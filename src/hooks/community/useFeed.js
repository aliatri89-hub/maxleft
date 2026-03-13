import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../supabase";
import { fetchCoversForItems, getPosterUrl } from "../../utils/communityTmdb";

/**
 * useFeed — Home feed data hook.
 *
 * Fetches data streams and merges them into a single interleaved feed,
 * filtered to only show content from communities the user is subscribed to.
 *
 * @param {string} userId
 * @param {Set<string>} subscribedIds — Set of community UUIDs from useCommunitySubscriptions
 *
 * Returns:
 *   feedItems     — array of { type, data } cards, interleaved and ready to render
 *   loading       — boolean
 *   refresh       — () => refetch everything
 */
export function useFeed(userId, subscribedIds) {
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const allCardsRef = useRef([]);
  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const fetchFeed = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);

    try {
      const [logsRes, badgesRes, trendingRes, badgeLookupRes, shelfRes, completionsRes, communityPagesRes, upNextRes, randomRes] = await Promise.all([
        // 1. Recent logs — with community context
        supabase
          .from("feed_user_logs")
          .select("*")
          .eq("user_id", userId)
          .order("logged_at", { ascending: false })
          .limit(100),

        // 2. Badge progress — in-progress badges sorted by completion %
        supabase
          .from("feed_badge_progress")
          .select("*")
          .eq("user_id", userId),

        // 3. Trending this week
        supabase
          .from("feed_trending_weekly")
          .select("*")
          .limit(5),

        // 4. Badge → miniseries lookup (for badge-aware community strips)
        supabase
          .from("badges")
          .select("id, name, miniseries_id, accent_color, image_url, community_id")
          .eq("is_active", true),

        // 5. Personal shelf logs — catches movies not in any community
        supabase
          .from("feed_shelf_logs")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(30),

        // 6. Recently earned badges (last 7 days)
        supabase
          .from("feed_badge_completions")
          .select("*")
          .eq("user_id", userId)
          .gte("earned_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

        // 7. Community slug → id mapping (for subscription filtering)
        supabase
          .from("community_pages")
          .select("id, slug"),

        // 8. Up Next — next unwatched item per in-progress series
        supabase
          .from("feed_up_next")
          .select("*")
          .eq("user_id", userId)
          .limit(3),

        // 9. Random unwatched — "Have You Seen...?" discovery picks
        subscribedIds?.size > 0
          ? supabase.rpc("feed_random_unwatched", {
              p_user_id: userId,
              p_community_ids: [...subscribedIds],
            })
          : Promise.resolve({ data: [], error: null }),
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

      // ── Build subscription-aware slug set ──
      // subscribedIds is a Set of community UUIDs; map to slugs for log filtering
      const slugToId = new Map();
      const idToSlug = new Map();
      for (const cp of communityPages) {
        slugToId.set(cp.slug, cp.id);
        idToSlug.set(cp.id, cp.slug);
      }
      const hasSubscriptions = subscribedIds && subscribedIds.size > 0;
      const subscribedSlugs = hasSubscriptions
        ? new Set([...subscribedIds].map(id => idToSlug.get(id)).filter(Boolean))
        : null; // null = no filtering (show everything — e.g. subs not loaded yet)

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

      // ── Group community logs by tmdb_id + completed_at date ──
      // Return to Oz in BC + NPP = one card with two community strips
      const logGroups = new Map();
      // FIX: Don't populate tmdbSeen eagerly — defer until after subscription
      // filtering so unsubscribed-community logs don't block shelf versions.

      for (const log of rawLogs) {
        // Skip books — cover pipeline not wired up yet
        if (log.media_type === "book") continue;

        // FIX: Use the MOST RECENT timestamp for grouping + sorting.
        // After a Letterboxd sync, logged_at (= GREATEST(completed_at, updated_at)
        // from the SQL view) reflects "now" rather than the old Letterboxd date.
        // If the view also exposes updated_at separately, prefer the newer of the two.
        const effectiveDate = log.updated_at && new Date(log.updated_at) > new Date(log.logged_at)
          ? log.updated_at
          : log.logged_at;

        // Group by date so rewatches across communities merge into one card
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
            logged_at: effectiveDate, // FIX: use effective date for sort
            completed_at: log.completed_at,
            communities: [],
          });
        }

        // Prefer a backdrop if this row has one and the group doesn't yet
        const group = logGroups.get(groupKey);
        if (!group.backdrop_path && log.backdrop_path) {
          group.backdrop_path = log.backdrop_path;
        }

        // FIX: Promote group's logged_at to the newest effective date seen
        // (handles multiple community rows for the same film)
        if (new Date(effectiveDate) > new Date(group.logged_at)) {
          group.logged_at = effectiveDate;
        }

        // Attach community context if present AND user is subscribed
        if (log.community_name) {
          // Skip this community strip if user isn't subscribed
          if (subscribedSlugs && !subscribedSlugs.has(log.community_slug)) continue;
          const alreadyAdded = group.communities.some(
            c => c.community_slug === log.community_slug && c.series_title === log.series_title
          );
          if (!alreadyAdded) {
            // Check if this series has a badge
            const badge = badgeByMiniseries.get(log.miniseries_id) || null;

            group.communities.push({
              community_name: log.community_name,
              community_slug: log.community_slug,
              community_image: log.community_image,
              series_title: log.series_title,
              series_watched: log.series_watched,
              series_total: log.series_total,
              badge,
              // Audio — powers feed play button
              episode_url: log.episode_url || null,
              episode_title: log.episode_title || null,
            });
          }
        }
      }

      // ── FIX: Build tmdbSeen AFTER grouping + subscription filtering ──
      // Only claim a tmdb_id if the group actually has visible community strips.
      // Groups with zero communities (all filtered out by subscription) should NOT
      // block the shelf version from appearing — otherwise synced films vanish.
      const tmdbSeen = new Set();
      for (const group of logGroups.values()) {
        if (group.communities.length > 0 && group.tmdb_id) {
          tmdbSeen.add(group.tmdb_id);
        }
      }

      // ── Remove empty community groups ──
      // If a log group lost all its community strips to subscription filtering
      // AND has no standalone value (no title visible without a community), drop it
      // so the shelf version can take over with its fresh created_at timestamp.
      for (const [key, group] of logGroups) {
        if (group.communities.length === 0) {
          logGroups.delete(key);
        }
      }

      // ── Merge in personal shelf logs not already covered by community logs ──
      for (const shelf of rawShelfLogs) {
        if (shelf.tmdb_id && tmdbSeen.has(shelf.tmdb_id)) continue; // already in feed via community

        const dateKey = shelf.watched_at
          ? new Date(shelf.watched_at).toISOString().slice(0, 10)
          : "unknown";
        const groupKey = `shelf_${shelf.tmdb_id || shelf.log_id}_${dateKey}`;

        if (!logGroups.has(groupKey)) {
          const posterPath = shelf.poster_url;
          const backdropPath = shelf.backdrop_url;

          logGroups.set(groupKey, {
            type: "log",
            title: shelf.title,
            year: shelf.year,
            creator: shelf.creator,
            poster_path: posterPath,
            backdrop_path: backdropPath,
            media_type: "film",
            tmdb_id: shelf.tmdb_id,
            rating: shelf.rating,
            logged_at: shelf.created_at || shelf.watched_at,
            completed_at: shelf.watched_at,
            communities: [],
            isShelfLog: true,
          });
        }
      }

      // ── Filter badges to subscribed communities only ──
      const filteredBadges = subscribedIds
        ? rawBadges.filter(b => !b.community_id || subscribedIds.has(b.community_id))
        : rawBadges;

      // ── Sort badges by completion % descending ──
      const sortedBadges = filteredBadges
        .map(b => ({
          ...b,
          pct: b.total_items > 0 ? b.watched_count / b.total_items : 0,
          remaining: b.total_items - b.watched_count,
        }))
        .sort((a, b) => b.pct - a.pct);

      // ── Filter badge completions to subscribed communities ──
      const filteredCompletions = subscribedIds
        ? rawCompletions.filter(c => !c.community_id || subscribedIds.has(c.community_id))
        : rawCompletions;

      // ── Filter Up Next to subscribed communities (exclude books) ──
      const filteredUpNext = (subscribedIds
        ? rawUpNext.filter(u => !u.community_id || subscribedIds.has(u.community_id))
        : rawUpNext
      ).filter(u => u.media_type !== "book");

      // ── Random unwatched picks (exclude books) ──
      const randomPicks = rawRandom.filter(r => r.media_type !== "book");

      // ── Build interleaved feed ──
      const cards = [];

      // Merge log cards and badge completions into a single chronological stream
      const logCards = [...logGroups.values()]
        .sort((a, b) => new Date(b.logged_at || 0) - new Date(a.logged_at || 0));

      const completionCards = filteredCompletions
        .map(c => ({ type: "badge_complete", data: c, sortDate: new Date(c.earned_at || 0) }));

      const logCardsWithDate = logCards
        .map(l => ({ type: "log", data: l, sortDate: new Date(l.logged_at || 0) }));

      // Combine and sort chronologically (newest first)
      const chronoStream = [...logCardsWithDate, ...completionCards]
        .sort((a, b) => b.sortDate - a.sortDate);

      // Fix series progress: when multiple logs share the same series,
      // older logs should show lower counts (e.g. Knock at the Cabin = 3/14, Split = 4/14)
      // logCards are sorted newest-first, so we decrement for older entries
      const seriesSeenCount = {}; // key: "slug_seriesTitle" → how many newer logs we've seen
      for (const item of chronoStream) {
        if (item.type !== "log") continue;
        for (const c of item.data.communities) {
          const key = `${c.community_slug}_${c.series_title}`;
          if (!seriesSeenCount[key]) {
            seriesSeenCount[key] = 0;
          }
          // This is the Nth card in this series (0 = newest)
          const offset = seriesSeenCount[key];
          if (offset > 0 && c.series_watched > 0) {
            c.series_watched = Math.max(0, c.series_watched - offset);
          }
          seriesSeenCount[key]++;
        }
      }

      // Interleave: walk the chronological stream, insert up_next + badge nudges + trending at intervals
      let upNextIdx = 0;
      let badgeIdx = 0;
      let trendingIdx = 0;
      let randomIdx = 0;
      let logCount = 0; // track how many log cards we've placed (for nudge spacing)

      for (let i = 0; i < chronoStream.length; i++) {
        const item = chronoStream[i];
        cards.push({ type: item.type, data: item.data });

        if (item.type === "log") {
          logCount++;

          // After 1st log card, insert Up Next (most recently active series)
          if (logCount === 1 && upNextIdx < filteredUpNext.length) {
            cards.push({ type: "up_next", data: filteredUpNext[upNextIdx++] });
          }

          // After 2nd log card, insert "Have You Seen...?" random pick
          if (logCount === 2 && randomIdx < randomPicks.length) {
            cards.push({ type: "random_pick", data: randomPicks[randomIdx++] });
          }

          // After 3rd log card, insert top badge nudge
          if (logCount === 3 && badgeIdx < sortedBadges.length) {
            cards.push({ type: "badge", data: sortedBadges[badgeIdx++] });
          }

          // After 5th log card, insert trending
          if (logCount === 5 && trendingIdx < rawTrending.length) {
            cards.push({ type: "trending", data: rawTrending[trendingIdx++] });
          }

          // After 7th log card, insert second badge if available
          if (logCount === 7 && badgeIdx < sortedBadges.length) {
            cards.push({ type: "badge", data: sortedBadges[badgeIdx++] });
          }

          // After 9th log card, insert second Up Next for a different series
          if (logCount === 9 && upNextIdx < filteredUpNext.length) {
            cards.push({ type: "up_next", data: filteredUpNext[upNextIdx++] });
          }

          // After 11th log card, insert another random pick
          if (logCount === 11 && randomIdx < randomPicks.length) {
            cards.push({ type: "random_pick", data: randomPicks[randomIdx++] });
          }

          // Every 10 logs after the initial set, sprinkle in more nudges
          if (logCount > 7 && logCount % 5 === 0) {
            if (badgeIdx < sortedBadges.length) {
              cards.push({ type: "badge", data: sortedBadges[badgeIdx++] });
            } else if (trendingIdx < rawTrending.length) {
              cards.push({ type: "trending", data: rawTrending[trendingIdx++] });
            }
          }

          // Every 10 logs, drop another random pick
          if (logCount > 11 && logCount % 10 === 0 && randomIdx < randomPicks.length) {
            cards.push({ type: "random_pick", data: randomPicks[randomIdx++] });
          }
        }
      }

      // If fewer than expected log cards, still add nudges at the end
      if (logCount === 0 && filteredUpNext.length > 0) {
        cards.push({ type: "up_next", data: filteredUpNext[0] });
      }
      if (logCount <= 1 && randomPicks.length > 0) {
        cards.push({ type: "random_pick", data: randomPicks[0] });
      }
      if (logCount <= 2 && sortedBadges.length > 0) {
        cards.push({ type: "badge", data: sortedBadges[0] });
      }
      if (logCount <= 4 && rawTrending.length > 0) {
        cards.push({ type: "trending", data: rawTrending[0] });
      }

      allCardsRef.current = cards;
      setVisibleCount(PAGE_SIZE); // Reset to first page on fresh fetch
      setFeedItems(cards.slice(0, PAGE_SIZE));

      // ── Background poster enrichment ──────────────────────
      // Collect items with tmdb_id but no poster — build pseudo-items
      // for fetchCoversForItems, then progressively re-render as
      // posters resolve so Poster components pick them up from cache.
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
        // Progressive: onUpdate fires per batch, triggers re-render
        // so Poster components re-evaluate getPosterUrl(tmdbId)
        fetchCoversForItems(posterItems, () => {
          if (!mountedRef.current) return;
          // Patch card data in-place with resolved poster URLs,
          // then set a new array reference to trigger React re-render
          for (const card of allCardsRef.current) {
            const d = card.data;
            if (!d?.tmdb_id) continue;
            const url = getPosterUrl(d.tmdb_id);
            if (!url) continue;
            if ((card.type === "log" || card.type === "up_next" || card.type === "trending") && !d.poster_path) {
              d.poster_path = url;
            }
            if (card.type === "random_pick" && !d.poster_url) {
              d.poster_url = url;
            }
            // Also patch backdrop if we resolved poster — backdrop comes from same TMDB call
          }
          setFeedItems(allCardsRef.current.slice(0, PAGE_SIZE));
        }).catch(() => {}); // non-fatal
      }
    } catch (err) {
      console.error("[Feed] Error loading feed:", err);
    }

    if (mountedRef.current) setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, subscribedIds?.size]);

  // Re-slice when visibleCount grows (Load More)
  useEffect(() => {
    if (allCardsRef.current.length > 0) {
      setFeedItems(allCardsRef.current.slice(0, visibleCount));
    }
  }, [visibleCount]);

  const loadMore = useCallback(() => {
    setVisibleCount(prev => prev + PAGE_SIZE);
  }, []);

  const hasMore = visibleCount < allCardsRef.current.length;

  useEffect(() => {
    mountedRef.current = true;
    fetchFeed();
    return () => { mountedRef.current = false; };
  }, [fetchFeed]);

  return { feedItems, loading, refresh: fetchFeed, loadMore, hasMore };
}
