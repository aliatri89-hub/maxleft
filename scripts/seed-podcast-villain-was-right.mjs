#!/usr/bin/env node
/**
 * seed-podcast-villain-was-right.mjs
 * ────────────────────────────────────
 * Seeds The Villain Was Right into MANTL:
 *   1. Dry-run (default): fetches RSS, counts episodes, shows sample titles
 *   2. --commit: upserts podcast row, calls ingest-rss to pull all episodes + TMDB matching
 *
 * Note: Some episodes cover TV — those will simply produce no TMDB film match
 * and show up as unmatched in IngestReviewTool. Just dismiss them.
 *
 * After running with --commit, review matches in the IngestReviewTool.
 *
 * Usage:
 *   node scripts/seed-podcast-villain-was-right.mjs           # dry-run preview
 *   node scripts/seed-podcast-villain-was-right.mjs --commit  # write to Supabase
 */

import { createClient } from "@supabase/supabase-js";

// ── Config ───────────────────────────────────────────────────
const SUPABASE_URL = "https://gfjobhkofftvmluocxyw.supabase.co";
// Service role key — bypasses RLS for the podcasts insert. Rotate after seeding.
const SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmam9iaGtvZmZ0dm1sdW9jeHl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM0Nzc5MCwiZXhwIjoyMDg2OTIzNzkwfQ.SYw4NJr7uXnX0xww4Uw5jfKtdnxbAaW_Kyzu9UIHoBI";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmam9iaGtvZmZ0dm1sdW9jeHl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDc3OTAsImV4cCI6MjA4NjkyMzc5MH0.RJVceNeBCmQLeFD35JKJxNqFuoDF4xXas7A2GCg1LwQ";
const INGEST_URL = "https://api.mymantl.app/functions/v1/ingest-rss";

const PODCAST = {
  name:             "The Villain Was Right",
  slug:             "villain-was-right",
  rss_url:          "https://feeds.megaphone.fm/TFSN4323398927",
  website_url:      "https://www.fromsuperheroes.com/the-villain-was-right",
  description:      "Comedians Craig Fay and Rebecca Reeds view movies and TV from the villain's perspective and dare to ask if they were really all that bad.",
  tier:             "catalog", // coverage-only, no community page
  active:           true,
  community_page_id: null,
};

// 376+ episodes — use 500 to be safe
const PARSE_LIMIT = 500;

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

function extractAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}[^>]+${attr}=["']([^"']+)["']`, "i");
  return xml.match(re)?.[1] || null;
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

function extractArtwork(xml) {
  return (
    extractAttr(xml, "itunes:image", "href") ||
    extractAttr(xml, "image", "href") ||
    null
  );
}

// ── Sniff likely film vs TV episodes ────────────────────────
// Just for dry-run preview — ingest-rss handles the real matching
function likelyFilm(title) {
  const tvSignals = /\b(series|season|episode|tv|show|sitcom|inbetweeners|rudolph|christmas special)\b/i;
  return !tvSignals.test(title);
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log(`\n🦹  The Villain Was Right — seed script (${COMMIT ? "COMMIT" : "DRY RUN"})\n`);

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

  const filmEps = episodes.filter((ep) => likelyFilm(ep.title));
  const tvEps   = episodes.length - filmEps.length;

  console.log(`✅  RSS OK — ${episodes.length} total episodes`);
  console.log(`   ~${filmEps.length} likely film episodes, ~${tvEps} likely TV/other`);
  if (artworkUrl) console.log(`🖼️   Artwork: ${artworkUrl}`);

  // 2. Preview sample episodes
  console.log(`\n📋  Sample episodes (newest first):`);
  episodes.slice(0, 10).forEach((ep, i) => {
    const tag = likelyFilm(ep.title) ? "🎬" : "📺";
    console.log(`   ${String(i + 1).padStart(2)}. ${tag} [${ep.airDate || "?"}] ${ep.title}`);
  });
  if (episodes.length > 10) {
    console.log(`   … and ${episodes.length - 10} more`);
  }

  console.log(`\n💡  TV episodes will produce no TMDB match — just dismiss them in IngestReviewTool.`);

  // 3. Check if already in DB
  const { data: existing } = await supabase
    .from("podcasts")
    .select("id, name, slug")
    .eq("slug", PODCAST.slug)
    .maybeSingle();

  if (existing) {
    console.log(`\n⚠️   Podcast already exists in DB: ${existing.name} (${existing.id})`);
    if (!COMMIT) {
      console.log("    Re-run with --commit to re-trigger ingest.");
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
  if (existing) {
    console.log("\n⏩  Podcast already exists — skipping insert, jumping to ingest...");
  } else {
    console.log("\n💾  Inserting podcast row...");
    const { data: inserted, error: insertErr } = await supabase
      .from("podcasts")
      .insert({ ...PODCAST, artwork_url: artworkUrl || null })
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

  console.log(`\n👀  Review matches in IngestReviewTool. Dismiss any TV episodes with no match.\n`);
}

main().catch((e) => {
  console.error("❌  Uncaught error:", e.message);
  process.exit(1);
});
