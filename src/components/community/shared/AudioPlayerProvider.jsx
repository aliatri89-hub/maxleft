/**
 * AudioPlayerProvider.jsx
 *
 * Thin orchestrator that wires the audio subsystem together and exposes
 * it to the component tree via AudioPlayerContext.
 *
 * All logic lives in the hooks below — this file is intentionally minimal:
 *   - Creates the shared refs that break circular dependencies between hooks
 *   - Calls the 4 hooks in dependency order
 *   - Builds the context value
 *   - Renders the portal tree (bubble, full-screen sheet, queue toast, keyframes)
 *
 * Hook dependency order:
 *   1. usePlaybackPersistence  — bookmarks, recents, save-on-visibility
 *   2. useSleepTimer           — sleep timer state + timeout actions
 *   3. usePlaybackEngine       — bridge events, all playback state + actions
 *   4. useQueueManager         — queue state, auto-advance, toast
 *
 * Circular dep resolution:
 *   advanceQueueRef    — engine's onEnded reads it; useQueueManager populates it
 *   pendingAutoPlayRef — shared between engine (focusregained) and queue (advance)
 *   clearQueueRef      — engine's stop/dismiss reads it; useQueueManager populates it
 *   loadForQueue       — engine exposes it; useQueueManager calls it for auto-advance
 */

import { createContext, useContext, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { getAudioBridge } from "../../../utils/nativeAudioBridge";
import usePlaybackPersistence from "./audio/usePlaybackPersistence";
import useSleepTimer from "./audio/useSleepTimer";
import usePlaybackEngine from "./audio/usePlaybackEngine";
import useQueueManager from "./audio/useQueueManager";
import PlayerBubble from "./audio/PlayerBubble";
import FullScreenPlayer from "./audio/FullScreenPlayer";
import QueueToast from "./audio/QueueToast";

// Re-exported so existing consumers (PodcastCard, VhsSleeveSheet) don't need
// to update their import paths yet.
export { renderWithTimecodes } from "./audio/audioHelpers";

// ── Context ──────────────────────────────────────────────────────────────────

const AudioPlayerContext = createContext(null);

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be inside AudioPlayerProvider");
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export default function AudioPlayerProvider({ children, session }) {
  // Bridge singleton — lazily initialised once
  const bridgeRef = useRef(null);
  if (!bridgeRef.current) bridgeRef.current = getAudioBridge();
  const bridge = bridgeRef.current;

  // Shared refs that break circular dependencies between engine and queue hooks
  const advanceQueueRef    = useRef(null);  // populated by useQueueManager
  const pendingAutoPlayRef = useRef(false); // shared: engine reads, queue sets
  const clearQueueRef      = useRef(null);  // populated by useQueueManager

  // ── Hook calls (order matters) ────────────────────────────────────────────

  const { recents, updateRecents, recentsRef, saveThrottle } =
    usePlaybackPersistence(bridge);

  const { sleepTimer, setSleepTimerAction, clearSleepTimer, sleepTimerRef } =
    useSleepTimer(bridge);

  const engine = usePlaybackEngine(bridge, session, {
    advanceQueueRef,
    sleepTimerRef,
    pendingAutoPlayRef,
    updateRecents,
    recentsRef,
    saveThrottle,
    clearSleepTimer,
    clearQueueRef,
  });

  const {
    queue, addToQueue, playNextInQueue, removeFromQueue, clearQueue,
    showNudge, queueToast,
  } = useQueueManager({
    loadForQueue: engine.loadForQueue,
    currentEp: engine.currentEp,
    speed: engine.speed,
    bridge,
    updateRecents,
    recentsRef,
    advanceQueueRef,
    pendingAutoPlayRef,
    clearQueueRef,
  });

  // ── Context value ─────────────────────────────────────────────────────────

  const value = useMemo(() => ({
    // Playback state
    currentEp: engine.currentEp,
    isPlaying: engine.isPlaying,
    speed: engine.speed,
    buffering: engine.buffering,
    error: engine.error,
    bubbleMode: engine.bubbleMode,
    activated: engine.activated,
    fullScreen: engine.fullScreen,
    // Playback actions
    play: engine.playEpisode,
    togglePlay: engine.togglePlay,
    skip: engine.skip,
    seekTo: engine.seekTo,
    cycleSpeed: engine.cycleSpeed,
    retry: engine.retry,
    stop: engine.stop,
    dismiss: engine.dismiss,
    openFullScreen: engine.openFullScreen,
    minimize: engine.minimize,
    restore: engine.restore,
    // Recents
    recents,
    resumeRecent: engine.resumeRecent,
    clearRecent: engine.clearRecent,
    // Sleep timer
    sleepTimer,
    setSleepTimer: setSleepTimerAction,
    clearSleepTimer,
    // Queue
    queue,
    addToQueue,
    playNext: playNextInQueue,
    removeFromQueue,
    clearQueue,
    showNudge,
  }), [
    engine.currentEp, engine.isPlaying, engine.speed, engine.buffering, engine.error,
    engine.bubbleMode, engine.activated, engine.fullScreen,
    engine.playEpisode, engine.togglePlay, engine.skip, engine.seekTo,
    engine.cycleSpeed, engine.retry, engine.stop, engine.dismiss,
    engine.openFullScreen, engine.minimize, engine.restore,
    engine.resumeRecent, engine.clearRecent,
    recents,
    sleepTimer, setSleepTimerAction, clearSleepTimer,
    queue, addToQueue, playNextInQueue, removeFromQueue, clearQueue, showNudge,
  ]);

  // ── Render ────────────────────────────────────────────────────────────────

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

      {/* Mini player — morphs between badge (circle) and pill (strip) */}
      {engine.activated && engine.currentEp && !engine.fullScreen && createPortal(
        <PlayerBubble
          episode={engine.currentEp}
          isPlaying={engine.isPlaying}
          buffering={engine.buffering}
          error={engine.error}
          progress={engine.progress}
          duration={engine.duration}
          mode={engine.bubbleMode}
          queueCount={queue.length}
          onTogglePlay={engine.togglePlay}
          onExpand={engine.restore}
          onCollapse={engine.minimize}
          onOpenFull={engine.openFullScreen}
          onDismiss={engine.dismiss}
          onRetry={engine.retry}
        />,
        document.body
      )}

      {/* Queue toast — brief feedback when episode is added */}
      {queueToast && createPortal(
        <QueueToast toast={queueToast} />,
        document.body
      )}

      {/* Full-screen sheet — can open with or without an active episode */}
      {engine.fullScreen && createPortal(
        <FullScreenPlayer
          episode={engine.currentEp}
          isPlaying={engine.isPlaying}
          buffering={engine.buffering}
          error={engine.error}
          bufferedPct={engine.bufferedPct}
          progress={engine.progress}
          duration={engine.duration}
          speed={engine.speed}
          recents={recents}
          onTogglePlay={engine.togglePlay}
          onSkip={engine.skip}
          onSeek={engine.seekTo}
          onCycleSpeed={engine.cycleSpeed}
          onRetry={engine.retry}
          onResumeRecent={engine.resumeRecent}
          onClearRecent={engine.clearRecent}
          onStop={engine.stop}
          onClose={engine.closeFullScreen}
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
