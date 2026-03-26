// src/features/cast-connections/useCastConnections.js
import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchTodaysPuzzle,
  fetchTodaysResult,
  submitResult,
  getPuzzleNumber,
} from "./castConnectionsApi";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function useCastConnections(userId) {
  const [puzzle, setPuzzle] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Game state
  const [actors, setActors] = useState([]);
  const [selected, setSelected] = useState([]);
  const [solved, setSolved] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [revealAll, setRevealAll] = useState(false);
  const startTimeRef = useRef(null);

  const maxMistakes = 3;
  const groupSize = 3;

  // Load puzzle + existing result
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

        // Flatten all actors and shuffle
        const allActors = puzzleData.movies.flatMap((m, movieIdx) =>
          m.actors.map((a) => ({ ...a, movieIdx }))
        );
        setActors(shuffle(allActors));

        if (existingResult) {
          // Restore completed state
          setResult(existingResult);
          setSolved(existingResult.solve_order || [0, 1, 2]);
          setMistakes(existingResult.mistakes || 0);
          setGameOver(true);
          if (!existingResult.solved) setRevealAll(true);
        } else {
          startTimeRef.current = Date.now();
        }
      } catch (err) {
        if (!cancelled) setError("Failed to load puzzle");
        console.error("[CastConnections]", err);
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  // Toggle actor selection
  const toggleSelect = useCallback((actorName) => {
    if (gameOver) return;
    setSelected((prev) =>
      prev.includes(actorName)
        ? prev.filter((n) => n !== actorName)
        : prev.length < groupSize
        ? [...prev, actorName]
        : prev
    );
  }, [gameOver]);

  // Submit guess
  const submitGuess = useCallback(async () => {
    if (selected.length !== groupSize || !puzzle) return;

    // Check if the 3 selected actors all belong to one unsolved movie
    const matchIdx = puzzle.movies.findIndex((movie, idx) => {
      if (solved.includes(idx)) return false;
      const movieActorNames = movie.actors.map((a) => a.name);
      return selected.every((name) => movieActorNames.includes(name));
    });

    if (matchIdx !== -1) {
      // Correct!
      const newSolved = [...solved, matchIdx];
      setSolved(newSolved);
      setSelected([]);

      // Check if game complete
      if (newSolved.length === puzzle.movies.length) {
        setGameOver(true);
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        const res = await submitResult({
          userId,
          puzzleDate: puzzle.date,
          solved: true,
          mistakes,
          solveOrder: newSolved,
          timeSeconds: elapsed,
        });
        if (res) setResult(res);
      }
    } else {
      // Wrong
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      setShaking(true);
      setTimeout(() => setShaking(false), 600);

      if (newMistakes >= maxMistakes) {
        setGameOver(true);
        setRevealAll(true);
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        const res = await submitResult({
          userId,
          puzzleDate: puzzle.date,
          solved: false,
          mistakes: newMistakes,
          solveOrder: solved,
          timeSeconds: elapsed,
        });
        if (res) setResult(res);
      }
    }
  }, [selected, puzzle, solved, mistakes, userId]);

  // Shuffle remaining actors
  const shuffleActors = useCallback(() => {
    setActors((prev) => shuffle(prev));
  }, []);

  // Deselect all
  const deselectAll = useCallback(() => {
    setSelected([]);
  }, []);

  // Derived state
  const solvedActorNames = new Set(
    solved.flatMap((idx) => puzzle?.movies[idx]?.actors.map((a) => a.name) || [])
  );
  const remainingActors = actors.filter((a) => !solvedActorNames.has(a.name));
  const won = solved.length === (puzzle?.movies?.length || 0);
  const puzzleNumber = puzzle ? getPuzzleNumber(puzzle.date) : null;

  return {
    puzzle,
    result,
    loading,
    error,
    // Game state
    actors: remainingActors,
    selected,
    solved,
    mistakes,
    maxMistakes,
    groupSize,
    gameOver,
    shaking,
    revealAll,
    won,
    puzzleNumber,
    // Actions
    toggleSelect,
    submitGuess,
    shuffleActors,
    deselectAll,
  };
}
