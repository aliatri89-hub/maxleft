// supabase/functions/tmdb-hydrate/index.ts
// Bulk TMDB data hydration: backfills poster_path, backdrop_path, runtime,
// genre, overview, tagline, budget, revenue for films missing any of those.
//
// Deploy:  supabase functions deploy tmdb-hydrate --no-verify-jwt
// Run:     curl -X POST https://gfjobhkofftvmluocxyw.supabase.co/functions/v1/tmdb-hydrate \
//            -H "Authorization: Bearer <ANON_KEY>" \
//            -H "Content-Type: application/json" \
//            -d '{"batch_size": 200}'
//
// Self-chains: call repeatedly until "remaining" hits 0.
// Modes:
//   "missing" (default) — only rows missing at least one field
//   "all"               — re-fetch every film with a tmdb_id

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TMDB_KEY = Deno.env.get("TMDB_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TMDB_BASE = "https://api.themoviedb.org/3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── TMDB fetch with retry on 429 ──
async function fetchTmdb(tmdbId: number): Promise<Record<string, unknown> | null> {
  const url = `${TMDB_BASE}/movie/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=credits&language=en-US`;
  try {
    let res = await fetch(url);
    if (res.status === 429) {
      await sleep(2000);
      res = await fetch(url);
    }
    if (!res.ok) {
      console.warn(`TMDB ${tmdbId} → ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error(`TMDB fetch error ${tmdbId}:`, e);
    return null;
  }
}

// ── Build the update payload — only fill NULL fields unless mode=all ──
function buildUpdate(
  existing: Record<string, unknown>,
  tmdb: Record<string, unknown>,
  overwrite: boolean
) {
  const update: Record<string, unknown> = {};
  const changes: string[] = [];

  // poster_path
  const posterPath = tmdb.poster_path as string | null;
  if (posterPath && (overwrite || !existing.poster_path)) {
    update.poster_path = posterPath;
    changes.push("poster_path");
  }

  // backdrop_path
  const backdropPath = tmdb.backdrop_path as string | null;
  if (backdropPath && (overwrite || !existing.backdrop_path)) {
    update.backdrop_path = backdropPath;
    changes.push("backdrop_path");
  }

  // runtime
  const runtime = tmdb.runtime as number | null;
  if (runtime && (overwrite || !existing.runtime)) {
    update.runtime = runtime;
    changes.push("runtime");
  }

  // genre — join genre names into comma-separated string
  const genres = tmdb.genres as { name: string }[] | undefined;
  if (genres?.length && (overwrite || !existing.genre)) {
    update.genre = genres.map((g) => g.name).join(", ");
    changes.push("genre");
  }

  // overview
  const overview = tmdb.overview as string | null;
  if (overview && (overwrite || !existing.overview)) {
    update.overview = overview;
    changes.push("overview");
  }

  // tagline
  const tagline = tmdb.tagline as string | null;
  if (tagline && (overwrite || !existing.tagline)) {
    update.tagline = tagline;
    changes.push("tagline");
  }

  // budget
  const budget = tmdb.budget as number | null;
  if (budget && budget > 0 && (overwrite || !existing.budget)) {
    update.budget = budget;
    changes.push("budget");
  }

  // revenue
  const revenue = tmdb.revenue as number | null;
  if (revenue && revenue > 0 && (overwrite || !existing.revenue)) {
    update.revenue = revenue;
    changes.push("revenue");
  }

  // year — derive from release_date if missing
  const releaseDate = tmdb.release_date as string | null;
  if (releaseDate && !existing.year) {
    const y = parseInt(releaseDate.substring(0, 4));
    if (y > 1800) {
      update.year = y;
      changes.push("year");
    }
  }

  // certification (from release_dates if available — not in append_to_response here,
  // but we can grab it from the main payload if present)

  return { update, changes };
}

// ── FILTER: rows missing at least one hydrate-able field ──
const MISSING_FILTER =
  "poster_path.is.null,backdrop_path.is.null,runtime.is.null,genre.is.null,overview.is.null,tagline.is.null";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  const batchSize = Math.min(body.batch_size ?? 200, 400);
  const mode = body.mode ?? "missing"; // "missing" | "all"
  const overwrite = mode === "all";

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Fetch batch ──
  let query = supabase
    .from("media")
    .select(
      "id, tmdb_id, title, year, poster_path, backdrop_path, runtime, genre, overview, tagline, budget, revenue"
    )
    .eq("media_type", "film")
    .not("tmdb_id", "is", null)
    .order("title", { ascending: true })
    .limit(batchSize);

  if (mode === "missing") {
    query = query.or(MISSING_FILTER);
  }

  const { data: films, error: fetchErr } = await query;

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!films || films.length === 0) {
    return new Response(
      JSON.stringify({
        done: true,
        processed: 0,
        remaining: 0,
        message: "All films hydrated!",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let processed = 0;
  let skipped = 0;
  let errors = 0;
  const sampleChanges: { title: string; changes: string[] }[] = [];

  // ── Process in mini-batches of 35 (TMDB ~40 req/10s) ──
  const MINI = 35;
  for (let i = 0; i < films.length; i += MINI) {
    const chunk = films.slice(i, i + MINI);

    const results = await Promise.all(
      chunk.map(async (film) => {
        const tmdb = await fetchTmdb(film.tmdb_id);
        if (!tmdb) return { title: film.title, ok: false, changes: [] as string[] };

        const { update, changes } = buildUpdate(film, tmdb, overwrite);

        if (Object.keys(update).length === 0) {
          return { title: film.title, ok: true, changes: [], skipped: true };
        }

        const { error: upErr } = await supabase
          .from("media")
          .update(update)
          .eq("id", film.id);

        return { title: film.title, ok: !upErr, changes };
      })
    );

    for (const r of results) {
      if (!r.ok) {
        errors++;
      } else if ((r as { skipped?: boolean }).skipped) {
        skipped++;
      } else {
        processed++;
        if (sampleChanges.length < 20) {
          sampleChanges.push({ title: r.title, changes: r.changes });
        }
      }
    }

    // Rate-limit pause between mini-batches
    if (i + MINI < films.length) {
      await sleep(11000);
    }
  }

  // ── Count remaining ──
  const { count } = await supabase
    .from("media")
    .select("id", { count: "exact", head: true })
    .eq("media_type", "film")
    .not("tmdb_id", "is", null)
    .or(MISSING_FILTER);

  return new Response(
    JSON.stringify({
      done: (count || 0) === 0,
      mode,
      processed,
      skipped,
      errors,
      batch_fetched: films.length,
      remaining: count || 0,
      sample_changes: sampleChanges,
      message: `Hydrated ${processed} films (${skipped} skipped, ${errors} errors). ${count} remaining.`,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
