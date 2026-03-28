// src/features/reel-time/useReelTimePublic.js
//
// Ungated version of the Reel Time hook.
// • Fetches puzzle from Supabase (anon read — no auth needed)
// • Stores play state in localStorage (no DB writes)
//
import { useState, useEffect, useCallback, useRef } from "react";
import { fetchTodaysPuzzle, getPuzzleNumber } from "./reelTimeApi";

const LS_KEY = "rt_result";

const PLACEMENT_VALUES = [10, 20, 20, 30];
function getPlacementValue(placementNum) {
  return PLACEMENT_VALUES[placementNum - 1] || 30;
}
const GIMME_POINTS = 10;

function getMaxScore(totalPlacements) {
  let sum = GIMME_POINTS;
  for (let i = 1; i <= totalPlacements; i++) sum += getPlacementValue(i);
  return sum;
}

// ── localStorage helpers ──

function getSavedResult(puzzleDate) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (saved.puzzleDate !== puzzleDate) {
      localStorage.removeItem(LS_KEY);
      return null;
    }
    return saved;
  } catch { return null; }
}

function saveResult(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

// ── Hook ──

export function useReelTimePublic() {
  const [puzzle, setPuzzle] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Game state
  const [placedMovies, setPlacedMovies] = useState([]);
  const [currentMovieIndex, setCurrentMovieIndex] = useState(1);
  const [score, setScore] = useState(0);
  const [placementResults, setPlacementResults] = useState([]);
  const [gamePhase, setGamePhase] = useState("loading");
  const [lastPlacement, setLastPlacement] = useState(null);
  const startTimeRef = useRef(null);

  const totalPlacements = puzzle ? puzzle.movies.length - 1 : 0;
  const maxScore = getMaxScore(totalPlacements);
  const currentMovie = puzzle?.movies[currentMovieIndex] || null;
  const currentPlacementNum = currentMovieIndex;
  const isGameOver = puzzle && currentMovieIndex >= puzzle.movies.length;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const puzzleData = await fetchTodaysPuzzle();
        if (cancelled) return;

        if (!puzzleData) {
          setError("No puzzle available today. Check back soon!");
          setLoading(false);
          return;
        }

        setPuzzle(puzzleData);

        const saved = getSavedResult(puzzleData.date);
        if (saved) {
          setResult(saved);
          setPlacedMovies(puzzleData.movies.map((m) => ({ ...m, revealed: true })));
          setPlacementResults(saved.placements || []);
          setScore(saved.score);
          setGamePhase("done");
        } else {
          setPlacedMovies([{ ...puzzleData.movies[0], revealed: true }]);
          setCurrentMovieIndex(1);
          setScore(GIMME_POINTS);
          setPlacementResults([]);
          setGamePhase("playing");
          startTimeRef.current = Date.now();
        }
      } catch {
        if (!cancelled) setError("Something went wrong loading the puzzle.");
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const placeMovie = useCallback((slotIndex) => {
    if (gamePhase !== "playing" || !currentMovie || isGameOver) return;

    const movie = currentMovie;
    const pointValue = getPlacementValue(currentPlacementNum);

    const newTimeline = [...placedMovies];
    newTimeline.splice(slotIndex, 0, { ...movie, revealed: false });

    const isCorrect = newTimeline.every((m, i) => {
      if (i === 0) return true;
      return new Date(m.release_date + "T00:00:00").getTime() >=
             new Date(newTimeline[i - 1].release_date + "T00:00:00").getTime();
    });

    if (isCorrect) {
      setScore((s) => s + pointValue);
      setPlacementResults((r) => [...r, true]);
      setLastPlacement({ correct: true, points: pointValue, movieId: movie.id });
      const revealed = newTimeline.map((m) => ({ ...m, revealed: true }));
      setPlacedMovies(revealed);
    } else {
      setPlacementResults((r) => [...r, false]);
      setLastPlacement({ correct: false, points: pointValue, movieId: movie.id });
      const correctTimeline = [...placedMovies];
      let correctPos = correctTimeline.length;
      for (let i = 0; i < correctTimeline.length; i++) {
        if (new Date(movie.release_date + "T00:00:00").getTime() <
            new Date(correctTimeline[i].release_date + "T00:00:00").getTime()) {
          correctPos = i;
          break;
        }
      }
      correctTimeline.splice(correctPos, 0, { ...movie, revealed: true });
      setPlacedMovies(correctTimeline);
    }

    setGamePhase("reveal");

    setTimeout(() => {
      setLastPlacement(null);
      const nextIndex = currentMovieIndex + 1;
      if (nextIndex >= puzzle.movies.length) {
        setGamePhase("done");
        const timeSeconds = Math.round((Date.now() - (startTimeRef.current || Date.now())) / 1000);
        const finalPlacements = [...placementResults, isCorrect];
        const finalScore = score + (isCorrect ? pointValue : 0);
        const perfect = finalPlacements.every(Boolean);

        const resultData = {
          puzzleDate: puzzle.date,
          placements: finalPlacements,
          score: finalScore,
          total: maxScore,
          perfect,
          time_seconds: timeSeconds,
        };
        saveResult(resultData);
        setResult(resultData);
      } else {
        setCurrentMovieIndex(nextIndex);
        setGamePhase("playing");
      }
    }, 1400);
  }, [placedMovies, currentMovie, currentMovieIndex, gamePhase, isGameOver, puzzle, score, placementResults, maxScore, currentPlacementNum]);

  const getShareText = useCallback(() => {
    if (!puzzle) return "";
    const puzzleNum = getPuzzleNumber(puzzle.date);
    const finalScore = result?.score ?? score;
    const verticalBlocks = ["🟩", ...placementResults.map((r) => r ? "🟩" : "🟥")].join("\n");
    return `M▶NTL\nReel Time #${puzzleNum} (${puzzle.year})\n${finalScore}/${maxScore} pts\n${verticalBlocks}\nmymantl.app/play`;
  }, [puzzle, placementResults, result, score, maxScore]);

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
    puzzle, result, loading, error,
    hasPlayed: !!result,
    placedMovies, currentMovie, currentMovieIndex, currentPlacementNum,
    score, maxScore, totalPlacements, placementResults,
    gamePhase, lastPlacement, isGameOver,
    placeMovie, getShareText, getTimeUntilNext, getPlacementValue,
  };
}
