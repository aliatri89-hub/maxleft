import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "../../supabase";
import { fetchCoversForItems, getPosterUrl, fetchLogosForItems, getLogoUrl } from "../../utils/communityTmdb";

/**
 * useFeed — Home feed data hook.
 *
 * Architecture:
 *   1. fetchAllData()        — 11 parallel Supabase queries
 *   2. groupAndMergeLogs()   — dedupe logs by tmdb_id, merge community contexts
 *   3. mergeShelfLogs()      — fold in personal shelf logs not already covered
 *   4. buildEpisodePipeline()— split episodes by status, dedupe upcoming
 *   5. buildActivityFeed()   — pure chronological logs + badge completions
 *   6. buildDiscoverFeed()   — 8-HOUR DRIP ENGINE: epoch-rotated card queue where
 *                              passive discovery cards (random/badge-nudge/up_next/trending)
 *                              drop every 8h in round-robin. Event-driven cards override:
 *                              episode drops (air_date), coming soon (7d before air_date),
 *                              and active badge progress (last_progress_at within 3d).
 *   7. buildAllFeed()        — interleaves discovery cards into the chronological stream
 *   8. enrichMedia()         — background poster + logo patching
 */

// ════════════════════════════════════════════════
// STABLE RANDOM PICKS CACHE
// Module-level — survives tab switches. localStorage — survives reloads.
// ════════════════════════════════════════════════

const _randomPicksCache = new Map();
const _PICKS_STORAGE_KEY = (uid) => `mantl_random_picks_${uid}`;

function _getPersistedPicks(userId) {
  try {
    const raw = localStorage.getItem(_PICKS_STORAGE_KEY(userId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function _persistPicks(userId, picks) {
  try {
    localStorage.setItem(_PICKS_STORAGE_KEY(userId), JSON.stringify(picks));
  } catch {}
}

// ════════════════════════════════════════════════
// JSONB → SAFE STRINGS (prevent React object-as-child errors)
// ════════════════════════════════════════════════

function _extractDirector(credits, fallback) {
  if (!credits || typeof credits !== "object") return fallback || null;
  // TMDB standard: {crew: [{job:"Director", name:"..."}]}
  if (Array.isArray(credits.crew)) {
    const dir = credits.crew.find(c => c && c.job === "Director");
    if (dir?.name) return dir.name;
  }
  // Flat: {director: "Name"}
  if (typeof credits.director === "string") return credits.director;
  return fallback || null;
}

function _extractCast(credits) {
  if (!credits || typeof credits !== "object") return [];
  const raw = Array.isArray(credits.cast) ? credits.cast : [];
  return raw.slice(0, 6).map(c => (typeof c === "string" ? c : c?.name || "")).filter(Boolean);
}

function _extractStudios(companies) {
  if (!Array.isArray(companies)) return [];
  return companies.slice(0, 3).map(c => {
    if (typeof c === "string") return { name: c, logo_url: null };
    return {
      name: c?.name || "",
      logo_url: c?.logo_path ? `https://image.tmdb.org/t/p/w92${c.logo_path}` : null,
    };
  }).filter(s => s.name);
}

// ════════════════════════════════════════════════
// DATA FETCHING
// ════════════════════════════════════════════════

function fetchAllData(userId, subscribedIds) {
  return Promise.all([
    // 1. Recent community logs
    supabase
      .from("feed_user_logs")
      .select("*")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(300),

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

    // 4. Badge metadata
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
      .limit(100),

    // 6. Recently earned badges
    supabase
      .from("feed_badge_completions")
      .select("*")
      .eq("user_id", userId)
      .gte("earned_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

    // 7. Community slug ↔ id mapping
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

    // 10. Unified episodes
    supabase.rpc("feed_episodes_v2", { p_user_id: userId }),

    // 11. Awards miniseries IDs (excluded from Up Next)
    supabase
      .from("community_miniseries")
      .select("id")
      .eq("tab_key", "awards"),
  ]);
}

// ════════════════════════════════════════════════
// LOG GROUPING & MERGING
// ════════════════════════════════════════════════

function buildSlugMaps(communityPages) {
  const slugToId = new Map();
  const idToSlug = new Map();
  for (const cp of communityPages) {
    slugToId.set(cp.slug, cp.id);
    idToSlug.set(cp.id, cp.slug);
  }
  return { slugToId, idToSlug };
}

function buildBadgeLookup(rawBadgeLookup) {
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
  return badgeByMiniseries;
}

function groupAndMergeLogs(rawLogs, badgeByMiniseries, subscribedSlugs) {
  // Step 1: Group by tmdb_id + date
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
        tagline: log.tagline || null,
        budget: log.budget || null,
        revenue: log.revenue || null,
        runtime: log.runtime || null,
        overview: log.overview || null,
        director: _extractDirector(log.credits, log.creator),
        cast_names: _extractCast(log.credits),
        studio_names: _extractStudios(log.production_companies),
        genre: log.genre || null,
        certification: log.certification || null,
        still_paths: log.still_paths || null,
        communities: [],
      });
    }

    const group = logGroups.get(groupKey);
    if (!group.backdrop_path && log.backdrop_path) group.backdrop_path = log.backdrop_path;
    if (new Date(effectiveDate) > new Date(group.logged_at)) group.logged_at = effectiveDate;

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

  // Step 2: Merge groups that share the same tmdb_id across different dates
  const mergedGroups = new Map();
  for (const group of logGroups.values()) {
    if (!group.tmdb_id) {
      mergedGroups.set(`notmdb_${mergedGroups.size}`, group);
      continue;
    }
    const mKey = `tmdb_${group.tmdb_id}`;
    if (!mergedGroups.has(mKey)) {
      mergedGroups.set(mKey, group);
    } else {
      const existing = mergedGroups.get(mKey);
      if (new Date(group.logged_at) > new Date(existing.logged_at)) existing.logged_at = group.logged_at;
      if (group.rating && (!existing.rating || group.rating > existing.rating)) existing.rating = group.rating;
      for (const c of group.communities) {
        const dup = existing.communities.some(
          ec => ec.community_slug === c.community_slug && ec.series_title === c.series_title
        );
        if (!dup) existing.communities.push(c);
      }
      if (!existing.backdrop_path && group.backdrop_path) existing.backdrop_path = group.backdrop_path;
    }
  }

  return mergedGroups;
}

function mergeShelfLogs(mergedGroups, rawShelfLogs) {
  // Build set of tmdb_ids already covered by community logs
  const tmdbSeen = new Set();
  for (const group of mergedGroups.values()) {
    if (group.communities.length > 0 && group.tmdb_id) tmdbSeen.add(group.tmdb_id);
  }

  // Remove empty community groups
  for (const [key, group] of mergedGroups) {
    if (group.communities.length === 0) mergedGroups.delete(key);
  }

  // Fold in personal shelf logs
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
        tagline: shelf.tagline || null,
        budget: shelf.budget || null,
        revenue: shelf.revenue || null,
        runtime: shelf.runtime || null,
        overview: shelf.overview || null,
        director: _extractDirector(shelf.credits, shelf.creator),
        cast_names: _extractCast(shelf.credits),
        studio_names: _extractStudios(shelf.production_companies),
        genre: shelf.genre || null,
        certification: shelf.certification || null,
        still_paths: shelf.still_paths || null,
        communities: [],
        isShelfLog: true,
      });
    }
  }

  return mergedGroups;
}

// ════════════════════════════════════════════════
// EPISODE PIPELINE
// ════════════════════════════════════════════════

function buildEpisodePipeline(rawEpisodesAll, subscribedIds) {
  const filtered = rawEpisodesAll.filter(e =>
    !subscribedIds || subscribedIds.size === 0 || subscribedIds.has(e.community_id)
  );

  const droppedEpisodes = filtered.filter(e => e.status === "dropped" || e.status === "published");
  const upcomingEpisodes = filtered.filter(e => e.status === "upcoming");

  // Dedupe upcoming: one per miniseries (nearest air_date wins)
  const upcomingByKey = new Map();
  for (const ep of upcomingEpisodes) {
    const key = ep.miniseries_id || ep.item_id;
    if (!upcomingByKey.has(key)) upcomingByKey.set(key, ep);
  }
  const upcomingCards = [...upcomingByKey.values()];

  const episodeTmdbIds = new Set(filtered.map(e => e.tmdb_id).filter(Boolean));

  return { droppedEpisodes, upcomingCards, episodeTmdbIds, allEpisodes: [...upcomingCards, ...droppedEpisodes] };
}

// ════════════════════════════════════════════════
// RANDOM PICKS (stable, deduplicated)
// ════════════════════════════════════════════════

function resolveRandomPicks(userId, rawRandom, episodeTmdbIds) {
  if (!_randomPicksCache.has(userId)) {
    const persisted = _getPersistedPicks(userId);
    if (persisted && persisted.length > 0) {
      _randomPicksCache.set(userId, persisted);
    } else {
      const fresh = rawRandom.filter(r => r.media_type !== "book");
      _randomPicksCache.set(userId, fresh);
      _persistPicks(userId, fresh);
    }
  }

  const raw = (_randomPicksCache.get(userId) || [])
    .filter(r => !episodeTmdbIds.has(r.tmdb_id));

  // Dedupe by tmdb_id + title
  const seen = new Set();
  const picks = [];
  for (const r of raw) {
    const key = r.tmdb_id ? `tmdb_${r.tmdb_id}` : `title_${(r.title || "").toLowerCase().trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      picks.push(r);
    }
  }
  return picks;
}

// ════════════════════════════════════════════════
// FILTER HELPERS
// ════════════════════════════════════════════════

function filterBadges(rawBadges, subscribedIds) {
  const filtered = subscribedIds
    ? rawBadges.filter(b => !b.community_id || subscribedIds.has(b.community_id))
    : rawBadges;

  return filtered
    .map(b => ({
      ...b,
      pct: b.total_items > 0 ? b.watched_count / b.total_items : 0,
      remaining: b.total_items - b.watched_count,
    }))
    .sort((a, b) => b.pct - a.pct);
}

function filterUpNext(rawUpNext, subscribedIds, awardsMiniseriesIds) {
  return (subscribedIds
    ? rawUpNext.filter(u => !u.community_id || subscribedIds.has(u.community_id))
    : rawUpNext
  ).filter(u => u.media_type !== "book" && !awardsMiniseriesIds.has(u.miniseries_id));
}

function filterTrending(rawTrending, subscribedSlugs) {
  return rawTrending
    .map(t => ({
      ...t,
      communities: (t.communities || []).filter(c =>
        !subscribedSlugs || subscribedSlugs.has(c.community_slug)
      ),
    }))
    .filter(t => t.communities.length > 0);
}

function filterCompletions(rawCompletions, subscribedIds) {
  return subscribedIds
    ? rawCompletions.filter(c => !c.community_id || subscribedIds.has(c.community_id))
    : rawCompletions;
}

// ════════════════════════════════════════════════
// CHRONOLOGICAL STREAM (shared by Activity + All)
// ════════════════════════════════════════════════

function buildChronoStream(mergedGroups, filteredCompletions) {
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

  const stream = [...logCardsWithDate, ...completionCards]
    .sort((a, b) => b.sortDate - a.sortDate);

  // Fix series progress: older logs show lower counts
  const seriesSeenCount = {};
  for (const item of stream) {
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

  return stream;
}

// ════════════════════════════════════════════════
// FEED BUILDERS
// ════════════════════════════════════════════════

function buildActivityFeed(chronoStream) {
  const ACTIVITY_TYPES = new Set(["log", "badge_complete"]);
  return chronoStream
    .filter(item => ACTIVITY_TYPES.has(item.type))
    .map(item => ({ type: item.type, data: item.data }));
}

/**
 * buildDiscoverFeed — 8-hour drip engine.
 *
 * Every 8 hours a new discovery card "drops" to the top of the feed.
 * Three passive pools rotate round-robin: random → up_next → trending.
 *
 * Event-driven cards override the rotation (sorted by real timestamps):
 *   - Dropped/published episodes: air_date as drop time
 *   - Upcoming episodes: "drop" 7 days before air_date
 *   - Badge progress updates: last_progress_at as drop time (when the user
 *     recently watched something toward a badge, it surfaces organically)
 *
 * Badges with no recent activity (>3 days) fall into the epoch rotation
 * as passive nudges alongside random/up_next/trending.
 *
 * Everything is sorted by drop time (newest first).
 */
const EPOCH_MS = 8 * 60 * 60 * 1000; // 8 hours
const BADGE_ACTIVE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

function buildDiscoverFeed({ upcomingCards, droppedEpisodes, randomPicks, sortedBadges, filteredUpNext, filteredTrending }) {
  const now = Date.now();
  const currentEpoch = Math.floor(now / EPOCH_MS);

  const feed = [];
  const seenKeys = new Set();

  const tryPush = (type, data, dropTime) => {
    const key = data.tmdb_id || data.item_id || data.badge_id || data.title || data.badge_name;
    if (key && seenKeys.has(key)) return false;
    if (key) seenKeys.add(key);
    feed.push({ type, data, _dropTime: dropTime });
    return true;
  };

  // ── Event-driven: dropped/published episodes ──
  for (const ep of droppedEpisodes) {
    const t = ep.air_date ? new Date(ep.air_date).getTime() : now;
    tryPush("episode", ep, t);
  }

  // ── Event-driven: upcoming (coming soon) episodes ──
  for (const ep of upcomingCards) {
    const airMs = ep.air_date ? new Date(ep.air_date).getTime() : now;
    const airEpoch = Math.floor(airMs / EPOCH_MS);
    const dropEpoch = airEpoch - 21; // ~7 days before
    let dropTime = dropEpoch * EPOCH_MS;
    dropTime = Math.min(dropTime, now);
    dropTime = Math.max(dropTime, now - 30 * 24 * 3600 * 1000);
    tryPush("episode", ep, dropTime);
  }

  // ── Split badges: active progress vs. passive nudge ──
  const activeBadges = [];
  const passiveBadges = [];
  for (const b of sortedBadges) {
    const progressMs = b.last_progress_at ? new Date(b.last_progress_at).getTime() : 0;
    if (progressMs > 0 && (now - progressMs) < BADGE_ACTIVE_WINDOW_MS) {
      activeBadges.push(b);
    } else {
      passiveBadges.push(b);
    }
  }

  // ── Event-driven: active badge progress ──
  // User recently watched something in this badge's series → drop with real timestamp
  for (const b of activeBadges) {
    const t = new Date(b.last_progress_at).getTime();
    tryPush("badge", b, t);
  }

  // ── Epoch-rotated: passive discovery card pools ──
  const pools = [
    { type: "random_pick", items: randomPicks.slice(0, 8) },
    { type: "badge",       items: passiveBadges.slice(0, 8) },
    { type: "up_next",     items: filteredUpNext.slice(0, 8) },
    { type: "trending",    items: filteredTrending.slice(0, 8) },
  ];

  const poolCount = pools.length;
  const poolCursors = pools.map(() => 0);
  let slotsAssigned = 0;
  const maxSlots = pools.reduce((sum, p) => sum + p.items.length, 0);

  for (let e = currentEpoch; slotsAssigned < maxSlots && (currentEpoch - e) < 90; e--) {
    const pIdx = ((e % poolCount) + poolCount) % poolCount;
    const pool = pools[pIdx];
    const cIdx = poolCursors[pIdx];

    if (cIdx < pool.items.length) {
      const dropTime = e * EPOCH_MS;
      poolCursors[pIdx]++;
      if (tryPush(pool.type, pool.items[cIdx], dropTime)) {
        slotsAssigned++;
      }
    }
  }

  // Sort newest first
  feed.sort((a, b) => b._dropTime - a._dropTime);

  // Strip internal timing field
  return feed.map(({ _dropTime, ...card }) => card);
}

function buildAllFeed({ chronoStream, allEpisodes, filteredUpNext, randomPicks, sortedBadges, filteredTrending }) {
  const cards = [];
  let upNextIdx = 0;
  let badgeIdx = 0;
  let trendingIdx = 0;
  let episodesInserted = false;
  let randomInserted = false;
  let logCount = 0;

  for (const item of chronoStream) {
    cards.push({ type: item.type, data: item.data });

    if (item.type === "log") {
      logCount++;

      if (logCount === 1) {
        if (!episodesInserted && allEpisodes.length > 0) {
          for (const ep of allEpisodes) cards.push({ type: "episode", data: ep });
          episodesInserted = true;
        }
        if (upNextIdx < filteredUpNext.length) {
          cards.push({ type: "up_next", data: filteredUpNext[upNextIdx++] });
        }
      }

      if (logCount === 2 && !randomInserted && randomPicks.length > 0) {
        cards.push({ type: "random_pick", data: randomPicks[0] });
        randomInserted = true;
      }

      if (logCount === 3 && badgeIdx < sortedBadges.length) {
        cards.push({ type: "badge", data: sortedBadges[badgeIdx++] });
      }

      if (logCount === 5 && trendingIdx < filteredTrending.length) {
        cards.push({ type: "trending", data: filteredTrending[trendingIdx++] });
      }

      if (logCount === 7 && badgeIdx < sortedBadges.length) {
        cards.push({ type: "badge", data: sortedBadges[badgeIdx++] });
      }

      if (logCount === 9 && upNextIdx < filteredUpNext.length) {
        cards.push({ type: "up_next", data: filteredUpNext[upNextIdx++] });
      }
    }
  }

  // Fallback: if too few logs to trigger interleave slots
  if (!episodesInserted && allEpisodes.length > 0) {
    for (const ep of allEpisodes) cards.push({ type: "episode", data: ep });
  }
  if (upNextIdx === 0 && filteredUpNext.length > 0) cards.push({ type: "up_next", data: filteredUpNext[0] });
  if (!randomInserted && randomPicks.length > 0) cards.push({ type: "random_pick", data: randomPicks[0] });
  if (badgeIdx === 0 && sortedBadges.length > 0) cards.push({ type: "badge", data: sortedBadges[0] });
  if (trendingIdx === 0 && filteredTrending.length > 0) cards.push({ type: "trending", data: filteredTrending[0] });

  return cards;
}

// ════════════════════════════════════════════════
// MEDIA ENRICHMENT (posters + logos)
// ════════════════════════════════════════════════

function enrichMedia(feedBucketsRef, thisGen, fetchGenRef, mountedRef, setRenderTick) {
  const allCards = feedBucketsRef.current.all;

  // Collect ALL data objects across all buckets (shared refs)
  const allDataObjects = new Set();
  for (const bucket of Object.values(feedBucketsRef.current)) {
    for (const card of bucket) {
      if (card.data) allDataObjects.add(card.data);
    }
  }

  // ── Poster enrichment ──
  const posterItems = [];
  const seenTmdb = new Set();
  for (const card of allCards) {
    const d = card.data;
    if (!d?.tmdb_id || seenTmdb.has(d.tmdb_id)) continue;
    if (!d.poster_path && !d.poster_url) {
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
    fetchCoversForItems(posterItems, () => {
      if (!mountedRef.current || fetchGenRef.current !== genAtStart) return;
      for (const d of allDataObjects) {
        if (!d.tmdb_id) continue;
        const url = getPosterUrl(d.tmdb_id);
        if (!url) continue;
        if (!d.poster_path) d.poster_path = url;
        if (!d.poster_url) d.poster_url = url;
      }
      setRenderTick(t => t + 1);
    }).catch(() => {});
  }

  // ── Logo enrichment ──
  const logoItems = [];
  const seenLogo = new Set();
  for (const card of allCards) {
    const d = card.data;
    if (!d?.tmdb_id || seenLogo.has(d.tmdb_id)) continue;
    if (d.media_type === "book" || d.media_type === "game") continue;
    seenLogo.add(d.tmdb_id);
    logoItems.push({ tmdb_id: d.tmdb_id, media_type: d.media_type || "film" });
  }

  // Immediately patch cached logos
  let patchedCached = false;
  for (const d of allDataObjects) {
    if (!d.tmdb_id || d.logo_url) continue;
    const url = getLogoUrl(d.tmdb_id);
    if (url) { d.logo_url = url; patchedCached = true; }
  }
  if (patchedCached) setRenderTick(t => t + 1);

  if (logoItems.length > 0) {
    const genAtStart = thisGen;
    fetchLogosForItems(logoItems, () => {
      if (!mountedRef.current || fetchGenRef.current !== genAtStart) return;
      for (const d of allDataObjects) {
        if (!d.tmdb_id) continue;
        const url = getLogoUrl(d.tmdb_id);
        if (url) d.logo_url = url;
      }
      setRenderTick(t => t + 1);
    }).catch(() => {});
  }
}

// ════════════════════════════════════════════════
// HOOK
// ════════════════════════════════════════════════

const PAGE_SIZE = 15;

export function useFeed(userId, subscribedIds) {
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const feedBucketsRef = useRef({ all: [], activity: [], discover: [] });
  const fetchGenRef = useRef(0);
  const [discoverVisible, setDiscoverVisible] = useState(PAGE_SIZE);
  const [activityVisible, setActivityVisible] = useState(PAGE_SIZE);
  const [renderTick, setRenderTick] = useState(0);

  const subscribedKey = subscribedIds
    ? [...subscribedIds].sort().join(",")
    : "";

  // ── Derive items for both feeds from shared buckets ──
  // renderTick in deps ensures we re-derive after enrichMedia patches logo_url/poster_url
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { discoverItems, activityItems, hasMoreDiscover, hasMoreActivity } = useMemo(() => {
    const discoverBucket = feedBucketsRef.current.discover || [];
    const activityBucket = feedBucketsRef.current.activity || [];
    // Activity feed = logs only (no badge_complete cards)
    const activityLogsOnly = activityBucket.filter(item => item.type === "log");
    return {
      discoverItems: discoverBucket.slice(0, discoverVisible),
      activityItems: activityLogsOnly.slice(0, activityVisible),
      hasMoreDiscover: discoverVisible < discoverBucket.length,
      hasMoreActivity: activityVisible < activityLogsOnly.length,
    };
  }, [discoverVisible, activityVisible, renderTick]);

  const fetchFeed = useCallback(async (isExplicit = false) => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const thisGen = ++fetchGenRef.current;

    try {
      const [
        logsRes, badgesRes, trendingRes, badgeLookupRes, shelfRes,
        completionsRes, communityPagesRes, upNextRes, randomRes,
        episodesRes, awardsMiniseriesRes,
      ] = await fetchAllData(userId, subscribedIds);

      if (!mountedRef.current) return;

      // ── Unpack raw data ──
      const rawLogs = logsRes.data || [];
      const rawBadges = badgesRes.data || [];
      const rawTrending = trendingRes.data || [];
      const rawBadgeLookup = badgeLookupRes.data || [];
      const rawShelfLogs = shelfRes.data || [];
      const rawCompletions = completionsRes.data || [];
      const communityPages = communityPagesRes.data || [];
      const rawUpNext = upNextRes.data || [];
      const rawRandom = randomRes.data || [];
      const rawEpisodesAll = episodesRes.data || [];
      const awardsMiniseriesIds = new Set((awardsMiniseriesRes.data || []).map(m => m.id));

      // ── Build lookups ──
      const { idToSlug } = buildSlugMaps(communityPages);
      const badgeByMiniseries = buildBadgeLookup(rawBadgeLookup);

      const hasSubscriptions = subscribedIds && subscribedIds.size > 0;
      const subscribedSlugs = hasSubscriptions
        ? new Set([...subscribedIds].map(id => idToSlug.get(id)).filter(Boolean))
        : null;

      // ── Process logs ──
      const mergedGroups = groupAndMergeLogs(rawLogs, badgeByMiniseries, subscribedSlugs);
      mergeShelfLogs(mergedGroups, rawShelfLogs);

      // ── Process episodes ──
      const { droppedEpisodes, upcomingCards, episodeTmdbIds, allEpisodes } =
        buildEpisodePipeline(rawEpisodesAll, subscribedIds);

      // ── Random picks (stable) ──
      const randomPicks = resolveRandomPicks(userId, rawRandom, episodeTmdbIds);

      // ── Filter pools ──
      const sortedBadges = filterBadges(rawBadges, subscribedIds);
      const filteredCompletions = filterCompletions(rawCompletions, subscribedIds);
      const filteredUpNext = filterUpNext(rawUpNext, subscribedIds, awardsMiniseriesIds);
      const filteredTrending = filterTrending(rawTrending, subscribedSlugs);

      // ── Build chronological stream ──
      const chronoStream = buildChronoStream(mergedGroups, filteredCompletions);

      // ── Assemble three feeds ──
      const activityCards = buildActivityFeed(chronoStream);

      const discoverCards = buildDiscoverFeed({
        upcomingCards, droppedEpisodes, randomPicks,
        sortedBadges, filteredUpNext, filteredTrending,
      });

      const allCards = buildAllFeed({
        chronoStream, allEpisodes, filteredUpNext,
        randomPicks, sortedBadges, filteredTrending,
      });

      // ── Commit buckets ──
      feedBucketsRef.current = { all: allCards, activity: activityCards, discover: discoverCards };
      setVisibleCount(PAGE_SIZE);
      setRenderTick(t => t + 1);

      // ── Background media enrichment ──
      enrichMedia(feedBucketsRef, thisGen, fetchGenRef, mountedRef, setRenderTick);

    } catch (err) {
      console.error("[Feed] Error loading feed:", err);
    }

    if (mountedRef.current) setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, subscribedKey]);

  const loadMoreDiscover = useCallback(() => {
    setDiscoverVisible(prev => prev + PAGE_SIZE);
  }, []);

  const loadMoreActivity = useCallback(() => {
    setActivityVisible(prev => prev + PAGE_SIZE);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchFeed();
    return () => { mountedRef.current = false; };
  }, [fetchFeed]);

  return {
    discoverItems, activityItems,
    hasMoreDiscover, hasMoreActivity,
    loadMoreDiscover, loadMoreActivity,
    loading, refresh: () => fetchFeed(true),
  };
}
