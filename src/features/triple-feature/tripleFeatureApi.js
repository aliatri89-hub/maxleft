// src/features/triple-feature/tripleFeatureApi.js
import { supabase } from "../../supabase";

const POSTER_BASE = "https://image.tmdb.org/t/p/w342/";

/**
 * Fetch today's puzzle with full movie data
 */
export async function fetchTodaysPuzzle() {
  const today = new Date().toISOString().split("T")[0];

  const { data: puzzle, error: puzzleError } = await supabase
    .from("tf_daily_puzzles")
    .select("*")
    .eq("puzzle_date", today)
    .single();

  if (puzzleError || !puzzle) {
    console.error("[TripleFeature] No puzzle for today:", puzzleError);
    return null;
  }

  const { data: movies, error: moviesError } = await supabase
    .from("tf_movies")
    .select("id, title, year, poster_path, domestic_gross, tier")
    .in("id", puzzle.movie_ids);

  if (moviesError) {
    console.error("[TripleFeature] Error fetching movies:", moviesError);
    return null;
  }

  const orderedMovies = puzzle.movie_ids.map((id) => {
    const movie = movies.find((m) => m.id === id);
    return {
      ...movie,
      poster: POSTER_BASE + movie.poster_path,
      gross: movie.domestic_gross,
    };
  });

  return {
    id: puzzle.id,
    date: puzzle.puzzle_date,
    movies: orderedMovies,
    target: puzzle.target,
    optimalCombo: puzzle.optimal_combo,
    optimalTotal: puzzle.optimal_total,
  };
}

/**
 * Check if user already played today
 */
export async function fetchTodaysResult(userId) {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("tf_daily_results")
    .select("*")
    .eq("user_id", userId)
    .eq("puzzle_date", today)
    .maybeSingle();

  if (error) {
    console.error("[TripleFeature] Error checking result:", error);
    return null;
  }
  return data;
}

/**
 * Submit a game result
 */
export async function submitResult({ userId, puzzleDate, selectedIndices, userTotal, rank }) {
  const { data, error } = await supabase
    .from("tf_daily_results")
    .insert({
      user_id: userId,
      puzzle_date: puzzleDate,
      selected_indices: selectedIndices,
      user_total: userTotal,
      rank,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return null; // already played
    console.error("[TripleFeature] Error submitting:", error);
    return null;
  }
  return data;
}

/**
 * Get percentile for a given date and rank
 */
export async function fetchPercentile(puzzleDate, rank) {
  const { data, error } = await supabase.rpc("tf_get_percentile", {
    p_puzzle_date: puzzleDate,
    p_rank: rank,
  });
  if (error) return 50;
  return data;
}

/**
 * Get total player count for today
 */
export async function fetchPlayerCount(puzzleDate) {
  const { count, error } = await supabase
    .from("tf_daily_results")
    .select("*", { count: "exact", head: true })
    .eq("puzzle_date", puzzleDate);
  if (error) return 0;
  return count || 0;
}

/**
 * Fetch lifetime stats for a user (games played, avg rank, streaks, etc.)
 */
export async function fetchUserStats(userId) {
  const { data, error } = await supabase.rpc("tf_get_user_stats", {
    p_user_id: userId,
  });
  if (error) {
    console.error("[TripleFeature] Error fetching stats:", error);
    return null;
  }
  return data;
}

/**
 * Check if user has played today (lightweight — for header icon dot)
 */
export async function hasPlayedToday(userId) {
  const today = new Date().toISOString().split("T")[0];
  const { count, error } = await supabase
    .from("tf_daily_results")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("puzzle_date", today);
  if (error) return true; // hide dot on error
  return count > 0;
}

/**
 * Puzzle number = days since launch
 */
export function getPuzzleNumber(puzzleDate, launchDate = "2025-04-01") {
  const d1 = new Date(launchDate);
  const d2 = new Date(puzzleDate);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
}
