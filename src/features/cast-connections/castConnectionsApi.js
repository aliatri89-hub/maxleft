// src/features/cast-connections/castConnectionsApi.js
import { supabase } from "../../supabase";

/**
 * Fetch today's Cast Connections puzzle
 * Returns: { id, date, movies: [{ tmdb_id, title, year, poster_path, actors: [{ name, tmdb_person_id }] }], colors }
 */
export async function fetchTodaysPuzzle() {
  const today = new Date().toISOString().split("T")[0];

  const { data: puzzle, error } = await supabase
    .from("cc_daily_puzzles")
    .select("*")
    .eq("puzzle_date", today)
    .single();

  if (error || !puzzle) {
    console.error("[CastConnections] No puzzle for today:", error);
    return null;
  }

  return {
    id: puzzle.id,
    date: puzzle.puzzle_date,
    movies: puzzle.movies,
    colors: puzzle.colors || ["#4a7c59", "#b8860b", "#6b4c8a"],
    difficulty: puzzle.difficulty || "easy",
  };
}

/**
 * Check if user already played today
 */
export async function fetchTodaysResult(userId) {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("cc_daily_results")
    .select("*")
    .eq("user_id", userId)
    .eq("puzzle_date", today)
    .maybeSingle();

  if (error) {
    console.error("[CastConnections] Error checking result:", error);
    return null;
  }
  return data;
}

/**
 * Submit a game result
 */
export async function submitResult({ userId, puzzleDate, solved, mistakes, solveOrder, timeSeconds }) {
  const { data, error } = await supabase
    .from("cc_daily_results")
    .insert({
      user_id: userId,
      puzzle_date: puzzleDate,
      solved,
      mistakes,
      solve_order: solveOrder,
      time_seconds: timeSeconds,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return null; // already played
    console.error("[CastConnections] Error submitting:", error);
    return null;
  }
  return data;
}

/**
 * Check if user has played today (lightweight — for hub status dot)
 */
export async function hasPlayedToday(userId) {
  const today = new Date().toISOString().split("T")[0];
  const { count, error } = await supabase
    .from("cc_daily_results")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("puzzle_date", today);
  if (error) return true;
  return count > 0;
}

/**
 * Puzzle number = days since launch
 */
export function getPuzzleNumber(puzzleDate, launchDate = "2026-04-01") {
  const d1 = new Date(launchDate);
  const d2 = new Date(puzzleDate);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
}
