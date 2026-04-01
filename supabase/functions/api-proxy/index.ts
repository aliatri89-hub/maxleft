// supabase/functions/api-proxy/index.ts
// Proxies TMDB API calls so keys stay server-side.
//
// Deploy:  supabase functions deploy api-proxy
// Secrets: supabase secrets set TMDB_KEY=<your_tmdb_key>

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TMDB_KEY = Deno.env.get("TMDB_KEY")!;

const TMDB_BASE = "https://api.themoviedb.org/3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Simple in-memory cache (lives for the lifetime of the edge function instance) ───
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  if (entry) cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  if (cache.size > 300) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  cache.set(key, { data, ts: Date.now() });
}

// ─── Route handlers ──────────────────────────────────────────

async function handleTmdbSearch(params: Record<string, string>) {
  const { query, type = "movie", year } = params;
  if (!query) return { error: "query required" };

  const cacheKey = `tmdb:search:${type}:${query}:${year || ""}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const yearParam = year ? `&year=${year}` : "";
  const res = await fetch(
    `${TMDB_BASE}/search/${type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&page=1${yearParam}&include_adult=false`
  );
  const data = await res.json();
  setCache(cacheKey, data);
  return data;
}

async function handleTmdbDetails(params: Record<string, string>) {
  const { tmdb_id, type = "movie", append } = params;
  if (!tmdb_id) return { error: "tmdb_id required" };

  const appendParam = append ?? "credits";
  const cacheKey = `tmdb:detail:${type}:${tmdb_id}:${appendParam}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const appendQuery = appendParam ? `&append_to_response=${appendParam}` : "";
  const res = await fetch(
    `${TMDB_BASE}/${type}/${tmdb_id}?api_key=${TMDB_KEY}${appendQuery}&language=en-US`
  );
  const data = await res.json();
  setCache(cacheKey, data);
  return data;
}

async function handleTmdbWatchProviders(params: Record<string, string>) {
  const { tmdb_id, type = "movie" } = params;
  if (!tmdb_id) return { error: "tmdb_id required" };

  const cacheKey = `tmdb:wp:${type}:${tmdb_id}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const res = await fetch(
    `${TMDB_BASE}/${type}/${tmdb_id}/watch/providers?api_key=${TMDB_KEY}`
  );
  const data = await res.json();
  setCache(cacheKey, data);
  return data;
}

async function handleTmdbImages(params: Record<string, string>) {
  const { tmdb_id, type = "movie" } = params;
  if (!tmdb_id) return { error: "tmdb_id required" };

  const cacheKey = `tmdb:images:${type}:${tmdb_id}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // include_image_language=en,null — gets both English and clean no-language
  // backdrops (real scene stills), excluding promo art in other languages
  const res = await fetch(
    `${TMDB_BASE}/${type}/${tmdb_id}/images?api_key=${TMDB_KEY}&include_image_language=en,null`
  );
  const data = await res.json();
  setCache(cacheKey, data);
  return data;
}

async function handleTmdbNowPlaying(params: Record<string, string>) {
  const { page = "1", region = "US" } = params;
  const cacheKey = `tmdb:now_playing:${region}:${page}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const res = await fetch(
    `${TMDB_BASE}/movie/now_playing?api_key=${TMDB_KEY}&language=en-US&region=${region}&page=${page}`
  );
  const data = await res.json();
  setCache(cacheKey, data);
  return data;
}

async function handleTmdbDiscover(params: Record<string, string>) {
  const {
    page = "1",
    watch_region = "US",
    with_watch_providers,
    sort_by = "popularity.desc",
    with_watch_monetization_types = "flatrate",
    release_date_gte,
    release_date_lte,
    with_genres,
    vote_count_gte,
  } = params;

  const cacheKey = `tmdb:discover:${watch_region}:${with_watch_providers || "none"}:${sort_by}:${release_date_gte || ""}:${release_date_lte || ""}:${with_genres || ""}:${vote_count_gte || ""}:${page}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let url = `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&language=en-US&sort_by=${sort_by}&page=${page}`;

  // Provider filters (streaming tab)
  if (with_watch_providers) {
    url += `&watch_region=${watch_region}&with_watch_providers=${with_watch_providers}`;
    url += `&with_watch_monetization_types=${with_watch_monetization_types}`;
  }

  // Date range filters (new releases tab)
  if (release_date_gte) url += `&primary_release_date.gte=${release_date_gte}`;
  if (release_date_lte) url += `&primary_release_date.lte=${release_date_lte}`;

  // Genre filter (Movie Night)
  if (with_genres) url += `&with_genres=${with_genres}`;

  // Quality floor (Movie Night — skip obscure films)
  if (vote_count_gte) url += `&vote_count.gte=${vote_count_gte}`;

  const res = await fetch(url);
  const data = await res.json();
  setCache(cacheKey, data);
  return data;
}

// ─── Main handler ────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    let result: unknown;

    switch (action) {
      case "ping":
        result = { ok: true };
        break;
      case "tmdb_search":
        result = await handleTmdbSearch(params);
        break;
      case "tmdb_details":
        result = await handleTmdbDetails(params);
        break;
      case "tmdb_watch_providers":
        result = await handleTmdbWatchProviders(params);
        break;
      case "tmdb_images":
        result = await handleTmdbImages(params);
        break;
      case "tmdb_now_playing":
        result = await handleTmdbNowPlaying(params);
        break;
      case "tmdb_discover":
        result = await handleTmdbDiscover(params);
        break;
      default:
        result = { error: `Unknown action: ${action}` };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
