import { useState, useEffect } from "react";
import { supabase } from "../../supabase";

/**
 * useCommunityPage — Fetches community page + miniseries + items.
 * Pure data fetch, no user state. Used by CommunityScreen.
 */
export function useCommunityPage(slug) {
  const [community, setCommunity] = useState(null);
  const [miniseries, setMiniseries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // 1. Get the community page
        const { data: page, error: pageErr } = await supabase
          .from("community_pages")
          .select("*")
          .eq("slug", slug)
          .single();

        if (pageErr) throw pageErr;
        if (cancelled) return;
        setCommunity(page);

        // 2. Get miniseries
        const { data: series, error: seriesErr } = await supabase
          .from("community_miniseries")
          .select("*")
          .eq("community_id", page.id)
          .order("sort_order");

        if (seriesErr) throw seriesErr;
        if (cancelled) return;

        // 3. Get all items for all miniseries
        const seriesIds = series.map((s) => s.id);
        const { data: items, error: itemsErr } = await supabase
          .from("community_items")
          .select("*")
          .in("miniseries_id", seriesIds)
          .order("sort_order");

        if (itemsErr) throw itemsErr;
        if (cancelled) return;

        // 4. Enrich items with podcast_episodes data (description, title, artwork)
        //    Single source of truth: podcast_episodes table holds canonical episode metadata.
        //    Community items reference via episode_url → podcast_episodes.audio_url.
        const episodeUrls = (items || [])
          .map(i => i.episode_url || i.extra_data?.episode_url)
          .filter(Boolean);

        let epLookup = {};
        if (episodeUrls.length > 0) {
          const { data: eps } = await supabase
            .from("podcast_episodes")
            .select("audio_url, description, title, air_date, duration_seconds")
            .in("audio_url", episodeUrls);

          if (eps) {
            eps.forEach(ep => { epLookup[ep.audio_url] = ep; });
          }
        }

        // Merge episode metadata into items (fill gaps, don't overwrite existing)
        const enrichedItems = (items || []).map(item => {
          const url = item.episode_url || item.extra_data?.episode_url;
          const ep = url ? epLookup[url] : null;
          if (!ep) return item;

          return {
            ...item,
            extra_data: {
              ...item.extra_data,
              episode_description: item.extra_data?.episode_description || ep.description || null,
              episode_title: item.extra_data?.episode_title || ep.title || null,
              episode_air_date: item.extra_data?.episode_air_date || ep.air_date || null,
              episode_duration: item.extra_data?.episode_duration || ep.duration_seconds || null,
            },
          };
        });

        // Group items by miniseries
        const itemsByMs = {};
        enrichedItems.forEach((item) => {
          if (!itemsByMs[item.miniseries_id]) itemsByMs[item.miniseries_id] = [];
          itemsByMs[item.miniseries_id].push(item);
        });

        const enriched = series.map((s) => ({
          ...s,
          items: itemsByMs[s.id] || [],
        }));

        setMiniseries(enriched);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [slug]);

  return { community, miniseries, loading, error };
}
