// supabase/functions/api-proxy/index.ts
// Proxies TMDB, RAWG, and Google Books API calls so keys stay server-side.
//
// Deploy:  supabase functions deploy api-proxy
// Secrets: supabase secrets set TMDB_KEY=ec6edb453a82a8a1081d13e597ea95ce \
//            RAWG_KEY=744f042dd2e547eba93ea70774d66a00 \
//            GOOGLE_BOOKS_KEY=AIzaSyDiuyC-AbpmuysA1Zy95NpbfbAbHvvJnuM

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TMDB_KEY = Deno.env.get("TMDB_KEY")!;
const RAWG_KEY = Deno.env.get("RAWG_KEY")!;
const GOOGLE_BOOKS_KEY = Deno.env.get("GOOGLE_BOOKS_KEY")!;

const TMDB_BASE = "https://api.themoviedb.org/3";
const RAWG_BASE = "https://api.rawg.io/api";
const GBOOKS_BASE = "https://www.googleapis.com/books/v1";

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

async function handleRawgSearch(params: Record<string, string>) {
  const { query, page_size = "8" } = params;
  if (!query) return { error: "query required" };

  const cacheKey = `rawg:search:${query}:${page_size}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const res = await fetch(
    `${RAWG_BASE}/games?key=${RAWG_KEY}&search=${encodeURIComponent(query)}&page_size=${page_size}`
  );
  const data = await res.json();
  setCache(cacheKey, data);
  return data;
}

async function handleGoogleBooks(params: Record<string, string>) {
  const { query, max_results = "8" } = params;
  if (!query) return { error: "query required" };

  const cacheKey = `gbooks:${query}:${max_results}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const res = await fetch(
    `${GBOOKS_BASE}/volumes?q=${encodeURIComponent(query)}&maxResults=${max_results}&langRestrict=en&key=${GOOGLE_BOOKS_KEY}`
  );

  if (res.status === 429) {
    return { error: "rate_limited", status: 429 };
  }
  if (!res.ok) {
    return { error: `Google Books API ${res.status}`, status: res.status };
  }

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
      case "tmdb_search":
        result = await handleTmdbSearch(params);
        break;
      case "tmdb_details":
        result = await handleTmdbDetails(params);
        break;
      case "tmdb_watch_providers":
        result = await handleTmdbWatchProviders(params);
        break;
      case "rawg_search":
        result = await handleRawgSearch(params);
        break;
      case "google_books":
        result = await handleGoogleBooks(params);
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
