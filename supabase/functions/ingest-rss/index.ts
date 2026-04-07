// supabase/functions/ingest-rss/index.ts
// Max Left — RSS ingestion for podcast episodes.
// Fetches each active podcast's RSS feed, dedupes by rss_guid, inserts new episodes.
//
// POST { podcast_slugs?: string[], parse_limit?: number }
// Response: { podcasts_processed, total_new_episodes, details[] }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── XML helpers ──────────────────────────────────────────────

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function extractTag(content: string, tag: string): string {
  const regex = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  );
  const match = content.match(regex);
  return decodeEntities((match?.[1] || match?.[2] || "").trim());
}

function extractEnclosure(content: string): string | null {
  const match = content.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  return match?.[1] || null;
}

function extractDuration(content: string): number | null {
  const raw = extractTag(content, "itunes:duration");
  if (!raw) return null;
  const parts = raw.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1 && !isNaN(parts[0])) return parts[0];
  return null;
}

function parseRSS(xml: string, limit = 100) {
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

    const enclosureUrl = extractEnclosure(content);
    if (!enclosureUrl) { count++; continue; } // skip episodes with no audio

    episodes.push({
      title,
      airDate,
      guid: guid || `${title}::${pubDate}`,
      description: (description || "").slice(0, 2000),
      enclosureUrl,
      durationSeconds: extractDuration(content),
    });
    count++;
  }

  return episodes;
}

// ── Main handler ─────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const filterSlugs: string[] | null = body.podcast_slugs || null;
    const parseLimit: number = body.parse_limit || 100;

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Load active podcasts
    let query = sb
      .from("podcasts")
      .select("id, name, slug, rss_url")
      .eq("active", true)
      .not("rss_url", "is", null);

    if (filterSlugs?.length) query = query.in("slug", filterSlugs);

    const { data: podcasts, error: podErr } = await query;
    if (podErr) throw new Error(`Failed to load podcasts: ${podErr.message}`);
    if (!podcasts?.length) return jsonResponse({ message: "No active podcasts with RSS URLs", podcasts_processed: 0 });

    console.log(`[Ingest] Processing ${podcasts.length} podcasts`);

    const details: any[] = [];
    let totalNewEps = 0;

    // 2. Process each podcast
    for (const podcast of podcasts) {
      const result = {
        slug: podcast.slug,
        name: podcast.name,
        episodes_in_feed: 0,
        new_episodes: 0,
        errors: [] as string[],
      };

      try {
        console.log(`[Ingest] Fetching ${podcast.slug}: ${podcast.rss_url}`);
        const feedRes = await fetch(podcast.rss_url, {
          headers: { "User-Agent": "MaxLeft-Ingest/1.0" },
        });

        if (!feedRes.ok) {
          result.errors.push(`RSS fetch failed: ${feedRes.status}`);
          details.push(result);
          continue;
        }

        const xml = await feedRes.text();
        const episodes = parseRSS(xml, parseLimit);
        result.episodes_in_feed = episodes.length;

        if (!episodes.length) { details.push(result); continue; }

        // Dedupe against existing GUIDs
        const guids = episodes.map((e) => e.guid).filter(Boolean);
        const { data: existingRows } = await sb
          .from("podcast_episodes")
          .select("rss_guid")
          .eq("podcast_id", podcast.id)
          .in("rss_guid", guids);

        const existingGuids = new Set((existingRows || []).map((r: any) => r.rss_guid));
        const newEpisodes = episodes.filter((ep) => ep.guid && !existingGuids.has(ep.guid));

        if (!newEpisodes.length) { details.push(result); continue; }

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
          .select("id");

        if (insErr) {
          result.errors.push(`Insert error: ${insErr.message}`);
        } else {
          result.new_episodes = (inserted || []).length;
          totalNewEps += result.new_episodes;
        }
      } catch (err: any) {
        result.errors.push(`Error: ${err.message}`);
      }

      details.push(result);
      await new Promise((r) => setTimeout(r, 300)); // polite delay between feeds
    }

    // 4. Log to ingest_log
    await sb.from("ingest_log").insert(
      details.map((d) => ({
        podcast_id: podcasts.find((p: any) => p.slug === d.slug)?.id || null,
        podcast_slug: d.slug,
        episodes_in_feed: d.episodes_in_feed,
        new_episodes_inserted: d.new_episodes,
        errors: d.errors.length ? d.errors : null,
      }))
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Ingest] Done in ${elapsed}s: ${totalNewEps} new episodes across ${podcasts.length} podcasts`);

    return jsonResponse({
      podcasts_processed: podcasts.length,
      total_new_episodes: totalNewEps,
      elapsed_seconds: parseFloat(elapsed),
      details,
    });

  } catch (err: any) {
    console.error("[Ingest] ERROR:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
