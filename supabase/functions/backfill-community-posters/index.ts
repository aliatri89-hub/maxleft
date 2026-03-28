// supabase/functions/backfill-community-posters/index.ts
// Fills poster_path on community_items rows that have a tmdb_id but no poster.
//
// Strategy (in order for each item):
//   1. Check the `media` table — if a row with the same tmdb_id already has a
//      poster_path, copy it over instantly (no TMDB API call needed).
//   2. Otherwise call TMDB /movie/:id and use the poster_path from there.
//
// Deploy:  supabase functions deploy backfill-community-posters --no-verify-jwt
// Run:     curl -X POST https://gfjobhkofftvmluocxyw.supabase.co/functions/v1/backfill-community-posters \
//            -H "Content-Type: application/json" \
//            -d '{"batch_size": 200}'
//
// Self-chains automatically — fire once, walk away. Stops when remaining=0.

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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPosterFromTmdb(tmdbId: number): Promise<string | null> {
  const url = `${TMDB_BASE}/movie/${tmdbId}?api_key=${TMDB_KEY}&language=en-US`;
  try {
    let res = await fetch(url);
    if (res.status === 429) {
      await sleep(2500);
      res = await fetch(url);
    }
    if (!res.ok) {
      console.warn(`TMDB ${tmdbId} → ${res.status}`);
      return null;
    }
    const data = await res.json();
    return (data.poster_path as string | null) || null;
  } catch (e) {
    console.error(`TMDB fetch error ${tmdbId}:`, e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  const batchSize = Math.min(body.batch_size ?? 200, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── 1. Fetch community_items missing posters ──
  const { data: items, error: fetchErr } = await supabase
    .from("community_items")
    .select("id, title, tmdb_id")
    .is("poster_path", null)
    .not("tmdb_id", "is", null)
    .order("id", { ascending: true })
    .limit(batchSize);

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!items || items.length === 0) {
    return new Response(
      JSON.stringify({ done: true, processed: 0, remaining: 0, message: "All community_items have posters!" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── 2. Build a map of tmdb_id → poster_path from the media table ──
  const tmdbIds = [...new Set(items.map((i) => i.tmdb_id as number))];

  const { data: mediaRows } = await supabase
    .from("media")
    .select("tmdb_id, poster_path")
    .in("tmdb_id", tmdbIds)
    .not("poster_path", "is", null);

  const mediaMap = new Map<number, string>();
  for (const row of mediaRows || []) {
    if (row.tmdb_id && row.poster_path) {
      mediaMap.set(row.tmdb_id, row.poster_path);
    }
  }

  // ── 3. Separate items: those we can resolve from media vs those needing TMDB ──
  const fromMedia: { id: string; tmdb_id: number; title: string; poster_path: string }[] = [];
  const needTmdb: { id: string; tmdb_id: number; title: string }[] = [];

  for (const item of items) {
    const cached = mediaMap.get(item.tmdb_id);
    if (cached) {
      fromMedia.push({ id: item.id, tmdb_id: item.tmdb_id, title: item.title, poster_path: cached });
    } else {
      needTmdb.push({ id: item.id, tmdb_id: item.tmdb_id, title: item.title });
    }
  }

  let processed = 0;
  let tmdbFetched = 0;
  let errors = 0;
  const sampleUpdates: { title: string; source: string }[] = [];

  // ── 4. Bulk update the ones resolved from media (no TMDB calls needed) ──
  if (fromMedia.length > 0) {
    await Promise.all(
      fromMedia.map(async (item) => {
        const { error } = await supabase
          .from("community_items")
          .update({ poster_path: item.poster_path })
          .eq("id", item.id);
        if (error) {
          errors++;
        } else {
          processed++;
          if (sampleUpdates.length < 10) sampleUpdates.push({ title: item.title, source: "media_table" });
        }
      })
    );
  }

  // ── 5. Fetch remaining from TMDB in mini-batches of 35 ──
  const MINI = 35;
  for (let i = 0; i < needTmdb.length; i += MINI) {
    const chunk = needTmdb.slice(i, i + MINI);

    const results = await Promise.all(
      chunk.map(async (item) => {
        const posterPath = await fetchPosterFromTmdb(item.tmdb_id);
        if (!posterPath) return { title: item.title, ok: false };

        const { error } = await supabase
          .from("community_items")
          .update({ poster_path: posterPath })
          .eq("id", item.id);

        return { title: item.title, ok: !error };
      })
    );

    for (const r of results) {
      if (r.ok) {
        processed++;
        tmdbFetched++;
        if (sampleUpdates.length < 20) sampleUpdates.push({ title: r.title, source: "tmdb_api" });
      } else {
        errors++;
      }
    }

    if (i + MINI < needTmdb.length) {
      await sleep(11000);
    }
  }

  // ── 6. Count remaining ──
  const { count } = await supabase
    .from("community_items")
    .select("id", { count: "exact", head: true })
    .is("poster_path", null)
    .not("tmdb_id", "is", null);

  const remaining = count || 0;

  // ── 7. Self-chain if more work remains ──
  if (remaining > 0) {
    const selfUrl = `${SUPABASE_URL}/functions/v1/backfill-community-posters`;
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 2000);
    try {
      await fetch(selfUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch_size: batchSize }),
        signal: controller.signal,
      });
    } catch {
      // AbortError expected — request dispatched, next invocation runs independently
    }
  }

  return new Response(
    JSON.stringify({
      done: remaining === 0,
      processed,
      from_media_table: fromMedia.length - (errors > fromMedia.length ? fromMedia.length : errors),
      from_tmdb_api: tmdbFetched,
      errors,
      batch_size: items.length,
      remaining,
      chaining: remaining > 0,
      sample_updates: sampleUpdates,
      message: remaining > 0
        ? `Updated ${processed} community_items (${errors} errors). ${remaining} remaining — auto-chaining...`
        : `Done! Updated ${processed} community_items. All posters filled.`,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
