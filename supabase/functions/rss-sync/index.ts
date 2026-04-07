// supabase/functions/rss-sync/index.ts
// Fetches a podcast RSS feed server-side (no CORS), parses episodes.
// Deploy with: supabase functions deploy rss-sync --no-verify-jwt
//
// Request:  POST { rss_url: string, limit?: number }
// Response: { episodes: [{ title, pubDate, guid, description, link, enclosureUrl }], count }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── XML helpers (regex-based, zero deps) ────────────────────
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

function parseRSS(xml: string, limit: number = 60) {
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

    let link = extractTag(content, "link");
    if (!link) {
      const linkMatch = content.match(/<link[^>]+href=["']([^"']+)["']/i);
      link = linkMatch?.[1] || "";
    }

    episodes.push({
      title,
      pubDate,
      guid: guid || `${title}::${pubDate}`,
      description: description.slice(0, 500),
      link,
      enclosureUrl: extractEnclosure(content),
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

  try {
    console.log("[RSS-Sync] Request received");
    const { rss_url, limit = 60 } = await req.json();

    if (!rss_url) {
      return new Response(
        JSON.stringify({ error: "rss_url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[RSS-Sync] Fetching:", rss_url);
    const feedRes = await fetch(rss_url, {
      headers: { "User-Agent": "Max Left-RSS-Sync/1.0" },
    });

    if (!feedRes.ok) {
      console.error("[RSS-Sync] Feed fetch failed:", feedRes.status);
      return new Response(
        JSON.stringify({ error: `RSS fetch failed: ${feedRes.status} ${feedRes.statusText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const xml = await feedRes.text();
    const episodes = parseRSS(xml, limit);
    console.log("[RSS-Sync] Parsed", episodes.length, "episodes");

    return new Response(
      JSON.stringify({ episodes, count: episodes.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[RSS-Sync] UNCAUGHT ERROR:", err.message, err.stack);
    return new Response(
      JSON.stringify({ error: err.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
