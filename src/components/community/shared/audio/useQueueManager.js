/**
 * useQueueManager.js
 *
 * Manages the session-only play queue and the queue-add toast notification.
 *
 * The queue is a simple ordered array of episode objects. When the current episode
 * ends, the engine calls advanceQueueRef.current() to pop the next item and start
 * playback. Background queue-advance is handled via pendingAutoPlayRef — if bridge.play()
 * fails while the app is backgrounded, the flag stays true and the engine's focusregained
 * handler retries on the next foreground resume.
 *
 * Circular dependency note:
 *   advanceQueue needs to trigger playback (via bridge.load + bridge.play), which requires
 *   access to engine state setters. Rather than importing usePlaybackEngine, the provider
 *   passes a loadEpisodeFn callback. advanceQueue calls loadEpisodeFn(ep) instead of
 *   touching engine state directly. The engine exposes this via the returned loadForQueue fn.
 *
 * Hook signature:
 *   useQueueManager({ loadForQueue, currentEp, speed, bridge, updateRecents, recentsRef,
 *                     advanceQueueRef, pendingAutoPlayRef, clearQueueRef })
 *
 * Returns:
 *   { queue, addToQueue, playNextInQueue, removeFromQueue, clearQueue,
 *     showNudge, queueToast }
 *
 *   advanceQueueRef and clearQueueRef are populated inside this hook via useEffect so
 *   the engine's event handlers always call the latest versions.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { upsertRecent } from "./usePlaybackPersistence";

export default function useQueueManager({
  loadForQueue,
  currentEp,
  speed,
  bridge,
  updateRecents,
  recentsRef,
  advanceQueueRef,
  pendingAutoPlayRef,
  clearQueueRef,
}) {
  const [queue, setQueue] = useState([]);
  const queueRef = useRef([]);
  const queueToastRef = useRef(null);
  const [queueToast, setQueueToast] = useState(null);

  // Keep queueRef in sync with state so advanceQueue reads fresh queue without
  // stale closure capture.
  const updateQueue = useCallback((updater) => {
    setQueue(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      queueRef.current = next;
      return next;
    });
  }, []);

  // ── Queue actions ─────────────────────────────────────────────────────────

  const showNudge = useCallback((msg, remove = false) => {
    clearTimeout(queueToastRef.current);
    setQueueToast({ title: msg, custom: true, remove });
    queueToastRef.current = setTimeout(() => setQueueToast(null), 2200);
  }, []);

  const addToQueue = useCallback((ep) => {
    if (!ep?.enclosureUrl) return;
    const isDuplicate = queueRef.current.some(q => q.enclosureUrl === ep.enclosureUrl);
    if (!isDuplicate) updateQueue(prev => [...prev, ep]);
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

  // ── Auto-advance ──────────────────────────────────────────────────────────
  // Called by the engine's onEnded handler via advanceQueueRef.current().
  // Returns true if a next episode was found and loading started, false otherwise.
  const advanceQueue = useCallback(() => {
    const next = queueRef.current[0];
    if (!next) return false;
    updateQueue(prev => prev.slice(1));
    // Save current episode to recents before switching
    if (currentEp && bridge.currentTime > 15) {
      updateRecents(prev => upsertRecent(prev, currentEp, bridge.currentTime, speed, bridge.duration));
    }
    // Delegate actual load+play to the engine via the callback the provider wired up
    pendingAutoPlayRef.current = true;
    loadForQueue(next)
      .then(() => { pendingAutoPlayRef.current = false; })
      .catch((e) => {
        console.warn("[QueueManager] Queue advance play failed — will retry on focus:", e);
        // Leave pendingAutoPlayRef true so focusregained can retry
      });
    return true;
  }, [currentEp, speed, bridge, updateRecents, updateQueue, loadForQueue, pendingAutoPlayRef]);

  // Keep the ref the engine reads up to date
  useEffect(() => { advanceQueueRef.current = advanceQueue; }, [advanceQueue, advanceQueueRef]);

  // Populate clearQueueRef so the engine can call clearQueue from stop/dismiss
  useEffect(() => { clearQueueRef.current = clearQueue; }, [clearQueue, clearQueueRef]);

  return {
    queue,
    addToQueue,
    playNextInQueue,
    removeFromQueue,
    clearQueue,
    showNudge,
    queueToast,
  };
}
