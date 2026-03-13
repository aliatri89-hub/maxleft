import { useState, useEffect, useMemo, useRef } from "react";

/**
 * useRecentlyLogged — Returns the 10 most recently logged items.
 *
 * Caches the result in localStorage so repeat visits render instantly
 * (no skeleton, no pop-in). Fresh data swaps in silently when ready.
 * Only shows loading state on true first visit (no cache).
 *
 * Cache stores minimal item fields needed for NowPlayingItemCard rendering.
 */
const CACHE_PREFIX = "mantl_recent_";

function getCacheKey(communityId, userId) {
  return `${CACHE_PREFIX}${communityId}_${userId}`;
}

// Minimal fields needed to render an ItemCard
function slimItem(item) {
  return {
    id: item.id,
    title: item.title,
    year: item.year || null,
    tmdb_id: item.tmdb_id || null,
    media_type: item.media_type || "film",
    creator: item.creator || null,
    poster_path: item.poster_path || null,
    extra_data: item.extra_data || null,
    miniseries_id: item.miniseries_id || null,
  };
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Basic validation
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) return parsed;
  } catch {}
  return null;
}

function writeCache(key, items) {
  try {
    localStorage.setItem(key, JSON.stringify(items.map(slimItem)));
  } catch {}
}

export function useRecentlyLogged(communityId, userId, allItems = [], progress = {}, mediaTypeFilter = null) {
  const cacheKey = communityId && userId ? getCacheKey(communityId, userId) + (mediaTypeFilter ? `_${mediaTypeFilter}` : "") : null;

  // Initialize from cache
  const [cachedItems, setCachedItems] = useState(() => {
    if (!cacheKey) return null;
    return readCache(cacheKey);
  });

  // Derive fresh data from progress (same logic as before)
  const freshItems = useMemo(() => {
    if (!userId || !communityId || allItems.length === 0 || Object.keys(progress).length === 0) return null;

    const pool = mediaTypeFilter
      ? allItems.filter((item) => (item.media_type || "film") === mediaTypeFilter)
      : allItems;

    const logged = pool
      .filter((item) => progress[item.id])
      .map((item) => ({
        item,
        sortDate: progress[item.id].completed_at || progress[item.id].updated_at || "",
      }))
      .filter((entry) => entry.sortDate)
      .sort((a, b) => b.sortDate.localeCompare(a.sortDate))
      .reduce((acc, entry) => {
        // Dedupe by tmdb_id so the same film in multiple miniseries only appears once
        const key = entry.item.tmdb_id || entry.item.id;
        if (!acc.seen.has(key)) {
          acc.seen.add(key);
          acc.items.push(entry);
        }
        return acc;
      }, { seen: new Set(), items: [] }).items
      .slice(0, 10)
      .map((entry) => entry.item);

    return logged.length > 0 ? logged : null;
  }, [communityId, userId, allItems, progress, mediaTypeFilter]);

  // When fresh data arrives, update cache
  const prevFresh = useRef(null);
  useEffect(() => {
    if (freshItems && freshItems !== prevFresh.current && cacheKey) {
      prevFresh.current = freshItems;
      writeCache(cacheKey, freshItems);
      setCachedItems(null); // Clear cached — fresh takes over
    }
  }, [freshItems, cacheKey]);

  // Priority: fresh data > cached data > empty
  const recentItems = freshItems || cachedItems || [];

  // Only "loading" if we have nothing to show at all
  const loading = recentItems.length === 0 && userId && allItems.length > 0 && Object.keys(progress).length === 0;

  return { recentItems, loading };
}
