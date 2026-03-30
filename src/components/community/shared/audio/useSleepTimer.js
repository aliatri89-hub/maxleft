/**
 * useSleepTimer.js
 *
 * Manages the sleep timer feature — automatically pauses playback after a chosen
 * duration or at the end of the current episode.
 *
 * Timer options are defined in SLEEP_OPTIONS (audioHelpers). Two modes:
 *   - Timed (minutes > 0): sets a real setTimeout that calls bridge.pause() when it fires.
 *   - End of episode (minutes === -1): sets an endOfEpisode flag only; the engine's
 *     onEnded handler checks sleepTimerRef.current?.endOfEpisode and stops there.
 *
 * Hook signature:
 *   useSleepTimer(bridge)
 *
 * Returns:
 *   { sleepTimer, setSleepTimerAction, clearSleepTimer, sleepTimerRef }
 *
 *   sleepTimerRef is a stable ref kept in sync with sleepTimer state. The engine's
 *   onEnded handler reads sleepTimerRef.current synchronously to avoid stale closures.
 */

import { useState, useRef, useEffect, useCallback } from "react";

export default function useSleepTimer(bridge) {
  const [sleepTimer, setSleepTimer] = useState(null); // null | { label, endOfEpisode, timerId, deadline? }
  const sleepTimerRef = useRef(null);

  const setSleepTimerAction = useCallback((option) => {
    // Clear any existing timer first
    if (sleepTimerRef.current?.timerId) clearTimeout(sleepTimerRef.current.timerId);

    if (option.minutes === -1) {
      // "End of episode" — no real timer, just a flag the engine's onEnded checks
      const st = { label: "End of ep", endOfEpisode: true, timerId: null };
      sleepTimerRef.current = st;
      setSleepTimer(st);
      return;
    }

    const ms = option.minutes * 60 * 1000;
    const timerId = setTimeout(() => {
      bridge.pause();
      setSleepTimer(null);
      sleepTimerRef.current = null;
    }, ms);
    const st = { label: option.label, endOfEpisode: false, timerId, deadline: Date.now() + ms };
    sleepTimerRef.current = st;
    setSleepTimer(st);
  }, [bridge]);

  const clearSleepTimer = useCallback(() => {
    if (sleepTimerRef.current?.timerId) clearTimeout(sleepTimerRef.current.timerId);
    sleepTimerRef.current = null;
    setSleepTimer(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sleepTimerRef.current?.timerId) clearTimeout(sleepTimerRef.current.timerId);
    };
  }, []);

  return { sleepTimer, setSleepTimerAction, clearSleepTimer, sleepTimerRef };
}
