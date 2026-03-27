#!/usr/bin/env node
/**
 * seed-podcast-romancing.mjs
 * ──────────────────────────
 * Seeds Romancing the Pod into MANTL:
 *   1. Dry-run (default): fetches RSS, counts episodes, shows sample titles
 *   2. --commit: upserts podcast row, calls ingest-rss to pull all episodes + TMDB matching
 *
 * After running with --commit, review matches in the IngestReviewTool.
 *
 * Usage:
 *   node scripts/seed-podcast-romancing.mjs           # dry-run preview
 *   node scripts/seed-podcast-romancing.mjs --commit  # write to Supabase
 */

import { createClient } from "@supabase/supabase-js";

// ── Config ───────────────────────────────────────────────────
const SUPABASE_URL  = "https://gfjobhkofftvmluocxyw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmam9iaGtvZmZ0dm1sdW9jeHl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDc3OTAsImV4cCI6MjA4NjkyMzc5MH0.RJVceNeBCmQLeFD35JKJxNqFuoDF4xXas7A2GCg1LwQ";
// Service role key — bypasses RLS for the podcasts insert. Rotate after seeding.
const SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmam9iaGtvZmZ0dm1sdW9jeHl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM0Nzc5MCwiZXhwIjoyMDg2OTIzNzkwfQ.SYw4NJr7uXnX0xww4Uw5jfKtdnxbAaW_Kyzu9UIHoBI";
const INGEST_URL    = "https://api.mymantl.app/functions/v1/ingest-rss";

const PODCAST = {
  name:        "Romancing the Pod",
  slug:        "romancing-the-pod",
  rss_url:     "https://rss.art19.com/romancing-the-pod",
  itunes_id:   1527940333,
  website_url: "https://art19.com/shows/romancing-the-pod",
  description: "Each week Paige and Todd review a romantic movie and break down the good, the bad, and the funny.",
  tier:        "catalog",   // no community page — coverage-only
  active:      true,
  community_page_id: null,
};

// How many RSS episodes to parse on first ingest (pod has ~295 eps)
const PARSE_LIMIT = 400;

const COMMIT = process.argv.includes("--commit");
// Use service role for writes (bypasses RLS). Rotate key after seeding.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── XML helpers ──────────────────────────────────────────────
function extractTag(xml, tag) {
  const re = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  );
  const m = xml.match(re);
  return (m?.[1] || m?.[2] || "").trim();
}

function parseRSS(xml) {
  const episodes = [];
  const itemRe = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = extractTag(block, "title");
    const pubDate = extractTag(block, "pubDate");
    const guid = extractTag(block, "guid");
    let airDate = null;
    try {
      const d = new Date(pubDate);
      if (!isNaN(d.getTime())) airDate = d.toISOString().split("T")[0];
    } catch {}
    episodes.push({ title, airDate, guid });
  }
  return episodes;
}

// ── Artwork from RSS channel ─────────────────────────────────
function extractArtwork(xml) {
  // <itunes:image href="..."/>
  const m = xml.match(/<itunes:image[^>]+href=["']([^"']+)["']/i);
  return m?.[1] || null;
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log(`\n🎬  Romancing the Pod — seed script (${COMMIT ? "COMMIT" : "DRY RUN"})\n`);

  // 1. Fetch RSS
  console.log(`📡  Fetching RSS: ${PODCAST.rss_url}`);
  const rssRes = await fetch(PODCAST.rss_url);
  if (!rssRes.ok) {
    console.error(`❌  RSS fetch failed: ${rssRes.status}`);
    process.exit(1);
  }
  const xml = await rssRes.text();
  const episodes = parseRSS(xml);
  const artworkUrl = extractArtwork(xml);

  console.log(`✅  RSS OK — ${episodes.length} episodes found`);
  if (artworkUrl) console.log(`🖼️   Artwork: ${artworkUrl}`);

  // 2. Preview sample episodes
  const sample = episodes.slice(0, 8);
  console.log(`\n📋  Sample episodes:`);
  sample.forEach((ep, i) => {
    console.log(`   ${String(i + 1).padStart(2)}. [${ep.airDate || "?"}] ${ep.title}`);
  });
  if (episodes.length > 8) {
    console.log(`   … and ${episodes.length - 8} more`);
  }

  // 3. Check if already in DB
  const { data: existing } = await supabase
    .from("podcasts")
    .select("id, name, slug")
    .eq("slug", PODCAST.slug)
    .maybeSingle();

  if (existing) {
    console.log(`\n⚠️   Podcast already exists in DB: ${existing.name} (${existing.id})`);
    if (!COMMIT) {
      console.log("    Re-run with --commit to re-trigger ingest on existing record.");
      return;
    }
  } else {
    console.log(`\n📭  Not yet in DB — will insert on --commit`);
  }

  if (!COMMIT) {
    console.log("\n💡  Dry run complete. Run with --commit to seed.\n");
    return;
  }

  // 4. Upsert podcast row
  const podcastRow = {
    ...PODCAST,
    artwork_url: artworkUrl || null,
  };

  if (existing) {
    console.log("\n⏩  Podcast already exists — skipping insert, jumping to ingest...");
  } else {
    console.log("\n💾  Inserting podcast row...");
    const { data: inserted, error: insertErr } = await supabase
      .from("podcasts")
      .insert(podcastRow)
      .select("id")
      .single();

    if (insertErr) {
      console.error(`❌  Insert failed: ${insertErr.message}`);
      process.exit(1);
    }
    console.log(`✅  Podcast inserted: ${inserted.id}`);
  }

  // 5. Call ingest-rss
  console.log(`\n🔄  Calling ingest-rss (parse_limit=${PARSE_LIMIT})...`);
  const ingestRes = await fetch(INGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      podcast_slugs: [PODCAST.slug],
      parse_limit: PARSE_LIMIT,
    }),
  });

  const ingestData = await ingestRes.json().catch(() => null);
  if (!ingestRes.ok || !ingestData) {
    console.error(`❌  ingest-rss failed: ${ingestRes.status}`, ingestData);
    process.exit(1);
  }

  const detail = ingestData.details?.[0];
  console.log(`\n✅  Ingest complete:`);
  console.log(`   Episodes in feed:    ${detail?.episodes_in_feed ?? "?"}`);
  console.log(`   New eps inserted:    ${detail?.new_episodes ?? "?"}`);
  console.log(`   TMDB matches found:  ${detail?.matches ?? "?"}`);
  console.log(`   High confidence:     ${detail?.high_confidence ?? "?"}`);
  console.log(`   Low confidence:      ${detail?.low_confidence ?? "?"}`);
  if (detail?.errors?.length) {
    console.log(`   ⚠️  Errors: ${detail.errors.join(", ")}`);
  }

  console.log(`\n👀  Review matches in the IngestReviewTool before approving.\n`);
}

main().catch((e) => {
  console.error("❌  Uncaught error:", e.message);
  process.exit(1);
});
