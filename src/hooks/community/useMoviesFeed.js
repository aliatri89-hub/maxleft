import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../supabase";

/**
 * useBrowseFeed — powers the New Releases and Streaming tabs.
 *
 * Reads pre-computed data from browse_feed_cache (populated by the
 * refresh-browse-feed edge function on a pg_cron schedule).
 * logo_url is fetched server-side during cache refresh — no client-side TMDB calls needed.
 */

const PAGE_SIZE = 20;

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
        logo_url: row.logo_url || null,
        podcast_count: row.podcast_count || 0,
        community_slugs: row.community_slugs || [],
      }));

      allItemsRef.current = normalized;
      visibleRef.current = PAGE_SIZE;
      setItems(normalized.slice(0, PAGE_SIZE));
      setHasMore(normalized.length > PAGE_SIZE);
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
