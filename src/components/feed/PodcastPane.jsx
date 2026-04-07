import { t } from "../../theme";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../../supabase";
import PodcastCard from "./PodcastCard";

const PAGE_SIZE = 30;

export default function PodcastPane({ isVisible, userId, selectedPodcast, sortOrder }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const sentinelRef = useRef(null);
  const fetchedRef  = useRef(false);

  const fetchItems = useCallback(async (offset = 0, append = false, slug = null) => {
    setLoading(true);
    try {
      let query = supabase
        .from("podcast_episodes")
        .select(`
          id,
          title,
          audio_url,
          air_date,
          description,
          duration_seconds,
          podcasts ( name, slug, artwork_url )
        `)
        .not("audio_url", "is", null)
        .order("air_date", { ascending: sortOrder === "oldest" })
        .range(offset, offset + PAGE_SIZE - 1);

      if (slug) {
        query = query.eq("podcasts.slug", slug);
      }

      const { data, error } = await query;
      if (error) { console.error("[PodcastPane]", error.message); return; }

      const rows = (data || []).map(ep => ({
        episode_id:          ep.id,
        episode_title:       ep.title,
        episode_air_date:    ep.air_date,
        episode_description: ep.description,
        audio_url:           ep.audio_url,
        duration_seconds:    ep.duration_seconds,
        podcast_name:        ep.podcasts?.name,
        podcast_slug:        ep.podcasts?.slug,
        podcast_artwork:     ep.podcasts?.artwork_url,
      }));

      if (append) setItems(prev => [...prev, ...rows]);
      else        setItems(rows);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      console.error("[PodcastPane]", err);
    } finally {
      setLoading(false);
    }
  }, [sortOrder]);

  const loadMore = useCallback(() => {
    setItems(prev => { fetchItems(prev.length, true, selectedPodcast); return prev; });
  }, [fetchItems, selectedPodcast]);

  // Initial fetch when tab becomes visible
  useEffect(() => {
    if (!isVisible || fetchedRef.current) return;
    fetchItems(0, false, selectedPodcast);
    fetchedRef.current = true;
  }, [isVisible, fetchItems, selectedPodcast]);

  // Re-fetch when filter changes
  useEffect(() => {
    if (!fetchedRef.current) return;
    setItems([]);
    fetchItems(0, false, selectedPodcast);
  }, [selectedPodcast, sortOrder]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || !isVisible) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore, isVisible]);

  return (
    <div style={{ padding: "8px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
      {loading && items.length === 0 && (
        [0,1,2,3].map(i => (
          <div key={i} style={{ height: 82, borderRadius: 14, background: t.bgCard, border: `1px solid ${t.border}`, opacity: 0.6, animation: `skeleton-pulse 1.5s ease ${i * 0.1}s infinite` }} />
        ))
      )}

      {!loading && items.length === 0 && (
        <div style={{ padding: 32, textAlign: "center", color: t.textTertiary, fontSize: 14 }}>
          No episodes yet.
        </div>
      )}

      {items.map(item => (
        <PodcastCard key={item.episode_id} item={item} />
      ))}

      <div ref={sentinelRef} style={{ height: 1 }} />

      {loading && items.length > 0 && (
        <div style={{ padding: 16, textAlign: "center", color: t.textTertiary, fontSize: 13 }}>Loading…</div>
      )}
    </div>
  );
}
