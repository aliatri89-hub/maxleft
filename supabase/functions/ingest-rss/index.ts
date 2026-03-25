// supabase/functions/ingest-rss/index.ts
// Automated daily RSS ingestion + film matching pipeline.
// Deploy with: supabase functions deploy ingest-rss --no-verify-jwt
//
// Triggered by pg_cron daily at 22:00 UTC via:
//   SELECT net.http_post(url, ...)
//
// Flow:
//   1. Load active podcasts with rss_url
//   2. Fetch each RSS feed, parse episodes
//   3. Dedupe against existing podcast_episodes by rss_guid
//   4. Insert new episodes
//   5. Run reverse_match_episode() on each new episode title
//   6. Insert matches into podcast_episode_films (admin_reviewed = false)
//   7. Log results to daily_ingest_log
//
// Request:  POST { podcast_slugs?: string[], parse_limit?: number }  (defaults: all podcasts, 100 eps)
// Response: { podcasts_processed, total_new_episodes, total_matches, details[] }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── XML helpers (same as rss-sync) ──────────────────────────

function extractTag(content: string, tag: string): string {
  const regex = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  );
  const match = content.match(regex);
  return (match?.[1] || match?.[2] || "").trim();
}

function extractEnclosure(content: string): string | null {
  const match = content.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  return match?.[1] || null;
}

function extractDuration(content: string): number | null {
  // <itunes:duration>HH:MM:SS</itunes:duration> or just seconds
  const raw = extractTag(content, "itunes:duration");
  if (!raw) return null;
  const parts = raw.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1 && !isNaN(parts[0])) return parts[0];
  return null;
}

function parseRSS(xml: string, limit: number = 100) {
  const episodes: any[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;
  let count = 0;

  while ((match = itemRegex.exec(xml)) !== null && count < limit) {
    const content = match[1];
    const title = extractTag(content, "title");
    const pubDate = extractTag(content, "pubDate");
    const guid = extractTag(content, "guid");
    const description = extractTag(content, "description");

    let airDate: string | null = null;
    if (pubDate) {
      try {
        const d = new Date(pubDate);
        if (!isNaN(d.getTime())) airDate = d.toISOString().split("T")[0];
      } catch {}
    }

    episodes.push({
      title,
      pubDate,
      airDate,
      guid: guid || `${title}::${pubDate}`,
      description: (description || "").slice(0, 2000),
      enclosureUrl: extractEnclosure(content),
      durationSeconds: extractDuration(content),
    });
    count++;
  }

  return episodes;
}

// ── Main handler ────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const filterSlugs: string[] | null = body.podcast_slugs || null;
    const parseLimit: number = body.parse_limit || 100;

    // Service-role client (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // 1. Load active podcasts with RSS URLs
    let query = sb
      .from("podcasts")
      .select("id, name, slug, rss_url")
      .eq("active", true)
      .not("rss_url", "is", null);

    if (filterSlugs && filterSlugs.length > 0) {
      query = query.in("slug", filterSlugs);
    }

    const { data: podcasts, error: podErr } = await query;
    if (podErr) throw new Error(`Failed to load podcasts: ${podErr.message}`);
    if (!podcasts || podcasts.length === 0) {
      return jsonResponse({ message: "No active podcasts with RSS URLs", podcasts_processed: 0 });
    }

    console.log(`[Ingest] Processing ${podcasts.length} podcasts`);

    const details: any[] = [];
    let totalNewEps = 0;
    let totalMatches = 0;

    // 2. Process each podcast
    for (const podcast of podcasts) {
      const podResult = {
        slug: podcast.slug,
        name: podcast.name,
        episodes_in_feed: 0,
        new_episodes: 0,
        matches: 0,
        high_confidence: 0,
        low_confidence: 0,
        errors: [] as string[],
      };

      try {
        // Fetch RSS
        console.log(`[Ingest] Fetching RSS for ${podcast.slug}: ${podcast.rss_url}`);
        const feedRes = await fetch(podcast.rss_url, {
          headers: { "User-Agent": "MANTL-Ingest/1.0" },
        });

        if (!feedRes.ok) {
          podResult.errors.push(`RSS fetch failed: ${feedRes.status}`);
          details.push(podResult);
          continue;
        }

        const xml = await feedRes.text();
        const episodes = parseRSS(xml, parseLimit);
        podResult.episodes_in_feed = episodes.length;

        if (episodes.length === 0) {
          details.push(podResult);
          continue;
        }

        // Get existing GUIDs for dedup
        const guids = episodes.map((e) => e.guid).filter(Boolean);
        const { data: existingRows } = await sb
          .from("podcast_episodes")
          .select("rss_guid")
          .eq("podcast_id", podcast.id)
          .in("rss_guid", guids);

        const existingGuids = new Set((existingRows || []).map((r: any) => r.rss_guid));

        // Filter to truly new episodes
        const newEpisodes = episodes.filter(
          (ep) => ep.guid && !existingGuids.has(ep.guid) && ep.enclosureUrl
        );

        if (newEpisodes.length === 0) {
          details.push(podResult);
          continue;
        }

        // 3. Insert new episodes
        const insertRows = newEpisodes.map((ep) => ({
          podcast_id: podcast.id,
          title: ep.title,
          audio_url: ep.enclosureUrl,
          air_date: ep.airDate,
          rss_guid: ep.guid,
          duration_seconds: ep.durationSeconds,
          description: ep.description,
        }));

        const { data: inserted, error: insErr } = await sb
          .from("podcast_episodes")
          .insert(insertRows)
          .select("id, title");

        if (insErr) {
          podResult.errors.push(`Episode insert error: ${insErr.message}`);
          details.push(podResult);
          continue;
        }

        podResult.new_episodes = (inserted || []).length;
        totalNewEps += podResult.new_episodes;

        // 4. Run reverse matching on each new episode
        for (const ep of inserted || []) {
          try {
            const { data: matches, error: matchErr } = await sb.rpc(
              "reverse_match_episode",
              { episode_text: ep.title, min_title_length: 4 }
            );

            if (matchErr || !matches || matches.length === 0) continue;

            // Check for existing mappings to avoid dupes
            const matchTmdbIds = matches.map((m: any) => m.tmdb_id);
            const { data: existingMappings } = await sb
              .from("podcast_episode_films")
              .select("tmdb_id")
              .eq("episode_id", ep.id)
              .in("tmdb_id", matchTmdbIds);

            const existingTmdbIds = new Set(
              (existingMappings || []).map((r: any) => r.tmdb_id)
            );

            // Also check if this film already has coverage from THIS podcast
            // (avoids duplicate coverage from re-releases, bonus eps, etc.)
            const { data: podcastCoverage } = await sb
              .from("podcast_episode_films")
              .select("tmdb_id")
              .in("tmdb_id", matchTmdbIds)
              .in(
                "episode_id",
                await sb
                  .from("podcast_episodes")
                  .select("id")
                  .eq("podcast_id", podcast.id)
                  .then((r) => (r.data || []).map((e: any) => e.id))
              );

            // Insert new film mappings
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

              if (!mapErr) {
                podResult.matches += mappingRows.length;
                totalMatches += mappingRows.length;
                for (const m of mappingRows) {
                  if (m.confidence_score >= 0.9) podResult.high_confidence++;
                  else podResult.low_confidence++;
                }
              } else {
                podResult.errors.push(`Mapping insert: ${mapErr.message}`);
              }
            }
          } catch (matchError: any) {
            podResult.errors.push(
              `Match error for "${ep.title}": ${matchError.message}`
            );
          }
        }
      } catch (podError: any) {
        podResult.errors.push(`Podcast error: ${podError.message}`);
      }

      details.push(podResult);

      // Small delay between podcasts to be polite
      await new Promise((r) => setTimeout(r, 500));
    }

    // 5. Log to daily_ingest_log
    const logRows = details.map((d) => ({
      run_date: new Date().toISOString().split("T")[0],
      podcast_id: podcasts.find((p: any) => p.slug === d.slug)?.id || null,
      podcast_slug: d.slug,
      episodes_in_feed: d.episodes_in_feed,
      new_episodes_inserted: d.new_episodes,
      matches_generated: d.matches,
      high_confidence_count: d.high_confidence,
      low_confidence_count: d.low_confidence,
      errors: d.errors.length > 0 ? d.errors : null,
    }));

    await sb.from("daily_ingest_log").insert(logRows);

    // NOTE: Push notifications are NOT sent here.
    // Matches land as admin_reviewed = false and are reviewed in IngestReviewTool.
    // Notifications fire from approve_ingest_matches RPC after admin confirms.

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `[Ingest] Done in ${elapsed}s: ${totalNewEps} new episodes, ${totalMatches} matches across ${podcasts.length} podcasts`
    );

    return jsonResponse({
      podcasts_processed: podcasts.length,
      total_new_episodes: totalNewEps,
      total_matches: totalMatches,
      elapsed_seconds: parseFloat(elapsed),
      details,
    });
  } catch (err: any) {
    console.error("[Ingest] UNCAUGHT ERROR:", err.message, err.stack);
    return new Response(
      JSON.stringify({ error: err.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
