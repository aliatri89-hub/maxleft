#!/usr/bin/env node
/**
 * fix-remaining-backdrops.mjs
 * ───────────────────────────
 * Targeted fix for the ~100 BC + NPP community_items that got
 * rate-limited during the initial seed run.
 *
 * Usage:
 *   node scripts/fix-remaining-backdrops.mjs              # preview — shows URLs to verify
 *   node scripts/fix-remaining-backdrops.mjs --commit     # writes to Supabase
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gfjobhkofftvmluocxyw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmam9iaGtvZmZ0dm1sdW9jeHl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDc3OTAsImV4cCI6MjA4NjkyMzc5MH0.RJVceNeBCmQLeFD35JKJxNqFuoDF4xXas7A2GCg1LwQ";
const TMDB_KEY = "ec6edb453a82a8a1081d13e597ea95ce";
const TMDB_IMG = "https://image.tmdb.org/t/p/w780";

const BC_ID = "cb2f3b1a-eca8-4e0f-b296-1e1dcabdcca7";
const NPP_ID = "dc0ff496-dce9-4dbf-b56e-5967be6b3b9c";

const COMMIT = process.argv.includes("--commit");
const DELAY = 500; // slower than before — 2 req/s to avoid rate limits

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`\n🎬 Fix Remaining BC + NPP Backdrops`);
  console.log(`   Mode: ${COMMIT ? "🟢 COMMIT" : "🔵 PREVIEW (verify URLs, then --commit)"}\n`);

  // Get all BC + NPP items with tmdb_id but no backdrop
  const { data: rows, error } = await supabase
    .from("community_items")
    .select("id, title, year, tmdb_id, media_type, miniseries_id")
    .in("media_type", ["film", "show"])
    .not("tmdb_id", "is", null)
    .is("backdrop_path", null);

  if (error) { console.error("Query error:", error.message); return; }

  // Filter to BC + NPP only via miniseries → community join
  const { data: series } = await supabase
    .from("community_miniseries")
    .select("id, community_id")
    .in("community_id", [BC_ID, NPP_ID]);

  const bcNppSeriesIds = new Set(series.map(s => s.id));
  const communityMap = Object.fromEntries(series.map(s => [s.id, s.community_id]));

  const targets = rows.filter(r => bcNppSeriesIds.has(r.miniseries_id));
  console.log(`  Found ${targets.length} BC + NPP items still missing backdrops\n`);

  let fixed = 0, noBackdrop = 0, failed = 0;

  for (const row of targets) {
    const type = row.media_type === "show" ? "tv" : "movie";
    const community = communityMap[row.miniseries_id] === BC_ID ? "BC" : "NPP";

    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/${type}/${row.tmdb_id}?api_key=${TMDB_KEY}`
      );

      if (!res.ok) {
        console.log(`  ❌ HTTP ${res.status}: "${row.title}" (${type}/${row.tmdb_id}) [${community}]`);
        failed++;
        await sleep(DELAY);
        continue;
      }

      const data = await res.json();
      const backdrop = data.backdrop_path;

      if (!backdrop) {
        console.log(`  ⏭  No backdrop: "${row.title}" (${row.year}) [${community}]`);
        noBackdrop++;
        await sleep(DELAY);
        continue;
      }

      const previewUrl = `${TMDB_IMG}${backdrop}`;
      console.log(`  ✅ [${community}] ${row.title} (${row.year})`);
      console.log(`     ${previewUrl}`);

      if (COMMIT) {
        const { error: upErr } = await supabase
          .from("community_items")
          .update({ backdrop_path: backdrop })
          .eq("id", row.id);
        if (upErr) console.error(`     ⚠️ Write error: ${upErr.message}`);
        else console.log(`     ✍️ Written`);
      }

      fixed++;
    } catch (err) {
      console.log(`  ❌ Error: "${row.title}" — ${err.message}`);
      failed++;
    }

    await sleep(DELAY);
  }

  console.log(`\n━━━ Results ━━━`);
  console.log(`  ✅ ${fixed} backdrops found`);
  console.log(`  ⏭  ${noBackdrop} genuinely have no backdrop on TMDB`);
  console.log(`  ❌ ${failed} errors`);

  if (!COMMIT && fixed > 0) {
    console.log(`\n  👆 Review the URLs above, then run with --commit to write them.`);
  }
  console.log();
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
