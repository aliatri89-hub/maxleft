#!/usr/bin/env node
/**
 * backfill-cc-backdrops.mjs
 *
 * Fetches backdrop_path from TMDB for all cc_movies, updates Supabase,
 * then propagates into existing cc_daily_puzzles JSON.
 *
 * Usage:
 *   node scripts/backfill-cc-backdrops.mjs
 *   node scripts/backfill-cc-backdrops.mjs --dry-run
 *
 * Env:
 *   TMDB_API_KEY           - v3 API key
 *   SUPABASE_URL           - defaults to https://gfjobhkofftvmluocxyw.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || "https://gfjobhkofftvmluocxyw.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TMDB_API_KEY) { console.error("Missing TMDB_API_KEY"); process.exit(1); }
if (!SUPABASE_KEY) { console.error("Missing SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchBackdropFromTMDB(tmdbId) {
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  TMDB ${tmdbId}: HTTP ${res.status}`);
    return null;
  }
  const data = await res.json();
  return data.backdrop_path || null;
}

async function main() {
  console.log(`\n🎬 Cast Connections — Backdrop Backfill ${DRY_RUN ? "(DRY RUN)" : ""}\n`);

  // 1. Fetch all movies missing backdrop_path
  const { data: movies, error } = await supabase
    .from("cc_movies")
    .select("id, tmdb_id, title, backdrop_path")
    .is("backdrop_path", null)
    .order("tmdb_id");

  if (error) { console.error("DB error:", error); process.exit(1); }
  console.log(`Found ${movies.length} movies without backdrop_path\n`);

  if (movies.length === 0) {
    console.log("All movies already have backdrops. Skipping to puzzle propagation.\n");
  }

  // 2. Fetch from TMDB and update
  let updated = 0;
  let failed = 0;

  for (const movie of movies) {
    const backdrop = await fetchBackdropFromTMDB(movie.tmdb_id);

    if (backdrop) {
      console.log(`  ✓ ${movie.title} → ${backdrop}`);
      if (!DRY_RUN) {
        const { error: updateErr } = await supabase
          .from("cc_movies")
          .update({ backdrop_path: backdrop })
          .eq("id", movie.id);
        if (updateErr) console.warn(`    Update failed:`, updateErr.message);
      }
      updated++;
    } else {
      console.log(`  ✗ ${movie.title} — no backdrop available`);
      failed++;
    }

    // Rate limit: TMDB allows ~40 req/10s
    await sleep(260);
  }

  console.log(`\nMovies: ${updated} updated, ${failed} no backdrop\n`);

  // 3. Propagate into existing puzzles
  console.log("Propagating backdrop_path into cc_daily_puzzles...\n");

  // Build tmdb_id → backdrop_path lookup from all movies
  const { data: allMovies, error: lookupErr } = await supabase
    .from("cc_movies")
    .select("tmdb_id, backdrop_path")
    .not("backdrop_path", "is", null);

  if (lookupErr) { console.error("Lookup error:", lookupErr); process.exit(1); }

  const backdropMap = Object.fromEntries(
    allMovies.map((m) => [m.tmdb_id, m.backdrop_path])
  );
  console.log(`  Backdrop lookup: ${Object.keys(backdropMap).length} movies\n`);

  // Fetch all puzzles
  const { data: puzzles, error: puzzleErr } = await supabase
    .from("cc_daily_puzzles")
    .select("id, puzzle_date, movies")
    .order("puzzle_date");

  if (puzzleErr) { console.error("Puzzle fetch error:", puzzleErr); process.exit(1); }

  let puzzlesUpdated = 0;

  for (const puzzle of puzzles) {
    let changed = false;
    const updatedMovies = puzzle.movies.map((m) => {
      if (!m.backdrop_path && backdropMap[m.tmdb_id]) {
        changed = true;
        return { ...m, backdrop_path: backdropMap[m.tmdb_id] };
      }
      return m;
    });

    if (changed) {
      if (!DRY_RUN) {
        const { error: upErr } = await supabase
          .from("cc_daily_puzzles")
          .update({ movies: updatedMovies })
          .eq("id", puzzle.id);
        if (upErr) console.warn(`  Puzzle ${puzzle.puzzle_date} update failed:`, upErr.message);
      }
      puzzlesUpdated++;
      console.log(`  ✓ ${puzzle.puzzle_date} — backdrops added`);
    }
  }

  console.log(`\nPuzzles updated: ${puzzlesUpdated} / ${puzzles.length}`);
  console.log(`\n${DRY_RUN ? "DRY RUN — no changes written" : "Done!"}\n`);
}

main().catch(console.error);
