import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "../../supabase";
import { fetchCoversForItems, getPosterUrl, fetchLogosForItems, getLogoUrl } from "../../utils/communityTmdb";

/**
 * useFeed — Activity feed data hook.
 *
 * Architecture:
 *   1. fetchAllData()        — 4 parallel Supabase queries (down from 10)
 *   2. groupAndMergeLogs()   — dedupe logs by tmdb_id, merge community contexts
 *   3. mergeShelfLogs()      — fold in personal shelf logs not already covered
 *   4. buildActivityFeed()   — pure chronological movie logs
 *   5. enrichMedia()         — background poster + logo patching
 *
 * New Releases + Streaming tabs are powered separately (TMDB client-side).
 */

// ════════════════════════════════════════════════
// JSONB → SAFE STRINGS (prevent React object-as-child errors)
// ════════════════════════════════════════════════

function _extractDirector(credits, fallback) {
  if (!credits || typeof credits !== "object") return fallback || null;
  if (Array.isArray(credits.crew)) {
    const dir = credits.crew.find(c => c && c.job === "Director");
    if (dir?.name) return dir.name;
  }
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
// DATA FETCHING (4 queries — activity only)
// ════════════════════════════════════════════════

function fetchAllData(userId) {
  return Promise.all([
    // 1. Recent community logs
    supabase
      .from("feed_user_logs")
      .select("*")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(60),

    // 2. Badge metadata (for log enrichment — community context on cards)
    supabase
      .from("badges")
      .select("id, name, miniseries_id, accent_color, image_url, community_id")
      .eq("is_active", true),

    // 3. Personal shelf logs
    supabase
      .from("feed_shelf_logs")
      .select("*")
      .eq("user_id", userId)
      .order("watched_at", { ascending: false, nullsFirst: false })
      .limit(40),

    // 4. Community slug ↔ id mapping
    supabase
      .from("community_pages")
      .select("id, slug"),
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

  // Merge groups that share the same tmdb_id across different dates
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
  const tmdbSeen = new Set();
  for (const group of mergedGroups.values()) {
    if (group.communities.length > 0 && group.tmdb_id) tmdbSeen.add(group.tmdb_id);
  }

  for (const [key, group] of mergedGroups) {
    if (group.communities.length === 0) mergedGroups.delete(key);
  }

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
// FEED BUILDER
// ════════════════════════════════════════════════

function buildActivityFeed(mergedGroups) {
  const sorted = [...mergedGroups.values()]
    .sort((a, b) => {
      const diff = new Date(b.logged_at || 0) - new Date(a.logged_at || 0);
      if (diff !== 0) return diff;
      return new Date(b._created_at || 0) - new Date(a._created_at || 0);
    });

  // Fix series progress: older logs show lower counts
  const seriesSeenCount = {};
  for (const log of sorted) {
    for (const c of log.communities) {
      const key = `${c.community_slug}_${c.series_title}`;
      if (!seriesSeenCount[key]) seriesSeenCount[key] = 0;
      const offset = seriesSeenCount[key];
      if (offset > 0 && c.series_watched > 0) {
        c.series_watched = Math.max(0, c.series_watched - offset);
      }
      seriesSeenCount[key]++;
    }
  }

  return sorted.map(data => ({ type: "log", data }));
}

// ════════════════════════════════════════════════
// MEDIA ENRICHMENT (posters + logos)
// ════════════════════════════════════════════════

function enrichMedia(visibleCards, thisGen, fetchGenRef, mountedRef, setRenderTick) {
  const allCards = visibleCards.filter(c => c?.data);
  const allDataObjects = new Set(allCards.map(c => c.data));

  // Poster enrichment
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

  // Logo enrichment
  const logoItems = [];
  const seenLogo = new Set();
  for (const card of allCards) {
    const d = card.data;
    if (!d?.tmdb_id || seenLogo.has(d.tmdb_id)) continue;
    if (d.media_type === "book" || d.media_type === "game") continue;
    seenLogo.add(d.tmdb_id);
    logoItems.push({ tmdb_id: d.tmdb_id, media_type: d.media_type || "film" });
  }

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
  const feedBucketRef = useRef([]);
  const fetchGenRef = useRef(0);
  const [activityVisible, setActivityVisible] = useState(PAGE_SIZE);
  const [renderTick, setRenderTick] = useState(0);

  const subscribedKey = subscribedIds
    ? [...subscribedIds].sort().join(",")
    : "";

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { activityItems, hasMoreActivity } = useMemo(() => {
    const bucket = feedBucketRef.current || [];
    return {
      activityItems: bucket.slice(0, activityVisible),
      hasMoreActivity: activityVisible < bucket.length,
    };
  }, [activityVisible, renderTick]);

  const fetchFeed = useCallback(async (isExplicit = false) => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const thisGen = ++fetchGenRef.current;

    try {
      const [
        logsRes, badgeLookupRes, shelfRes, communityPagesRes,
      ] = await fetchAllData(userId);

      if (!mountedRef.current) return;

      const rawLogs = logsRes.data || [];
      const rawBadgeLookup = badgeLookupRes.data || [];
      const rawShelfLogs = shelfRes.data || [];
      const communityPages = communityPagesRes.data || [];

      const { idToSlug } = buildSlugMaps(communityPages);
      const badgeByMiniseries = buildBadgeLookup(rawBadgeLookup);

      const hasSubscriptions = subscribedIds && subscribedIds.size > 0;
      const subscribedSlugs = hasSubscriptions
        ? new Set([...subscribedIds].map(id => idToSlug.get(id)).filter(Boolean))
        : null;

      const mergedGroups = groupAndMergeLogs(rawLogs, badgeByMiniseries, subscribedSlugs);
      mergeShelfLogs(mergedGroups, rawShelfLogs);

      const activityCards = buildActivityFeed(mergedGroups);

      feedBucketRef.current = activityCards;
      setActivityVisible(PAGE_SIZE);
      setRenderTick(t => t + 1);

      // Background media enrichment
      const initialActivity = activityCards.slice(0, PAGE_SIZE * 2);
      enrichMedia(initialActivity, thisGen, fetchGenRef, mountedRef, setRenderTick);

    } catch (err) {
      console.error("[Feed] Error loading feed:", err);
    }

    if (mountedRef.current) setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, subscribedKey]);

  const loadMoreActivity = useCallback(() => {
    setActivityVisible(prev => {
      const next = prev + PAGE_SIZE;
      const bucket = feedBucketRef.current || [];
      const newSlice = bucket.slice(prev, next);
      if (newSlice.length > 0) {
        enrichMedia(newSlice, fetchGenRef.current, fetchGenRef, mountedRef, setRenderTick);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchFeed();
    return () => { mountedRef.current = false; };
  }, [fetchFeed]);

  return {
    activityItems,
    hasMoreActivity,
    loadMoreActivity,
    loading,
    refresh: () => fetchFeed(true),
  };
}
