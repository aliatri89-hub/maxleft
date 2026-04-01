// ─── useSubscription Hook ──────────────────────────────────────
//
// Provides subscription state for the current user.
// Initializes RevenueCat on mount, checks entitlements,
// and listens for real-time status changes.
//
// Usage:
//   const { isPro, loading, presentPaywall, presentCustomerCenter } = useSubscription(session);
//
// Free tier:  daily games, feed listening, community browsing, basic tracking
// Paid tier:  all communities, full badge systems, celebration videos,
//             game stats/archive, diary
// ────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import {
  initRevenueCat,
  identifyUser,
  logoutRevenueCat,
  checkSubscription,
  presentPaywall as rcPresentPaywall,
  presentCustomerCenter as rcPresentCustomerCenter,
  restorePurchases as rcRestorePurchases,
  onCustomerInfoUpdate,
  isNativePlatform,
} from "../utils/revenueCat";

export function useSubscription(session) {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const cleanupRef = useRef(null);
  const userId = session?.user?.id;

  // ── Init + identify ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!isNativePlatform) {
        // Web: always free tier, no loading state
        setIsPro(false);
        setLoading(false);
        return;
      }

      setLoading(true);

      // Initialize SDK (idempotent — won't re-configure)
      await initRevenueCat(userId);

      // If we have a user, make sure RC knows who they are
      if (userId) {
        await identifyUser(userId);
      }

      // Check current entitlements
      const { isPro: pro } = await checkSubscription();
      if (!cancelled) {
        setIsPro(pro);
        setLoading(false);
      }

      // Listen for changes (purchase, renewal, expiration)
      const remove = await onCustomerInfoUpdate(({ isPro: pro }) => {
        if (!cancelled) setIsPro(pro);
      });
      cleanupRef.current = remove;
    }

    init();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
    };
  }, [userId]);

  // ── Logout handler ─────────────────────────────────────────
  // Call when the user signs out of Supabase
  useEffect(() => {
    if (!userId && !loading) {
      // User logged out
      logoutRevenueCat();
      setIsPro(false);
    }
  }, [userId, loading]);

  // ── Present paywall ────────────────────────────────────────
  // Shows the RevenueCat-managed native paywall.
  // Returns the result string or null on web.
  const presentPaywall = useCallback(async () => {
    const result = await rcPresentPaywall();
    // After paywall closes, re-check in case status changed
    const { isPro: pro } = await checkSubscription();
    setIsPro(pro);
    return result;
  }, []);

  // ── Present customer center ────────────────────────────────
  // For managing subscriptions (cancel, restore, etc.)
  const presentCustomerCenter = useCallback(async () => {
    await rcPresentCustomerCenter();
    // Re-check after customer center closes
    const { isPro: pro } = await checkSubscription();
    setIsPro(pro);
  }, []);

  // ── Restore purchases ──────────────────────────────────────
  const restorePurchases = useCallback(async () => {
    const { isPro: pro } = await rcRestorePurchases();
    setIsPro(pro);
    return pro;
  }, []);

  return {
    isPro,
    loading,
    presentPaywall,
    presentCustomerCenter,
    restorePurchases,
    isNative: isNativePlatform,
  };
}
