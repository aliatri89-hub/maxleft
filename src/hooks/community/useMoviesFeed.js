import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../supabase";
import { fetchLogosForItems, getLogoUrl, isLogoChecked, clearSoftLogoMisses, clearAllLogoMisses } from "../../utils/communityTmdb";

/**
 * useBrowseFeed — powers the New Releases and Streaming tabs.
 *
 * Reads pre-computed data from browse_feed_cache (populated by the
 * refresh-browse-feed edge function on a pg_cron schedule).
 * Logo enrichment still happens client-side from TMDB logo cache.
 */

const PAGE_SIZE = 20;

function patchLogosIntoRef(allItemsRef) {
  allItemsRef.current = allItemsRef.current.map(item => {
    if (item.logo_url) return item;
    const url = getLogoUrl(item.tmdb_id);
    return url ? { ...item, logo_url: url } : item;
  });
}

function enrichLogos(items, mountedRef, setItems, allItemsRef) {
  let patched = false;
  for (const item of items) {
    if (item.logo_url) continue;
    const url = getLogoUrl(item.tmdb_id);
    if (url) { item.logo_url = url; patched = true; }
  }

  if (patched && mountedRef.current) {
    patchLogosIntoRef(allItemsRef);
    setItems(prev => prev.map(item => {
      if (item.logo_url) return item;
      const url = getLogoUrl(item.tmdb_id);
      return url ? { ...item, logo_url: url } : item;
    }));
  }

  const logoItems = items
    .filter(m => !m.logo_url && !isLogoChecked(m.tmdb_id))
    .map(m => ({ tmdb_id: m.tmdb_id, media_type: "film" }));

  if (logoItems.length > 0) {
    fetchLogosForItems(logoItems, () => {
      if (!mountedRef.current) return;
      patchLogosIntoRef(allItemsRef);
      setItems(prev => prev.map(item => {
        if (item.logo_url) return item;
        const url = getLogoUrl(item.tmdb_id);
        return url ? { ...item, logo_url: url } : item;
      }));
    }).catch(() => {});
  }
}

// ── Exported: fetch episodes for a single film (called on-demand by BrowseCard) ──

export async function getEpisodesForFilm(tmdbId) {
  try {
    const { data, error } = await supabase.rpc("get_episodes_for_film", { film_tmdb_id: tmdbId });
    if (error) { console.warn("[BrowseFeed] episode fetch failed:", error.message); return []; }
    return data || [];
  } catch (err) { console.warn("[BrowseFeed] episode fetch error:", err); return []; }
}

// ── Hook ──

export function useMoviesFeed(mode, active = false) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const mountedRef = useRef(true);
  const fetchedRef = useRef(false);
  const allItemsRef = useRef([]);
  const visibleRef = useRef(PAGE_SIZE);

  const fetchFromCache = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("browse_feed_cache")
        .select("*")
        .eq("mode", mode)
        .order("sort_order");

      if (!mountedRef.current) return;

      if (error) {
        console.error(`[BrowseFeed] ${mode} cache query error:`, error.message);
        allItemsRef.current = [];
        setItems([]);
        setHasMore(false);
        return;
      }

      const normalized = (data || []).map(row => ({
        tmdb_id: row.tmdb_id,
        title: row.title,
        year: row.year,
        release_date: row.release_date,
        poster_path: row.poster_path,
        backdrop_path: row.backdrop_path,
        overview: row.overview || "",
        vote_average: row.vote_average || 0,
        genre_ids: row.genre_ids || [],
        media_type: "film",
        logo_url: getLogoUrl(row.tmdb_id) || null,
        podcast_count: row.podcast_count || 0,
        community_slugs: row.community_slugs || [],
      }));

      allItemsRef.current = normalized;
      visibleRef.current = PAGE_SIZE;

      const visible = normalized.slice(0, PAGE_SIZE);
      setItems(visible);
      setHasMore(normalized.length > PAGE_SIZE);

      if (normalized.length > 0) {
        enrichLogos(normalized, mountedRef, setItems, allItemsRef);
      }
    } catch (err) {
      console.error(`[BrowseFeed] ${mode} fetch error:`, err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [mode]);

  const loadMore = useCallback(() => {
    const all = allItemsRef.current;
    const next = visibleRef.current + PAGE_SIZE;
    visibleRef.current = next;
    setItems(all.slice(0, next));
    setHasMore(next < all.length);
  }, []);

  const refresh = useCallback(() => {
    clearAllLogoMisses(); // explicit pull-to-refresh clears hard misses too
    fetchFromCache();
  }, [fetchFromCache]);

  useEffect(() => {
    mountedRef.current = true;
    if (active && !fetchedRef.current) {
      fetchFromCache();
      fetchedRef.current = true;
    }
    return () => { mountedRef.current = false; };
  }, [active, fetchFromCache]);

  return { items, loading, hasMore, loadMore, refresh };
}
