import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../supabase";
import { TMDB_IMG, fetchTMDBDiscover } from "../../utils/api";
import { fetchLogosForItems, getLogoUrl, isLogoChecked } from "../../utils/communityTmdb";

/**
 * useBrowseFeed — powers the New Releases and Streaming tabs.
 *
 * Only shows films with podcast coverage. Fetches TMDB pages in a loop,
 * checks coverage via get_playable_films(), keeps covered films only,
 * enriches with logos. Stops at TARGET_ITEMS or MAX_PAGES.
 */

const TARGET_ITEMS = 50;
const MAX_PAGES = 15; // 300 films checked max (15 pages × 20)

function normalizeTmdbResults(results) {
  return (results || [])
    .filter(m => m.poster_path)
    .map(m => ({
      tmdb_id: m.id,
      title: m.title || m.original_title,
      year: (m.release_date || "").slice(0, 4),
      release_date: m.release_date || null,
      poster_path: `${TMDB_IMG}/w342${m.poster_path}`,
      backdrop_path: m.backdrop_path ? `${TMDB_IMG}/w780${m.backdrop_path}` : null,
      overview: m.overview || "",
      vote_average: m.vote_average || 0,
      genre_ids: m.genre_ids || [],
      media_type: "film",
      logo_url: null,
      podcast_count: 0,
      community_slugs: [],
    }));
}

async function checkPlayability(tmdbIds) {
  if (!tmdbIds.length) return new Map();
  try {
    const { data, error } = await supabase.rpc("get_playable_films", { tmdb_ids: tmdbIds });
    if (error) { console.warn("[BrowseFeed] playability check failed:", error.message); return new Map(); }
    const map = new Map();
    for (const row of (data || [])) map.set(row.tmdb_id, { podcast_count: row.podcast_count, community_slugs: row.community_slugs || [] });
    return map;
  } catch (err) { console.warn("[BrowseFeed] playability error:", err); return new Map(); }
}

function enrichLogos(items, mountedRef, setItems) {
  // Patch any cached logos immediately (synchronous localStorage read)
  let patched = false;
  for (const item of items) {
    if (item.logo_url) continue;
    const url = getLogoUrl(item.tmdb_id);
    if (url) { item.logo_url = url; patched = true; }
  }

  // If we patched from cache, trigger re-render so logos show instantly
  if (patched && mountedRef.current) {
    setItems(prev => prev.map(item => {
      if (item.logo_url) return item;
      const url = getLogoUrl(item.tmdb_id);
      return url ? { ...item, logo_url: url } : item;
    }));
  }

  // Only fetch logos we haven't checked yet (post-patch)
  const logoItems = items
    .filter(m => !m.logo_url && !isLogoChecked(m.tmdb_id))
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
// `active` = true when this tab is visible. Defers initial fetch until first activation.
// This prevents both browse feeds from firing 15+ TMDB pages on app launch.

const PAGES_PER_BATCH = 3; // Fetch 3 TMDB pages, then batch-check playability (60 films at once)

export function useBrowseFeed(mode, active = false) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const mountedRef = useRef(true);
  const fetchedRef = useRef(false);
  const nextPageRef = useRef(1);       // next TMDB page to fetch
  const seenTmdbRef = useRef(new Set()); // dedup across pages
  const genRef = useRef(0);            // generation counter — stale fetches bail out

  // Fetch TMDB pages in batches, then check playability once per batch (fewer RPCs)
  const fetchCovered = useCallback(async (startPage, existingItems = []) => {
    const gen = ++genRef.current;      // claim this generation
    setLoading(true);
    let accumulated = [...existingItems];
    let page = startPage;
    let tmdbExhausted = false;

    try {
      while (accumulated.length < TARGET_ITEMS && page <= MAX_PAGES) {
        if (gen !== genRef.current) return; // stale — newer fetch is running
        // ── Phase 1: Fetch PAGES_PER_BATCH pages of TMDB results ──
        const discoverOpts = mode === "releases"
          ? {
              releaseDateGte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
              releaseDateLte: new Date().toISOString().slice(0, 10),
            }
          : {
              providers: "8|9|337|384|15|350|531|386",
            };

        const batchNormalized = [];
        const pagesEnd = Math.min(page + PAGES_PER_BATCH, MAX_PAGES + 1);

        for (let p = page; p < pagesEnd; p++) {
          const data = await fetchTMDBDiscover(p, discoverOpts);
          if (!mountedRef.current || gen !== genRef.current) return;
          if (!data || data.error || !data.results?.length) {
            tmdbExhausted = true;
            break;
          }

          const normalized = normalizeTmdbResults(data.results)
            .filter(m => !seenTmdbRef.current.has(m.tmdb_id));
          for (const m of normalized) seenTmdbRef.current.add(m.tmdb_id);
          batchNormalized.push(...normalized);

          if (data.page >= data.total_pages) { tmdbExhausted = true; break; }
          page = p + 1;
        }

        if (batchNormalized.length === 0) {
          if (tmdbExhausted) break;
          continue;
        }

        // ── Phase 2: Single playability check for entire batch (60 IDs vs 20) ──
        const tmdbIds = batchNormalized.map(m => m.tmdb_id);
        const playMap = await checkPlayability(tmdbIds);
        if (!mountedRef.current || gen !== genRef.current) return;

        const covered = batchNormalized
          .filter(m => playMap.has(m.tmdb_id))
          .map(m => {
            const info = playMap.get(m.tmdb_id);
            // Patch cached logos synchronously before first render
            const logo_url = getLogoUrl(m.tmdb_id) || null;
            return { ...m, podcast_count: info.podcast_count, community_slugs: info.community_slugs, logo_url };
          });

        if (covered.length > 0) {
          accumulated = [...accumulated, ...covered].slice(0, TARGET_ITEMS);
          // Streaming renders progressively (popularity order is final).
          // Releases defers until the post-loop date sort.
          if (mode !== "releases") {
            setItems([...accumulated]);
          }
        }

        if (tmdbExhausted) break;

        // Small delay between batches (not between individual pages)
        if (accumulated.length < TARGET_ITEMS) {
          await new Promise(r => setTimeout(r, 100));
        }
      }

      if (gen !== genRef.current) return; // stale — bail before updating state

      nextPageRef.current = page;
      setHasMore(!tmdbExhausted && accumulated.length < TARGET_ITEMS && page <= MAX_PAGES);

      // ── Final sort: releases = newest first, streaming = popularity (as-is) ──
      // TMDB fetches by popularity (finds covered films fast). For releases we
      // re-sort by release_date so newest films top the list. Streaming keeps
      // popularity order since users expect "what's hot" rather than chronological.
      if (accumulated.length > 0) {
        if (mode === "releases") {
          accumulated.sort((a, b) =>
            (b.release_date || "").localeCompare(a.release_date || "")
            || (a.title || "").localeCompare(b.title || "")
          );
        }
        setItems([...accumulated]);
      }

      // ── Phase 3: Enrich logos ONCE after all items are accumulated ──
      // Running this inside the loop caused a race: enrichLogos would patch
      // logos into React state, then the next loop iteration's setItems([...accumulated])
      // would overwrite them with the stale local array — causing logo ↔ text flash.
      if (accumulated.length > 0 && gen === genRef.current) {
        enrichLogos(accumulated, mountedRef, setItems);
      }
    } catch (err) {
      console.error(`[BrowseFeed] ${mode} fetch error:`, err);
    }

    if (mountedRef.current && gen === genRef.current) setLoading(false);
  }, [mode]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore || items.length >= TARGET_ITEMS) return;
    fetchCovered(nextPageRef.current, items);
  }, [loading, hasMore, items, fetchCovered]);

  const refresh = useCallback(() => {
    seenTmdbRef.current = new Set();
    nextPageRef.current = 1;
    setItems([]);
    fetchCovered(1, []);
  }, [fetchCovered]);

  // ── Lazy activation: only fetch when tab becomes active for the first time ──
  useEffect(() => {
    mountedRef.current = true;
    if (active && !fetchedRef.current) {
      fetchCovered(1, []);
      fetchedRef.current = true;
    }
    return () => { mountedRef.current = false; };
  }, [active, fetchCovered]);

  return { items, loading, hasMore, loadMore, refresh };
}
