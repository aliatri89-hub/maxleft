import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "../../supabase";
import { getEpisodesForFilm } from "../../hooks/community/useBrowseFeed";

/**
 * useWhatToWatch
 *
 * Flow: setup → loading → swiping → reviewing → selected
 *
 * Setup phase lets user pick podcasts + pool size before launching.
 */

export function useWhatToWatch(userId) {
  const [pool, setPool] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [kept, setKept] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState("setup"); // setup | loading | swiping | reviewing | selected | empty
  const [selectedFilm, setSelectedFilm] = useState(null);
  const [episodes, setEpisodes] = useState(null);
  const [epLoading, setEpLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(false);

  // ── Start a session with settings ──
  const start = useCallback(async ({ poolSize = 20, podcastIds = null } = {}) => {
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
      const params = {
        p_user_id: userId,
        p_limit: poolSize,
      };
      // Only pass podcast filter if specific podcasts selected (not "all")
      if (podcastIds && podcastIds.length > 0) {
        params.p_podcast_ids = podcastIds;
      }

      const { data, error: rpcErr } = await supabase.rpc("what_to_watch_pool", params);

      if (abortRef.current) return;

      if (rpcErr) {
        console.error("[WhatToWatch] RPC error:", rpcErr.message);
        setError("Couldn't load suggestions. Try again.");
        setPhase("setup");
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
      setPhase("setup");
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
        if (updated.length === 0) setPhase("empty");
        else if (updated.length === 1) { setSelectedFilm(updated[0]); setPhase("selected"); }
        else setPhase("reviewing");
      }
      return updated;
    });

    if (!isLast) setCurrentIndex(nextIdx);
  }, [phase, currentIndex, pool]);

  const swipeLeft = useCallback(() => {
    if (phase !== "swiping" || currentIndex >= pool.length) return;
    const nextIdx = currentIndex + 1;
    const isLast = nextIdx >= pool.length;

    setDismissed(prev => [...prev, pool[currentIndex]]);

    if (isLast) {
      setKept(prev => {
        if (prev.length === 0) setPhase("empty");
        else if (prev.length === 1) { setSelectedFilm(prev[0]); setPhase("selected"); }
        else setPhase("reviewing");
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

  // ── Select a film ──
  const selectFilm = useCallback(async (film) => {
    setSelectedFilm(film);
    setPhase("selected");
    setEpLoading(true);
    try {
      const eps = await getEpisodesForFilm(film.tmdb_id);
      setEpisodes(eps || []);
    } catch { setEpisodes([]); }
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
        } catch { if (!cancelled) setEpisodes([]); }
        if (!cancelled) setEpLoading(false);
      })();
      return () => { cancelled = true; };
    }
  }, [phase, selectedFilm, episodes, epLoading]);

  // ── Back to setup ──
  const backToSetup = useCallback(() => {
    abortRef.current = true;
    setPhase("setup");
    setPool([]);
    setKept([]);
    setDismissed([]);
    setCurrentIndex(0);
    setRound(1);
    setSelectedFilm(null);
    setEpisodes(null);
    setError(null);
  }, []);

  // ── Full reset / close ──
  const reset = useCallback(() => {
    abortRef.current = true;
    setPhase("setup");
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
    phase, pool, currentIndex,
    currentFilm: pool[currentIndex] || null,
    kept, dismissed, round,
    selectedFilm, episodes, epLoading, error,
    remaining: pool.length - currentIndex,
    total: pool.length,
    start, swipeRight, swipeLeft, nextRound,
    selectFilm, backToSetup, reset,
  };
}
