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

        // Group items by miniseries
        const itemsByMs = {};
        (items || []).forEach((item) => {
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
