import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../supabase";
import { fetchCoversForItems, getPosterUrl, fetchLogosForItems, getLogoUrl } from "../../utils/communityTmdb";

/**
 * useFeed — Home feed data hook.
 *
 * Fetches data streams and merges them into a single interleaved feed,
 * filtered to only show content from communities the user is subscribed to.
 *
 * v2: Unified episode pipeline (replaces separate episode_card + upcoming_episode).
 *     Fixed poster callback race condition that caused tab-switch duplication.
 */

// Module-level cache — survives tab switches (component unmount/remount).
const _randomPicksCache = new Map();

export function useFeed(userId, subscribedIds, feedMode = "all") {
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const feedBucketsRef = useRef({ all: [], activity: [], discover: [] });
  const fetchGenRef = useRef(0);
  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // ── Render tick — bumped whenever bucket data changes (fetch complete, poster resolve).
  // The derivation effect below is the ONLY codepath that writes feedItems.
  const [renderTick, setRenderTick] = useState(0);

  // Stable dependency key
  const subscribedKey = subscribedIds
    ? [...subscribedIds].sort().join(",")
    : "";

  // ════════════════════════════════════════════
  // DERIVE feedItems from bucket + mode + visibleCount + renderTick
  // This is the SINGLE codepath that writes feedItems.
  // Tab switches, fetch completion, poster enrichment, and load-more
  // all just change inputs to this effect.
  // ════════════════════════════════════════════
  useEffect(() => {
    const bucket = feedBucketsRef.current[feedMode] || [];
    setFeedItems(bucket.slice(0, visibleCount));
  }, [feedMode, visibleCount, renderTick]);

  const fetchFeed = useCallback(async (isExplicit = false) => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const thisGen = ++fetchGenRef.current;

    try {
      const [
        logsRes, badgesRes, trendingRes, badgeLookupRes, shelfRes,
        completionsRes, communityPagesRes, upNextRes, randomRes,
        episodesRes, awardsMiniseriesRes,
      ] = await Promise.all([
        // 1. Recent logs — with community context
        supabase
          .from("feed_user_logs")
          .select("*")
          .eq("user_id", userId)
          .order("logged_at", { ascending: false })
          .limit(100),

        // 2. Badge progress
        supabase
          .from("feed_badge_progress")
          .select("*")
          .eq("user_id", userId),

        // 3. Trending
        supabase
          .from("feed_trending_weekly")
          .select("*")
          .limit(8),

        // 4. Badge → miniseries lookup
        supabase
          .from("badges")
          .select("id, name, miniseries_id, accent_color, image_url, community_id")
          .eq("is_active", true),

        // 5. Personal shelf logs
        supabase
          .from("feed_shelf_logs")
          .select("*")
          .eq("user_id", userId)
          .order("watched_at", { ascending: false, nullsFirst: false })
          .limit(30),

        // 6. Recently earned badges
        supabase
          .from("feed_badge_completions")
          .select("*")
          .eq("user_id", userId)
          .gte("earned_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

        // 7. Community slug → id mapping
        supabase
          .from("community_pages")
          .select("id, slug"),

        // 8. Up Next
        supabase
          .from("feed_up_next")
          .select("*")
          .eq("user_id", userId)
          .limit(8),

        // 9. Random unwatched
        subscribedIds?.size > 0
          ? supabase.rpc("feed_random_unwatched", {
              p_user_id: userId,
              p_community_ids: [...subscribedIds],
            })
          : Promise.resolve({ data: [], error: null }),

        // 10. UNIFIED episode cards (replaces feed_episode_cards + feed_upcoming_episodes)
        supabase.rpc("feed_episodes_v2", { p_user_id: userId }),

        // 11. Awards miniseries IDs — excluded from Up Next
        supabase
          .from("community_miniseries")
          .select("id")
          .eq("tab_key", "awards"),
      ]);

      if (!mountedRef.current) return;

      const rawLogs = logsRes.data || [];
      const rawBadges = badgesRes.data || [];
      const rawTrending = trendingRes.data || [];
      const rawBadgeLookup = badgeLookupRes.data || [];
      const rawShelfLogs = shelfRes.data || [];
      const rawCompletions = completionsRes.data || [];
      const communityPages = communityPagesRes.data || [];
      const rawUpNext = upNextRes.data || [];
      const rawRandom = randomRes.data || [];

      if (isExplicit || !_randomPicksCache.has(userId)) {
        _randomPicksCache.set(userId, rawRandom.filter(r => r.media_type !== "book"));
      }

      // ════════════════════════════════════════════
      // EPISODE PIPELINE (unified — single card type "episode")
      // SQL returns DISTINCT ON tmdb_id with status ('dropped' | 'upcoming').
      // ════════════════════════════════════════════
      const rawEpisodesAll = (episodesRes.data || []).filter(e =>
        !subscribedIds || subscribedIds.size === 0 || subscribedIds.has(e.community_id)
      );

      // Split by status — SQL guarantees one row per tmdb_id
      const droppedEpisodes = rawEpisodesAll.filter(e => e.status === "dropped");
      const upcomingEpisodes = rawEpisodesAll.filter(e => e.status === "upcoming");

      // Dedupe upcoming to one per miniseries (nearest air_date wins)
      const upcomingByKey = new Map();
      for (const ep of upcomingEpisodes) {
        const key = ep.miniseries_id || ep.item_id;
        if (!upcomingByKey.has(key)) upcomingByKey.set(key, ep);
      }
      const upcomingCards = [...upcomingByKey.values()];

      // Build tmdb set for random pick suppression
      const episodeTmdbIds = new Set(rawEpisodesAll.map(e => e.tmdb_id).filter(Boolean));

      const randomPicksRaw = (_randomPicksCache.get(userId) || [])
        .filter(r => !episodeTmdbIds.has(r.tmdb_id));

      // Dedupe by tmdb_id + title — same film appears across multiple miniseries/communities
      const seenRandomKeys = new Set();
      const randomPicks = [];
      for (const r of randomPicksRaw) {
        const key = r.tmdb_id ? `tmdb_${r.tmdb_id}` : `title_${(r.title || "").toLowerCase().trim()}`;
        if (!seenRandomKeys.has(key)) {
          seenRandomKeys.add(key);
          randomPicks.push(r);
        }
      }

      // ── Build subscription-aware slug set ──
      const slugToId = new Map();
      const idToSlug = new Map();
      for (const cp of communityPages) {
        slugToId.set(cp.slug, cp.id);
        idToSlug.set(cp.id, cp.slug);
      }
      const hasSubscriptions = subscribedIds && subscribedIds.size > 0;
      const subscribedSlugs = hasSubscriptions
        ? new Set([...subscribedIds].map(id => idToSlug.get(id)).filter(Boolean))
        : null;

      // ── Build miniseries_id → badge lookup ──
      const badgeByMiniseries = new Map();
      for (const b of rawBadgeLookup) {
        if (b.miniseries_id) {
          badgeByMiniseries.set(b.miniseries_id, {
            badge_id: b.id,
            badge_name: b.name,
            accent_color: b.accent_color,
            badge_image: b.image_url,
            miniseries_id: b.miniseries_id,
          });
        }
      }

      // ── Group community logs by tmdb_id + date ──
      const logGroups = new Map();

      for (const log of rawLogs) {
        if (log.media_type === "book") continue;
        const effectiveDate = log.logged_at;
        const dateKey = new Date(effectiveDate).toISOString().slice(0, 10);
        const groupKey = `${log.tmdb_id || log.item_id}_${dateKey}`;

        if (!logGroups.has(groupKey)) {
          logGroups.set(groupKey, {
            type: "log",
            title: log.title,
            year: log.year,
            creator: log.creator,
            poster_path: log.poster_path,
            backdrop_path: log.backdrop_path,
            media_type: log.media_type,
            tmdb_id: log.tmdb_id,
            rating: log.rating,
            logged_at: effectiveDate,
            _created_at: log.created_at,
            completed_at: log.completed_at,
            communities: [],
          });
        }

        const group = logGroups.get(groupKey);
        if (!group.backdrop_path && log.backdrop_path) {
          group.backdrop_path = log.backdrop_path;
        }
        if (new Date(effectiveDate) > new Date(group.logged_at)) {
          group.logged_at = effectiveDate;
        }

        if (log.community_name) {
          if (subscribedSlugs && !subscribedSlugs.has(log.community_slug)) continue;
          const alreadyAdded = group.communities.some(
            c => c.community_slug === log.community_slug && c.series_title === log.series_title
          );
          if (!alreadyAdded) {
            const badge = badgeByMiniseries.get(log.miniseries_id) || null;
            group.communities.push({
              community_name: log.community_name,
              community_slug: log.community_slug,
              community_image: log.community_image,
              series_title: log.series_title,
              series_watched: log.series_watched,
              series_total: log.series_total,
              badge,
              episode_url: log.episode_url || null,
              episode_title: log.episode_title || null,
            });
          }
        }
      }

      // Build tmdbSeen AFTER grouping + subscription filtering
      // First: merge groups that share the same tmdb_id across different dates
      const mergedGroups = new Map();
      for (const group of logGroups.values()) {
        if (!group.tmdb_id) {
          // No tmdb_id — keep as-is with original key
          mergedGroups.set(`notmdb_${mergedGroups.size}`, group);
          continue;
        }
        const mKey = `tmdb_${group.tmdb_id}`;
        if (!mergedGroups.has(mKey)) {
          mergedGroups.set(mKey, group);
        } else {
          const existing = mergedGroups.get(mKey);
          // Keep the most recent date
          if (new Date(group.logged_at) > new Date(existing.logged_at)) {
            existing.logged_at = group.logged_at;
          }
          // Keep best rating
          if (group.rating && (!existing.rating || group.rating > existing.rating)) {
            existing.rating = group.rating;
          }
          // Merge communities
          for (const c of group.communities) {
            const dup = existing.communities.some(
              ec => ec.community_slug === c.community_slug && ec.series_title === c.series_title
            );
            if (!dup) existing.communities.push(c);
          }
          // Fill missing backdrop
          if (!existing.backdrop_path && group.backdrop_path) {
            existing.backdrop_path = group.backdrop_path;
          }
        }
      }

      const tmdbSeen = new Set();
      for (const group of mergedGroups.values()) {
        if (group.communities.length > 0 && group.tmdb_id) {
          tmdbSeen.add(group.tmdb_id);
        }
      }

      // Remove empty community groups
      for (const [key, group] of mergedGroups) {
        if (group.communities.length === 0) {
          mergedGroups.delete(key);
        }
      }

      // ── Merge personal shelf logs ──
      for (const shelf of rawShelfLogs) {
        if (shelf.tmdb_id && tmdbSeen.has(shelf.tmdb_id)) continue;
        const dateKey = shelf.watched_at
          ? new Date(shelf.watched_at).toISOString().slice(0, 10)
          : "unknown";
        const groupKey = `shelf_${shelf.tmdb_id || shelf.log_id}_${dateKey}`;
        if (!mergedGroups.has(groupKey)) {
          mergedGroups.set(groupKey, {
            type: "log",
            title: shelf.title,
            year: shelf.year,
            creator: shelf.creator,
            poster_path: shelf.poster_url,
            backdrop_path: shelf.backdrop_url,
            media_type: "film",
            tmdb_id: shelf.tmdb_id,
            rating: shelf.rating,
            logged_at: shelf.watched_at || shelf.created_at,
            _created_at: shelf.created_at,
            completed_at: shelf.watched_at,
            communities: [],
            isShelfLog: true,
          });
        }
      }

      // ── Filter badges to subscribed communities ──
      const filteredBadges = subscribedIds
        ? rawBadges.filter(b => !b.community_id || subscribedIds.has(b.community_id))
        : rawBadges;

      const sortedBadges = filteredBadges
        .map(b => ({
          ...b,
          pct: b.total_items > 0 ? b.watched_count / b.total_items : 0,
          remaining: b.total_items - b.watched_count,
        }))
        .sort((a, b) => b.pct - a.pct);

      // ── Filter badge completions ──
      const filteredCompletions = subscribedIds
        ? rawCompletions.filter(c => !c.community_id || subscribedIds.has(c.community_id))
        : rawCompletions;

      // ── Filter Up Next (exclude books + awards miniseries) ──
      const awardsMiniseriesIds = new Set(
        (awardsMiniseriesRes.data || []).map(m => m.id)
      );
      const filteredUpNext = (subscribedIds
        ? rawUpNext.filter(u => !u.community_id || subscribedIds.has(u.community_id))
        : rawUpNext
      ).filter(u => u.media_type !== "book" && !awardsMiniseriesIds.has(u.miniseries_id));

      // ── Build chronological stream ──
      const logCards = [...mergedGroups.values()]
        .sort((a, b) => {
          const diff = new Date(b.logged_at || 0) - new Date(a.logged_at || 0);
          if (diff !== 0) return diff;
          return new Date(b._created_at || 0) - new Date(a._created_at || 0);
        });

      const completionCards = filteredCompletions
        .map(c => ({ type: "badge_complete", data: c, sortDate: new Date(c.earned_at || 0) }));

      const logCardsWithDate = logCards
        .map(l => ({ type: "log", data: l, sortDate: new Date(l.logged_at || 0) }));

      const chronoStream = [...logCardsWithDate, ...completionCards]
        .sort((a, b) => b.sortDate - a.sortDate);

      // Fix series progress: older logs show lower counts
      const seriesSeenCount = {};
      for (const item of chronoStream) {
        if (item.type !== "log") continue;
        for (const c of item.data.communities) {
          const key = `${c.community_slug}_${c.series_title}`;
          if (!seriesSeenCount[key]) seriesSeenCount[key] = 0;
          const offset = seriesSeenCount[key];
          if (offset > 0 && c.series_watched > 0) {
            c.series_watched = Math.max(0, c.series_watched - offset);
          }
          seriesSeenCount[key]++;
        }
      }

      // ════════════════════════════════════════════
      // ACTIVITY FEED — pure chronological (no episodes, no discover cards)
      // ════════════════════════════════════════════
      const ACTIVITY_TYPES = new Set(["log", "badge_complete"]);
      const activityCards = chronoStream
        .filter(item => ACTIVITY_TYPES.has(item.type))
        .map(item => ({ type: item.type, data: item.data }));

      // ════════════════════════════════════════════
      // DISCOVER FEED — structured order, no duplicates
      // ════════════════════════════════════════════
      const discoverCards = [];
      const discoverSeenTmdb = new Set();

      const pushUnique = (type, data) => {
        const key = data.tmdb_id || data.item_id || data.title;
        if (key && discoverSeenTmdb.has(key)) return;
        if (key) discoverSeenTmdb.add(key);
        discoverCards.push({ type, data });
      };

      // 1. Upcoming episodes (homework — highest urgency)
      for (const ep of upcomingCards) {
        pushUnique("episode", ep);
      }

      // 2. Dropped episodes (listen now)
      for (const ep of droppedEpisodes) {
        pushUnique("episode", ep);
      }

      // 3. Interleave remaining pools: random → badge → up_next → trending
      //    Cap each to avoid one pool dominating
      const capRandom = randomPicks.slice(0, 8);
      const capBadges = sortedBadges.slice(0, 8);
      const capUpNext = filteredUpNext.slice(0, 8);
      const capTrending = rawTrending.slice(0, 8);
      const maxLen = Math.max(capRandom.length, capBadges.length, capUpNext.length, capTrending.length);

      for (let i = 0; i < maxLen; i++) {
        if (i < capRandom.length) pushUnique("random_pick", capRandom[i]);
        if (i < capBadges.length) pushUnique("badge", capBadges[i]);
        if (i < capUpNext.length) pushUnique("up_next", capUpNext[i]);
        if (i < capTrending.length) pushUnique("trending", capTrending[i]);
      }

      // ════════════════════════════════════════════
      // ALL FEED — interleaved
      // ════════════════════════════════════════════
      const cards = [];
      let upNextIdx = 0;
      let badgeIdx = 0;
      let trendingIdx = 0;
      let episodesInserted = false;
      let randomInserted = false;
      let logCount = 0;

      // Combine all episodes into one list for interleaving
      const allEpisodes = [...upcomingCards, ...droppedEpisodes];

      for (let i = 0; i < chronoStream.length; i++) {
        const item = chronoStream[i];
        cards.push({ type: item.type, data: item.data });

        if (item.type === "log") {
          logCount++;

          // After 1st log: episodes + up next
          if (logCount === 1) {
            if (!episodesInserted && allEpisodes.length > 0) {
              for (const ep of allEpisodes) {
                cards.push({ type: "episode", data: ep });
              }
              episodesInserted = true;
            }
            if (upNextIdx < filteredUpNext.length) {
              cards.push({ type: "up_next", data: filteredUpNext[upNextIdx++] });
            }
          }

          // After 2nd log: random pick
          if (logCount === 2 && !randomInserted && randomPicks.length > 0) {
            cards.push({ type: "random_pick", data: randomPicks[0] });
            randomInserted = true;
          }

          // After 3rd log: badge nudge
          if (logCount === 3 && badgeIdx < sortedBadges.length) {
            cards.push({ type: "badge", data: sortedBadges[badgeIdx++] });
          }

          // After 5th log: trending
          if (logCount === 5 && trendingIdx < rawTrending.length) {
            cards.push({ type: "trending", data: rawTrending[trendingIdx++] });
          }

          // After 7th log: second badge
          if (logCount === 7 && badgeIdx < sortedBadges.length) {
            cards.push({ type: "badge", data: sortedBadges[badgeIdx++] });
          }

          // After 9th log: second up next
          if (logCount === 9 && upNextIdx < filteredUpNext.length) {
            cards.push({ type: "up_next", data: filteredUpNext[upNextIdx++] });
          }
        }
      }

      // Fallback: if too few logs to trigger interleave slots
      if (!episodesInserted && allEpisodes.length > 0) {
        for (const ep of allEpisodes) {
          cards.push({ type: "episode", data: ep });
        }
      }
      if (upNextIdx === 0 && filteredUpNext.length > 0) {
        cards.push({ type: "up_next", data: filteredUpNext[0] });
      }
      if (!randomInserted && randomPicks.length > 0) {
        cards.push({ type: "random_pick", data: randomPicks[0] });
      }
      if (badgeIdx === 0 && sortedBadges.length > 0) {
        cards.push({ type: "badge", data: sortedBadges[0] });
      }
      if (trendingIdx === 0 && rawTrending.length > 0) {
        cards.push({ type: "trending", data: rawTrending[0] });
      }

      // ════════════════════════════════════════════
      // COMMIT BUCKETS — then bump renderTick so derivation effect re-slices
      // ════════════════════════════════════════════
      feedBucketsRef.current = { all: cards, activity: activityCards, discover: discoverCards };
      setVisibleCount(PAGE_SIZE);
      setRenderTick(t => t + 1);

      // ── Background poster enrichment ──────────────────────
      // Poster callback ONLY mutates data objects in-place and bumps
      // renderTick. The derivation effect handles re-slicing from the
      // correct bucket. This eliminates the race condition.
      const posterItems = [];
      const seenTmdb = new Set();
      for (const card of cards) {
        const d = card.data;
        if (!d?.tmdb_id || seenTmdb.has(d.tmdb_id)) continue;
        const hasPoster = d.poster_path || d.poster_url;
        if (!hasPoster) {
          seenTmdb.add(d.tmdb_id);
          posterItems.push({
            tmdb_id: d.tmdb_id,
            media_type: d.media_type || "film",
            poster_path: null,
            title: d.title,
          });
        }
      }

      if (posterItems.length > 0) {
        const genAtStart = thisGen;

        // Collect ALL data objects across all buckets (shared refs)
        const allDataObjects = new Set();
        for (const bucket of Object.values(feedBucketsRef.current)) {
          for (const card of bucket) {
            if (card.data) allDataObjects.add(card.data);
          }
        }

        fetchCoversForItems(posterItems, () => {
          if (!mountedRef.current) return;
          if (fetchGenRef.current !== genAtStart) return;

          // Patch poster paths on shared data objects
          for (const d of allDataObjects) {
            if (!d.tmdb_id) continue;
            const url = getPosterUrl(d.tmdb_id);
            if (!url) continue;
            if (!d.poster_path) d.poster_path = url;
            if (!d.poster_url) d.poster_url = url;
          }

          // Bump tick — derivation effect re-slices from correct bucket
          setRenderTick(t => t + 1);
        }).catch(() => {});
      }

      // ── Background logo enrichment (VHS tape card titles) ──
      {
        const genAtStart = thisGen;
        const logoItems = [];
        const seenLogo = new Set();
        for (const card of cards) {
          const d = card.data;
          if (!d?.tmdb_id || seenLogo.has(d.tmdb_id)) continue;
          if (d.media_type === "book" || d.media_type === "game") continue;
          seenLogo.add(d.tmdb_id);
          logoItems.push({ tmdb_id: d.tmdb_id, media_type: d.media_type || "film" });
        }

        if (logoItems.length > 0) {
          // Collect ALL data objects across all buckets
          const allDataObjects = new Set();
          for (const bucket of Object.values(feedBucketsRef.current)) {
            for (const card of bucket) {
              if (card.data) allDataObjects.add(card.data);
            }
          }

          fetchLogosForItems(logoItems, () => {
            if (!mountedRef.current) return;
            if (fetchGenRef.current !== genAtStart) return;

            // Patch logo_url on shared data objects
            for (const d of allDataObjects) {
              if (!d.tmdb_id) continue;
              const url = getLogoUrl(d.tmdb_id);
              if (url) d.logo_url = url;
            }

            setRenderTick(t => t + 1);
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error("[Feed] Error loading feed:", err);
    }

    if (mountedRef.current) setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, subscribedKey]);

  const loadMore = useCallback(() => {
    setVisibleCount(prev => prev + PAGE_SIZE);
  }, []);

  // Reset page when switching tabs
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [feedMode]);

  const hasMore = (() => {
    const bucket = feedBucketsRef.current[feedMode] || [];
    return visibleCount < bucket.length;
  })();

  useEffect(() => {
    mountedRef.current = true;
    fetchFeed();
    return () => { mountedRef.current = false; };
  }, [fetchFeed]);

  return { feedItems, loading, refresh: () => fetchFeed(true), loadMore, hasMore };
}
