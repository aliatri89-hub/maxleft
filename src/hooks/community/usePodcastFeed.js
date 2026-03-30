import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../supabase";
import { fetchLogosForItems, getLogoUrl, isLogoChecked } from "../../utils/communityTmdb";

function enrichLogos(items, mountedRef, setItems) {
  let patched = false;
  for (const item of items) {
    if (item.logo_url) continue;
    const url = getLogoUrl(item.tmdb_id);
    if (url) { item.logo_url = url; patched = true; }
  }

  if (patched && mountedRef.current) {
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
      setItems(prev => prev.map(item => {
        if (item.logo_url) return item;
        const url = getLogoUrl(item.tmdb_id);
        return url ? { ...item, logo_url: url } : item;
      }));
    }).catch(() => {});
  }
}

/**
 * usePodcastFeed — powers the Podcast tab.
 *
 * Returns one card per episode-film pair, sorted by air_date.
 * Supports server-side filtering by podcast slug, sort direction,
 * and all-time vs recent windowing.
 */

const PAGE_SIZE = 50;

export function usePodcastFeed(active = false, userId = null, podcastSlug = null, sortOrder = null) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const mountedRef = useRef(true);
  const fetchedRef = useRef(false);
  const lastSlugRef = useRef(null);
  const lastSortRef = useRef(null);
  const lastUserIdRef = useRef(userId);

  // Reset fetch gate when userId changes (e.g. null → authenticated after OAuth)
  // so the initial fetch retries with valid credentials
  useEffect(() => {
    if (userId !== lastUserIdRef.current) {
      lastUserIdRef.current = userId;
      if (userId && fetchedRef.current && items.length === 0) {
        // Auth settled but initial fetch returned nothing — retry
        fetchedRef.current = false;
      }
    }
  }, [userId, items.length]);

  const fetchItems = useCallback(async (offset = 0, append = false, slug = null, sort = null) => {
    setLoading(true);
    try {
      // When a specific podcast is selected, show all-time; otherwise last 60 days
      const daysBack = slug ? 0 : 60;

      const { data, error } = await supabase.rpc("podcast_feed_items", {
        days_back: daysBack,
        result_limit: PAGE_SIZE,
        result_offset: offset,
        podcast_slug: slug || null,
        check_user_id: userId || null,
        sort_asc: sort === "oldest",
      });

      if (!mountedRef.current) return;

      if (error) {
        console.error("[PodcastFeed] RPC error:", error.message);
        if (!append) setItems([]);
        setHasMore(false);
        return;
      }

      const rows = data || [];
      if (append) {
        setItems(prev => [...prev, ...rows]);
      } else {
        setItems(rows);
      }
      setHasMore(rows.length === PAGE_SIZE);
      enrichLogos(rows, mountedRef, setItems);
    } catch (err) {
      console.error("[PodcastFeed] fetch error:", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId]);

  const loadMore = useCallback(() => {
    setItems(prev => {
      fetchItems(prev.length, true, podcastSlug, sortOrder);
      return prev;
    });
  }, [fetchItems, podcastSlug, sortOrder]);

  const refresh = useCallback(() => {
    fetchItems(0, false, podcastSlug, sortOrder);
  }, [fetchItems, podcastSlug, sortOrder]);

  // Initial fetch when tab becomes active
  useEffect(() => {
    mountedRef.current = true;
    let staleTimer;
    if (active && !fetchedRef.current) {
      fetchItems(0, false, podcastSlug, sortOrder);
      fetchedRef.current = true;
      lastSlugRef.current = podcastSlug;
      lastSortRef.current = sortOrder;
      // Safety: if still loading with no items after 8s (e.g. Supabase client
      // hung during OAuth token exchange on fresh install), reset and retry
      staleTimer = setTimeout(() => {
        if (!mountedRef.current) return;
        // Check loading state by looking at items — if still empty, force retry
        setItems(prev => {
          if (prev.length === 0) {
            fetchedRef.current = false;
            fetchItems(0, false, podcastSlug, sortOrder).then(() => { fetchedRef.current = true; });
          }
          return prev;
        });
      }, 8000);
    }
    return () => { mountedRef.current = false; clearTimeout(staleTimer); };
  }, [active, fetchItems, podcastSlug, sortOrder]);

  // Re-fetch when podcast filter or sort order changes
  useEffect(() => {
    if (!active || !fetchedRef.current) return;
    if (podcastSlug === lastSlugRef.current && sortOrder === lastSortRef.current) return;
    lastSlugRef.current = podcastSlug;
    lastSortRef.current = sortOrder;
    setItems([]);
    fetchItems(0, false, podcastSlug, sortOrder);
  }, [podcastSlug, sortOrder, active, fetchItems]);

  return { items, loading, hasMore, loadMore, refresh };
}
