import { useState, useEffect, useMemo, useRef } from "react";
import { isComingSoon } from "../../utils/comingSoon";

/**
 * useRecentEpisodes — Maps recent podcast episodes to community items.
 *
 * Caches matched items in localStorage so repeat visits render instantly.
 * Fresh data swaps in silently when episodes + allItems are both ready.
 * Only shows loading state on true first visit (no cache).
 */
const CACHE_KEY = "mantl_recent_episodes";

// Minimal fields for card rendering
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
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].item?.id) return parsed;
  } catch {}
  return null;
}

function writeCache(key, matched) {
  try {
    // Cache item data + episode title (for display, not full episode object)
    const slim = matched.map((m) => ({
      item: slimItem(m.item),
      episodeTitle: m.episode?.title || null,
    }));
    localStorage.setItem(key, JSON.stringify(slim));
  } catch {}
}

export function useRecentEpisodes(episodes = [], allItems = [], limit = 10, communitySlug = "", episodeSource = "") {
  // Community-specific cache key prevents NPP/BC/etc from stomping each other
  const cacheKey = communitySlug ? `${CACHE_KEY}_${communitySlug}` : CACHE_KEY;

  // Initialize from cache
  const [cachedItems, setCachedItems] = useState(() => readCache(cacheKey));

  // Derive fresh matches — air_date based: "New Episodes" = items where air_date <= today, newest first
  const freshMatched = useMemo(() => {
    if (allItems.length === 0) return null;

    const aired = allItems
      .filter(item => item.air_date && !isComingSoon(item))
      .sort((a, b) => b.air_date.localeCompare(a.air_date))
      .slice(0, limit);
    return aired.length > 0 ? aired.map(item => ({ item, episode: null })) : null;
  }, [allItems, limit]);

  // When fresh data arrives, update cache
  const prevFresh = useRef(null);
  useEffect(() => {
    if (freshMatched && freshMatched !== prevFresh.current) {
      prevFresh.current = freshMatched;
      writeCache(cacheKey, freshMatched);
      setCachedItems(null);
    }
  }, [freshMatched]);

  // Resolve cached items: use full item objects from allItems if available,
  // fall back to cached slim objects
  const recentEpisodeItems = useMemo(() => {
    if (freshMatched) return freshMatched;
    if (!cachedItems) return [];

    // Try to resolve cached IDs to full allItems objects (for fresh cover URLs etc)
    if (allItems.length > 0) {
      const itemMap = new Map(allItems.map((i) => [i.id, i]));
      return cachedItems
        .map((c) => {
          const fullItem = itemMap.get(c.item.id);
          return { item: fullItem || c.item, episode: { title: c.episodeTitle } };
        })
        .filter((c) => c.item);
    }

    // allItems not loaded yet — use cached slim objects directly
    return cachedItems.map((c) => ({ item: c.item, episode: { title: c.episodeTitle } }));
  }, [freshMatched, cachedItems, allItems]);

  const loading = recentEpisodeItems.length === 0 && allItems.length === 0;

  return { recentEpisodeItems, loading };
}
