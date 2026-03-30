import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "../../supabase";
import { fetchCoversForItems, getPosterUrl, fetchLogosForItems, getLogoUrl } from "../../utils/communityTmdb";

/**
 * useFeed — Activity feed data hook.
 *
 * Architecture:
 *   1. fetchAllData()           — 3 parallel Supabase queries
 *   2. groupAndMergeLogs()      — dedupe logs by tmdb_id
 *   3. mergeShelfLogs()         — fold in personal shelf logs
 *   4. enrichPodcastCoverage()  — batch RSS coverage → podcast pills
 *   5. buildActivityFeed()      — pure chronological sort
 *   6. enrichMedia()            — background poster + logo patching
 *
 * Podcast coverage uses the same data pipe as New Releases / Streaming:
 *   podcast_episode_films → podcast_episodes → podcasts
 * No community tracking data flows into the activity feed.
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
// DATA FETCHING (3 queries)
// ════════════════════════════════════════════════

function fetchAllData(userId) {
  return Promise.all([
    // 1. Community logs (film metadata only — community columns ignored)
    supabase
      .from("feed_user_logs")
      .select("*")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(60),

    // 2. Personal shelf logs
    supabase
      .from("feed_shelf_logs")
      .select("*")
      .eq("user_id", userId)
      .order("watched_at", { ascending: false, nullsFirst: false })
      .limit(40),

    // 3. Podcasts (for artwork/name/slug maps)
    supabase
      .from("podcasts")
      .select("id, slug, artwork_url, name")
      .eq("active", true),
  ]);
}

// ════════════════════════════════════════════════
// LOG GROUPING & MERGING (no community logic)
// ════════════════════════════════════════════════

function groupAndMergeLogs(rawLogs) {
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
    if (log.rating && (!group.rating || log.rating > group.rating)) group.rating = log.rating;
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
      if (!existing.backdrop_path && group.backdrop_path) existing.backdrop_path = group.backdrop_path;
    }
  }

  return mergedGroups;
}

function mergeShelfLogs(mergedGroups, rawShelfLogs) {
  // Enrich existing groups with letterboxd_url from shelf logs
  for (const shelf of rawShelfLogs) {
    if (!shelf.tmdb_id) continue;
    const lbUrl = shelf.extra_data?.letterboxd_url || null;
    if (!lbUrl) continue;
    for (const group of mergedGroups.values()) {
      if (group.tmdb_id === shelf.tmdb_id && !group.letterboxd_url) {
        group.letterboxd_url = lbUrl;
      }
    }
  }

  // Add shelf-only logs (not already in feed from community logs)
  const tmdbSeen = new Set();
  for (const group of mergedGroups.values()) {
    if (group.tmdb_id) tmdbSeen.add(group.tmdb_id);
  }

  for (const shelf of rawShelfLogs) {
    if (shelf.tmdb_id && tmdbSeen.has(shelf.tmdb_id)) continue;
    if (shelf.tmdb_id) tmdbSeen.add(shelf.tmdb_id);
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
        letterboxd_url: shelf.extra_data?.letterboxd_url || null,
        communities: [],
        isShelfLog: true,
      });
    }
  }

  return mergedGroups;
}

// ════════════════════════════════════════════════
// PODCAST COVERAGE (same pipe as browse feeds)
// ════════════════════════════════════════════════

async function enrichPodcastCoverage(mergedGroups, podcasts, favoritePodcastIds) {
  // Collect tmdb_ids from all cards
  const tmdbIds = [];
  for (const group of mergedGroups.values()) {
    if (group.tmdb_id) tmdbIds.push(group.tmdb_id);
  }
  if (tmdbIds.length === 0) return;

  // Batch query: which podcasts covered which films?
  const { data: coverage, error } = await supabase.rpc("get_podcast_coverage_for_feed", {
    p_tmdb_ids: tmdbIds,
  });

  if (error || !coverage) {
    console.warn("[Feed] podcast coverage query failed:", error?.message);
    return;
  }

  // Build podcast lookup: id → { slug, artwork_url, name }
  const podcastMap = new Map();
  for (const p of podcasts) {
    podcastMap.set(p.id, { slug: p.slug, artwork_url: p.artwork_url, name: p.name });
  }

  // Group coverage by tmdb_id
  const coverageByFilm = new Map();
  for (const row of coverage) {
    if (!coverageByFilm.has(row.tmdb_id)) coverageByFilm.set(row.tmdb_id, new Set());
    coverageByFilm.get(row.tmdb_id).add(row.podcast_id);
  }

  const hasFavorites = favoritePodcastIds && favoritePodcastIds.size > 0;

  // Inject podcast pills into each card
  for (const group of mergedGroups.values()) {
    if (!group.tmdb_id) continue;
    const podcastIds = coverageByFilm.get(group.tmdb_id);
    if (!podcastIds) continue;

    // Headphone icon: any podcast covered this film
    group.has_podcast_coverage = true;

    // Pills: only from user's favorite podcasts
    if (!hasFavorites) continue;
    for (const pid of podcastIds) {
      if (!favoritePodcastIds.has(pid)) continue;
      const pod = podcastMap.get(pid);
      if (!pod || !pod.artwork_url) continue;

      // Avoid dupes (shouldn't happen, but safe)
      const already = group.communities.some(c => c.community_slug === pod.slug);
      if (!already) {
        group.communities.push({
          community_name: pod.name,
          community_slug: pod.slug,
          community_image: pod.artwork_url,
        });
      }
    }
  }
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

export function useActivityFeed(userId, favoritePodcastIds, active = false) {
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const fetchedRef = useRef(false);
  const feedBucketRef = useRef([]);
  const fetchGenRef = useRef(0);
  const [activityVisible, setActivityVisible] = useState(PAGE_SIZE);
  const [renderTick, setRenderTick] = useState(0);

  const subscribedKey = favoritePodcastIds
    ? [...favoritePodcastIds].sort().join(",")
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
      const [logsRes, shelfRes, podcastsRes] = await fetchAllData(userId);

      if (!mountedRef.current) return;

      const rawLogs = logsRes.data || [];
      const rawShelfLogs = shelfRes.data || [];
      const podcasts = podcastsRes.data || [];

      const mergedGroups = groupAndMergeLogs(rawLogs);
      mergeShelfLogs(mergedGroups, rawShelfLogs);

      // Podcast coverage — same pipe as browse feeds
      await enrichPodcastCoverage(mergedGroups, podcasts, favoritePodcastIds);

      if (!mountedRef.current) return;

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
    if (active && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchFeed();
    }
    return () => { mountedRef.current = false; };
  }, [active, fetchFeed]);

  return {
    activityItems,
    hasMoreActivity,
    loadMoreActivity,
    loading,
    refresh: () => fetchFeed(true),
  };
}
