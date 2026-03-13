import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../supabase";

/**
 * useBadges — Badge system hook.
 *
 * Loads active badges for a community, tracks earned badges,
 * and evaluates completion after each item log.
 *
 * OPTIMIZED: Uses server-side RPC (community_badges_init) to load
 * badges + earned + badge items + completions in a single round trip
 * instead of 4 sequential queries. Falls back to multi-query approach
 * if the RPC doesn't exist yet.
 *
 * Returns:
 *   badges          — all active badges for the community
 *   earnedBadgeIds  — Set of badge IDs the user has earned
 *   badgeProgress   — { [badgeId]: { current, total } }
 *   checkForBadge   — (itemId) => Promise<badge | null>  — call after logging
 *   loading         — boolean
 */
export function useBadges(communityId, userId) {
  const [badges, setBadges] = useState([]);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState(new Set());
  const [badgeProgress, setBadgeProgress] = useState({});
  const [loading, setLoading] = useState(false);

  // Ref always has the latest earnedBadgeIds — avoids stale closures
  const earnedRef = useRef(earnedBadgeIds);
  useEffect(() => { earnedRef.current = earnedBadgeIds; }, [earnedBadgeIds]);

  // ─── Process raw data into progress map (shared by RPC + fallback) ──
  const buildProgressMap = (badgeRows, earned, allItems, allCompleted) => {
    const progressMap = {};

    // Mark earned badges
    badgeRows.forEach(b => {
      if (earned.has(b.id)) {
        progressMap[b.id] = { current: -1, total: -1, complete: true };
      }
    });

    const unearnedBadges = badgeRows.filter(
      b => !earned.has(b.id) && b.badge_type === "miniseries_completion" && b.miniseries_id
    );

    for (const badge of unearnedBadges) {
      const badgeItems = (allItems || []).filter(i =>
        i.miniseries_id === badge.miniseries_id
        && (!badge.media_type_filter || i.media_type === badge.media_type_filter)
      );
      const requiredTmdbIds = new Set(badgeItems.map(i => i.tmdb_id).filter(Boolean));
      const completedTmdbIds = new Set(
        (allCompleted || [])
          .filter(c => {
            const tmdbId = c.tmdb_id || c.community_items?.tmdb_id;
            const mediaType = c.media_type || c.community_items?.media_type;
            return requiredTmdbIds.has(tmdbId)
              && (!badge.media_type_filter || mediaType === badge.media_type_filter);
          })
          .map(c => c.tmdb_id || c.community_items?.tmdb_id)
      );

      progressMap[badge.id] = {
        current: completedTmdbIds.size,
        total: badgeItems.length,
        complete: false,
      };
    }

    return progressMap;
  };

  // ─── Load badges + earned status on mount ───────────────────
  useEffect(() => {
    if (!communityId || !userId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);

      // ── Strategy 1: Single RPC (1 round trip) ──────────────
      try {
        const { data, error } = await supabase.rpc("community_badges_init", {
          p_user_id: userId,
          p_community_id: communityId,
        });

        if (error) throw error;
        if (cancelled) return;

        const badgeRows = data.badges || [];
        const earned = new Set(data.earned || []);
        const allItems = data.badge_items || [];
        const allCompleted = data.completed_tmdb || [];

        setBadges(badgeRows);
        setEarnedBadgeIds(earned);
        setBadgeProgress(buildProgressMap(badgeRows, earned, allItems, allCompleted));
        setLoading(false);
        return;
      } catch (rpcErr) {
        console.warn("[Badges] RPC not available, using fallback:", rpcErr.message);
      }

      // ── Strategy 2: Fallback — 4 sequential queries ────────
      // 1. Fetch active badges for this community
      const { data: badgeRows, error: bErr } = await supabase
        .from("badges")
        .select("*")
        .eq("community_id", communityId)
        .eq("is_active", true)
        .order("sort_order");

      if (bErr || !badgeRows) {
        console.error("[Badges] Load error:", bErr?.message);
        setLoading(false);
        return;
      }
      if (cancelled) return;

      // 2. Fetch user's earned badges
      const { data: earnedRows } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", userId);

      if (cancelled) return;

      const earned = new Set((earnedRows || []).map(r => r.badge_id));
      setBadges(badgeRows);
      setEarnedBadgeIds(earned);

      // 3. Calculate progress — 2 bulk queries instead of 2 per badge
      const unearnedBadges = badgeRows.filter(
        b => !earned.has(b.id) && b.badge_type === "miniseries_completion" && b.miniseries_id
      );

      let allItems = [];
      let allCompleted = [];

      if (unearnedBadges.length > 0) {
        const miniseriesIds = [...new Set(unearnedBadges.map(b => b.miniseries_id))];

        const { data: itemRows } = await supabase
          .from("community_items")
          .select("id, miniseries_id, media_type, tmdb_id")
          .in("miniseries_id", miniseriesIds);

        if (cancelled) return;
        allItems = itemRows || [];

        const badgeTmdbIds = [...new Set(allItems.map(i => i.tmdb_id).filter(Boolean))];

        const { data: completedRows } = badgeTmdbIds.length > 0
          ? await supabase
              .from("community_user_progress")
              .select("item_id, community_items!inner(tmdb_id, media_type)")
              .eq("user_id", userId)
              .eq("status", "completed")
              .in("community_items.tmdb_id", badgeTmdbIds)
          : { data: [] };

        if (cancelled) return;
        allCompleted = completedRows || [];
      }

      setBadgeProgress(buildProgressMap(badgeRows, earned, allItems, allCompleted));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [communityId, userId]);

  // ─── Check if logging an item just earned a badge ───────────
  const checkForBadge = useCallback(async (itemId) => {
    if (!userId || badges.length === 0) return null;

    // Find this item's tmdb_id (works regardless of which community copy was logged)
    const { data: itemRow } = await supabase
      .from("community_items")
      .select("tmdb_id, media_type")
      .eq("id", itemId)
      .single();

    if (!itemRow?.tmdb_id) return null;

    // Find which badge miniseries contain an item with this tmdb_id
    const unearnedBadges = badges.filter(
      b => b.badge_type === "miniseries_completion"
        && b.miniseries_id
        && !earnedRef.current.has(b.id)
    );
    if (unearnedBadges.length === 0) return null;

    const badgeMiniseriesIds = unearnedBadges.map(b => b.miniseries_id);

    const { data: matchingItems } = await supabase
      .from("community_items")
      .select("miniseries_id")
      .eq("tmdb_id", itemRow.tmdb_id)
      .in("miniseries_id", badgeMiniseriesIds);

    if (!matchingItems || matchingItems.length === 0) return null;

    const matchedMiniseriesIds = new Set(matchingItems.map(i => i.miniseries_id));
    const candidateBadges = unearnedBadges.filter(
      b => matchedMiniseriesIds.has(b.miniseries_id)
        && (!b.media_type_filter || b.media_type_filter === itemRow.media_type)
    );

    if (candidateBadges.length === 0) return null;

    for (const badge of candidateBadges) {
      // Get all items in this badge's miniseries (with tmdb_ids)
      let totalQuery = supabase
        .from("community_items")
        .select("tmdb_id")
        .eq("miniseries_id", badge.miniseries_id);
      if (badge.media_type_filter) totalQuery = totalQuery.eq("media_type", badge.media_type_filter);
      const { data: badgeItems } = await totalQuery;

      const requiredTmdbIds = [...new Set((badgeItems || []).map(i => i.tmdb_id).filter(Boolean))];
      const total = requiredTmdbIds.length;

      // Count user's completed items by tmdb_id (cross-community)
      const { data: completedRows } = requiredTmdbIds.length > 0
        ? await supabase
            .from("community_user_progress")
            .select("community_items!inner(tmdb_id)")
            .eq("user_id", userId)
            .eq("status", "completed")
            .in("community_items.tmdb_id", requiredTmdbIds)
        : { data: [] };

      const completedTmdbIds = new Set(
        (completedRows || []).map(c => c.community_items?.tmdb_id).filter(Boolean)
      );
      const current = completedTmdbIds.size;

      // Update progress
      setBadgeProgress(prev => ({
        ...prev,
        [badge.id]: { current, total, complete: current >= total },
      }));

      if (current >= total) {
        // 🎉 Badge earned! Insert into user_badges
        const { error: insertErr } = await supabase
          .from("user_badges")
          .insert({ user_id: userId, badge_id: badge.id });

        if (insertErr) {
          // Might already exist (race condition) — that's fine
          if (!insertErr.message.includes("duplicate")) {
            console.error("[Badges] Earn error:", insertErr.message);
          }
        }

        // Update local state + ref immediately
        setEarnedBadgeIds(prev => {
          const next = new Set([...prev, badge.id]);
          earnedRef.current = next;
          return next;
        });

        return badge; // Return the earned badge for celebration
      }
    }

    return null; // No badge earned this time
  }, [userId, badges]);

  // ─── Check ALL badges at once (for post-sync / import) ─────
  const checkAllBadges = useCallback(async () => {
    if (!userId || badges.length === 0) return [];

    const unearnedBadges = badges.filter(
      b => !earnedRef.current.has(b.id) && b.badge_type === "miniseries_completion" && b.miniseries_id
    );
    if (unearnedBadges.length === 0) return [];

    const miniseriesIds = [...new Set(unearnedBadges.map(b => b.miniseries_id))];

    // 2 bulk queries — matched by tmdb_id for cross-community support
    const { data: allItems } = await supabase
      .from("community_items")
      .select("id, miniseries_id, media_type, tmdb_id")
      .in("miniseries_id", miniseriesIds);

    const badgeTmdbIds = [...new Set(
      (allItems || []).map(i => i.tmdb_id).filter(Boolean)
    )];

    const { data: allCompleted } = badgeTmdbIds.length > 0
      ? await supabase
          .from("community_user_progress")
          .select("item_id, community_items!inner(tmdb_id, media_type)")
          .eq("user_id", userId)
          .eq("status", "completed")
          .in("community_items.tmdb_id", badgeTmdbIds)
      : { data: [] };

    const newlyEarned = [];

    for (const badge of unearnedBadges) {
      const badgeItems = (allItems || []).filter(i =>
        i.miniseries_id === badge.miniseries_id
        && (!badge.media_type_filter || i.media_type === badge.media_type_filter)
      );
      const requiredTmdbIds = new Set(badgeItems.map(i => i.tmdb_id).filter(Boolean));
      const completedTmdbIds = new Set(
        (allCompleted || [])
          .filter(c => requiredTmdbIds.has(c.community_items?.tmdb_id)
            && (!badge.media_type_filter || c.community_items?.media_type === badge.media_type_filter))
          .map(c => c.community_items.tmdb_id)
      );

      const current = completedTmdbIds.size;
      const total = badgeItems.length;

      setBadgeProgress(prev => ({
        ...prev,
        [badge.id]: { current, total, complete: current >= total },
      }));

      if (current >= total) {
        const { error: insertErr } = await supabase
          .from("user_badges")
          .insert({ user_id: userId, badge_id: badge.id });

        if (!insertErr || insertErr.message.includes("duplicate")) {
          setEarnedBadgeIds(prev => {
            const next = new Set([...prev, badge.id]);
            earnedRef.current = next;
            return next;
          });
          newlyEarned.push(badge);
          console.log(`[Badges] Auto-earned "${badge.name}" via sync`);
        }
      }
    }

    return newlyEarned; // Array of badges earned — caller can queue celebrations
  }, [userId, badges]);

  // ─── Get progress toward a specific badge ───────────────────
  const getProgress = useCallback((badgeId) => {
    return badgeProgress[badgeId] || null;
  }, [badgeProgress]);

  // ─── Find which badge (if any) an item contributes to ──────
  const getBadgeForItem = useCallback((itemId, miniseriesId, mediaType) => {
    return badges.find(
      b => b.badge_type === "miniseries_completion"
        && b.miniseries_id === miniseriesId
        && (!b.media_type_filter || b.media_type_filter === mediaType)
    ) || null;
  }, [badges]);

  // ─── Revoke badge if unlogging breaks completion ───────────
  const revokeBadgeIfNeeded = useCallback(async (itemId) => {
    if (!userId || badges.length === 0) return;

    // Find this item's tmdb_id
    const { data: itemRow } = await supabase
      .from("community_items")
      .select("tmdb_id, media_type")
      .eq("id", itemId)
      .single();

    if (!itemRow?.tmdb_id) return;

    // Find earned badges whose miniseries contains this tmdb_id
    const earnedBadges = badges.filter(
      b => b.badge_type === "miniseries_completion"
        && b.miniseries_id
        && earnedRef.current.has(b.id)
        && (!b.media_type_filter || b.media_type_filter === itemRow.media_type)
    );
    if (earnedBadges.length === 0) return;

    const { data: matchingItems } = await supabase
      .from("community_items")
      .select("miniseries_id")
      .eq("tmdb_id", itemRow.tmdb_id)
      .in("miniseries_id", earnedBadges.map(b => b.miniseries_id));

    if (!matchingItems || matchingItems.length === 0) return;

    const matchedMiniseriesIds = new Set(matchingItems.map(i => i.miniseries_id));
    const affectedBadges = earnedBadges.filter(b => matchedMiniseriesIds.has(b.miniseries_id));

    for (const badge of affectedBadges) {
      // Delete from user_badges
      await supabase
        .from("user_badges")
        .delete()
        .eq("user_id", userId)
        .eq("badge_id", badge.id);

      // Update local state + ref immediately
      setEarnedBadgeIds(prev => {
        const next = new Set(prev);
        next.delete(badge.id);
        earnedRef.current = next;
        return next;
      });

      // Update progress
      setBadgeProgress(prev => ({
        ...prev,
        [badge.id]: { ...prev[badge.id], complete: false },
      }));

      console.log(`[Badges] Revoked "${badge.name}" — item unlogged`);
    }
  }, [userId, badges]);

  return {
    badges,
    earnedBadgeIds,
    badgeProgress,
    checkForBadge,
    checkAllBadges,
    revokeBadgeIfNeeded,
    getProgress,
    getBadgeForItem,
    loading,
  };
}
