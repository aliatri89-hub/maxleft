import { useState, useEffect, useCallback, useRef } from "react";
import { TMDB_IMG, fetchTMDBNowPlaying, fetchTMDBDiscover } from "../../utils/api";
import { fetchLogosForItems, getLogoUrl } from "../../utils/communityTmdb";

/**
 * useBrowseFeed — powers the New Releases and Streaming tabs.
 *
 * Fetches from TMDB (now_playing / discover), normalizes to a flat
 * card data shape, enriches with movie logos in the background.
 */

const PAGE_SIZE = 20; // TMDB returns 20 per page
const MAX_ITEMS = 50; // Cap to prevent mobile memory issues with VHS cards

function normalizeTmdbResults(results) {
  return (results || [])
    .filter(m => m.poster_path) // skip films with no poster
    .map(m => ({
      tmdb_id: m.id,
      title: m.title || m.original_title,
      year: (m.release_date || "").slice(0, 4),
      poster_path: `${TMDB_IMG}/w342${m.poster_path}`,
      backdrop_path: m.backdrop_path ? `${TMDB_IMG}/w780${m.backdrop_path}` : null,
      overview: m.overview || "",
      vote_average: m.vote_average || 0,
      genre_ids: m.genre_ids || [],
      media_type: "film",
      logo_url: null, // enriched async
    }));
}

export function useBrowseFeed(mode) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const mountedRef = useRef(true);
  const fetchedRef = useRef(false);

  const fetchPage = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const data = mode === "releases"
        ? await fetchTMDBNowPlaying(pageNum)
        : await fetchTMDBDiscover(pageNum);

      if (!mountedRef.current) return;
      if (!data || data.error) {
        setLoading(false);
        return;
      }

      const normalized = normalizeTmdbResults(data.results);

      // Patch any cached logos immediately
      for (const item of normalized) {
        const url = getLogoUrl(item.tmdb_id);
        if (url) item.logo_url = url;
      }

      setItems(prev => {
        const merged = append ? [...prev, ...normalized] : normalized;
        return merged.slice(0, MAX_ITEMS);
      });
      // Estimate merged count for hasMore (page * PAGE_SIZE approximates total loaded)
      const estimatedTotal = append ? (pageNum * PAGE_SIZE) : normalized.length;
      setHasMore(data.page < data.total_pages && estimatedTotal < MAX_ITEMS);
      setPage(data.page);

      // Enrich logos in background
      const logoItems = normalized
        .filter(m => !m.logo_url)
        .map(m => ({ tmdb_id: m.tmdb_id, media_type: "film" }));

      if (logoItems.length > 0) {
        fetchLogosForItems(logoItems, () => {
          if (!mountedRef.current) return;
          setItems(prev => prev.map(item => {
            if (item.logo_url) return item;
            const url = getLogoUrl(item.tmdb_id);
            return url ? { ...item, logo_url: url } : item;
          }));
        }).catch(() => {});
      }
    } catch (err) {
      console.error(`[BrowseFeed] ${mode} fetch error:`, err);
    }
    if (mountedRef.current) setLoading(false);
  }, [mode]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore || items.length >= MAX_ITEMS) return;
    fetchPage(page + 1, true);
  }, [loading, hasMore, page, items.length, fetchPage]);

  const refresh = useCallback(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  useEffect(() => {
    mountedRef.current = true;
    // Only fetch on first mount — avoid re-fetching on every tab switch
    if (!fetchedRef.current) {
      fetchPage(1, false);
      fetchedRef.current = true;
    }
    return () => { mountedRef.current = false; };
  }, [fetchPage]);

  return { items, loading, hasMore, loadMore, refresh };
}
