#!/usr/bin/env node
/**
 * seed-backdrops.mjs
 * ──────────────────
 * Fills in missing backdrop images across three tables:
 *   1. community_items  → backdrop_path  (TMDB path only: /abc123.jpg)
 *   2. movies           → backdrop_url   (full URL: https://image.tmdb.org/t/p/w780/abc123.jpg)
 *   3. shows            → backdrop_url   (full URL: https://image.tmdb.org/t/p/w780/abc123.jpg)
 *
 * Phase 0: Searches TMDB by title+year for community_items missing tmdb_id,
 *          backfills tmdb_id + poster_path + backdrop_path in one shot.
 * Phase 1-3: Fetches backdrop from TMDB by ID for items that have tmdb_id
 *            but are missing their backdrop.
 *
 * Usage:
 *   node scripts/seed-backdrops.mjs              # dry-run (default)
 *   node scripts/seed-backdrops.mjs --commit     # actually write to Supabase
 *
 * Requirements:
 *   npm install @supabase/supabase-js   (already in project deps)
 */

import { createClient } from "@supabase/supabase-js";

// ── Config ──────────────────────────────────────────────────
const SUPABASE_URL = "https://gfjobhkofftvmluocxyw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmam9iaGtvZmZ0dm1sdW9jeHl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDc3OTAsImV4cCI6MjA4NjkyMzc5MH0.RJVceNeBCmQLeFD35JKJxNqFuoDF4xXas7A2GCg1LwQ";
const TMDB_API_KEY = "ec6edb453a82a8a1081d13e597ea95ce";
const TMDB_IMG = "https://image.tmdb.org/t/p/w780";

const COMMIT = process.argv.includes("--commit");
const BATCH_DELAY_MS = 260; // ~4 req/s — well within TMDB's 40 req/10s limit

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Helpers ─────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchTmdbDetails(tmdbId, type = "movie") {
  const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function searchTmdb(title, year, type = "movie") {
  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    query: title,
  });
  if (year) params.set("year", String(year));
  const url = `https://api.themoviedb.org/3/search/${type}?${params}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

// ── Known title corrections for Blank Check pun names ───────
const TITLE_OVERRIDES = {
  "Paddington 2: The Deuce":       "Paddington 2",
  "Portrait of a Lady":            "Portrait of a Lady on Fire",
  "Roman J. Israel":               "Roman J. Israel, Esq.",
  "At the Beach Alone":            "On the Beach at Night Alone",
  "BPM":                           "BPM (Beats per Minute)",
  "Ya Burnt":                      "Burnt",
  "Hitman":                        "Hit Man",
  "Confess, Fletch":               "Confess, Fletch",
  "Return to Seoul":               "Return to Seoul",
  "Steve Jobs or The Martian":     "Steve Jobs",       // pick one — both are 2015
  "It Was Just An Accident":       "It Was Just An Accident",
};

// ── Phase 0: Resolve missing tmdb_ids via search ────────────
async function resolveOrphans() {
  console.log("\n━━━ Phase 0: Resolve community_items missing tmdb_id ━━━");

  const { data: rows, error } = await supabase
    .from("community_items")
    .select("id, title, year, media_type")
    .in("media_type", ["film", "show"])
    .is("tmdb_id", null);

  if (error) {
    console.error("  Query error:", error.message);
    return { found: 0, resolved: 0, skipped: 0 };
  }

  console.log(`  Found ${rows.length} items with no tmdb_id`);
  let resolved = 0, skipped = 0;

  for (const row of rows) {
    const searchTitle = TITLE_OVERRIDES[row.title] || row.title;
    const tmdbType = row.media_type === "show" ? "tv" : "movie";

    let results = await searchTmdb(searchTitle, row.year, tmdbType);
    await sleep(BATCH_DELAY_MS);

    // Retry without year if no match
    if (!results.length) {
      results = await searchTmdb(searchTitle, null, tmdbType);
      await sleep(BATCH_DELAY_MS);
    }

    const match = results[0];
    if (!match) {
      console.log(`  ⏭  No TMDB match: "${row.title}" (${row.year}) [searched: "${searchTitle}"]`);
      skipped++;
      continue;
    }

    const matchTitle = match.title || match.name;

    // Fetch full details for backdrop + poster
    const detail = await fetchTmdbDetails(match.id, tmdbType);
    await sleep(BATCH_DELAY_MS);

    const updates = { tmdb_id: match.id };
    if (detail?.backdrop_path) updates.backdrop_path = detail.backdrop_path;
    if (detail?.poster_path) updates.poster_path = detail.poster_path;

    console.log(`  ✅ "${row.title}" → TMDB ${match.id} "${matchTitle}" | backdrop=${updates.backdrop_path || "none"}`);

    if (COMMIT) {
      const { error: upErr } = await supabase
        .from("community_items")
        .update(updates)
        .eq("id", row.id);
      if (upErr) console.error(`     Update error: ${upErr.message}`);
    }

    resolved++;
  }

  return { found: rows.length, resolved, skipped };
}

// ── Phase 1: community_items with tmdb_id but no backdrop ───
async function seedCommunityItems() {
  console.log("\n━━━ Phase 1: community_items (has tmdb_id, missing backdrop) ━━━");

  const { data: rows, error } = await supabase
    .from("community_items")
    .select("id, title, tmdb_id, media_type, poster_path")
    .in("media_type", ["film", "show"])
    .not("tmdb_id", "is", null)
    .is("backdrop_path", null);

  if (error) {
    console.error("  Query error:", error.message);
    return { found: 0, updated: 0, skipped: 0 };
  }

  console.log(`  Found ${rows.length} items missing backdrop_path`);
  let updated = 0, skipped = 0;

  for (const row of rows) {
    const tmdbType = row.media_type === "show" ? "tv" : "movie";
    const detail = await fetchTmdbDetails(row.tmdb_id, tmdbType);
    const backdrop = detail?.backdrop_path || null;

    if (!backdrop) {
      console.log(`  ⏭  No backdrop on TMDB: "${row.title}" (${tmdbType}/${row.tmdb_id})`);
      skipped++;
      await sleep(BATCH_DELAY_MS);
      continue;
    }

    const updates = { backdrop_path: backdrop };
    // Also backfill poster if missing
    if (!row.poster_path && detail.poster_path) {
      updates.poster_path = detail.poster_path;
    }

    console.log(`  ✅ ${row.title} → ${backdrop}`);

    if (COMMIT) {
      const { error: upErr } = await supabase
        .from("community_items")
        .update(updates)
        .eq("id", row.id);
      if (upErr) console.error(`     Update error: ${upErr.message}`);
    }

    updated++;
    await sleep(BATCH_DELAY_MS);
  }

  return { found: rows.length, updated, skipped };
}

// ── Phase 2: movies table ───────────────────────────────────
async function seedMovies() {
  console.log("\n━━━ Phase 2: movies (has tmdb_id, missing backdrop_url) ━━━");

  const { data: rows, error } = await supabase
    .from("movies")
    .select("id, title, tmdb_id")
    .not("tmdb_id", "is", null)
    .is("backdrop_url", null);

  if (error) {
    console.error("  Query error:", error.message);
    return { found: 0, updated: 0, skipped: 0 };
  }

  console.log(`  Found ${rows.length} movies missing backdrop_url`);
  let updated = 0, skipped = 0;

  for (const row of rows) {
    const detail = await fetchTmdbDetails(row.tmdb_id, "movie");
    const backdrop = detail?.backdrop_path || null;

    if (!backdrop) {
      console.log(`  ⏭  No backdrop on TMDB: "${row.title}" (movie/${row.tmdb_id})`);
      skipped++;
      await sleep(BATCH_DELAY_MS);
      continue;
    }

    const fullUrl = `${TMDB_IMG}${backdrop}`;
    console.log(`  ✅ ${row.title} → ${fullUrl}`);

    if (COMMIT) {
      const { error: upErr } = await supabase
        .from("movies")
        .update({ backdrop_url: fullUrl })
        .eq("id", row.id);
      if (upErr) console.error(`     Update error: ${upErr.message}`);
    }

    updated++;
    await sleep(BATCH_DELAY_MS);
  }

  return { found: rows.length, updated, skipped };
}

// ── Phase 3: shows table ────────────────────────────────────
async function seedShows() {
  console.log("\n━━━ Phase 3: shows (has tmdb_id, missing backdrop_url) ━━━");

  const { data: rows, error } = await supabase
    .from("shows")
    .select("id, title, tmdb_id")
    .not("tmdb_id", "is", null)
    .is("backdrop_url", null);

  if (error) {
    console.error("  Query error:", error.message);
    return { found: 0, updated: 0, skipped: 0 };
  }

  console.log(`  Found ${rows.length} shows missing backdrop_url`);
  let updated = 0, skipped = 0;

  for (const row of rows) {
    const detail = await fetchTmdbDetails(row.tmdb_id, "tv");
    const backdrop = detail?.backdrop_path || null;

    if (!backdrop) {
      console.log(`  ⏭  No backdrop on TMDB: "${row.title}" (tv/${row.tmdb_id})`);
      skipped++;
      await sleep(BATCH_DELAY_MS);
      continue;
    }

    const fullUrl = `${TMDB_IMG}${backdrop}`;
    console.log(`  ✅ ${row.title} → ${fullUrl}`);

    if (COMMIT) {
      const { error: upErr } = await supabase
        .from("shows")
        .update({ backdrop_url: fullUrl })
        .eq("id", row.id);
      if (upErr) console.error(`     Update error: ${upErr.message}`);
    }

    updated++;
    await sleep(BATCH_DELAY_MS);
  }

  return { found: rows.length, updated, skipped };
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log(`\n🎬 MANTL Backdrop Seeder`);
  console.log(`   Mode: ${COMMIT ? "🟢 COMMIT (writing to DB)" : "🔵 DRY RUN (preview only)"}`);
  if (!COMMIT) console.log(`   Add --commit to actually write updates\n`);

  const t0 = Date.now();

  const p0 = await resolveOrphans();
  const p1 = await seedCommunityItems();
  const p2 = await seedMovies();
  const p3 = await seedShows();

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Summary`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Phase 0 (resolve orphans) : ${p0.resolved} resolved, ${p0.skipped} unmatched (of ${p0.found})`);
  console.log(`  Phase 1 (community_items) : ${p1.updated} backdrops, ${p1.skipped} unavailable (of ${p1.found})`);
  console.log(`  Phase 2 (movies)          : ${p2.updated} backdrops, ${p2.skipped} unavailable (of ${p2.found})`);
  console.log(`  Phase 3 (shows)           : ${p3.updated} backdrops, ${p3.skipped} unavailable (of ${p3.found})`);
  const total = p0.resolved + p1.updated + p2.updated + p3.updated;
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  Total: ${total} rows updated in ${elapsed}s`);

  if (!COMMIT) {
    console.log(`\n  ⚠️  This was a DRY RUN — no changes written.`);
    console.log(`     Run with --commit to apply updates.`);
  }

  if (p0.skipped > 0 || p1.skipped > 0) {
    console.log(`\n  📋 ${p0.skipped + p1.skipped} items may need manual attention`);
    console.log(`     (titles TMDB couldn't match or has no backdrop image)`);
  }

  console.log();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
