#!/usr/bin/env node
/**
 * expand-cc-pool.mjs
 *
 * Fetches additional movies from TMDB and seeds them into cc_movies.
 * Skips any tmdb_id already in the pool. Includes cast_list and backdrop_path.
 *
 * Usage:
 *   node scripts/expand-cc-pool.mjs --target 200
 *   node scripts/expand-cc-pool.mjs --target 200 --min-votes 5000 --dry-run
 *
 * Env:
 *   TMDB_API_KEY
 *   SUPABASE_URL             - defaults to https://gfjobhkofftvmluocxyw.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

function getArg(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const TARGET = parseInt(getArg("target", "200"), 10);
const MIN_VOTES = parseInt(getArg("min-votes", "5000"), 10);
const MAX_PAGES = parseInt(getArg("max-pages", "40"), 10);

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || "https://gfjobhkofftvmluocxyw.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TMDB_API_KEY) { console.error("Missing TMDB_API_KEY"); process.exit(1); }
if (!SUPABASE_KEY) { console.error("Missing SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function tmdbGet(path) {
  const url = `https://api.themoviedb.org/3${path}${path.includes("?") ? "&" : "?"}api_key=${TMDB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${path}: HTTP ${res.status}`);
  return res.json();
}

async function main() {
  console.log(`\n🎬 Cast Connections — Pool Expansion ${DRY_RUN ? "(DRY RUN)" : ""}`);
  console.log(`   Target: ${TARGET} new movies | Min votes: ${MIN_VOTES}\n`);

  // 1. Load existing tmdb_ids to skip
  const { data: existing, error: existErr } = await supabase
    .from("cc_movies")
    .select("tmdb_id");

  if (existErr) { console.error("DB error:", existErr); process.exit(1); }

  const existingIds = new Set(existing.map((m) => m.tmdb_id));
  console.log(`  Existing pool: ${existingIds.size} movies\n`);

  // 2. Discover movies from TMDB, sorted by vote_count desc
  const newMovies = [];
  let page = 1;

  while (newMovies.length < TARGET && page <= MAX_PAGES) {
    console.log(`  Fetching discover page ${page}...`);

    const discover = await tmdbGet(
      `/discover/movie?sort_by=vote_count.desc&vote_count.gte=${MIN_VOTES}` +
      `&with_original_language=en&page=${page}`
    );

    if (!discover.results || discover.results.length === 0) {
      console.log("  No more results from TMDB.");
      break;
    }

    for (const movie of discover.results) {
      if (existingIds.has(movie.id)) continue;
      if (newMovies.length >= TARGET) break;

      // Skip if no release year
      const year = movie.release_date ? parseInt(movie.release_date.split("-")[0], 10) : null;
      if (!year) continue;

      // Fetch credits for cast list
      await sleep(260); // rate limit
      let credits;
      try {
        credits = await tmdbGet(`/movie/${movie.id}/credits`);
      } catch (e) {
        console.warn(`    Skipping ${movie.title} — credits fetch failed`);
        continue;
      }

      const castList = (credits.cast || []).slice(0, 15).map((c) => ({
        tmdb_person_id: c.id,
        name: c.name,
        character: c.character,
        order: c.order,
      }));

      // Need at least 3 cast members to be useful
      if (castList.length < 3) {
        console.log(`    Skipping ${movie.title} — too few cast`);
        continue;
      }

      newMovies.push({
        tmdb_id: movie.id,
        title: movie.title,
        year,
        poster_path: movie.poster_path || null,
        backdrop_path: movie.backdrop_path || null,
        vote_count: movie.vote_count,
        popularity: movie.popularity,
        cast_list: castList,
      });

      existingIds.add(movie.id); // prevent dupes within this run
      console.log(`    ✓ ${newMovies.length}. ${movie.title} (${year}) — ${movie.vote_count} votes, ${castList.length} cast`);
    }

    page++;
    await sleep(260);
  }

  console.log(`\n  Found ${newMovies.length} new movies\n`);

  if (newMovies.length === 0) {
    console.log("  Nothing to insert. Try lowering --min-votes.\n");
    process.exit(0);
  }

  // 3. Insert into cc_movies
  if (!DRY_RUN) {
    // Batch insert in chunks of 25
    let inserted = 0;
    for (let i = 0; i < newMovies.length; i += 25) {
      const batch = newMovies.slice(i, i + 25);
      const { error: insertErr } = await supabase
        .from("cc_movies")
        .insert(batch);

      if (insertErr) {
        console.error(`  Insert error (batch ${Math.floor(i / 25) + 1}):`, insertErr.message);
      } else {
        inserted += batch.length;
        console.log(`  Inserted batch ${Math.floor(i / 25) + 1} (${batch.length} movies)`);
      }
    }

    // Verify
    const { count } = await supabase
      .from("cc_movies")
      .select("*", { count: "exact", head: true });

    console.log(`\n  Pool now: ${count} total movies (added ${inserted})`);
  }

  // 4. Summary stats
  const voteRange = newMovies.map((m) => m.vote_count).sort((a, b) => a - b);
  console.log(`\n  Vote range of new movies: ${voteRange[0]} – ${voteRange[voteRange.length - 1]}`);
  console.log(`  ${DRY_RUN ? "DRY RUN — no changes written" : "Done!"}\n`);
}

main().catch(console.error);
