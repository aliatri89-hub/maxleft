/**
 * usePlaybackEngine.js
 *
 * Core audio engine — owns all playback state and wires up bridge events.
 *
 * Responsibilities:
 *   - State: currentEp, isPlaying, progress, duration, speed, buffering, error, bufferedPct
 *   - UI state: fullScreen, bubbleMode ("badge" | "pill"), activated
 *   - Bridge event listeners: timeupdate, durationchange, play, pause, ended, error,
 *     waiting, canplay, bufferprogress, focusregained
 *   - Stall detection: 15s timeout on "waiting" before surfacing an error to the user
 *   - Optimistic seek: seekTargetRef suppresses timeupdate ticks until playback catches up
 *   - Actions: playEpisode, togglePlay, skip, seekTo, cycleSpeed, retry,
 *              stop, dismiss, openFullScreen, closeFullScreen, minimize, restore,
 *              resumeRecent, clearRecent
 *   - Analytics: episode_play and episode_complete events via trackEvent
 *   - Media session: updates web mediaSession metadata when episode changes (native
 *     sets it via the foreground service in bridge.load())
 *   - loadForQueue: a stripped-down play function for queue auto-advance (no analytics,
 *     no recents check) that useQueueManager calls via callback
 *
 * Hook signature:
 *   usePlaybackEngine(bridge, session, {
 *     advanceQueueRef,    // ref populated by useQueueManager — called in onEnded
 *     sleepTimerRef,      // ref populated by useSleepTimer — checked in onEnded
 *     pendingAutoPlayRef, // ref shared with useQueueManager — set on queue advance
 *     updateRecents,      // from usePlaybackPersistence
 *     recentsRef,         // from usePlaybackPersistence
 *     saveThrottle,       // from usePlaybackPersistence
 *     clearSleepTimer,    // from useSleepTimer
 *     clearQueueRef,      // ref populated by useQueueManager — called in stop/dismiss
 *   })
 *
 * Returns:
 *   { currentEp, isPlaying, progress, duration, speed, buffering, error, bufferedPct,
 *     fullScreen, bubbleMode, activated,
 *     playEpisode, togglePlay, skip, seekTo, cycleSpeed, retry, loadForQueue,
 *     stop, dismiss, openFullScreen, closeFullScreen, minimize, restore,
 *     resumeRecent, clearRecent }
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { trackEvent } from "../../../../hooks/useAnalytics";
import { reportDeadAudio } from "../../../../utils/reportDeadAudio";
import { SPEEDS, STALL_TIMEOUT, SAVE_INTERVAL } from "./audioHelpers";
import {
  saveBookmark, upsertRecent, persistRecents,
} from "./usePlaybackPersistence";

export default function usePlaybackEngine(bridge, session, {
  advanceQueueRef,
  sleepTimerRef,
  pendingAutoPlayRef,
  updateRecents,
  recentsRef,
  saveThrottle,
  clearSleepTimer,
  clearQueueRef,
}) {
  const [currentEp, setCurrentEp] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState(null);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [fullScreen, setFullScreen] = useState(false);
  const [bubbleMode, setBubbleMode] = useState("badge"); // "badge" | "pill"
  const [activated, setActivated] = useState(false);

  const stallTimerRef = useRef(null);
  const seekTargetRef = useRef(null); // { time, ts } — holds optimistic seek position

  // ── Bridge event listeners ────────────────────────────────────────────────
  useEffect(() => {
    const onTimeUpdate = ({ currentTime, duration: dur }) => {
      // Optimistic seek: suppress ticks until playback catches up (within 2s) or 8s timeout
      if (seekTargetRef.current) {
        const { time: target, ts } = seekTargetRef.current;
        const caught = Math.abs(currentTime - target) < 2;
        const expired = Date.now() - ts > 8000;
        if (caught || expired) {
          seekTargetRef.current = null;
        } else {
          return; // keep showing the seek target position
        }
      }
      setProgress(currentTime);
      setError(null);
      clearTimeout(stallTimerRef.current);
      const now = Date.now();
      if (now - saveThrottle.current > SAVE_INTERVAL) {
        saveThrottle.current = now;
        saveBookmark(currentEp, currentTime, speed, dur || bridge.duration);
        if (currentEp && currentTime > 15) {
          const updated = upsertRecent(recentsRef.current, currentEp, currentTime, speed, dur || bridge.duration);
          recentsRef.current = updated;
          persistRecents(updated);
        }
      }
    };

    const onDurationChange = ({ duration: dur }) => {
      setDuration(dur || 0);
    };

    const onPlay = () => {
      setIsPlaying(true);
      setBuffering(false);
      setError(null);
      pendingAutoPlayRef.current = false;
    };

    const onPause = () => {
      setIsPlaying(false);
      clearTimeout(stallTimerRef.current);
      const ct = bridge.currentTime;
      const dur = bridge.duration;
      saveBookmark(currentEp, ct, speed, dur);
      if (currentEp && ct > 15) {
        const updated = upsertRecent(recentsRef.current, currentEp, ct, speed, dur);
        recentsRef.current = updated;
        persistRecents(updated);
      }
    };

    const onEnded = () => {
      clearTimeout(stallTimerRef.current);
      // Analytics
      if (currentEp && session?.user?.id) {
        trackEvent(session.user.id, "episode_complete", {
          episode_title: currentEp.title,
          podcast_slug: currentEp.community || null,
          episode_id: currentEp.guid || null,
          duration_seconds: Math.round(bridge.duration || 0),
        });
      }
      // Sleep timer — end of episode mode
      if (sleepTimerRef.current?.endOfEpisode) {
        clearTimeout(sleepTimerRef.current.timerId);
        clearSleepTimer();
        setIsPlaying(false);
        return;
      }
      // Try to auto-advance from queue
      if (advanceQueueRef.current && advanceQueueRef.current()) return;
      setIsPlaying(false);
    };

    const onError = ({ message }) => {
      setError(message || "Playback error");
      setBuffering(false);
      setIsPlaying(false);
      clearTimeout(stallTimerRef.current);
      if (currentEp) reportDeadAudio(currentEp, message || "bridge_error");
    };

    const onWaiting = () => {
      setBuffering(true);
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = setTimeout(() => {
        setBuffering(false);
        setError("Stream stalled — check your connection");
        if (currentEp) reportDeadAudio(currentEp, "waiting_timeout");
      }, STALL_TIMEOUT);
    };

    const onCanPlay = () => {
      setBuffering(false);
      setError(null);
      clearTimeout(stallTimerRef.current);
    };

    const onBufferProgress = ({ bufferedPct: pct }) => {
      setBufferedPct(pct || 0);
    };

    // On native: sync UI when app regains focus after background playback
    const onFocusRegained = async () => {
      setProgress(bridge.currentTime);
      if (pendingAutoPlayRef.current && !bridge.playing) {
        console.log("[PlaybackEngine] Resuming pending auto-play after focus regained");
        pendingAutoPlayRef.current = false;
        setBuffering(true);
        try {
          await bridge.play();
        } catch (e) {
          console.warn("[PlaybackEngine] Focus-resume play failed:", e);
          setBuffering(false);
          setError("Tap play to start the next episode");
        }
      }
    };

    bridge.on("timeupdate", onTimeUpdate);
    bridge.on("durationchange", onDurationChange);
    bridge.on("play", onPlay);
    bridge.on("pause", onPause);
    bridge.on("ended", onEnded);
    bridge.on("error", onError);
    bridge.on("waiting", onWaiting);
    bridge.on("canplay", onCanPlay);
    bridge.on("bufferprogress", onBufferProgress);
    bridge.on("focusregained", onFocusRegained);

    return () => {
      bridge.off("timeupdate", onTimeUpdate);
      bridge.off("durationchange", onDurationChange);
      bridge.off("play", onPlay);
      bridge.off("pause", onPause);
      bridge.off("ended", onEnded);
      bridge.off("error", onError);
      bridge.off("waiting", onWaiting);
      bridge.off("canplay", onCanPlay);
      bridge.off("bufferprogress", onBufferProgress);
      bridge.off("focusregained", onFocusRegained);
      clearTimeout(stallTimerRef.current);
    };
  }, [
    currentEp, speed, bridge, session,
    advanceQueueRef, sleepTimerRef, pendingAutoPlayRef,
    recentsRef, saveThrottle, clearSleepTimer,
  ]);

  // ── Save on tab hide / page unload ────────────────────────────────────────
  // Lives here (not in usePlaybackPersistence) because currentEp and speed are
  // owned by this hook.
  useEffect(() => {
    const save = async () => {
      if (!currentEp) return;
      const ct = bridge.isNative ? await bridge.getFreshCurrentTime() : bridge.currentTime;
      const dur = bridge.duration;
      saveBookmark(currentEp, ct, speed, dur);
      if (ct > 15) {
        const updated = upsertRecent(recentsRef.current, currentEp, ct, speed, dur);
        recentsRef.current = updated;
        persistRecents(updated);
      }
    };
    const onVis = () => { if (document.hidden) save(); };
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeunload", save);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [currentEp, speed, bridge, recentsRef]);

  // ── Web media session metadata ────────────────────────────────────────────
  // Native sets metadata in bridge.load(); web needs an explicit update here.
  useEffect(() => {
    if (bridge.isNative || !currentEp) return;
    bridge.changeMetadata({
      title: currentEp.title || "Unknown Episode",
      artist: currentEp.community || "MANTL",
      artwork: currentEp.artwork || currentEp.image || "",
    });
  }, [currentEp, bridge]);

  // ── Actions ───────────────────────────────────────────────────────────────

  // Legacy cleanup stub — bridge handles seeks internally now
  const cleanupPendingSeek = useCallback(() => {}, []);

  const playEpisode = useCallback((ep) => {
    if (!ep?.enclosureUrl) return;
    const isSameEp = currentEp && (
      currentEp.guid === ep.guid || currentEp.enclosureUrl === ep.enclosureUrl
    );
    if (isSameEp) {
      isPlaying ? bridge.pause() : bridge.play();
      return;
    }
    cleanupPendingSeek();
    trackEvent(session?.user?.id, "episode_play", {
      episode_title: ep.title,
      podcast_slug: ep.community || null,
      episode_id: ep.guid || null,
      resumed: !!(recentsRef.current.find(
        r => r.guid === ep.guid || r.enclosureUrl === ep.enclosureUrl
      )?.time > 15),
    });
    // Save current to recents before switching
    if (currentEp && bridge.currentTime > 15) {
      updateRecents(prev => upsertRecent(prev, currentEp, bridge.currentTime, speed, bridge.duration));
    }
    const saved = recentsRef.current.find(
      r => r.guid === ep.guid || r.enclosureUrl === ep.enclosureUrl
    );
    setCurrentEp(ep);
    setBubbleMode("badge");
    setActivated(true);
    setBuffering(true);
    setError(null);
    setBufferedPct(0);
    const meta = { title: ep.title, artist: ep.community || "MANTL", artwork: ep.artwork || "" };
    if (saved && saved.time > 15) {
      setProgress(saved.time);
      setDuration(saved.duration || 0);
      setSpeed(saved.speed || speed);
      bridge.load(ep.enclosureUrl, meta, { seekTo: saved.time, rate: saved.speed || speed })
        .then(() => bridge.play());
    } else {
      setProgress(ep.startAt || 0);
      setDuration(0);
      bridge.load(ep.enclosureUrl, meta, { seekTo: ep.startAt || 0, rate: speed })
        .then(() => bridge.play());
    }
  }, [currentEp, isPlaying, speed, updateRecents, cleanupPendingSeek, bridge, session, recentsRef]);

  // loadForQueue: stripped-down load used by useQueueManager for auto-advance.
  // No analytics, no recents check — the queue manager handles saving to recents
  // before calling this. Returns a Promise so queue manager can catch failures.
  const loadForQueue = useCallback((ep) => {
    setCurrentEp(ep);
    setProgress(0);
    setDuration(0);
    setBuffering(true);
    setError(null);
    setBufferedPct(0);
    const meta = { title: ep.title, artist: ep.community || "MANTL", artwork: ep.artwork || "" };
    return bridge.load(ep.enclosureUrl, meta, { rate: speed }).then(() => bridge.play());
  }, [speed, bridge]);

  const togglePlay = useCallback(() => {
    if (!currentEp) return;
    isPlaying ? bridge.pause() : bridge.play();
  }, [isPlaying, currentEp, bridge]);

  const skip = useCallback((sec) => {
    const newTime = Math.max(0, Math.min(duration || 0, bridge.currentTime + sec));
    bridge.seek(newTime);
  }, [bridge, duration]);

  const seekTo = useCallback((time) => {
    const clamped = Math.max(0, Math.min(duration || 0, time));
    setProgress(clamped);
    seekTargetRef.current = { time: clamped, ts: Date.now() };
    bridge.seek(clamped);
  }, [bridge, duration]);

  const cycleSpeed = useCallback(() => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    bridge.setRate(next);
  }, [speed, bridge]);

  const retry = useCallback(() => {
    if (!currentEp?.enclosureUrl) return;
    setError(null);
    setBuffering(true);
    setBufferedPct(0);
    clearTimeout(stallTimerRef.current);
    const savedTime = bridge.currentTime || progress;
    const meta = { title: currentEp.title, artist: currentEp.community || "MANTL", artwork: currentEp.artwork || "" };
    bridge.load(currentEp.enclosureUrl, meta, { seekTo: savedTime > 5 ? savedTime : 0, rate: speed })
      .then(() => bridge.play());
  }, [currentEp, speed, progress, bridge]);

  const stop = useCallback(() => {
    cleanupPendingSeek();
    clearSleepTimer();
    clearQueueRef.current?.();
    bridge.destroy();
    setCurrentEp(null);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setError(null);
    setFullScreen(false);
    setBubbleMode("badge");
  }, [cleanupPendingSeek, clearSleepTimer, clearQueueRef, bridge]);

  const dismiss = useCallback(() => {
    const ct = bridge.currentTime;
    const dur = bridge.duration;
    if (currentEp && ct > 5) {
      updateRecents(prev => upsertRecent(prev, currentEp, ct, speed, dur));
      saveBookmark(currentEp, ct, speed, dur);
    }
    cleanupPendingSeek();
    clearSleepTimer();
    clearQueueRef.current?.();
    bridge.destroy();
    setCurrentEp(null);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setError(null);
    setFullScreen(false);
    setBubbleMode("badge");
  }, [currentEp, speed, updateRecents, cleanupPendingSeek, clearSleepTimer, clearQueueRef, bridge]);

  const openFullScreen = useCallback(() => setFullScreen(true), []);
  const closeFullScreen = useCallback(() => setFullScreen(false), []);
  const minimize = useCallback(() => setBubbleMode("badge"), []);
  const restore = useCallback(() => setBubbleMode("pill"), []);

  const resumeRecent = useCallback((recent) => {
    if (!recent?.enclosureUrl) return;
    cleanupPendingSeek();
    if (currentEp && bridge.currentTime > 15) {
      updateRecents(prev => upsertRecent(prev, currentEp, bridge.currentTime, speed, bridge.duration));
    }
    const ep = {
      guid: recent.guid,
      title: recent.title,
      enclosureUrl: recent.enclosureUrl,
      community: recent.community || null,
      artwork: recent.artwork || null,
    };
    const resumeTime = recent.time || 0;
    const resumeSpeed = recent.speed || 1;
    setCurrentEp(ep);
    setBubbleMode("badge");
    setActivated(true);
    setProgress(resumeTime);
    setDuration(recent.duration || 0);
    setSpeed(resumeSpeed);
    setBuffering(true);
    setBufferedPct(0);
    const meta = { title: ep.title, artist: ep.community || "MANTL", artwork: ep.artwork || "" };
    bridge.load(ep.enclosureUrl, meta, { seekTo: resumeTime, rate: resumeSpeed })
      .then(() => bridge.play());
  }, [currentEp, speed, updateRecents, cleanupPendingSeek, bridge]);

  const clearRecent = useCallback((guid) => {
    updateRecents(prev => prev.filter(r => r.guid !== guid));
  }, [updateRecents]);

  return {
    // State
    currentEp, isPlaying, progress, duration, speed,
    buffering, error, bufferedPct,
    fullScreen, bubbleMode, activated,
    // Actions
    playEpisode, loadForQueue,
    togglePlay, skip, seekTo, cycleSpeed, retry,
    stop, dismiss,
    openFullScreen, closeFullScreen, minimize, restore,
    resumeRecent, clearRecent,
  };
}
