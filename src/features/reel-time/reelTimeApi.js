// src/features/reel-time/reelTimeApi.js
import { supabase } from "../../supabase";
import { trackEvent } from "../../hooks/useAnalytics";

const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

/**
 * Fetch today's Reel Time puzzle with full movie data
 */
export async function fetchTodaysPuzzle() {
  const today = new Date().toISOString().split("T")[0];

  const { data: puzzle, error: puzzleError } = await supabase
    .from("wt_daily_puzzles")
    .select("*")
    .eq("puzzle_date", today)
    .single();

  if (puzzleError || !puzzle) {
    console.error("[ReelTime] No puzzle for today:", puzzleError);
    return null;
  }

  const { data: movies, error: moviesError } = await supabase
    .from("wt_movies")
    .select("id, title, release_date, year, month, poster_path, display_date")
    .in("id", puzzle.movie_ids);

  if (moviesError) {
    console.error("[ReelTime] Error fetching movies:", moviesError);
    return null;
  }

  // Order movies by the puzzle's movie_ids array order
  // First movie = seed (placed automatically), rest are placements
  const orderedMovies = puzzle.movie_ids.map((id) => {
    const movie = movies.find((m) => m.id === id);
    return {
      ...movie,
      poster: movie.poster_path ? POSTER_BASE + movie.poster_path : null,
    };
  });

  // Sort by release_date to get chronological order (the "answer")
  const sortedByDate = [...orderedMovies].sort(
    (a, b) => new Date(a.release_date) - new Date(b.release_date)
  );

  return {
    id: puzzle.id,
    date: puzzle.puzzle_date,
    year: puzzle.year,
    difficulty: puzzle.difficulty || puzzle.movie_count || orderedMovies.length,
    movieCount: puzzle.movie_count || orderedMovies.length,
    movies: sortedByDate, // seed is first (earliest release)
  };
}

/**
 * Check if user already played today
 */
export async function fetchTodaysResult(userId) {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("wt_daily_results")
    .select("*")
    .eq("user_id", userId)
    .eq("puzzle_date", today)
    .maybeSingle();

  if (error) {
    console.error("[ReelTime] Error checking result:", error);
    return null;
  }
  return data;
}

/**
 * Submit a game result
 */
export async function submitResult({ userId, puzzleDate, placements, score, total, perfect, timeSeconds }) {
  const { data, error } = await supabase
    .from("wt_daily_results")
    .insert({
      user_id: userId,
      puzzle_date: puzzleDate,
      placements,
      score,
      total,
      perfect,
      time_seconds: timeSeconds,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return null; // already played
    console.error("[ReelTime] Error submitting:", error);
    return null;
  }
  trackEvent(userId, "game_played", { game: "reel_time", score, total, perfect, time_seconds: timeSeconds, puzzle_date: puzzleDate });
  return data;
}

/**
 * Check if user has played today (lightweight — for hub status dot)
 */
export async function hasPlayedToday(userId) {
  const today = new Date().toISOString().split("T")[0];
  const { count, error } = await supabase
    .from("wt_daily_results")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("puzzle_date", today);
  if (error) return true; // hide dot on error
  return count > 0;
}

/**
 * Puzzle number = days since launch
 */
export function getPuzzleNumber(puzzleDate, launchDate = "2026-03-24") {
  const d1 = new Date(launchDate);
  const d2 = new Date(puzzleDate);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
}
