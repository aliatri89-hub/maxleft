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

  // Fetch editorial cards from Staff Picks blurbs
  const fetchEditorialItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("community_items")
        .select(`
          id, title, year, tmdb_id, poster_path, backdrop_path,
          published_at, extra_data, sort_order,
          community_miniseries!inner ( title, community_id,
            community_pages!inner ( slug )
          )
        `)
        .not("extra_data->editorial_blurb", "is", null)
        .not("published_at", "is", null)
        .lte("published_at", new Date().toISOString())
        .eq("community_miniseries.community_pages.slug", "staff-picks")
        .order("published_at", { ascending: false });

      if (error || !data) return [];

      return data.map(item => {
        const shelfTitle = item.community_miniseries?.title || "MANTL Staff Picks";
        // Shorten shelf name for card label: "2002 in Theaters: Simply the Best" → "2002: Simply the Best"
        const shortShelf = shelfTitle.replace(/\s+in Theaters/i, "");
        const editorial_label = `${shortShelf} #${item.sort_order}`;
        return {
          card_type: "editorial",
          episode_id: `editorial-${item.id}`,
          episode_air_date: item.published_at?.slice(0, 10),
          episode_description: item.extra_data?.editorial_blurb || "",
          episode_title: null,
          editorial_label,
          audio_url: null,
          audio_status: null,
          duration_seconds: null,
          podcast_name: shelfTitle,
          podcast_slug: "staff-picks",
          podcast_artwork: null,
          tmdb_id: item.tmdb_id,
          film_title: item.title,
          film_year: item.year,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          watched: false,
          logo_url: null,
          logo_display: item.extra_data?.logo_display || "white",
          blurb_author: item.extra_data?.blurb_author || "Ali",
        };
      });
    } catch (err) {
      console.error("[PodcastFeed] editorial fetch error:", err);
      return [];
    }
  }, []);

  const fetchItems = useCallback(async (offset = 0, append = false, slug = null, sort = null) => {
    setLoading(true);
    try {
      // When a specific podcast is selected, show all-time; otherwise last 60 days
      const daysBack = slug ? 0 : 60;

      const [{ data, error }, editorialRows] = await Promise.all([
        supabase.rpc("podcast_feed_items", {
          days_back: daysBack,
          result_limit: PAGE_SIZE,
          result_offset: offset,
          p_slug: slug || null,
          check_user_id: userId || null,
          sort_asc: sort === "oldest",
        }),
        // Only mix editorial into the unfiltered first page
        (!slug && offset === 0) ? fetchEditorialItems() : Promise.resolve([]),
      ]);

      if (!mountedRef.current) return;

      if (error) {
        console.error("[PodcastFeed] RPC error:", error.message);
        if (!append) setItems([]);
        setHasMore(false);
        return;
      }

      const podcastRows = data || [];

      // Merge and sort editorial + podcast by air_date
      const merged = [...podcastRows, ...editorialRows].sort((a, b) => {
        const da = a.episode_air_date || "";
        const db = b.episode_air_date || "";
        return sort === "oldest" ? da.localeCompare(db) : db.localeCompare(da);
      });

      if (append) {
        setItems(prev => [...prev, ...merged]);
      } else {
        setItems(merged);
      }
      setHasMore(podcastRows.length === PAGE_SIZE);
      enrichLogos(merged, mountedRef, setItems);
    } catch (err) {
      console.error("[PodcastFeed] fetch error:", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId, fetchEditorialItems]);

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
