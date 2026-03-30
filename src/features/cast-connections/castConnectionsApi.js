// src/features/cast-connections/castConnectionsApi.js
import { supabase } from "../../supabase";
import { trackEvent } from "../../hooks/useAnalytics";

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
export async function submitResult({ userId, puzzleDate, solved, mistakes, solveOrder, timeSeconds, hintsUsed = 0 }) {
  const { data, error } = await supabase
    .from("cc_daily_results")
    .insert({
      user_id: userId,
      puzzle_date: puzzleDate,
      solved,
      mistakes,
      solve_order: solveOrder,
      time_seconds: timeSeconds,
      hints_used: hintsUsed,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return null; // already played
    console.error("[CastConnections] Error submitting:", error);
    return null;
  }
  trackEvent(userId, "game_played", { game: "cast_connections", solved, mistakes, time_seconds: timeSeconds, puzzle_date: puzzleDate });
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
 * Fetch solve rate for a given puzzle date (% of players who solved it)
 */
export async function fetchSolveRate(puzzleDate) {
  const { data, error } = await supabase
    .from("cc_daily_results")
    .select("solved")
    .eq("puzzle_date", puzzleDate);

  if (error || !data || data.length === 0) return null;
  const solved = data.filter(r => r.solved).length;
  return Math.round((solved / data.length) * 100);
}

/**
 * Puzzle number = days since launch
 */
export function getPuzzleNumber(puzzleDate, launchDate = "2026-04-01") {
  const d1 = new Date(launchDate);
  const d2 = new Date(puzzleDate);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
}
