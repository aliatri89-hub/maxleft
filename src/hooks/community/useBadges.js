import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../supabase";
import { trackEvent } from "../../hooks/useAnalytics";

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

  // Cache: item_id → badge_id for item_set_completion badges (populated on load)
  const itemBadgeMapRef = useRef({});

  // ─── Process raw data into progress map (shared by RPC + fallback) ──
  // badgeItemsMap: { [badgeId]: [{ tmdb_id, ... }] } — for item_set_completion badges
  const buildProgressMap = (badgeRows, earned, allItems, allCompleted, badgeItemsMap = {}) => {
    const progressMap = {};

    // Mark earned badges
    badgeRows.forEach(b => {
      if (earned.has(b.id)) {
        progressMap[b.id] = { current: -1, total: -1, complete: true };
      }
    });

    // ── Miniseries-completion badges ──
    const unearnedMiniseries = badgeRows.filter(
      b => !earned.has(b.id) && b.badge_type === "miniseries_completion" && b.miniseries_id
    );

    for (const badge of unearnedMiniseries) {
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

    // ── Item-set-completion badges (cross-miniseries) ──
    const unearnedItemSet = badgeRows.filter(
      b => !earned.has(b.id) && b.badge_type === "item_set_completion"
    );

    for (const badge of unearnedItemSet) {
      const items = badgeItemsMap[badge.id] || [];
      const requiredTmdbIds = new Set(items.map(i => i.tmdb_id).filter(Boolean));
      const completedTmdbIds = new Set(
        (allCompleted || [])
          .filter(c => {
            const tmdbId = c.tmdb_id || c.community_items?.tmdb_id;
            return requiredTmdbIds.has(tmdbId);
          })
          .map(c => c.tmdb_id || c.community_items?.tmdb_id)
      );

      progressMap[badge.id] = {
        current: completedTmdbIds.size,
        total: items.length,
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
        const itemSetItems = data.item_set_items || [];

        // Build badgeItemsMap + itemBadgeMapRef from item_set_items
        const badgeItemsMap = {};
        const ibMap = {};
        for (const row of itemSetItems) {
          ibMap[row.item_id] = row.badge_id;
          if (!badgeItemsMap[row.badge_id]) badgeItemsMap[row.badge_id] = [];
          badgeItemsMap[row.badge_id].push({
            tmdb_id: row.tmdb_id,
            media_type: row.media_type,
          });
        }
        itemBadgeMapRef.current = ibMap;

        setBadges(badgeRows);
        setEarnedBadgeIds(earned);
        setBadgeProgress(buildProgressMap(badgeRows, earned, allItems, allCompleted, badgeItemsMap));
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
      const unearnedMiniseries = badgeRows.filter(
        b => !earned.has(b.id) && b.badge_type === "miniseries_completion" && b.miniseries_id
      );
      const unearnedItemSet = badgeRows.filter(
        b => !earned.has(b.id) && b.badge_type === "item_set_completion"
      );

      let allItems = [];
      let allCompleted = [];
      let badgeItemsMap = {};

      if (unearnedMiniseries.length > 0) {
        const miniseriesIds = [...new Set(unearnedMiniseries.map(b => b.miniseries_id))];

        const { data: itemRows } = await supabase
          .from("community_items")
          .select("id, miniseries_id, media_type, tmdb_id")
          .in("miniseries_id", miniseriesIds);

        if (cancelled) return;
        allItems = itemRows || [];
      }

      // Fetch badge_items for item_set_completion badges
      // Fetch for ALL (not just unearned) so getBadgeForItem + revoke work for earned badges
      const allItemSetBadges = badgeRows.filter(b => b.badge_type === "item_set_completion");
      if (allItemSetBadges.length > 0) {
        const allItemSetBadgeIds = allItemSetBadges.map(b => b.id);

        const { data: biRows } = await supabase
          .from("badge_items")
          .select("badge_id, item_id, community_items!inner(tmdb_id, media_type)")
          .in("badge_id", allItemSetBadgeIds);

        if (cancelled) return;

        // Build item_id → badge_id map for getBadgeForItem / revoke
        const ibMap = {};
        for (const row of (biRows || [])) {
          ibMap[row.item_id] = row.badge_id;

          // Also build badgeItemsMap for progress (unearned only)
          if (unearnedItemSet.some(b => b.id === row.badge_id)) {
            if (!badgeItemsMap[row.badge_id]) badgeItemsMap[row.badge_id] = [];
            badgeItemsMap[row.badge_id].push({
              tmdb_id: row.community_items?.tmdb_id,
              media_type: row.community_items?.media_type,
            });
          }
        }
        itemBadgeMapRef.current = ibMap;
      }

      // Collect all required tmdb_ids from both badge types
      const miniseriesTmdbIds = allItems.map(i => i.tmdb_id).filter(Boolean);
      const itemSetTmdbIds = Object.values(badgeItemsMap)
        .flat()
        .map(i => i.tmdb_id)
        .filter(Boolean);
      const allRequiredTmdbIds = [...new Set([...miniseriesTmdbIds, ...itemSetTmdbIds])];

      if (allRequiredTmdbIds.length > 0) {
        const { data: completedRows } = await supabase
          .from("community_user_progress")
          .select("item_id, community_items!inner(tmdb_id, media_type)")
          .eq("user_id", userId)
          .eq("status", "completed")
          .in("community_items.tmdb_id", allRequiredTmdbIds);

        if (cancelled) return;
        allCompleted = completedRows || [];
      }

      setBadgeProgress(buildProgressMap(badgeRows, earned, allItems, allCompleted, badgeItemsMap));
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

    // ── Helper: evaluate a single badge and return it if earned ──
    const evaluateBadge = async (badge, requiredTmdbIds) => {
      const total = requiredTmdbIds.length;

      const { data: completedRows } = total > 0
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

      setBadgeProgress(prev => ({
        ...prev,
        [badge.id]: { current, total, complete: current >= total },
      }));

      if (current >= total) {
        const { error: insertErr } = await supabase
          .from("user_badges")
          .insert({ user_id: userId, badge_id: badge.id });

        if (insertErr) {
          if (!insertErr.message.includes("duplicate")) {
            console.error("[Badges] Earn error:", insertErr.message);
          }
        }

        setEarnedBadgeIds(prev => {
          const next = new Set([...prev, badge.id]);
          earnedRef.current = next;
          return next;
        });

        // ── Inbox: badge earned notification ──
        supabase.from("user_notifications").upsert({
          user_id: userId,
          notif_type: "badge_earned",
          title: "Badge unlocked",
          body: `You earned "${badge.name}"`,
          image_url: badge.image_url || null,
          payload: { type: "badge_earned", badge_id: badge.id, community_id: badge.community_id },
          ref_key: `badge_earned:${badge.id}`,
        }, { onConflict: "user_id,ref_key", ignoreDuplicates: true }).then(({ error }) => {
          if (error) console.error("[Badges] Inbox earned error:", error.message);
        });

        // Analytics: track badge earned
        trackEvent(userId, "badge_earned", {
          badge_id: badge.id,
          badge_name: badge.name,
          badge_type: badge.badge_type,
          community_id: badge.community_id,
        });

        return badge;
      }

      // ── Inbox: badge progress notification (upsert — latest state only) ──
      if (current > 0) {
        supabase.from("user_notifications").upsert({
          user_id: userId,
          notif_type: "badge_progress",
          title: "Badge progress",
          body: `${current}/${total} for "${badge.name}"`,
          image_url: badge.image_url || null,
          payload: { type: "badge_progress", badge_id: badge.id, community_id: badge.community_id, current, total },
          ref_key: `badge_progress:${badge.id}`,
          created_at: new Date().toISOString(),
        }, { onConflict: "user_id,ref_key" }).then(({ error }) => {
          if (error) console.error("[Badges] Inbox progress error:", error.message);
        });
      }

      return null;
    };

    // ── Check miniseries_completion badges ──
    const unearnedMiniseries = badges.filter(
      b => b.badge_type === "miniseries_completion"
        && b.miniseries_id
        && !earnedRef.current.has(b.id)
    );

    if (unearnedMiniseries.length > 0) {
      const badgeMiniseriesIds = unearnedMiniseries.map(b => b.miniseries_id);

      const { data: matchingItems } = await supabase
        .from("community_items")
        .select("miniseries_id")
        .eq("tmdb_id", itemRow.tmdb_id)
        .in("miniseries_id", badgeMiniseriesIds);

      if (matchingItems && matchingItems.length > 0) {
        const matchedMiniseriesIds = new Set(matchingItems.map(i => i.miniseries_id));
        const candidateBadges = unearnedMiniseries.filter(
          b => matchedMiniseriesIds.has(b.miniseries_id)
            && (!b.media_type_filter || b.media_type_filter === itemRow.media_type)
        );

        for (const badge of candidateBadges) {
          let totalQuery = supabase
            .from("community_items")
            .select("tmdb_id")
            .eq("miniseries_id", badge.miniseries_id);
          if (badge.media_type_filter) totalQuery = totalQuery.eq("media_type", badge.media_type_filter);
          const { data: badgeItems } = await totalQuery;

          const requiredTmdbIds = [...new Set((badgeItems || []).map(i => i.tmdb_id).filter(Boolean))];
          const result = await evaluateBadge(badge, requiredTmdbIds);
          if (result) return result;
        }
      }
    }

    // ── Check item_set_completion badges ──
    const unearnedItemSet = badges.filter(
      b => b.badge_type === "item_set_completion" && !earnedRef.current.has(b.id)
    );

    if (unearnedItemSet.length > 0) {
      const itemSetBadgeIds = unearnedItemSet.map(b => b.id);

      // Check if this item (by tmdb_id) is in any item-set badge
      const { data: biMatches } = await supabase
        .from("badge_items")
        .select("badge_id, community_items!inner(tmdb_id)")
        .in("badge_id", itemSetBadgeIds)
        .eq("community_items.tmdb_id", itemRow.tmdb_id);

      if (biMatches && biMatches.length > 0) {
        const matchedBadgeIds = new Set(biMatches.map(r => r.badge_id));
        const candidateBadges = unearnedItemSet.filter(b => matchedBadgeIds.has(b.id));

        for (const badge of candidateBadges) {
          // Get all items for this badge
          const { data: biRows } = await supabase
            .from("badge_items")
            .select("item_id, community_items!inner(tmdb_id)")
            .eq("badge_id", badge.id);

          const requiredTmdbIds = [...new Set(
            (biRows || []).map(r => r.community_items?.tmdb_id).filter(Boolean)
          )];
          const result = await evaluateBadge(badge, requiredTmdbIds);
          if (result) return result;
        }
      }
    }

    return null; // No badge earned this time
  }, [userId, badges]);

  // ─── Check ALL badges at once (for post-sync / import) ─────
  const checkAllBadges = useCallback(async () => {
    if (!userId || badges.length === 0) return [];

    const unearnedMiniseries = badges.filter(
      b => !earnedRef.current.has(b.id) && b.badge_type === "miniseries_completion" && b.miniseries_id
    );
    const unearnedItemSet = badges.filter(
      b => !earnedRef.current.has(b.id) && b.badge_type === "item_set_completion"
    );
    if (unearnedMiniseries.length === 0 && unearnedItemSet.length === 0) return [];

    // ── Fetch items for miniseries badges ──
    let allItems = [];
    if (unearnedMiniseries.length > 0) {
      const miniseriesIds = [...new Set(unearnedMiniseries.map(b => b.miniseries_id))];
      const { data: itemRows } = await supabase
        .from("community_items")
        .select("id, miniseries_id, media_type, tmdb_id")
        .in("miniseries_id", miniseriesIds);
      allItems = itemRows || [];
    }

    // ── Fetch items for item-set badges ──
    const badgeItemsMap = {};
    if (unearnedItemSet.length > 0) {
      const itemSetBadgeIds = unearnedItemSet.map(b => b.id);
      const { data: biRows } = await supabase
        .from("badge_items")
        .select("badge_id, item_id, community_items!inner(tmdb_id, media_type)")
        .in("badge_id", itemSetBadgeIds);

      for (const row of (biRows || [])) {
        if (!badgeItemsMap[row.badge_id]) badgeItemsMap[row.badge_id] = [];
        badgeItemsMap[row.badge_id].push({
          tmdb_id: row.community_items?.tmdb_id,
          media_type: row.community_items?.media_type,
        });
      }
    }

    // ── Single bulk completion query for all required tmdb_ids ──
    const miniseriesTmdbIds = allItems.map(i => i.tmdb_id).filter(Boolean);
    const itemSetTmdbIds = Object.values(badgeItemsMap).flat().map(i => i.tmdb_id).filter(Boolean);
    const allRequiredTmdbIds = [...new Set([...miniseriesTmdbIds, ...itemSetTmdbIds])];

    const { data: allCompleted } = allRequiredTmdbIds.length > 0
      ? await supabase
          .from("community_user_progress")
          .select("item_id, community_items!inner(tmdb_id, media_type)")
          .eq("user_id", userId)
          .eq("status", "completed")
          .in("community_items.tmdb_id", allRequiredTmdbIds)
      : { data: [] };

    const newlyEarned = [];

    // ── Helper to award a badge ──
    const tryAward = async (badge, current, total) => {
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

          // ── Inbox: badge earned notification ──
          supabase.from("user_notifications").upsert({
            user_id: userId,
            notif_type: "badge_earned",
            title: "Badge unlocked",
            body: `You earned "${badge.name}"`,
            image_url: badge.image_url || null,
            payload: { type: "badge_earned", badge_id: badge.id, community_id: badge.community_id },
            ref_key: `badge_earned:${badge.id}`,
          }, { onConflict: "user_id,ref_key", ignoreDuplicates: true }).then(({ error }) => {
            if (error) console.error("[Badges] Inbox earned error:", error.message);
          });
        }
      }
    };

    // ── Evaluate miniseries badges ──
    for (const badge of unearnedMiniseries) {
      const badgeItems = allItems.filter(i =>
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
      await tryAward(badge, completedTmdbIds.size, badgeItems.length);
    }

    // ── Evaluate item-set badges ──
    for (const badge of unearnedItemSet) {
      const items = badgeItemsMap[badge.id] || [];
      const requiredTmdbIds = new Set(items.map(i => i.tmdb_id).filter(Boolean));
      const completedTmdbIds = new Set(
        (allCompleted || [])
          .filter(c => requiredTmdbIds.has(c.community_items?.tmdb_id))
          .map(c => c.community_items.tmdb_id)
      );
      await tryAward(badge, completedTmdbIds.size, items.length);
    }

    return newlyEarned; // Array of badges earned — caller can queue celebrations
  }, [userId, badges]);

  // ─── Get progress toward a specific badge ───────────────────
  const getProgress = useCallback((badgeId) => {
    return badgeProgress[badgeId] || null;
  }, [badgeProgress]);

  // ─── Find which badge (if any) an item contributes to ──────
  const getBadgeForItem = useCallback((itemId, miniseriesId, mediaType) => {
    // Check miniseries_completion badges
    const miniseriesBadge = badges.find(
      b => b.badge_type === "miniseries_completion"
        && b.miniseries_id === miniseriesId
        && (!b.media_type_filter || b.media_type_filter === mediaType)
    );
    if (miniseriesBadge) return miniseriesBadge;

    // Check item_set_completion badges via cached map
    const itemSetBadgeId = itemBadgeMapRef.current[itemId];
    if (itemSetBadgeId) {
      return badges.find(b => b.id === itemSetBadgeId) || null;
    }

    return null;
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

    // ── Helper: revoke a single badge ──
    const doRevoke = async (badge) => {
      await supabase
        .from("user_badges")
        .delete()
        .eq("user_id", userId)
        .eq("badge_id", badge.id);

      setEarnedBadgeIds(prev => {
        const next = new Set(prev);
        next.delete(badge.id);
        earnedRef.current = next;
        return next;
      });

      setBadgeProgress(prev => ({
        ...prev,
        [badge.id]: { ...prev[badge.id], complete: false },
      }));

      console.log(`[Badges] Revoked "${badge.name}" — item unlogged`);
    };

    // ── Check miniseries_completion badges ──
    const earnedMiniseries = badges.filter(
      b => b.badge_type === "miniseries_completion"
        && b.miniseries_id
        && earnedRef.current.has(b.id)
        && (!b.media_type_filter || b.media_type_filter === itemRow.media_type)
    );

    if (earnedMiniseries.length > 0) {
      const { data: matchingItems } = await supabase
        .from("community_items")
        .select("miniseries_id")
        .eq("tmdb_id", itemRow.tmdb_id)
        .in("miniseries_id", earnedMiniseries.map(b => b.miniseries_id));

      if (matchingItems && matchingItems.length > 0) {
        const matchedMiniseriesIds = new Set(matchingItems.map(i => i.miniseries_id));
        const affectedBadges = earnedMiniseries.filter(b => matchedMiniseriesIds.has(b.miniseries_id));

        for (const badge of affectedBadges) {
          await doRevoke(badge);
        }
      }
    }

    // ── Check item_set_completion badges ──
    const earnedItemSet = badges.filter(
      b => b.badge_type === "item_set_completion" && earnedRef.current.has(b.id)
    );

    if (earnedItemSet.length > 0) {
      const itemSetBadgeIds = earnedItemSet.map(b => b.id);

      // Check if this tmdb_id is in any earned item-set badge
      const { data: biMatches } = await supabase
        .from("badge_items")
        .select("badge_id, community_items!inner(tmdb_id)")
        .in("badge_id", itemSetBadgeIds)
        .eq("community_items.tmdb_id", itemRow.tmdb_id);

      if (biMatches && biMatches.length > 0) {
        const matchedBadgeIds = new Set(biMatches.map(r => r.badge_id));
        const affectedBadges = earnedItemSet.filter(b => matchedBadgeIds.has(b.id));

        for (const badge of affectedBadges) {
          await doRevoke(badge);
        }
      }
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
