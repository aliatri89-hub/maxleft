// supabase/functions/seed-sleeve-data/index.ts
// One-time seeder: fetches overview, credits, and production_companies from TMDB
// for all films that have a tmdb_id but no credits yet.
//
// Deploy:  supabase functions deploy seed-sleeve-data
// Run:     curl -X POST https://gfjobhkofftvmluocxyw.supabase.co/functions/v1/seed-sleeve-data \
//            -H "Authorization: Bearer <ANON_KEY>" \
//            -H "Content-Type: application/json" \
//            -d '{"batch_size": 200}'
//
// Call repeatedly until "remaining" hits 0. Each call processes up to batch_size films.
// TMDB rate limit: ~40 req / 10s — we throttle internally.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TMDB_KEY = Deno.env.get("TMDB_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TMDB_BASE = "https://api.themoviedb.org/3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── TMDB fetch with retry ──
async function fetchTmdbDetails(tmdbId: number, mediaType: string = "movie"): Promise<unknown | null> {
  const type = mediaType === "show" ? "tv" : "movie";
  const url = `${TMDB_BASE}/${type}/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=credits&language=en-US`;
  try {
    const res = await fetch(url);
    if (res.status === 429) {
      // Rate limited — wait and retry once
      await sleep(2000);
      const retry = await fetch(url);
      if (!retry.ok) return null;
      return await retry.json();
    }
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Extract sleeve-back fields from TMDB response ──
function extractSleeveData(data: Record<string, unknown>) {
  const overview = (data.overview as string) || null;

  // Credits: director + top 6 cast
  const rawCredits = data.credits as Record<string, unknown[]> | undefined;
  const cast = (rawCredits?.cast || []).slice(0, 6).map((c: Record<string, unknown>) => ({
    name: c.name,
    character: c.character,
    id: c.id,
    profile_path: c.profile_path,
  }));
  const directors = (rawCredits?.crew || [])
    .filter((c: Record<string, unknown>) => c.job === "Director")
    .map((c: Record<string, unknown>) => ({
      name: c.name,
      id: c.id,
      profile_path: c.profile_path,
    }));
  // For TV: use "created_by" from the top-level response
  const createdBy = (data.created_by as Record<string, unknown>[]) || [];
  const showCreators = createdBy.map((c) => ({
    name: c.name,
    id: c.id,
    profile_path: c.profile_path,
  }));

  const credits = {
    director: directors.length > 0 ? directors : showCreators.length > 0 ? showCreators : [],
    cast,
  };

  // Production companies
  const companies = ((data.production_companies as Record<string, unknown>[]) || []).map((c) => ({
    id: c.id,
    name: c.name,
    logo_path: c.logo_path,
    origin_country: c.origin_country,
  }));

  return { overview, credits, production_companies: companies };
}

// ── Main handler ──
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { batch_size = 200 } = await req.json().catch(() => ({}));
  const limit = Math.min(batch_size, 400); // cap at 400 per invocation

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Find films/shows with tmdb_id but no credits yet
  const { data: rows, error: fetchErr } = await supabase
    .from("media")
    .select("id, tmdb_id, media_type")
    .not("tmdb_id", "is", null)
    .in("media_type", ["film", "show"])
    .or("credits.is.null,credits.eq.{}")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!rows || rows.length === 0) {
    return new Response(
      JSON.stringify({ done: true, processed: 0, remaining: 0, message: "All films seeded!" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let processed = 0;
  let errors = 0;

  // Process in mini-batches of 35 to stay under TMDB rate limit (40/10s)
  const MINI_BATCH = 35;
  for (let i = 0; i < rows.length; i += MINI_BATCH) {
    const chunk = rows.slice(i, i + MINI_BATCH);

    const results = await Promise.all(
      chunk.map(async (row) => {
        const data = await fetchTmdbDetails(row.tmdb_id, row.media_type);
        if (!data) return { id: row.id, ok: false };

        const sleeve = extractSleeveData(data as Record<string, unknown>);
        const { error: upErr } = await supabase
          .from("media")
          .update({
            overview: sleeve.overview,
            credits: sleeve.credits,
            production_companies: sleeve.production_companies,
          })
          .eq("id", row.id);

        return { id: row.id, ok: !upErr };
      })
    );

    processed += results.filter((r) => r.ok).length;
    errors += results.filter((r) => !r.ok).length;

    // Wait 10s before next mini-batch to respect rate limits
    if (i + MINI_BATCH < rows.length) {
      await sleep(10000);
    }
  }

  // Count remaining
  const { count } = await supabase
    .from("media")
    .select("id", { count: "exact", head: true })
    .not("tmdb_id", "is", null)
    .in("media_type", ["film", "show"])
    .or("credits.is.null,credits.eq.{}");

  return new Response(
    JSON.stringify({
      done: (count || 0) === 0,
      processed,
      errors,
      remaining: count || 0,
      message: `Seeded ${processed} films this batch. ${count || 0} remaining.`,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
