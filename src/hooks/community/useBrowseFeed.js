import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../supabase";
import { TMDB_IMG, fetchTMDBNowPlaying, fetchTMDBDiscover } from "../../utils/api";
import { fetchLogosForItems, getLogoUrl } from "../../utils/communityTmdb";

/**
 * useBrowseFeed — powers the New Releases and Streaming tabs.
 *
 * 1. Fetches from TMDB (now_playing / discover)
 * 2. Normalizes to flat card data
 * 3. Enriches with movie logos
 * 4. Bulk-checks podcast coverage via get_playable_films()
 */

const PAGE_SIZE = 20;
const MAX_ITEMS = 50;

function normalizeTmdbResults(results) {
  return (results || [])
    .filter(m => m.poster_path)
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
      logo_url: null,
      podcast_count: 0, // enriched by playability check
    }));
}

// ── Playability enrichment ──

async function checkPlayability(tmdbIds) {
  if (!tmdbIds.length) return new Map();
  try {
    const { data, error } = await supabase.rpc("get_playable_films", {
      tmdb_ids: tmdbIds,
    });
    if (error) {
      console.warn("[BrowseFeed] playability check failed:", error.message);
      return new Map();
    }
    const map = new Map();
    for (const row of (data || [])) {
      map.set(row.tmdb_id, row.podcast_count);
    }
    return map;
  } catch (err) {
    console.warn("[BrowseFeed] playability check error:", err);
    return new Map();
  }
}

// ── Exported: fetch episodes for a single film (called on-demand by BrowseCard) ──

export async function getEpisodesForFilm(tmdbId) {
  try {
    const { data, error } = await supabase.rpc("get_episodes_for_film", {
      film_tmdb_id: tmdbId,
    });
    if (error) {
      console.warn("[BrowseFeed] episode fetch failed:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn("[BrowseFeed] episode fetch error:", err);
    return [];
  }
}

// ── Hook ──

export function useBrowseFeed(mode) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
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
        console.warn(`[BrowseFeed] ${mode} failed:`, data?.error || "no data");
        setLoading(false);
        return;
      }

      const normalized = normalizeTmdbResults(data.results);

      // Patch cached logos
      for (const item of normalized) {
        const url = getLogoUrl(item.tmdb_id);
        if (url) item.logo_url = url;
      }

      setItems(prev => {
        const merged = append ? [...prev, ...normalized] : normalized;
        return merged.slice(0, MAX_ITEMS);
      });
      const estimatedTotal = append ? (pageNum * PAGE_SIZE) : normalized.length;
      setHasMore(data.page < data.total_pages && estimatedTotal < MAX_ITEMS);
      setPage(data.page);

      // Background: enrich logos
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

      // Background: check podcast coverage
      const tmdbIds = normalized.map(m => m.tmdb_id);
      checkPlayability(tmdbIds).then(playMap => {
        if (!mountedRef.current || playMap.size === 0) return;
        setItems(prev => prev.map(item => {
          const count = playMap.get(item.tmdb_id);
          return count ? { ...item, podcast_count: count } : item;
        }));
      });

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
    if (!fetchedRef.current) {
      fetchPage(1, false);
      fetchedRef.current = true;
    }
    return () => { mountedRef.current = false; };
  }, [fetchPage]);

  return { items, loading, hasMore, loadMore, refresh };
}
