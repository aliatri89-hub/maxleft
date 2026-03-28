// src/features/triple-feature/useTripleFeaturePublic.js
//
// Ungated version of the Triple Feature hook.
// • Fetches puzzle from Supabase (anon read — no auth needed)
// • Stores play state in localStorage (no DB writes)
// • Calculates rank purely client-side
//
import { useState, useEffect, useCallback } from "react";
import { fetchTodaysPuzzle, getPuzzleNumber } from "./tripleFeatureApi";

const LS_KEY = "tf_result";

// ── Helpers ────────────────────────────────────────────────

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


// ── localStorage helpers ──────────────────────────────────

function getSavedResult(puzzleDate) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    // Only valid if it's for today's puzzle
    if (saved.puzzleDate !== puzzleDate) {
      localStorage.removeItem(LS_KEY);
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

function saveResult(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silent fail
  }
}

// ── Hook ──────────────────────────────────────────────────

export function useTripleFeaturePublic() {
  const [puzzle, setPuzzle] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const puzzleData = await fetchTodaysPuzzle();

        if (cancelled) return;

        if (!puzzleData) {
          setError("No puzzle available today. Check back tomorrow!");
          setLoading(false);
          return;
        }

        setPuzzle(puzzleData);

        // Check localStorage for existing play
        const saved = getSavedResult(puzzleData.date);
        if (saved) setResult(saved);
      } catch {
        if (!cancelled) setError("Something went wrong loading the puzzle.");
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const submitPlay = useCallback(
    (selectedIndices) => {
      if (!puzzle || result) return null;

      const selectedArray = [...selectedIndices].sort((a, b) => a - b);
      const userTotal = selectedArray.reduce(
        (sum, idx) => sum + puzzle.movies[idx].gross, 0
      );
      const rank = calculateRank(puzzle.movies, selectedArray);

      const resultData = {
        puzzleDate: puzzle.date,
        selected_indices: selectedArray,
        user_total: userTotal,
        rank,
      };

      saveResult(resultData);
      setResult(resultData);
      return resultData;
    },
    [puzzle, result]
  );

  const getShareText = useCallback(() => {
    if (!puzzle || !result) return "";
    const puzzleNum = getPuzzleNumber(puzzle.date);
    const rankScore = result.rank > 0 ? 11 - result.rank : 0;
    const rankEmoji = rankScore === 10 ? "🏆" : rankScore >= 9 ? "🎯" : rankScore >= 7 ? "🎬" : "😬";

    let text = `M▶NTL\nTriple Feature #${puzzleNum}\n`;
    text += `${rankEmoji} ${rankScore}/10\n`;
    text += `mymantl.app/play`;
    return text;
  }, [puzzle, result]);

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
    loading,
    error,
    hasPlayed: !!result,
    submitPlay,
    getShareText,
    getTimeUntilNext,
    // Not available in public version
    percentile: null,
    playerCount: 0,
  };
}
