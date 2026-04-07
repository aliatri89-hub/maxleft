/**
 * useAnalytics — Lightweight event tracking for Max Left.
 *
 * Usage:
 *   const { track } = useAnalytics(userId);
 *   track("community_visit", { slug: "now-playing", tab: "films" });
 *
 * Design:
 *   - Generates a session ID per app mount (survives tab switches, not refreshes)
 *   - Batches events in memory, flushes to Supabase every 30s
 *   - Also flushes on visibilitychange (page hide / app background)
 *   - No-ops if userId is null (logged-out users are not tracked)
 *   - Fire-and-forget: tracking failures are silently logged, never thrown
 */
import { useCallback, useEffect, useRef } from "react";
import { supabase } from "../supabase";

// One session ID per app lifecycle (tab/window)
const SESSION_ID = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const FLUSH_INTERVAL = 30_000; // 30 seconds
const MAX_BATCH = 50; // flush if queue hits this even before interval

// Shared queue — singleton across all hook instances
let eventQueue = [];
let flushTimer = null;
let isFlushing = false;

async function flush(userId) {
  if (isFlushing || eventQueue.length === 0 || !userId) return;
  isFlushing = true;

  const batch = eventQueue.splice(0, MAX_BATCH);

  try {
    const { error } = await supabase.from("analytics_events").insert(batch);
    if (error) {
      console.warn("[Analytics] Flush error:", error.message);
      // Put failed events back at front (don't lose data)
      eventQueue.unshift(...batch);
    }
  } catch (e) {
    console.warn("[Analytics] Flush exception:", e.message);
    eventQueue.unshift(...batch);
  } finally {
    isFlushing = false;
  }

  // If there are still events queued, flush again
  if (eventQueue.length >= MAX_BATCH) {
    flush(userId);
  }
}

export function useAnalytics(userId) {
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // Set up interval flush + visibility listener
  useEffect(() => {
    if (!userId) return;

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        flush(userIdRef.current);
      }
    };

    // Start flush interval
    if (!flushTimer) {
      flushTimer = setInterval(() => flush(userIdRef.current), FLUSH_INTERVAL);
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      // Don't clear the interval on unmount — it's shared singleton
    };
  }, [userId]);

  // Flush on unmount (app closing)
  useEffect(() => {
    return () => {
      if (userIdRef.current && eventQueue.length > 0) {
        // Best-effort flush using sendBeacon for reliability
        try {
          const batch = eventQueue.splice(0);
          const body = JSON.stringify(batch);
          // sendBeacon isn't ideal for Supabase, fall back to sync flush
          flush(userIdRef.current);
        } catch {
          // swallow
        }
      }
    };
  }, []);

  const track = useCallback((eventName, eventData = {}) => {
    if (!userIdRef.current) return;

    eventQueue.push({
      user_id: userIdRef.current,
      event_name: eventName,
      event_data: eventData,
      session_id: SESSION_ID,
      created_at: new Date().toISOString(),
    });

    // Eager flush if batch is full
    if (eventQueue.length >= MAX_BATCH) {
      flush(userIdRef.current);
    }
  }, []);

  return { track, sessionId: SESSION_ID };
}

/**
 * Standalone track function for use outside React components
 * (e.g., in API utility files like tripleFeatureApi.js).
 *
 * Usage:
 *   import { trackEvent } from "../hooks/useAnalytics";
 *   trackEvent(userId, "game_played", { game: "triple_feature", score: 42 });
 */
export function trackEvent(userId, eventName, eventData = {}) {
  if (!userId) return;

  eventQueue.push({
    user_id: userId,
    event_name: eventName,
    event_data: eventData,
    session_id: SESSION_ID,
    created_at: new Date().toISOString(),
  });

  if (eventQueue.length >= MAX_BATCH) {
    flush(userId);
  }
}
