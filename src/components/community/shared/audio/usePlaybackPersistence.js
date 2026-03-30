/**
 * usePlaybackPersistence.js
 *
 * Manages all audio playback persistence to localStorage:
 *   - Bookmark: single-episode save (guid, time, speed, duration) with 30-day expiry.
 *     Written on every timeupdate tick (throttled to SAVE_INTERVAL), on pause, and on
 *     visibility change / beforeunload. Consumed on mount and merged into recents.
 *   - Recents: ordered list of up to MAX_RECENTS recently-played episodes. Updated
 *     whenever progress is saved. Displayed in the FullScreenPlayer "Recently Played" list.
 *
 * Hook signature:
 *   usePlaybackPersistence(bridge)
 *
 * Returns:
 *   { recents, updateRecents, recentsRef, saveThrottle }
 *
 * Note: saveBookmark, loadBookmark, upsertRecent, persistRecents are also exported as
 * named functions so usePlaybackEngine can call them directly from bridge event handlers
 * without going through React state.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  STORAGE_KEY, RECENTS_KEY, BOOKMARK_EXPIRY, MAX_RECENTS,
} from "./audioHelpers";

// ── Pure persistence helpers (exported for use in engine event handlers) ──────

export function saveBookmark(ep, time, spd, dur) {
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

export function loadBookmark() {
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

export function loadRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    const now = Date.now();
    return arr.filter(r => now - r.savedAt < BOOKMARK_EXPIRY);
  } catch { return []; }
}

export function persistRecents(recents) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, MAX_RECENTS)));
  } catch {}
}

export function upsertRecent(recents, ep, time, spd, dur) {
  if (!ep || !ep.enclosureUrl) return recents;
  // Don't save if barely started (< 15s) and no meaningful progress
  if (time < 15 && (!dur || time / dur < 0.01)) return recents;
  const entry = {
    guid: ep.guid,
    title: ep.title,
    enclosureUrl: ep.enclosureUrl,
    community: ep.community || null,
    artwork: ep.artwork || null,
    time: Math.floor(time),
    speed: spd,
    duration: dur || 0,
    savedAt: Date.now(),
  };
  const filtered = recents.filter(
    r => r.guid !== ep.guid && r.enclosureUrl !== ep.enclosureUrl
  );
  return [entry, ...filtered].slice(0, MAX_RECENTS);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export default function usePlaybackPersistence(bridge) {
  const [recents, setRecents] = useState(() => loadRecents());
  const recentsRef = useRef(recents);
  const saveThrottle = useRef(0);
  const restoredRef = useRef(false);

  // Keep ref in sync immediately (before next render) so engine handlers always
  // read the freshest recents list without a stale closure.
  const updateRecents = useCallback((updater) => {
    setRecents(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      recentsRef.current = next;
      persistRecents(next);
      return next;
    });
  }, []);

  // ── Restore bookmark into recents on mount ────────────────────────────────
  // Player stays dormant until user taps play from a community — we just merge
  // any saved bookmark into recents so it appears in "Recently Played".
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = loadBookmark();
    if (saved?.enclosureUrl && saved.time > 15) {
      updateRecents(prev => {
        const idx = prev.findIndex(
          r => r.guid === saved.guid || r.enclosureUrl === saved.enclosureUrl
        );
        if (idx >= 0) {
          if (saved.time > prev[idx].time) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              time: saved.time,
              speed: saved.speed || updated[idx].speed,
              duration: saved.duration || updated[idx].duration,
              savedAt: saved.savedAt,
            };
            return updated;
          }
          return prev;
        }
        return upsertRecent(prev, saved, saved.time, saved.speed || 1, saved.duration || 0);
      });
      localStorage.removeItem(STORAGE_KEY); // consumed — now lives in recents
    }
  }, [updateRecents]);


  return { recents, updateRecents, recentsRef, saveThrottle };
}
