// src/features/cast-connections/useCastConnectionsPublic.js
//
// Ungated version of the Cast Connections hook.
// • Fetches puzzle from Supabase (anon read — no auth needed)
// • Stores play state in localStorage (no DB writes)
//
import { useState, useEffect, useCallback, useRef } from "react";
import { fetchTodaysPuzzle, getPuzzleNumber, fetchSolveRate } from "./castConnectionsApi";

const LS_KEY = "cc_result";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

export function useCastConnectionsPublic() {
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
  const [hints, setHints] = useState([]);
  const [solveRate, setSolveRate] = useState(null);
  const startTimeRef = useRef(null);

  const groupSize = puzzle?.movies[0]?.actors.length ?? 3;
  const maxMistakes = groupSize;

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

        const allActors = puzzleData.movies.flatMap((m, movieIdx) =>
          m.actors.map((a) => ({ ...a, movieIdx }))
        );
        setActors(shuffle(allActors));

        const saved = getSavedResult(puzzleData.date);
        if (saved) {
          setResult(saved);
          setSolved(saved.solveOrder || saved.solve_order || [0, 1, 2]);
          setMistakes(saved.mistakes || 0);
          setGameOver(true);
          if (!saved.solved) setRevealAll(true);
        } else {
          startTimeRef.current = Date.now();
        }
      } catch {
        if (!cancelled) setError("Failed to load puzzle");
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const toggleSelect = useCallback((actorName) => {
    if (gameOver) return;
    const solvedNames = new Set(
      solved.flatMap((idx) => puzzle?.movies[idx]?.actors.map((a) => a.name) || [])
    );
    if (solvedNames.has(actorName)) return;

    setSelected((prev) =>
      prev.includes(actorName)
        ? prev.filter((n) => n !== actorName)
        : prev.length < groupSize
        ? [...prev, actorName]
        : prev
    );
  }, [gameOver, solved, puzzle]);

  const submitGuess = useCallback(async () => {
    if (selected.length !== groupSize || !puzzle) return;

    const matchIdx = puzzle.movies.findIndex((movie, idx) => {
      if (solved.includes(idx)) return false;
      const movieActorNames = movie.actors.map((a) => a.name);
      return selected.every((name) => movieActorNames.includes(name));
    });

    if (matchIdx !== -1) {
      const newSolved = [...solved, matchIdx];
      setSolved(newSolved);
      setSelected([]);

      if (newSolved.length === puzzle.movies.length) {
        setGameOver(true);
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        const resultData = {
          puzzleDate: puzzle.date,
          solved: true,
          mistakes,
          solveOrder: newSolved,
          time_seconds: elapsed,
          hintsUsed: hints.length,
        };
        saveResult(resultData);
        setResult(resultData);
        fetchSolveRate(puzzle.date).then(rate => setSolveRate(rate));
      }
    } else {
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      setShaking(true);
      setTimeout(() => setShaking(false), 600);

      if (newMistakes >= maxMistakes) {
        setGameOver(true);
        setRevealAll(true);
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        const resultData = {
          puzzleDate: puzzle.date,
          solved: false,
          mistakes: newMistakes,
          solveOrder: solved,
          time_seconds: elapsed,
          hintsUsed: hints.length,
        };
        saveResult(resultData);
        setResult(resultData);
      }
    }
  }, [selected, puzzle, solved, mistakes]);

  const useHint = useCallback(() => {
    if (gameOver || !puzzle) return;
    const unsolvedUnhinted = puzzle.movies
      .map((m, idx) => ({ tmdb_id: m.tmdb_id, idx }))
      .filter(({ idx, tmdb_id }) => !solved.includes(idx) && !hints.includes(tmdb_id));
    if (unsolvedUnhinted.length === 0) return;
    const pick = unsolvedUnhinted[Math.floor(Math.random() * unsolvedUnhinted.length)];
    setHints(prev => [...prev, pick.tmdb_id]);
  }, [gameOver, puzzle, solved, hints]);

  const shuffleActors = useCallback(() => {
    setActors((prev) => shuffle(prev));
  }, []);

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

  const solvedActorMovieIdx = {};
  solved.forEach((idx) => {
    puzzle?.movies[idx]?.actors.forEach((a) => {
      solvedActorMovieIdx[a.name] = idx;
    });
  });

  return {
    puzzle, result, loading, error,
    allActors: actors,
    actors: remainingActors,
    selected, solved, solvedActorNames, solvedActorMovieIdx,
    mistakes, maxMistakes, groupSize,
    gameOver, shaking, revealAll, won, puzzleNumber,
    hints, useHint,
    solveRate,
    toggleSelect, submitGuess, shuffleActors, deselectAll,
  };
}
