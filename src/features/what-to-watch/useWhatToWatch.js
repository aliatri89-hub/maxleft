import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "../../supabase";
import { getEpisodesForFilm } from "../../hooks/community/useBrowseFeed";

/**
 * useWhatToWatch
 *
 * Manages the full "What to Watch" flow:
 *   1. Load a pool of 20 unwatched films from favorite podcasts
 *   2. User swipes right (keep) or left (dismiss)
 *   3. After first pass, show only right-swiped films for narrowing
 *   4. Repeat until user taps "select" on a film
 *
 * Returns everything the UI component needs.
 */

const POOL_SIZE = 20;

export function useWhatToWatch(userId) {
  // ── Pool state ──
  const [pool, setPool] = useState([]);          // current round's films
  const [currentIndex, setCurrentIndex] = useState(0);
  const [kept, setKept] = useState([]);           // right-swiped this round
  const [dismissed, setDismissed] = useState([]); // left-swiped this round
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState("idle");     // idle | loading | swiping | reviewing | selected | empty
  const [selectedFilm, setSelectedFilm] = useState(null);
  const [episodes, setEpisodes] = useState(null);
  const [epLoading, setEpLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(false);

  // ── Start a new session ──
  const start = useCallback(async () => {
    if (!userId) return;
    abortRef.current = false;
    setPhase("loading");
    setError(null);
    setKept([]);
    setDismissed([]);
    setRound(1);
    setCurrentIndex(0);
    setSelectedFilm(null);
    setEpisodes(null);

    try {
      const { data, error: rpcErr } = await supabase.rpc("what_to_watch_pool", {
        p_user_id: userId,
        p_limit: POOL_SIZE,
      });

      if (abortRef.current) return;

      if (rpcErr) {
        console.error("[WhatToWatch] RPC error:", rpcErr.message);
        setError("Couldn't load suggestions. Try again.");
        setPhase("idle");
        return;
      }

      if (!data || data.length === 0) {
        setPhase("empty");
        return;
      }

      setPool(data);
      setPhase("swiping");
    } catch (err) {
      console.error("[WhatToWatch] fetch error:", err);
      setError("Something went wrong.");
      setPhase("idle");
    }
  }, [userId]);

  // ── Swipe actions ──
  const swipeRight = useCallback(() => {
    if (phase !== "swiping" || currentIndex >= pool.length) return;
    const film = pool[currentIndex];
    const nextIdx = currentIndex + 1;
    const isLast = nextIdx >= pool.length;

    setKept(prev => {
      const updated = [...prev, film];
      if (isLast) {
        if (updated.length === 0) {
          setPhase("empty");
        } else if (updated.length === 1) {
          setSelectedFilm(updated[0]);
          setPhase("selected");
        } else {
          setPhase("reviewing");
        }
      }
      return updated;
    });

    if (!isLast) setCurrentIndex(nextIdx);
  }, [phase, currentIndex, pool]);

  const swipeLeft = useCallback(() => {
    if (phase !== "swiping" || currentIndex >= pool.length) return;
    const film = pool[currentIndex];
    const nextIdx = currentIndex + 1;
    const isLast = nextIdx >= pool.length;

    setDismissed(prev => [...prev, film]);

    if (isLast) {
      setKept(prev => {
        if (prev.length === 0) {
          setPhase("empty");
        } else if (prev.length === 1) {
          setSelectedFilm(prev[0]);
          setPhase("selected");
        } else {
          setPhase("reviewing");
        }
        return prev;
      });
    } else {
      setCurrentIndex(nextIdx);
    }
  }, [phase, currentIndex, pool]);

  // ── Start next whittle round ──
  const nextRound = useCallback(() => {
    setPool(kept);
    setKept([]);
    setDismissed([]);
    setCurrentIndex(0);
    setRound(r => r + 1);
    setPhase("swiping");
  }, [kept]);

  // ── Select a film (user taps to pick) ──
  const selectFilm = useCallback(async (film) => {
    setSelectedFilm(film);
    setPhase("selected");

    // Load episodes for this film
    setEpLoading(true);
    try {
      const eps = await getEpisodesForFilm(film.tmdb_id);
      setEpisodes(eps || []);
    } catch {
      setEpisodes([]);
    }
    setEpLoading(false);
  }, []);

  // Auto-load episodes for auto-selected films (1 kept = auto-pick)
  useEffect(() => {
    if (phase === "selected" && selectedFilm && !episodes && !epLoading) {
      let cancelled = false;
      (async () => {
        setEpLoading(true);
        try {
          const eps = await getEpisodesForFilm(selectedFilm.tmdb_id);
          if (!cancelled) setEpisodes(eps || []);
        } catch {
          if (!cancelled) setEpisodes([]);
        }
        if (!cancelled) setEpLoading(false);
      })();
      return () => { cancelled = true; };
    }
  }, [phase, selectedFilm, episodes, epLoading]);

  // ── Reset / close ──
  const reset = useCallback(() => {
    abortRef.current = true;
    setPhase("idle");
    setPool([]);
    setKept([]);
    setDismissed([]);
    setCurrentIndex(0);
    setRound(1);
    setSelectedFilm(null);
    setEpisodes(null);
    setError(null);
  }, []);

  return {
    // state
    phase,
    pool,
    currentIndex,
    currentFilm: pool[currentIndex] || null,
    kept,
    dismissed,
    round,
    selectedFilm,
    episodes,
    epLoading,
    error,
    remaining: pool.length - currentIndex,
    total: pool.length,

    // actions
    start,
    swipeRight,
    swipeLeft,
    nextRound,
    selectFilm,
    reset,
  };
}
