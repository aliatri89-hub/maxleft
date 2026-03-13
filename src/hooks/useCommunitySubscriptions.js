import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

/**
 * useCommunitySubscriptions — manages which podcast communities a user follows.
 *
 * Returns:
 *   subscriptions     — Set of community IDs the user is subscribed to
 *   isSubscribed(id)  — quick check
 *   subscribe(id)     — add a subscription
 *   unsubscribe(id)   — remove a subscription
 *   seedSubscriptions(ids) — bulk-insert during onboarding
 *   loading           — initial load in progress
 *   loaded            — initial load complete (distinguishes "no subs" from "still loading")
 */
export function useCommunitySubscriptions(userId) {
  const [subscriptions, setSubscriptions] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // ── Load on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_community_subscriptions")
        .select("community_id")
        .eq("user_id", userId);

      if (!cancelled && !error) {
        setSubscriptions(new Set((data || []).map(r => r.community_id)));
      }
      if (!cancelled) {
        setLoading(false);
        setLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  // ── Subscribe to a single community ───────────────────────
  const subscribe = useCallback(async (communityId) => {
    if (!userId) return;
    setSubscriptions(prev => new Set([...prev, communityId]));

    const { error } = await supabase
      .from("user_community_subscriptions")
      .upsert({ user_id: userId, community_id: communityId }, { onConflict: "user_id,community_id" });

    if (error) {
      console.error("Subscribe error:", error);
      // Revert optimistic update
      setSubscriptions(prev => {
        const next = new Set(prev);
        next.delete(communityId);
        return next;
      });
    }
  }, [userId]);

  // ── Unsubscribe from a single community ───────────────────
  const unsubscribe = useCallback(async (communityId) => {
    if (!userId) return;
    setSubscriptions(prev => {
      const next = new Set(prev);
      next.delete(communityId);
      return next;
    });

    const { error } = await supabase
      .from("user_community_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("community_id", communityId);

    if (error) {
      console.error("Unsubscribe error:", error);
      // Revert
      setSubscriptions(prev => new Set([...prev, communityId]));
    }
  }, [userId]);

  // ── Bulk seed during onboarding ───────────────────────────
  const seedSubscriptions = useCallback(async (communityIds) => {
    if (!userId || !communityIds?.length) return;

    const rows = communityIds.map(id => ({ user_id: userId, community_id: id }));
    const { error } = await supabase
      .from("user_community_subscriptions")
      .upsert(rows, { onConflict: "user_id,community_id" });

    if (!error) {
      setSubscriptions(new Set(communityIds));
      setLoaded(true);
    } else {
      console.error("Seed subscriptions error:", error);
    }
  }, [userId]);

  // ── Quick check helper ────────────────────────────────────
  const isSubscribed = useCallback((communityId) => {
    return subscriptions.has(communityId);
  }, [subscriptions]);

  return { subscriptions, isSubscribed, subscribe, unsubscribe, seedSubscriptions, loading, loaded };
}
