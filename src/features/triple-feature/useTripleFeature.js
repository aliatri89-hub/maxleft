// src/features/triple-feature/useTripleFeature.js
import { useState, useEffect, useCallback } from "react";
import {
  fetchTodaysPuzzle,
  fetchTodaysResult,
  submitResult,
  fetchPercentile,
  fetchPlayerCount,
  fetchUserStats,
  getPuzzleNumber,
} from "./tripleFeatureApi";

/**
 * All 10 combinations of picking 3 from 5
 */
function getCombos(movies) {
  const combos = [];
  for (let i = 0; i < 5; i++)
    for (let j = i + 1; j < 5; j++)
      for (let k = j + 1; k < 5; k++)
        combos.push({
          indices: [i, j, k],
          total: movies[i].gross + movies[j].gross + movies[k].gross,
        });
  return combos;
}

/**
 * Calculate rank (1-10) for a given selection — highest gross = rank 1
 */
function calculateRank(movies, selectedIndices) {
  const allCombos = getCombos(movies);
  const ranked = [...allCombos].sort((a, b) => b.total - a.total);
  const selectedSet = new Set(selectedIndices);
  const idx = ranked.findIndex((c) => {
    const s = new Set(c.indices);
    return [...selectedSet].every((i) => s.has(i));
  });
  return idx + 1;
}

export function useTripleFeature(userId) {
  const [puzzle, setPuzzle] = useState(null);
  const [result, setResult] = useState(null);
  const [percentile, setPercentile] = useState(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [puzzleData, existingResult, userStats] = await Promise.all([
          fetchTodaysPuzzle(),
          fetchTodaysResult(userId),
          fetchUserStats(userId),
        ]);

        if (cancelled) return;

        if (userStats) setStats(userStats);

        if (!puzzleData) {
          setError("No puzzle available today. Check back soon!");
          setLoading(false);
          return;
        }

        setPuzzle(puzzleData);

        if (existingResult) {
          setResult(existingResult);
          const [pct, count] = await Promise.all([
            fetchPercentile(puzzleData.date, existingResult.rank),
            fetchPlayerCount(puzzleData.date),
          ]);
          if (!cancelled) {
            setPercentile(pct);
            setPlayerCount(count);
          }
        }
      } catch (err) {
        if (!cancelled) setError("Something went wrong loading the puzzle.");
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  const submitPlay = useCallback(
    async (selectedIndices) => {
      if (!puzzle || result) return null;

      const selectedArray = [...selectedIndices].sort((a, b) => a - b);
      const userTotal = selectedArray.reduce(
        (sum, idx) => sum + puzzle.movies[idx].gross, 0
      );
      const rank = calculateRank(puzzle.movies, selectedArray);

      const submitted = await submitResult({
        userId,
        puzzleDate: puzzle.date,
        selectedIndices: selectedArray,
        userTotal,
        rank,
      });

      if (!submitted) {
        // Race condition — re-fetch
        const existingResult = await fetchTodaysResult(userId);
        if (existingResult) {
          setResult(existingResult);
          return existingResult;
        }
        return null;
      }

      setResult(submitted);

      // Fetch percentile, player count, and refreshed stats in parallel
      const [pct, count, freshStats] = await Promise.all([
        fetchPercentile(puzzle.date, rank),
        fetchPlayerCount(puzzle.date),
        fetchUserStats(userId),
      ]);
      setPercentile(pct);
      setPlayerCount(count);
      if (freshStats) setStats(freshStats);

      return submitted;
    },
    [userId, puzzle, result]
  );

  const getShareText = useCallback(() => {
    if (!puzzle || !result) return "";
    const puzzleNum = getPuzzleNumber(puzzle.date);
    const rankScore = result.rank > 0 ? 11 - result.rank : 0;
    const rankEmoji = rankScore === 10 ? "🏆" : rankScore >= 9 ? "🎯" : rankScore >= 7 ? "🎬" : "😬";

    let text = `M▶NTL\nTriple Feature #${puzzleNum}\n`;
    text += `${rankEmoji} ${rankScore}/10\n`;
    if (stats?.current_streak > 1) text += `🔥 ${stats.current_streak} day streak\n`;
    if (percentile !== null && playerCount > 1) text += `Top ${Math.round(100 - percentile + 1)}% of players\n`;
    text += `mymantl.app/play`;
    return text;
  }, [puzzle, result, percentile, playerCount, stats]);

  const getTimeUntilNext = useCallback(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(10, 0, 0, 0);
    const diff = tomorrow - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes, total: diff };
  }, []);

  return {
    puzzle,
    result,
    percentile,
    playerCount,
    stats,
    loading,
    error,
    hasPlayed: !!result,
    submitPlay,
    getShareText,
    getTimeUntilNext,
  };
}
