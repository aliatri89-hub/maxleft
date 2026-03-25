import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../supabase";

/**
 * usePodcastFeed — powers the Podcast tab.
 *
 * Returns one card per episode-film pair, sorted by air_date DESC.
 * All data is local Supabase joins — no external API calls, loads fast.
 * Backdrop deep-cuts are resolved client-side via TMDB images endpoint.
 */

const PAGE_SIZE = 50;

export function usePodcastFeed(active = false, userId = null, podcastSlug = null) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const mountedRef = useRef(true);
  const fetchedRef = useRef(false);
  const lastSlugRef = useRef(null);

  const fetchItems = useCallback(async (offset = 0, append = false, slug = null) => {
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
    } catch (err) {
      console.error("[PodcastFeed] fetch error:", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId]);

  const loadMore = useCallback(() => {
    setItems(prev => {
      fetchItems(prev.length, true, podcastSlug);
      return prev;
    });
  }, [fetchItems, podcastSlug]);

  const refresh = useCallback(() => {
    fetchItems(0, false, podcastSlug);
  }, [fetchItems, podcastSlug]);

  // Initial fetch when tab becomes active
  useEffect(() => {
    mountedRef.current = true;
    if (active && !fetchedRef.current) {
      fetchItems(0, false, podcastSlug);
      fetchedRef.current = true;
      lastSlugRef.current = podcastSlug;
    }
    return () => { mountedRef.current = false; };
  }, [active, fetchItems, podcastSlug]);

  // Re-fetch when podcast filter changes
  useEffect(() => {
    if (!active || !fetchedRef.current) return;
    if (podcastSlug === lastSlugRef.current) return;
    lastSlugRef.current = podcastSlug;
    setItems([]);
    fetchItems(0, false, podcastSlug);
  }, [podcastSlug, active, fetchItems]);

  return { items, loading, hasMore, loadMore, refresh };
}
