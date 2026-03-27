#!/usr/bin/env node
/**
 * backfill-villain-matches.mjs
 * ────────────────────────────
 * Re-runs TMDB reverse matching on all Villain Was Right episodes
 * that currently have no entry in podcast_episode_films.
 *
 * Root cause: ingest-rss 504'd partway through, so only ~167 episodes
 * got matched before the function timed out.
 *
 * Title format: "392: A Walk To Remember" → strip "392: " prefix.
 * Also handles guest suffixes: "(with Michelle Forrester)" etc.
 *
 * Usage:
 *   node scripts/backfill-villain-matches.mjs           # dry-run preview
 *   node scripts/backfill-villain-matches.mjs --commit  # write matches to DB
 */

import { createClient } from "@supabase/supabase-js";

// ── Config ───────────────────────────────────────────────────
const SUPABASE_URL = "https://gfjobhkofftvmluocxyw.supabase.co";
// Service role key — bypasses RLS. Rotate after seeding.
const SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmam9iaGtvZmZ0dm1sdW9jeHl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM0Nzc5MCwiZXhwIjoyMDg2OTIzNzkwfQ.SYw4NJr7uXnX0xww4Uw5jfKtdnxbAaW_Kyzu9UIHoBI";

const BATCH_DELAY_MS = 120; // ~8 req/s
const COMMIT = process.argv.includes("--commit");

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Strip episode number prefix + guest suffixes ─────────────
// "392: A Walk To Remember"                        → "A Walk To Remember"
// "390: Romy And Michele's High School Reunion (with Michelle Forrester)" → "Romy And Michele's High School Reunion"
// Also handles "EP X - " just in case
function cleanTitle(raw) {
  return raw
    .replace(/^\d+\s*[:|-]\s*/, "")          // "392: " or "392 - "
    .replace(/^EP\s*\d+\s*[-:]\s*/i, "")     // "EP 3 - " fallback
    .replace(/\s*\(with\s[^)]+\)/i, "")      // "(with Guest Name)"
    .replace(/\s*\(feat\.[^)]+\)/i, "")      // "(feat. ...)"
    .replace(/\s*with\s+[A-Z][a-z]+\s+[A-Z][a-z]+$/, "") // trailing "with First Last"
    .trim();
}

async function main() {
  console.log(`\n🦹  The Villain Was Right — match backfill (${COMMIT ? "COMMIT" : "DRY RUN"})\n`);

  // 1. Get podcast ID
  const { data: podcast, error: podErr } = await sb
    .from("podcasts")
    .select("id")
    .eq("slug", "villain-was-right")
    .single();

  if (podErr || !podcast) {
    console.error("❌  Podcast not found in DB:", podErr?.message);
    process.exit(1);
  }

  // 2. Fetch all episodes
  const { data: allEps, error: epsErr } = await sb
    .from("podcast_episodes")
    .select("id, title, air_date")
    .eq("podcast_id", podcast.id)
    .order("air_date", { ascending: true });

  if (epsErr) {
    console.error("❌  Failed to fetch episodes:", epsErr.message);
    process.exit(1);
  }

  // 3. Find unmatched ones
  const { data: alreadyMatched } = await sb
    .from("podcast_episode_films")
    .select("episode_id")
    .in("episode_id", allEps.map((e) => e.id));

  const matchedSet = new Set((alreadyMatched || []).map((m) => m.episode_id));
  const unmatched = allEps.filter((e) => !matchedSet.has(e.id));

  console.log(`📋  ${allEps.length} total episodes, ${unmatched.length} unmatched\n`);

  // Preview cleaned titles in dry-run
  if (!COMMIT) {
    console.log("🔍  Sample cleaned titles:");
    unmatched.slice(0, 10).forEach((ep) => {
      const cleaned = cleanTitle(ep.title);
      console.log(`   "${ep.title}"\n    → "${cleaned}"`);
    });
    if (unmatched.length > 10) console.log(`   … and ${unmatched.length - 10} more`);
  }

  let matchCount = 0;
  let skipCount = 0;
  let insertCount = 0;
  const noMatchList = [];

  for (const ep of unmatched) {
    const cleaned = cleanTitle(ep.title);

    if (!cleaned || cleaned.length < 4) {
      skipCount++;
      continue;
    }

    // 4. Run reverse matcher
    const { data: matches, error: matchErr } = await sb.rpc("reverse_match_episode", {
      episode_text: cleaned,
      min_title_length: 4,
    });

    if (matchErr) {
      console.warn(`  ⚠️  Match error on "${cleaned}": ${matchErr.message}`);
      skipCount++;
      await sleep(BATCH_DELAY_MS);
      continue;
    }

    if (!matches || matches.length === 0) {
      noMatchList.push({ title: ep.title, cleaned });
      skipCount++;
      await sleep(BATCH_DELAY_MS);
      continue;
    }

    matchCount++;
    const top = matches[0];
    console.log(`  ✅  "${ep.title}"\n      → ${top.title} (${top.year}) [conf: ${top.confidence}]`);

    if (COMMIT) {
      const insertRows = matches.map((m) => ({
        episode_id: ep.id,
        tmdb_id: m.tmdb_id,
        confidence_score: m.confidence,
        admin_reviewed: false,
      }));

      const { error: insertErr } = await sb
        .from("podcast_episode_films")
        .upsert(insertRows, { onConflict: "episode_id,tmdb_id", ignoreDuplicates: true });

      if (insertErr) {
        console.warn(`  ⚠️  Insert error: ${insertErr.message}`);
      } else {
        insertCount += insertRows.length;
      }
    }

    await sleep(BATCH_DELAY_MS);
  }

  // 5. Summary
  console.log(`\n── Summary ─────────────────────────────────────`);
  console.log(`   Unmatched episodes processed: ${unmatched.length}`);
  console.log(`   New matches found:            ${matchCount}`);
  console.log(`   No match / skipped:           ${skipCount}`);
  if (COMMIT) console.log(`   Match rows inserted:          ${insertCount}`);

  if (noMatchList.length > 0) {
    console.log(`\n📭  No TMDB match for ${noMatchList.length} episodes (likely TV or ambiguous titles):`);
    noMatchList.forEach((r) =>
      console.log(`   - "${r.title}"  →  "${r.cleaned}"`)
    );
  }

  if (!COMMIT) {
    console.log(`\n💡  Dry run complete. Run with --commit to write matches to DB.\n`);
  } else {
    console.log(`\n👀  New matches pending in IngestReviewTool (admin_reviewed = false).\n`);
  }
}

main().catch((e) => {
  console.error("❌  Uncaught error:", e.message);
  process.exit(1);
});
