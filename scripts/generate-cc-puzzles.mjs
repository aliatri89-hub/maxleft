#!/usr/bin/env node
/**
 * generate-cc-puzzles.mjs
 *
 * Generates Cast Connections daily puzzles from the cc_movies pool.
 * Includes backdrop_path in puzzle JSON and difficulty scaling by day of week.
 *
 * Usage:
 *   node scripts/generate-cc-puzzles.mjs --count 90 --start-date 2026-06-24
 *   node scripts/generate-cc-puzzles.mjs --count 90 --start-date 2026-06-24 --dry-run
 *
 * Env:
 *   SUPABASE_URL             - defaults to https://gfjobhkofftvmluocxyw.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

// ── CLI args ──────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

function getArg(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const COUNT = parseInt(getArg("count", "90"), 10);
const START_DATE = getArg("start-date", null);

if (!START_DATE) {
  console.error("Missing --start-date (e.g. 2026-06-24)");
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL || "https://gfjobhkofftvmluocxyw.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_KEY) { console.error("Missing SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Color palettes for the 3 groups ───────────────────────────

const COLOR_SETS = [
  ["#4a7c59", "#b8860b", "#6b4c8a"],
  ["#8b4513", "#2e6b8a", "#8a6b4c"],
  ["#5a4a7c", "#7c5a4a", "#4a7c6b"],
  ["#6b3a3a", "#3a6b5a", "#5a3a6b"],
  ["#7c6b4a", "#4a5a7c", "#6b4a5a"],
  ["#4c6b3a", "#6b3a4c", "#3a4c6b"],
];

// ── Difficulty by day of week ─────────────────────────────────
// Mon–Thu: easy (top 8 billing, all leads)
// Fri: medium (2 leads + 1 supporting)
// Sat–Sun: hard (1 lead + 2 supporting)

function getDifficulty(date) {
  const dow = date.getDay(); // 0=Sun, 1=Mon...6=Sat
  if (dow === 5) return "medium";     // Friday
  if (dow === 6 || dow === 0) return "hard"; // Sat/Sun
  return "easy";
}

// ── Puzzle generation ─────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Try to build a valid puzzle from 3 movies.
 * Returns array of 3 actor groups or null if impossible.
 */
function tryBuildPuzzle(movies, difficulty) {
  // Build full cast sets per movie
  const casts = movies.map((m) =>
    (m.cast_list || []).map((a) => ({
      name: a.name,
      tmdb_person_id: a.tmdb_person_id,
      order: a.order,
    }))
  );

  // Build actor → movie indices map (across ALL cast members)
  const actorMovies = new Map();
  casts.forEach((cast, mi) => {
    for (const actor of cast) {
      const key = actor.tmdb_person_id;
      if (!actorMovies.has(key)) actorMovies.set(key, new Set());
      actorMovies.get(key).add(mi);
    }
  });

  // Find exclusive actors per movie (appear in only one of the 3 selected movies)
  const exclusivePerMovie = casts.map((cast, mi) =>
    cast.filter((a) => {
      const appearances = actorMovies.get(a.tmdb_person_id);
      return appearances && appearances.size === 1;
    })
  );

  // Apply difficulty-based selection
  if (difficulty === "easy") {
    // Top 3 from billing positions 0-7
    const maxOrder = 7;
    const filtered = exclusivePerMovie.map((actors) =>
      actors.filter((a) => a.order <= maxOrder).sort((a, b) => a.order - b.order)
    );
    if (filtered.some((a) => a.length < 3)) return null;
    return filtered.map((a) => a.slice(0, 3));
  }

  if (difficulty === "medium") {
    // 2 leads (order 0-4) + 1 supporting (order 5-10)
    const results = exclusivePerMovie.map((actors) => {
      const leads = actors.filter((a) => a.order <= 4).sort((a, b) => a.order - b.order);
      const supporting = actors.filter((a) => a.order > 4 && a.order <= 10).sort((a, b) => a.order - b.order);
      if (leads.length < 2 || supporting.length < 1) return null;
      return [...leads.slice(0, 2), supporting[0]];
    });
    if (results.some((r) => r === null)) return null;
    return results;
  }

  if (difficulty === "hard") {
    // 1 lead (order 0-3) + 2 supporting (order 4-10)
    const results = exclusivePerMovie.map((actors) => {
      const leads = actors.filter((a) => a.order <= 3).sort((a, b) => a.order - b.order);
      const supporting = actors.filter((a) => a.order > 3 && a.order <= 10).sort((a, b) => a.order - b.order);
      if (leads.length < 1 || supporting.length < 2) return null;
      return [leads[0], ...supporting.slice(0, 2)];
    });
    if (results.some((r) => r === null)) return null;
    return results;
  }

  return null;
}

function comboKey(movies) {
  return movies.map((m) => m.tmdb_id).sort((a, b) => a - b).join(",");
}

async function main() {
  console.log(`\n🎬 Cast Connections — Puzzle Generator ${DRY_RUN ? "(DRY RUN)" : ""}`);
  console.log(`   ${COUNT} puzzles starting ${START_DATE}\n`);

  // 1. Load movie pool
  const { data: pool, error: poolErr } = await supabase
    .from("cc_movies")
    .select("tmdb_id, title, year, poster_path, backdrop_path, cast_list, vote_count")
    .order("vote_count", { ascending: false });

  if (poolErr) { console.error("Pool error:", poolErr); process.exit(1); }
  console.log(`  Movie pool: ${pool.length} movies\n`);

  // 2. Load existing combos to avoid duplicates
  const { data: existing, error: existErr } = await supabase
    .from("cc_daily_puzzles")
    .select("movies");

  if (existErr) { console.error("Existing puzzle error:", existErr); process.exit(1); }

  const usedCombos = new Set();
  for (const p of existing || []) {
    const key = p.movies.map((m) => m.tmdb_id).sort((a, b) => a - b).join(",");
    usedCombos.add(key);
  }
  console.log(`  Existing puzzles: ${usedCombos.size} (will avoid duplicates)\n`);

  // 3. Generate puzzles
  const puzzles = [];
  let attempts = 0;
  const maxAttempts = COUNT * 200;

  for (let i = 0; i < COUNT && attempts < maxAttempts; attempts++) {
    // Pick 3 random movies
    const shuffled = shuffle(pool);
    const trio = shuffled.slice(0, 3);
    const key = comboKey(trio);

    // Skip duplicate combos
    if (usedCombos.has(key)) continue;

    // Calculate difficulty for this date
    const date = new Date(START_DATE);
    date.setDate(date.getDate() + i);
    const difficulty = getDifficulty(date);

    // Try to build a valid puzzle
    const actorGroups = tryBuildPuzzle(trio, difficulty);
    if (!actorGroups) continue;

    // Success!
    usedCombos.add(key);

    const dateStr = date.toISOString().split("T")[0];
    const colors = COLOR_SETS[i % COLOR_SETS.length];

    const puzzleMovies = trio.map((movie, mi) => ({
      tmdb_id: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
      actors: actorGroups[mi].map((a) => ({
        name: a.name,
        tmdb_person_id: a.tmdb_person_id,
      })),
    }));

    puzzles.push({
      puzzle_date: dateStr,
      movies: puzzleMovies,
      colors,
      difficulty,
    });

    const diffLabel = difficulty === "easy" ? "  " : difficulty === "medium" ? "🟡" : "🔴";
    console.log(
      `  ${diffLabel} #${i + 1} ${dateStr} (${difficulty}): ` +
      trio.map((m) => m.title).join(" / ")
    );
    i++;
  }

  console.log(`\n  Generated: ${puzzles.length} / ${COUNT} puzzles (${attempts} attempts)\n`);

  if (puzzles.length < COUNT) {
    console.warn(`  ⚠️  Only generated ${puzzles.length}. Pool may be too small for ${COUNT} unique ${getDifficulty(new Date(START_DATE))}+ puzzles.\n`);
  }

  // 4. Insert
  if (!DRY_RUN && puzzles.length > 0) {
    // Batch insert in chunks of 20
    for (let i = 0; i < puzzles.length; i += 20) {
      const batch = puzzles.slice(i, i + 20);
      const { error: insertErr } = await supabase
        .from("cc_daily_puzzles")
        .insert(batch);

      if (insertErr) {
        console.error(`  Insert error (batch ${Math.floor(i / 20) + 1}):`, insertErr.message);
      } else {
        console.log(`  Inserted batch ${Math.floor(i / 20) + 1} (${batch.length} puzzles)`);
      }
    }

    // Verify
    const { data: verify } = await supabase
      .from("cc_daily_puzzles")
      .select("puzzle_date")
      .order("puzzle_date", { ascending: false })
      .limit(1);

    console.log(`\n  Coverage now extends to: ${verify?.[0]?.puzzle_date || "?"}`);
  }

  console.log(`\n${DRY_RUN ? "DRY RUN — no changes written" : "Done!"}\n`);
}

main().catch(console.error);
