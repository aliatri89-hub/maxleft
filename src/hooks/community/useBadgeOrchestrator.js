import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useBadges } from "./useBadges";

/**
 * useBadgeOrchestrator — manages badge celebration/toast/auto-check lifecycle.
 *
 * Wraps useBadges and adds orchestration state:
 *   - celebrationBadge / detailBadge / completionToast / showBadgePage state
 *   - showCompletionToast — shows "Badge Unlocked" toast; tap → celebration
 *   - Auto-check on mount (catches completions from dashboard/sync)
 *   - Re-check when Letterboxd sync completes (letterboxdSyncSignal)
 *   - earnedCount for this community's badges
 *
 * Progress toasts are killed — progress lives in notification center.
 * Completion toast shows above nav; user taps to celebrate (no auto-interrupt).
 */

export function useBadgeOrchestrator(communityId, userId, letterboxdSyncSignal) {
  // ── Core badge data ────────────────────────────────────────
  const {
    badges, earnedBadgeIds, badgeProgress, checkForBadge, checkAllBadges,
    getBadgeForItem, revokeBadgeIfNeeded, loading: badgesLoading,
  } = useBadges(communityId, userId);

  // ── Orchestration state ────────────────────────────────────
  const [celebrationBadge, setCelebrationBadge] = useState(null);
  const [detailBadge, setDetailBadge] = useState(null);
  const [completionToast, setCompletionToast] = useState(null); // { badge, current, total, visible }
  const completionTimer = useRef(null);
  const [showBadgePage, setShowBadgePage] = useState(false);

  // Count only badges earned in THIS community
  const earnedCount = useMemo(
    () => badges.filter(b => earnedBadgeIds.has(b.id)).length,
    [badges, earnedBadgeIds]
  );

  // ── Completion toast (replaces all progress toasts) ────────
  // Shows "Badge Unlocked" toast above nav. Tap → celebration.
  // Auto-dismisses after 4.5s if not tapped.

  const showCompletionToast = useCallback((badge) => {
    if (completionTimer.current) clearTimeout(completionTimer.current);

    const total = badgeProgress[badge.id]?.total || 1;
    setCompletionToast({ badge, current: total, total, visible: false });

    // Animate in
    setTimeout(() => {
      setCompletionToast(prev => prev ? { ...prev, visible: true } : null);
    }, 50);

    // Auto-dismiss after 4.5s
    completionTimer.current = setTimeout(() => {
      setCompletionToast(prev => prev ? { ...prev, visible: false } : null);
      setTimeout(() => setCompletionToast(null), 500);
    }, 4500);
  }, [badgeProgress]);

  const handleCompletionToastTap = useCallback(() => {
    if (!completionToast?.badge) return;
    if (completionTimer.current) clearTimeout(completionTimer.current);
    const badge = completionToast.badge;
    setCompletionToast(prev => prev ? { ...prev, visible: false } : null);
    setTimeout(() => {
      setCompletionToast(null);
      setCelebrationBadge(badge);
    }, 400);
  }, [completionToast]);

  // ── Auto-check badges on load ──────────────────────────────
  // Catches completions from sync/import — shows completion toast, not auto-celebration
  const badgeAutoChecked = useRef(false);
  useEffect(() => {
    if (badgeAutoChecked.current || badgesLoading || badges.length === 0) return;
    badgeAutoChecked.current = true;
    checkAllBadges().then(earned => {
      if (earned.length > 0) {
        showCompletionToast(earned[0]);
      }
    });
  }, [badgesLoading, badges.length, checkAllBadges, showCompletionToast]);

  // ── Re-check on Letterboxd sync ────────────────────────────
  // No more progress toasts — notification center handles progress.
  const prevSyncSignal = useRef(letterboxdSyncSignal);
  useEffect(() => {
    if (!letterboxdSyncSignal || letterboxdSyncSignal === prevSyncSignal.current) return;
    prevSyncSignal.current = letterboxdSyncSignal;
    checkAllBadges().then(earned => {
      if (earned.length > 0) {
        showCompletionToast(earned[0]);
      }
      // Progress is handled by notification center — no toasts
    });
  }, [letterboxdSyncSignal, checkAllBadges, showCompletionToast]);

  return {
    // Badge data (from useBadges)
    badges,
    earnedBadgeIds,
    badgeProgress,
    checkForBadge,
    checkAllBadges,
    getBadgeForItem,
    revokeBadgeIfNeeded,
    badgesLoading,

    // Orchestration state
    celebrationBadge,
    setCelebrationBadge,
    detailBadge,
    setDetailBadge,
    completionToast,
    showBadgePage,
    setShowBadgePage,
    earnedCount,

    // Orchestration actions
    showCompletionToast,
    handleCompletionToastTap,
  };
}
