import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useBadges } from "./useBadges";

/**
 * useBadgeOrchestrator — manages badge celebration/toast/auto-check lifecycle.
 *
 * Wraps useBadges and adds all the orchestration state that was previously
 * duplicated across BlankCheckScreen and NowPlayingScreen:
 *   - celebrationBadge / detailBadge / badgeToasts / showBadgePage state
 *   - showSingleBadgeToast / showBadgeProgressToasts actions
 *   - Auto-check on mount (catches completions from dashboard/sync)
 *   - Re-check when Letterboxd sync completes (letterboxdSyncSignal)
 *   - earnedCount for this community's badges
 *
 * Usage:
 *   const badge = useBadgeOrchestrator(community?.id, userId, letterboxdSyncSignal);
 *   // badge.showSingleBadgeToast({ badge, current, total, isComplete }, { delayToCelebration, celebrationBadge });
 *   // badge.celebrationBadge, badge.setCelebrationBadge, etc.
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
  const [badgeToasts, setBadgeToasts] = useState([]);
  const badgeToastTimers = useRef([]);
  const [showBadgePage, setShowBadgePage] = useState(false);

  // Count only badges earned in THIS community
  const earnedCount = useMemo(
    () => badges.filter(b => earnedBadgeIds.has(b.id)).length,
    [badges, earnedBadgeIds]
  );

  // ── Toast helpers ──────────────────────────────────────────

  const clearBadgeToastTimers = () => {
    badgeToastTimers.current.forEach(t => clearTimeout(t));
    badgeToastTimers.current = [];
  };

  const showSingleBadgeToast = useCallback((toastData, { delayToCelebration, celebrationBadge: celBadge } = {}) => {
    clearBadgeToastTimers();
    setBadgeToasts([{ ...toastData, visible: false }]);

    const t0 = setTimeout(() => {
      setBadgeToasts(prev => prev.map(t => ({ ...t, visible: true })));
    }, 50);
    badgeToastTimers.current.push(t0);

    const displayTime = delayToCelebration ? 2000 : 3000;
    const t1 = setTimeout(() => {
      setBadgeToasts(prev => prev.map(t => ({ ...t, visible: false })));
    }, displayTime);
    badgeToastTimers.current.push(t1);

    const t2 = setTimeout(() => {
      setBadgeToasts([]);
      if (delayToCelebration && celBadge) setCelebrationBadge(celBadge);
    }, displayTime + 500);
    badgeToastTimers.current.push(t2);
  }, []);

  const showBadgeProgressToasts = useCallback(() => {
    const toasts = [];
    for (const b of badges) {
      if (earnedBadgeIds.has(b.id)) continue;
      const bp = badgeProgress[b.id];
      if (!bp || bp.current === 0) continue;
      toasts.push({ badge: b, current: bp.current, total: bp.total, isComplete: false });
    }
    if (!toasts.length) return;

    toasts.sort((a, b) => (b.current / b.total) - (a.current / a.total));
    const capped = toasts.slice(0, 3);

    clearBadgeToastTimers();
    setBadgeToasts(capped.map(t => ({ ...t, visible: false })));

    // Stagger entrance
    capped.forEach((_, i) => {
      const tid = setTimeout(() => {
        setBadgeToasts(prev => prev.map((t, j) => j === i ? { ...t, visible: true } : t));
      }, i * 350);
      badgeToastTimers.current.push(tid);
    });

    // Stagger dismissal
    capped.forEach((_, i) => {
      const tid = setTimeout(() => {
        setBadgeToasts(prev => prev.map((t, j) => j === i ? { ...t, visible: false } : t));
      }, 4000 + i * 250);
      badgeToastTimers.current.push(tid);
    });

    const tidClear = setTimeout(() => setBadgeToasts([]), 4000 + capped.length * 250 + 600);
    badgeToastTimers.current.push(tidClear);
  }, [badges, earnedBadgeIds, badgeProgress]);

  // ── Auto-check badges on load ──────────────────────────────
  const badgeAutoChecked = useRef(false);
  useEffect(() => {
    if (badgeAutoChecked.current || badgesLoading || badges.length === 0) return;
    badgeAutoChecked.current = true;
    checkAllBadges().then(earned => {
      if (earned.length > 0) {
        setCelebrationBadge(earned[0]);
      }
    });
  }, [badgesLoading, badges.length, checkAllBadges]);

  // ── Re-check on Letterboxd sync ────────────────────────────
  const prevSyncSignal = useRef(letterboxdSyncSignal);
  useEffect(() => {
    if (!letterboxdSyncSignal || letterboxdSyncSignal === prevSyncSignal.current) return;
    prevSyncSignal.current = letterboxdSyncSignal;
    checkAllBadges().then(earned => {
      if (earned.length > 0) {
        setCelebrationBadge(earned[0]);
      } else {
        showBadgeProgressToasts();
      }
    });
  }, [letterboxdSyncSignal, checkAllBadges, showBadgeProgressToasts]);

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
    badgeToasts,
    showBadgePage,
    setShowBadgePage,
    earnedCount,

    // Orchestration actions
    showSingleBadgeToast,
    showBadgeProgressToasts,
  };
}
