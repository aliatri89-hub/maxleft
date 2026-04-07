import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabase';
import PodcastCard from './PodcastCard';

const PAGE_SIZE = 30;

export default function PodcastPane({ isVisible, onSelectEpisode }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const sentinelRef = useRef(null);
  const fetchedRef  = useRef(false);

  const fetchItems = useCallback(async (offset = 0, append = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('podcast_episodes')
        .select(`
          id, title, audio_url, air_date, description, duration_seconds,
          podcasts (
            name, slug, artwork_url,
            backdrop_url, backdrop_mon, backdrop_tue, backdrop_wed, backdrop_thu, backdrop_fri
          )
        `)
        .not('audio_url', 'is', null)
        .order('air_date', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) { console.error('[PodcastPane]', error.message); return; }

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
        // Backdrop columns — null until DB migration is run
        backdrop_url:        ep.podcasts?.backdrop_url,
        backdrop_mon:        ep.podcasts?.backdrop_mon,
        backdrop_tue:        ep.podcasts?.backdrop_tue,
        backdrop_wed:        ep.podcasts?.backdrop_wed,
        backdrop_thu:        ep.podcasts?.backdrop_thu,
        backdrop_fri:        ep.podcasts?.backdrop_fri,
      }));

      if (append) setItems(prev => [...prev, ...rows]);
      else        setItems(rows);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      console.error('[PodcastPane]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    setItems(prev => { fetchItems(prev.length, true); return prev; });
  }, [fetchItems]);

  useEffect(() => {
    if (!isVisible || fetchedRef.current) return;
    fetchItems();
    fetchedRef.current = true;
  }, [isVisible, fetchItems]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || !isVisible) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore, isVisible]);

  if (loading && items.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ height: i === 0 ? 224 : 152, background: '#1a1a1a',
            opacity: 0.5 + i * 0.1, animation: `pulse 1.5s ease ${i * 0.15}s infinite` }} />
        ))}
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#888', fontSize: 14 }}>
        No episodes yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {items.map((item, i) => (
        <PodcastCard
          key={item.episode_id}
          item={item}
          isLead={i === 0}
          onSelect={onSelectEpisode}
        />
      ))}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {loading && items.length > 0 && (
        <div style={{ padding: 16, textAlign: 'center', color: '#888', fontSize: 13 }}>Loading…</div>
      )}
    </div>
  );
}
