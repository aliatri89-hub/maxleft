import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../supabase";

/**
 * usePodcastFeed — powers the Podcast tab.
 *
 * Returns one card per episode-film pair, sorted by air_date DESC.
 * All data is local Supabase joins — no external API calls, loads fast.
 * Backdrop deep-cuts are resolved client-side via TMDB images endpoint.
 */

const PAGE_SIZE = 20;

export function usePodcastFeed(active = false, userId = null) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const mountedRef = useRef(true);
  const fetchedRef = useRef(false);

  const fetchItems = useCallback(async (offset = 0, append = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("podcast_feed_items", {
        days_back: 60,
        result_limit: PAGE_SIZE,
        result_offset: offset,
        podcast_slug: null,
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
      fetchItems(prev.length, true);
      return prev;
    });
  }, [fetchItems]);

  const refresh = useCallback(() => {
    fetchItems(0, false);
  }, [fetchItems]);

  useEffect(() => {
    mountedRef.current = true;
    if (active && !fetchedRef.current) {
      fetchItems(0, false);
      fetchedRef.current = true;
    }
    return () => { mountedRef.current = false; };
  }, [active, fetchItems]);

  return { items, loading, hasMore, loadMore, refresh };
}
