import { useState, useEffect } from "react";
import { supabase } from "../../supabase";

/**
 * useCommunityPage — Fetches community page + miniseries + items.
 *
 * OPTIMIZED:
 *   - Single RPC call (get_community_page) replaces 3 sequential queries.
 *   - Module-level cache (5 min TTL) so re-entering a community is instant.
 *   - Episode enrichment deferred + only runs for slugs that need it.
 */

// ── Module-level cache ─────────────────────────────────────────────────────
const PAGE_CACHE = new Map(); // slug → { data, ts }
const CACHE_TTL  = 5 * 60 * 1000; // 5 minutes

function getCached(slug) {
  const entry = PAGE_CACHE.get(slug);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { PAGE_CACHE.delete(slug); return null; }
  return entry.data;
}

function setCache(slug, data) {
  PAGE_CACHE.set(slug, { data, ts: Date.now() });
}

// Bust cache after writes (call from log/edit actions if needed)
export function bustCommunityCache(slug) {
  PAGE_CACHE.delete(slug);
}

// Only these communities actually display episode metadata (description,
// title, duration) fetched from podcast_episodes. Everyone else skips it.
const EPISODE_ENRICHED_SLUGS = new Set(["nowplaying", "getplayed"]);

export function useCommunityPage(slug) {
  const [community,  setCommunity]  = useState(null);
  const [miniseries, setMiniseries] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    // ── Serve from cache immediately if warm ──────────────────
    const cached = getCached(slug);
    if (cached) {
      setCommunity(cached.community);
      setMiniseries(cached.miniseries);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        // ── 1. Single RPC: community + miniseries + items ──────
        const { data: rpcData, error: rpcErr } = await supabase.rpc("get_community_page", {
          p_slug: slug,
        });

        if (rpcErr) throw rpcErr;
        if (cancelled) return;
        if (rpcData?.error) throw new Error(rpcData.error);

        const page   = rpcData.community;
        const series = rpcData.miniseries || [];
        const items  = rpcData.items      || [];

        // ── 2. Group items by miniseries ───────────────────────
        const itemsByMs = {};
        items.forEach((item) => {
          if (!itemsByMs[item.miniseries_id]) itemsByMs[item.miniseries_id] = [];
          itemsByMs[item.miniseries_id].push(item);
        });
        const enriched = series.map((s) => ({ ...s, items: itemsByMs[s.id] || [] }));

        // ── 3. Render immediately — don't wait for episodes ────
        if (cancelled) return;
        setCommunity(page);
        setMiniseries(enriched);
        setError(null);
        setLoading(false);
        setCache(slug, { community: page, miniseries: enriched });

        // ── 4. Deferred: episode enrichment only where needed ──
        if (!EPISODE_ENRICHED_SLUGS.has(slug)) return;

        const episodeUrls = items
          .map((i) => i.episode_url || i.extra_data?.episode_url)
          .filter(Boolean);
        if (episodeUrls.length === 0) return;

        const BATCH = 30;
        const batches = [];
        for (let i = 0; i < episodeUrls.length; i += BATCH) batches.push(episodeUrls.slice(i, i + BATCH));

        const results = await Promise.all(
          batches.map((batch) =>
            supabase
              .from("podcast_episodes")
              .select("audio_url, description, title, air_date, duration_seconds")
              .in("audio_url", batch)
          )
        );
        if (cancelled) return;

        const epLookup = {};
        results.forEach(({ data: eps }) => {
          if (eps) eps.forEach((ep) => { epLookup[ep.audio_url] = ep; });
        });

        const enrichedWithEps = enriched.map((s) => ({
          ...s,
          items: s.items.map((item) => {
            const url = item.episode_url || item.extra_data?.episode_url;
            const ep  = url ? epLookup[url] : null;
            if (!ep) return item;
            return {
              ...item,
              extra_data: {
                ...item.extra_data,
                episode_description: item.extra_data?.episode_description || ep.description     || null,
                episode_title:       item.extra_data?.episode_title       || ep.title           || null,
                episode_air_date:    item.extra_data?.episode_air_date    || ep.air_date        || null,
                episode_duration:    item.extra_data?.episode_duration    || ep.duration_seconds || null,
              },
            };
          }),
        }));

        if (cancelled) return;
        setMiniseries(enrichedWithEps);
        setCache(slug, { community: page, miniseries: enrichedWithEps });

      } catch (e) {
        if (cancelled) return;

        // ── Fallback: original 3-query waterfall ───────────────
        console.warn("[useCommunityPage] RPC failed, using fallback:", e.message);
        try {
          const { data: pageData, error: pageErr } = await supabase
            .from("community_pages").select("*").eq("slug", slug).single();
          if (pageErr) throw pageErr;
          if (cancelled) return;

          const { data: seriesData, error: seriesErr } = await supabase
            .from("community_miniseries").select("*").eq("community_id", pageData.id).order("sort_order");
          if (seriesErr) throw seriesErr;
          if (cancelled) return;

          const { data: itemsData, error: itemsErr } = await supabase
            .from("community_items").select("*").in("miniseries_id", seriesData.map((s) => s.id)).order("sort_order");
          if (itemsErr) throw itemsErr;
          if (cancelled) return;

          const ibm = {};
          (itemsData || []).forEach((item) => {
            if (!ibm[item.miniseries_id]) ibm[item.miniseries_id] = [];
            ibm[item.miniseries_id].push(item);
          });
          const fb = seriesData.map((s) => ({ ...s, items: ibm[s.id] || [] }));
          setCommunity(pageData);
          setMiniseries(fb);
          setError(null);
          setCache(slug, { community: pageData, miniseries: fb });
        } catch (fbErr) {
          if (!cancelled) setError(fbErr.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [slug]);

  return { community, miniseries, loading, error };
}
