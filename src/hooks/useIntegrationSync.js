import { useState, useRef, useCallback } from "react";
import { supabase } from "../supabase";
import { useShelves } from "../contexts/ShelvesProvider";

/**
 * useIntegrationSync — Letterboxd sync logic.
 *
 * CONSOLIDATED: All sync logic now runs server-side in sync-letterboxd-batch.
 * The client just calls the edge function in single_user mode (same code the
 * cron uses), gets back { synced, rewatches, community_logged }, and updates UI.
 *
 * This replaces the old client-side DOMParser + TMDB + community backfill +
 * badge check pipeline (~350 lines) with a single fetch call.
 */

const EDGE_FN_URL = "https://api.mymantl.app/functions/v1/sync-letterboxd-batch";

export function useIntegrationSync({ session, showToast, setProfile }) {
  const { loadShelves } = useShelves();
  const userId = session?.user?.id;

  // ── Sync state ──
  const [letterboxdSyncing, setLetterboxdSyncing] = useState(false);
  const [letterboxdLastSync, setLetterboxdLastSync] = useState(null);
  const [letterboxdSyncSignal, setLetterboxdSyncSignal] = useState(null);
  const [autoLogCompleteSignal, setAutoLogCompleteSignal] = useState(null);

  // ── Lock refs (synchronous — prevents race conditions) ──
  const letterboxdLock = useRef(false);
  const hasSyncedThisSession = useRef(false);

  // ════════════════════════════════════════════════
  // LETTERBOXD SYNC — calls sync-letterboxd-batch in single_user mode
  // ════════════════════════════════════════════════

  const syncLetterboxd = async (username, uid, manual = false) => {
    if (!username || !uid || letterboxdLock.current) return null;
    letterboxdLock.current = true;
    setLetterboxdSyncing(true);

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) throw new Error("Not authenticated");

      const res = await fetch(EDGE_FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({ single_user: true }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Sync failed: ${res.status}`);
      }

      const result = await res.json();
      const synced = result.synced || 0;
      const rewatchCount = result.rewatches || 0;

      setLetterboxdLastSync(new Date());

      if (synced > 0 || rewatchCount > 0) {
        setLetterboxdSyncSignal(Date.now());
        await loadShelves(uid);
        setAutoLogCompleteSignal(Date.now());
        return { synced, rewatchCount };
      } else if (manual) {
        showToast("Letterboxd up to date ✓");
      }

      // Still fire autoLogCompleteSignal so listeners aren't left waiting
      setAutoLogCompleteSignal(Date.now());
      return null;
    } catch (e) {
      console.error("[Letterboxd] Sync error:", e);
      if (manual) showToast("Letterboxd sync failed — check username");
      return null;
    } finally {
      letterboxdLock.current = false;
      setLetterboxdSyncing(false);
    }
  };

  // ════════════════════════════════════════════════
  // CONNECT / DISCONNECT
  // ════════════════════════════════════════════════

  const connectLetterboxd = async (username) => {
    if (!username || !session) return;
    const clean = username.trim().toLowerCase();
    const { error } = await supabase.from("profiles").update({ letterboxd_username: clean }).eq("id", session.user.id);
    if (error) { showToast("Couldn't save username"); return; }
    setProfile(prev => ({ ...prev, letterboxd_username: clean }));
    showToast("Letterboxd connected! Syncing...");
    syncLetterboxd(clean, session.user.id, true);
  };

  const disconnectLetterboxd = async () => {
    if (!session) return;
    const { error } = await supabase.from("profiles").update({ letterboxd_username: null }).eq("id", session.user.id);
    if (error) { showToast("Couldn't disconnect Letterboxd"); return; }
    setProfile(prev => ({ ...prev, letterboxd_username: null }));
    setLetterboxdLastSync(null);
    showToast("Letterboxd disconnected");
  };

  // ════════════════════════════════════════════════
  // SESSION-ONCE AUTO-SYNC
  // ════════════════════════════════════════════════

  const runInitialSync = useCallback((profile, uid, { onLetterboxdSync } = {}) => {
    if (hasSyncedThisSession.current) return;
    const id = uid || userId;
    if (!id) return;
    const letterboxdFn = onLetterboxdSync || syncLetterboxd;
    if (profile.letterboxd_username) letterboxdFn(profile.letterboxd_username, id);
    hasSyncedThisSession.current = true;
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // Letterboxd
    letterboxdSyncing, letterboxdLastSync, letterboxdSyncSignal, autoLogCompleteSignal,
    syncLetterboxd, connectLetterboxd, disconnectLetterboxd,
    // Auto-sync
    runInitialSync,
  };
}
