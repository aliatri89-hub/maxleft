// supabase/functions/backfill-episodes/index.ts
// Pull full episode archives from Podcast Index API.
// Deploy: supabase functions deploy backfill-episodes --no-verify-jwt
//
// Env vars required:
//   PODCASTINDEX_API_KEY    — free from https://api.podcastindex.org
//   PODCASTINDEX_API_SECRET — free from https://api.podcastindex.org
//
// Request:  POST { podcast_slug: string, max_episodes?: number, run_matching?: boolean }
// Response: { episodes_found, new_episodes_inserted, matches_generated, details }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PI_BASE = "https://api.podcastindex.org/api/1.0";

// ── Podcast Index Auth ──────────────────────────────────────
async function piHeaders(): Promise<Record<string, string>> {
  const apiKey = Deno.env.get("PODCASTINDEX_API_KEY")!;
  const apiSecret = Deno.env.get("PODCASTINDEX_API_SECRET")!;
  const authDate = Math.floor(Date.now() / 1000).toString();

  // SHA-1 hash of key + secret + date
  const data = new TextEncoder().encode(`${apiKey}${apiSecret}${authDate}`);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashHex = [...new Uint8Array(hashBuffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    "X-Auth-Key": apiKey,
    "X-Auth-Date": authDate,
    Authorization: hashHex,
    "User-Agent": "MANTL-Backfill/1.0",
  };
}

// ── Fetch episodes from Podcast Index ───────────────────────
async function fetchPIEpisodes(
  itunesId: number,
  maxEpisodes: number
): Promise<{ feedId: number | null; episodes: any[] }> {
  const headers = await piHeaders();

  // 1. Look up feed by iTunes ID
  const lookupRes = await fetch(
    `${PI_BASE}/podcasts/byitunesid?id=${itunesId}`,
    { headers }
  );
  if (!lookupRes.ok) {
    throw new Error(`Podcast Index lookup failed: ${lookupRes.status}`);
  }
  const lookupData = await lookupRes.json();
  const feedId = lookupData?.feed?.id;
  if (!feedId) throw new Error(`No Podcast Index feed found for iTunes ID ${itunesId}`);

  console.log(`[Backfill] Found PI feed ${feedId} for iTunes ${itunesId}`);

  // 2. Fetch episodes (max 1000 per call)
  const allEpisodes: any[] = [];
  let hasMore = true;
  let offset = 0;
  const batchSize = Math.min(maxEpisodes, 1000);

  while (hasMore && allEpisodes.length < maxEpisodes) {
    const epHeaders = await piHeaders(); // refresh auth date each call
    const url = `${PI_BASE}/episodes/byfeedid?id=${feedId}&max=${batchSize}&fulltext`;
    console.log(`[Backfill] Fetching offset=${offset}, have=${allEpisodes.length}`);

    const epRes = await fetch(url, { headers: epHeaders });
    if (!epRes.ok) {
      console.error(`[Backfill] Episode fetch failed: ${epRes.status}`);
      break;
    }

    const epData = await epRes.json();
    const items = epData?.items || [];
    if (items.length === 0) break;

    allEpisodes.push(...items);
    hasMore = items.length >= batchSize;
    offset += items.length;

    // Rate limit courtesy
    await new Promise((r) => setTimeout(r, 300));
  }

  return { feedId, episodes: allEpisodes.slice(0, maxEpisodes) };
}

// ── Main handler ────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const slug: string = body.podcast_slug;
    const maxEpisodes: number = body.max_episodes || 1000;
    const runMatching: boolean = body.run_matching !== false; // default true

    if (!slug) {
      return jsonResponse({ error: "podcast_slug required" }, 400);
    }

    // Verify PI credentials exist
    if (!Deno.env.get("PODCASTINDEX_API_KEY") || !Deno.env.get("PODCASTINDEX_API_SECRET")) {
      return jsonResponse({
        error: "PODCASTINDEX_API_KEY and PODCASTINDEX_API_SECRET must be set. Register free at https://api.podcastindex.org",
      }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // 1. Look up podcast
    const { data: podcast, error: podErr } = await sb
      .from("podcasts")
      .select("id, name, slug, itunes_id")
      .eq("slug", slug)
      .single();

    if (podErr || !podcast) {
      return jsonResponse({ error: `Podcast "${slug}" not found` }, 404);
    }
    if (!podcast.itunes_id) {
      return jsonResponse({ error: `Podcast "${slug}" has no itunes_id set` }, 400);
    }

    console.log(`[Backfill] Starting for ${podcast.name} (iTunes: ${podcast.itunes_id})`);

    // 2. Fetch from Podcast Index
    const { feedId, episodes } = await fetchPIEpisodes(podcast.itunes_id, maxEpisodes);
    console.log(`[Backfill] Got ${episodes.length} episodes from PI`);

    if (episodes.length === 0) {
      return jsonResponse({ message: "No episodes found on Podcast Index", episodes_found: 0 });
    }

    // 3. Get existing enclosure URLs + titles for dedup
    const { data: existingEps } = await sb
      .from("podcast_episodes")
      .select("audio_url, title")
      .eq("podcast_id", podcast.id);

    const existingUrls = new Set((existingEps || []).map((e: any) => e.audio_url).filter(Boolean));
    const existingTitles = new Set((existingEps || []).map((e: any) => e.title?.toLowerCase()).filter(Boolean));

    // 4. Filter to truly new episodes
    const newEpisodes = episodes.filter((ep: any) => {
      const url = ep.enclosureUrl || "";
      const title = (ep.title || "").toLowerCase();
      // Dedup by audio URL or exact title match
      return url && !existingUrls.has(url) && !existingTitles.has(title);
    });

    console.log(`[Backfill] ${newEpisodes.length} new episodes (${episodes.length - newEpisodes.length} already exist)`);

    // 5. Insert new episodes
    const insertRows = newEpisodes.map((ep: any) => {
      let airDate: string | null = null;
      if (ep.datePublished) {
        try {
          const d = new Date(ep.datePublished * 1000); // PI uses epoch seconds
          if (!isNaN(d.getTime())) airDate = d.toISOString().split("T")[0];
        } catch {}
      }

      return {
        podcast_id: podcast.id,
        title: ep.title || "Untitled",
        audio_url: ep.enclosureUrl,
        air_date: airDate,
        duration_seconds: ep.duration || null,
        description: (ep.description || "").slice(0, 2000),
        rss_guid: ep.guid || ep.enclosureUrl,
      };
    });

    let insertedCount = 0;
    if (insertRows.length > 0) {
      // Insert in batches to avoid timeouts
      const BATCH = 50;
      for (let i = 0; i < insertRows.length; i += BATCH) {
        const batch = insertRows.slice(i, i + BATCH);
        const { data: inserted, error: insErr } = await sb
          .from("podcast_episodes")
          .upsert(batch, { onConflict: "podcast_id,rss_guid", ignoreDuplicates: true })
          .select("id, title");

        if (insErr) {
          console.error(`[Backfill] Insert batch error: ${insErr.message}`);
        } else {
          insertedCount += (inserted || []).length;
        }
      }
    }

    console.log(`[Backfill] Inserted ${insertedCount} episodes`);

    // 6. Run reverse matching on new episodes (optional)
    let matchCount = 0;
    if (runMatching && insertedCount > 0) {
      // Get the newly inserted episodes
      const { data: newEps } = await sb
        .from("podcast_episodes")
        .select("id, title")
        .eq("podcast_id", podcast.id)
        .order("air_date", { ascending: false })
        .limit(insertedCount + 10); // small buffer

      for (const ep of newEps || []) {
        try {
          const { data: matches } = await sb.rpc("reverse_match_episode", {
            episode_text: ep.title,
            min_title_length: 4,
          });

          if (!matches || matches.length === 0) continue;

          // Check for existing mappings
          const matchTmdbIds = matches.map((m: any) => m.tmdb_id);
          const { data: existingMappings } = await sb
            .from("podcast_episode_films")
            .select("tmdb_id")
            .eq("episode_id", ep.id)
            .in("tmdb_id", matchTmdbIds);

          const existingTmdbIds = new Set(
            (existingMappings || []).map((r: any) => r.tmdb_id)
          );

          const mappingRows = matches
            .filter((m: any) => !existingTmdbIds.has(m.tmdb_id))
            .map((m: any) => ({
              episode_id: ep.id,
              tmdb_id: m.tmdb_id,
              confidence_score: m.confidence,
              admin_reviewed: false,
            }));

          if (mappingRows.length > 0) {
            const { error: mapErr } = await sb
              .from("podcast_episode_films")
              .insert(mappingRows);
            if (!mapErr) matchCount += mappingRows.length;
          }
        } catch (err: any) {
          console.error(`[Backfill] Match error for "${ep.title}": ${err.message}`);
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Backfill] Done in ${elapsed}s`);

    return jsonResponse({
      podcast: podcast.name,
      podcast_index_feed_id: feedId,
      episodes_found: episodes.length,
      already_existed: episodes.length - newEpisodes.length,
      new_episodes_inserted: insertedCount,
      matches_generated: matchCount,
      elapsed_seconds: parseFloat(elapsed),
    });
  } catch (err: any) {
    console.error("[Backfill] ERROR:", err.message, err.stack);
    return new Response(
      JSON.stringify({ error: err.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
