// src/features/reel-time/useReelTime.js
import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchTodaysPuzzle,
  fetchTodaysResult,
  submitResult,
  getPuzzleNumber,
} from "./reelTimeApi";

/**
 * Escalating points: placement 1 = 10, placement 2 = 20, etc.
 */
function getPlacementValue(placementNum) {
  return placementNum * 10;
}

function getMaxScore(totalPlacements) {
  let sum = 0;
  for (let i = 1; i <= totalPlacements; i++) sum += i * 10;
  return sum;
}

export function useReelTime(userId) {
  const [puzzle, setPuzzle] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Game state
  const [placedMovies, setPlacedMovies] = useState([]);
  const [currentMovieIndex, setCurrentMovieIndex] = useState(1);
  const [score, setScore] = useState(0);
  const [placementResults, setPlacementResults] = useState([]); // [true, false, ...]
  const [gamePhase, setGamePhase] = useState("loading"); // loading | playing | reveal | done
  const [lastPlacement, setLastPlacement] = useState(null); // { correct, points, movieId }
  const startTimeRef = useRef(null);

  const totalPlacements = puzzle ? puzzle.movies.length - 1 : 0;
  const maxScore = getMaxScore(totalPlacements);
  const currentMovie = puzzle?.movies[currentMovieIndex] || null;
  const currentPlacementNum = currentMovieIndex; // 1-indexed
  const isGameOver = puzzle && currentMovieIndex >= puzzle.movies.length;

  // Load puzzle + check for existing result
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [puzzleData, existingResult] = await Promise.all([
          fetchTodaysPuzzle(),
          fetchTodaysResult(userId),
        ]);

        if (cancelled) return;

        if (!puzzleData) {
          setError("No puzzle available today. Check back soon!");
          setLoading(false);
          return;
        }

        setPuzzle(puzzleData);

        if (existingResult) {
          // Already played — show completed state
          setResult(existingResult);
          setPlacedMovies(puzzleData.movies.map((m) => ({ ...m, revealed: true })));
          setPlacementResults(existingResult.placements || []);
          setScore(existingResult.score);
          setGamePhase("done");
        } else {
          // Fresh game — set seed movie
          setPlacedMovies([{ ...puzzleData.movies[0], revealed: true }]);
          setCurrentMovieIndex(1);
          setScore(0);
          setPlacementResults([]);
          setGamePhase("playing");
          startTimeRef.current = Date.now();
        }
      } catch (err) {
        if (!cancelled) setError("Something went wrong loading the puzzle.");
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  // Place a movie at a given slot index
  const placeMovie = useCallback((slotIndex) => {
    if (gamePhase !== "playing" || !currentMovie || isGameOver) return;

    const movie = currentMovie;
    const movieDate = new Date(movie.release_date + "T00:00:00").getTime();
    const pointValue = getPlacementValue(currentPlacementNum);

    // Build new timeline with insertion
    const newTimeline = [...placedMovies];
    newTimeline.splice(slotIndex, 0, { ...movie, revealed: false });

    // Check if placement is correct (full sort order preserved)
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
      // Find correct position
      const correctTimeline = [...placedMovies];
      let correctPos = correctTimeline.length;
      for (let i = 0; i < correctTimeline.length; i++) {
        if (movieDate < new Date(correctTimeline[i].release_date + "T00:00:00").getTime()) {
          correctPos = i;
          break;
        }
      }
      correctTimeline.splice(correctPos, 0, { ...movie, revealed: true });
      setPlacedMovies(correctTimeline);
    }

    setGamePhase("reveal");

    // After reveal, advance or finish
    setTimeout(() => {
      setLastPlacement(null);
      const nextIndex = currentMovieIndex + 1;
      if (nextIndex >= puzzle.movies.length) {
        setGamePhase("done");
        // Auto-submit result
        const timeSeconds = Math.round((Date.now() - (startTimeRef.current || Date.now())) / 1000);
        const finalPlacements = [...placementResults, isCorrect];
        const finalScore = score + (isCorrect ? pointValue : 0);
        const perfect = finalPlacements.every(Boolean);

        submitResult({
          userId,
          puzzleDate: puzzle.date,
          placements: finalPlacements,
          score: finalScore,
          total: maxScore,
          perfect,
          timeSeconds,
        }).then((res) => {
          if (res) setResult(res);
        });
      } else {
        setCurrentMovieIndex(nextIndex);
        setGamePhase("playing");
      }
    }, 1400);
  }, [placedMovies, currentMovie, currentMovieIndex, gamePhase, isGameOver, puzzle, userId, score, placementResults, maxScore, currentPlacementNum]);

  const getShareText = useCallback(() => {
    if (!puzzle) return "";
    const puzzleNum = getPuzzleNumber(puzzle.date);
    const blocks = placementResults.map((r) => r ? "🟩" : "🟥").join("");
    const finalScore = result?.score ?? score;
    return `🎞 Reel Time #${puzzleNum} (${puzzle.year})\n${finalScore}/${maxScore} pts ${blocks}\n\nmymantl.app/play`;
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
    puzzle,
    result,
    loading,
    error,
    hasPlayed: !!result,

    // Game state
    placedMovies,
    currentMovie,
    currentMovieIndex,
    currentPlacementNum,
    score,
    maxScore,
    totalPlacements,
    placementResults,
    gamePhase,
    lastPlacement,
    isGameOver,

    // Actions
    placeMovie,
    getShareText,
    getTimeUntilNext,
    getPlacementValue,
  };
}
