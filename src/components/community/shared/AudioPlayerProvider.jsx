import { t } from "../../../theme";
import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { getAudioBridge } from "../../../utils/nativeAudioBridge";
import { reportDeadAudio } from "../../../utils/reportDeadAudio";
import { trackEvent } from "../../../hooks/useAnalytics";
import {
  SPEEDS, STORAGE_KEY, RECENTS_KEY, ACCENT, SAVE_INTERVAL, BOOKMARK_EXPIRY,
  MAX_RECENTS, STALL_TIMEOUT,
} from "./audio/audioHelpers";
import PlayerBubble from "./audio/PlayerBubble";
import FullScreenPlayer from "./audio/FullScreenPlayer";
import QueueToast from "./audio/QueueToast";
// Re-exported so existing consumers (PodcastCard, VhsSleeveSheet) don't need to update their import paths yet
export { renderWithTimecodes } from "./audio/audioHelpers";

const AudioPlayerContext = createContext(null);
export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be inside AudioPlayerProvider");
  return ctx;
}

function saveBookmark(ep, time, spd, dur) {
  try {
    if (!ep) { localStorage.removeItem(STORAGE_KEY); return; }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      guid: ep.guid,
      title: ep.title,
      enclosureUrl: ep.enclosureUrl,
      community: ep.community || null,
      artwork: ep.artwork || null,
      time: Math.floor(time),
      speed: spd,
      duration: dur || 0,
      savedAt: Date.now(),
    }));
  } catch {}
}

function loadBookmark() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (Date.now() - s.savedAt > BOOKMARK_EXPIRY) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return s;
  } catch { return null; }
}

// ── Recents persistence ─────────────────────────────────────

function loadRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    // Filter out expired entries
    const now = Date.now();
    return arr.filter(r => now - r.savedAt < BOOKMARK_EXPIRY);
  } catch { return []; }
}

function persistRecents(recents) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, MAX_RECENTS)));
  } catch {}
}

function upsertRecent(recents, ep, time, spd, dur) {
  if (!ep || !ep.enclosureUrl) return recents;
  // Don't save if barely started (< 15s) and no meaningful progress
  if (time < 15 && (!dur || time / dur < 0.01)) return recents;
  const entry = {
    guid: ep.guid,
    title: ep.title,
    enclosureUrl: ep.enclosureUrl,
    community: ep.community || null, // e.g. "Now Playing Podcast", "Big Picture"
    artwork: ep.artwork || null,
    time: Math.floor(time),
    speed: spd,
    duration: dur || 0,
    savedAt: Date.now(),
  };
  // Remove existing entry for this episode, add to front
  const filtered = recents.filter(r => r.guid !== ep.guid && r.enclosureUrl !== ep.enclosureUrl);
  return [entry, ...filtered].slice(0, MAX_RECENTS);
}

// ── Provider ────────────────────────────────────────────────

export default function AudioPlayerProvider({ children, session }) {
  const bridgeRef = useRef(null);
  // Lazily get the bridge singleton
  if (!bridgeRef.current) bridgeRef.current = getAudioBridge();
  const bridge = bridgeRef.current;

  const [currentEp, setCurrentEp] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState(null);       // null | string message
  const [bufferedPct, setBufferedPct] = useState(0); // 0-100, buffered range %
  const [fullScreen, setFullScreen] = useState(false);
  const [bubbleMode, setBubbleMode] = useState("badge"); // "badge" | "pill"
  const [activated, setActivated] = useState(false); // true once user plays something this session
  const [sleepTimer, setSleepTimer] = useState(null); // null | { label, deadline, timerId }
  const [queue, setQueue] = useState([]);             // session-only play queue
  const sleepTimerRef = useRef(null);
  const stallTimerRef = useRef(null);
  const seekTargetRef = useRef(null); // { time, ts } — holds seek position until playback catches up
  const queueRef = useRef([]);
  const advanceQueueRef = useRef(null);
  const pendingAutoPlayRef = useRef(false);
  const queueToastRef = useRef(null);
  const [queueToast, setQueueToast] = useState(null); // null | { title }
  const [recents, setRecents] = useState(() => loadRecents());
  const recentsRef = useRef(recents);
  const saveThrottle = useRef(0);
  const restoredRef = useRef(false);

  // Keep ref in sync — but also update ref immediately in updateRecents
  const updateRecents = useCallback((updater) => {
    setRecents(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      recentsRef.current = next;
      persistRecents(next);
      return next;
    });
  }, []);

  // ── Restore bookmark into recents on mount ─────────────────
  // Don't restore to currentEp — player stays dormant until user plays from a community.
  // Saved progress gets merged into recents so it's available when they do engage.
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = loadBookmark();
    if (saved?.enclosureUrl && saved.time > 15) {
      updateRecents(prev => {
        const idx = prev.findIndex(r => r.guid === saved.guid || r.enclosureUrl === saved.enclosureUrl);
        if (idx >= 0) {
          // Episode exists in recents — update position if bookmark is newer
          if (saved.time > prev[idx].time) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], time: saved.time, speed: saved.speed || updated[idx].speed, duration: saved.duration || updated[idx].duration, savedAt: saved.savedAt };
            return updated;
          }
          return prev;
        }
        return upsertRecent(prev, saved, saved.time, saved.speed || 1, saved.duration || 0);
      });
      localStorage.removeItem(STORAGE_KEY); // consumed — now lives in recents
    }
  }, [updateRecents]);

  // ── Bridge event listeners ────────────────────────────────
  useEffect(() => {
    const onTimeUpdate = ({ currentTime, duration: dur }) => {
      // If we're waiting for a seek to land, hold the optimistic position
      // until playback catches up (within 2s of target) or 8s timeout
      if (seekTargetRef.current) {
        const { time: target, ts } = seekTargetRef.current;
        const caught = Math.abs(currentTime - target) < 2;
        const expired = Date.now() - ts > 8000;
        if (caught || expired) {
          seekTargetRef.current = null;
        } else {
          // Suppress this timeupdate — keep showing the seek target
          return;
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
      setIsPlaying(true); setBuffering(false); setError(null);
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
      // Analytics: track episode completion
      if (currentEp && session?.user?.id) {
        trackEvent(session.user.id, "episode_complete", {
          episode_title: currentEp.title,
          podcast_slug: currentEp.community || null,
          episode_id: currentEp.guid || null,
          duration_seconds: Math.round(bridge.duration || 0),
        });
      }
      // Sleep timer — end of episode
      if (sleepTimerRef.current?.endOfEpisode) {
        clearTimeout(sleepTimerRef.current.timerId);
        setSleepTimer(null);
        sleepTimerRef.current = null;
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
      setBuffering(false); setError(null);
      clearTimeout(stallTimerRef.current);
    };
    const onBufferProgress = ({ bufferedPct: pct }) => {
      setBufferedPct(pct || 0);
    };
    // On native, sync UI when app regains focus after background playback
    const onFocusRegained = async () => {
      // Force a state refresh — bridge already synced its internal state
      setProgress(bridge.currentTime);
      // If queue advanced in background but play failed, retry now that we're in foreground
      if (pendingAutoPlayRef.current && !bridge.playing) {
        console.log("[AudioProvider] Resuming pending auto-play after focus regained");
        pendingAutoPlayRef.current = false;
        setBuffering(true);
        try {
          await bridge.play();
        } catch (e) {
          console.warn("[AudioProvider] Focus-resume play failed:", e);
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
  }, [currentEp, speed, bridge]);

  // ── Save on visibility change / beforeunload ─────────────
  useEffect(() => {
    const save = async () => {
      if (currentEp) {
        const ct = bridge.isNative ? await bridge.getFreshCurrentTime() : bridge.currentTime;
        const dur = bridge.duration;
        saveBookmark(currentEp, ct, speed, dur);
        if (ct > 15) {
          const updated = upsertRecent(recentsRef.current, currentEp, ct, speed, dur);
          recentsRef.current = updated;
          persistRecents(updated);
        }
      }
    };
    const onVis = () => { if (document.hidden) save(); };
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeunload", save);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [currentEp, speed, bridge]);

  // ── Actions ──────────────────────────────────────────────

  // Legacy cleanup stub — bridge handles seeks internally now
  const cleanupPendingSeek = useCallback(() => {}, []);

  const playEpisode = useCallback((ep) => {
    if (!ep?.enclosureUrl) return;

    const isSameEp = currentEp && (currentEp.guid === ep.guid || currentEp.enclosureUrl === ep.enclosureUrl);
    if (isSameEp) {
      isPlaying ? bridge.pause() : bridge.play();
      return;
    }

    // Clean up any pending seek from a previous rapid switch
    cleanupPendingSeek();

    // Analytics: track new episode play
    trackEvent(session?.user?.id, "episode_play", {
      episode_title: ep.title,
      podcast_slug: ep.community || null,
      episode_id: ep.guid || null,
      resumed: !!(recentsRef.current.find(r => r.guid === ep.guid || r.enclosureUrl === ep.enclosureUrl)?.time > 15),
    });

    // Save current episode to recents before switching
    if (currentEp && bridge.currentTime > 15) {
      updateRecents(prev => upsertRecent(prev, currentEp, bridge.currentTime, speed, bridge.duration));
    }

    // Check if this episode has a saved position in recents (use ref for fresh value)
    const saved = recentsRef.current.find(r => r.guid === ep.guid || r.enclosureUrl === ep.enclosureUrl);

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
      bridge.load(ep.enclosureUrl, meta, {
        seekTo: saved.time,
        rate: saved.speed || speed,
      }).then(() => bridge.play());
    } else {
      setProgress(ep.startAt || 0);
      setDuration(0);
      bridge.load(ep.enclosureUrl, meta, { seekTo: ep.startAt || 0, rate: speed })
        .then(() => bridge.play());
    }
  }, [currentEp, isPlaying, speed, updateRecents, cleanupPendingSeek, bridge]);

  const togglePlay = useCallback(() => {
    if (!currentEp) return;
    isPlaying ? bridge.pause() : bridge.play();
  }, [isPlaying, currentEp, bridge]);

  const skip = useCallback((sec) => {
    const ct = bridge.currentTime;
    const newTime = Math.max(0, Math.min(duration || 0, ct + sec));
    bridge.seek(newTime);
  }, [bridge, duration]);

  const seekTo = useCallback((time) => {
    const clamped = Math.max(0, Math.min(duration || 0, time));
    // Optimistically show the seek target immediately
    setProgress(clamped);
    seekTargetRef.current = { time: clamped, ts: Date.now() };
    bridge.seek(clamped);
  }, [bridge, duration]);

  const cycleSpeed = useCallback(() => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    bridge.setRate(next);
  }, [speed, bridge]);

  // ── Retry — reload current episode's audio source ────────
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

  // ── Sleep timer ─────────────────────────────────────────
  const setSleepTimerAction = useCallback((option) => {
    // Clear any existing timer
    if (sleepTimerRef.current?.timerId) clearTimeout(sleepTimerRef.current.timerId);

    if (option.minutes === -1) {
      // "End of episode" — no real timer, just flag it
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
  }, []);

  const clearSleepTimer = useCallback(() => {
    if (sleepTimerRef.current?.timerId) clearTimeout(sleepTimerRef.current.timerId);
    sleepTimerRef.current = null;
    setSleepTimer(null);
  }, []);

  // Clean up sleep timer on unmount
  useEffect(() => {
    return () => {
      if (sleepTimerRef.current?.timerId) clearTimeout(sleepTimerRef.current.timerId);
    };
  }, []);

  // ── Queue actions ──────────────────────────────────────
  const updateQueue = useCallback((updater) => {
    setQueue(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      queueRef.current = next;
      return next;
    });
  }, []);

  const showNudge = useCallback((msg, remove = false) => {
    clearTimeout(queueToastRef.current);
    setQueueToast({ title: msg, custom: true, remove });
    queueToastRef.current = setTimeout(() => setQueueToast(null), 2200);
  }, []);

  const addToQueue = useCallback((ep) => {
    if (!ep?.enclosureUrl) return;
    const isDuplicate = queueRef.current.some(q => q.enclosureUrl === ep.enclosureUrl);
    if (!isDuplicate) {
      updateQueue(prev => [...prev, ep]);
    }
    // Show toast
    clearTimeout(queueToastRef.current);
    setQueueToast(isDuplicate ? { title: ep.title, duplicate: true } : { title: ep.title });
    queueToastRef.current = setTimeout(() => setQueueToast(null), 2200);
  }, [updateQueue]);

  const playNextInQueue = useCallback((ep) => {
    if (!ep?.enclosureUrl) return;
    updateQueue(prev => {
      const filtered = prev.filter(q => q.enclosureUrl !== ep.enclosureUrl);
      return [ep, ...filtered];
    });
  }, [updateQueue]);

  const removeFromQueue = useCallback((index) => {
    updateQueue(prev => prev.filter((_, i) => i !== index));
  }, [updateQueue]);

  const clearQueue = useCallback(() => {
    updateQueue([]);
  }, [updateQueue]);

  // Auto-advance: play next queued episode when current one ends
  const advanceQueue = useCallback(() => {
    const next = queueRef.current[0];
    if (!next) return false;
    updateQueue(prev => prev.slice(1));
    // Save current to recents
    if (currentEp && bridge.currentTime > 15) {
      updateRecents(prev => upsertRecent(prev, currentEp, bridge.currentTime, speed, bridge.duration));
    }
    setCurrentEp(next);
    setProgress(0);
    setDuration(0);
    setBuffering(true);
    setError(null);
    setBufferedPct(0);
    const meta = { title: next.title, artist: next.community || "MANTL", artwork: next.artwork || "" };
    pendingAutoPlayRef.current = true;
    bridge.load(next.enclosureUrl, meta, { rate: speed })
      .then(() => bridge.play())
      .then(() => { pendingAutoPlayRef.current = false; })
      .catch((e) => {
        console.warn("[AudioProvider] Queue advance play failed — will retry on focus:", e);
        // Don't set error — leave pendingAutoPlayRef true so focusregained can retry
      });
    return true;
  }, [currentEp, speed, updateRecents, updateQueue, bridge]);

  // Keep ref in sync so the ended handler always has the latest
  useEffect(() => { advanceQueueRef.current = advanceQueue; }, [advanceQueue]);

  const stop = useCallback(() => {
    cleanupPendingSeek();
    clearSleepTimer();
    clearQueue();
    bridge.destroy();
    setCurrentEp(null);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setError(null);
    setFullScreen(false);
    setBubbleMode("badge");
  }, [cleanupPendingSeek, clearSleepTimer, clearQueue, bridge]);

  // Dismiss — save position to recents so user can resume later, then clean up
  const dismiss = useCallback(() => {
    // Explicitly save to recents before tearing down
    const ct = bridge.currentTime;
    const dur = bridge.duration;
    if (currentEp && ct > 5) {
      updateRecents(prev => upsertRecent(prev, currentEp, ct, speed, dur));
      saveBookmark(currentEp, ct, speed, dur);
    }
    cleanupPendingSeek();
    clearSleepTimer();
    bridge.destroy();
    setCurrentEp(null);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setError(null);
    setFullScreen(false);
    setBubbleMode("badge");
  }, [currentEp, speed, updateRecents, cleanupPendingSeek, clearSleepTimer, bridge]);

  const openFullScreen = useCallback(() => { setFullScreen(true); }, []);
  const closeFullScreen = useCallback(() => setFullScreen(false), []);
  const minimize = useCallback(() => setBubbleMode("badge"), []);
  const restore = useCallback(() => setBubbleMode("pill"), []);

  // Resume a recently played episode from its saved position
  const resumeRecent = useCallback((recent) => {
    if (!recent?.enclosureUrl) return;

    cleanupPendingSeek();

    // Save current episode to recents before switching
    if (currentEp && bridge.currentTime > 15) {
      updateRecents(prev => upsertRecent(prev, currentEp, bridge.currentTime, speed, bridge.duration));
    }

    const ep = { guid: recent.guid, title: recent.title, enclosureUrl: recent.enclosureUrl, community: recent.community || null, artwork: recent.artwork || null };
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

  // Remove a single episode from recents
  const clearRecent = useCallback((guid) => {
    updateRecents(prev => prev.filter(r => r.guid !== guid));
  }, [updateRecents]);

  // ── Media notification ──────────────────────────────────────
  // On native: the @mediagrid/capacitor-native-audio plugin handles all
  // notification/lock-screen controls via its built-in foreground service.
  // On web: the bridge sets up navigator.mediaSession in load().
  // Update metadata when episode changes (web only — native sets it in load()).
  useEffect(() => {
    if (bridge.isNative || !currentEp) return;
    bridge.changeMetadata({
      title: currentEp.title || "Unknown Episode",
      artist: currentEp.community || "MANTL",
      artwork: currentEp.artwork || currentEp.image || "",
    });
  }, [currentEp, bridge]);

  // ── Context value ────────────────────────────────────────

  const value = useMemo(() => ({
    currentEp, isPlaying, speed, buffering, error, recents, queue,
    bubbleMode, activated, play: playEpisode, togglePlay, skip, stop, dismiss, cycleSpeed, retry,
    openFullScreen, fullScreen, resumeRecent, clearRecent, minimize, restore,
    sleepTimer, setSleepTimer: setSleepTimerAction, clearSleepTimer,
    addToQueue, playNext: playNextInQueue, removeFromQueue, clearQueue, showNudge, seekTo,
  }), [
    currentEp, isPlaying, speed, buffering, error, recents, queue,
    bubbleMode, activated, playEpisode, togglePlay, skip, stop, dismiss, cycleSpeed, retry, openFullScreen, fullScreen,
    resumeRecent, clearRecent, minimize, restore,
    sleepTimer, setSleepTimerAction, clearSleepTimer,
    addToQueue, playNextInQueue, removeFromQueue, clearQueue, showNudge, seekTo,
  ]);

  // ── Render ───────────────────────────────────────────────

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}

      <style>{`
        @keyframes audioEqBar {
          0% { height: 4px; }
          100% { height: 16px; }
        }
        @keyframes audioSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes audioSheetBgIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes audioSheetSlideIn {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes audioSheetOut {
          to { opacity: 0; }
        }
        @keyframes audioSheetSlideOut {
          to { transform: translateY(100%); }
        }
        @keyframes nudgeSlideIn {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes nudgeSlideOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(24px); }
        }
        @keyframes skipFlashIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Player bubble — morphs between badge and pill */}
      {activated && currentEp && !fullScreen && createPortal(
        <PlayerBubble
          episode={currentEp}
          isPlaying={isPlaying}
          buffering={buffering}
          error={error}
          progress={progress}
          duration={duration}
          mode={bubbleMode}
          queueCount={queue.length}
          onTogglePlay={togglePlay}
          onExpand={restore}
          onCollapse={minimize}
          onOpenFull={openFullScreen}
          onDismiss={dismiss}
          onRetry={retry}
        />,
        document.body
      )}


      {/* Queue toast — brief feedback when episode is added */}
      {queueToast && createPortal(
        <QueueToast toast={queueToast} />,
        document.body
      )}

      {/* Full-screen sheet — can open with or without a current episode */}
      {fullScreen && createPortal(
        <FullScreenPlayer
          episode={currentEp}
          isPlaying={isPlaying}
          buffering={buffering}
          error={error}
          bufferedPct={bufferedPct}
          progress={progress}
          duration={duration}
          speed={speed}
          recents={recents}
          onTogglePlay={togglePlay}
          onSkip={skip}
          onSeek={seekTo}
          onCycleSpeed={cycleSpeed}
          onRetry={retry}
          onResumeRecent={(r) => { resumeRecent(r); }}
          onClearRecent={(guid) => { clearRecent(guid); }}
          onStop={() => { stop(); }}
          onClose={closeFullScreen}
          sleepTimer={sleepTimer}
          onSetSleep={setSleepTimerAction}
          onClearSleep={clearSleepTimer}
          queue={queue}
          onRemoveFromQueue={removeFromQueue}
          onClearQueue={clearQueue}
        />,
        document.body
      )}
    </AudioPlayerContext.Provider>
  );
}
