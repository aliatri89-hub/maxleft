import { useState, useEffect } from "react";
import { supabase } from "../supabase";

/**
 * useGlobalBadges — Cross-community badge data for the My MANTL page.
 *
 * Loads:
 *   1. User's earned badges across ALL communities (most recent first)
 *   2. The single "closest to earning" badge (highest progress ratio, current > 0)
 *
 * Returns:
 *   earnedBadges   — [{ id, name, image_url, accent_color, community_id, earned_at }]
 *   closestBadge   — { id, name, image_url, accent_color, current, total } | null
 *   loading        — boolean
 */
export function useGlobalBadges(userId) {
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [closestBadge, setClosestBadge] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      setLoading(true);

      try {
        // ── 1. Fetch earned badges with badge details ──
        const { data: earnedRows, error: earnedErr } = await supabase
          .from("user_badges")
          .select("badge_id, earned_at, badges(id, name, image_url, accent_color, community_id)")
          .eq("user_id", userId)
          .order("earned_at", { ascending: false });

        if (earnedErr) {
          console.error("[GlobalBadges] Earned fetch error:", earnedErr.message);
          if (!cancelled) setLoading(false);
          return;
        }
        if (cancelled) return;

        const earned = (earnedRows || [])
          .filter(r => r.badges)
          .map(r => ({
            id: r.badges.id,
            name: r.badges.name,
            image_url: r.badges.image_url,
            accent_color: r.badges.accent_color,
            community_id: r.badges.community_id,
            earned_at: r.earned_at,
          }));

        setEarnedBadges(earned);

        // ── 2. Find closest-to-earning badge ──
        // Get subscribed community IDs
        const { data: subRows } = await supabase
          .from("user_community_subscriptions")
          .select("community_id")
          .eq("user_id", userId);

        if (cancelled) return;
        const subCommunityIds = (subRows || []).map(r => r.community_id);
        if (subCommunityIds.length === 0) { setLoading(false); return; }

        const earnedIds = new Set(earned.map(e => e.id));

        // Fetch all active badges from subscribed communities
        const { data: allBadges } = await supabase
          .from("badges")
          .select("id, name, image_url, accent_color, community_id, badge_type, miniseries_id, media_type_filter")
          .in("community_id", subCommunityIds)
          .eq("is_active", true);

        if (cancelled) return;
        const unearnedBadges = (allBadges || []).filter(b => !earnedIds.has(b.id));
        if (unearnedBadges.length === 0) { setLoading(false); return; }

        // ── Compute progress for unearned miniseries_completion badges ──
        const unearnedMiniseries = unearnedBadges.filter(
          b => b.badge_type === "miniseries_completion" && b.miniseries_id
        );
        const unearnedItemSet = unearnedBadges.filter(
          b => b.badge_type === "item_set_completion"
        );

        const progressEntries = []; // [{ badge, current, total }]

        if (unearnedMiniseries.length > 0) {
          const miniseriesIds = [...new Set(unearnedMiniseries.map(b => b.miniseries_id))];

          const { data: itemRows } = await supabase
            .from("community_items")
            .select("id, miniseries_id, media_type, tmdb_id")
            .in("miniseries_id", miniseriesIds);

          if (cancelled) return;

          // Get all tmdb_ids we need to check
          const allTmdbIds = [...new Set((itemRows || []).map(i => i.tmdb_id).filter(Boolean))];

          let completedRows = [];
          if (allTmdbIds.length > 0) {
            const { data: cRows } = await supabase
              .from("community_user_progress")
              .select("item_id, community_items!inner(tmdb_id, media_type)")
              .eq("user_id", userId)
              .eq("status", "completed")
              .in("community_items.tmdb_id", allTmdbIds);
            completedRows = cRows || [];
          }

          if (cancelled) return;
          const completedTmdbSet = new Set(completedRows.map(c => c.community_items?.tmdb_id));

          for (const badge of unearnedMiniseries) {
            const badgeItems = (itemRows || []).filter(i =>
              i.miniseries_id === badge.miniseries_id
              && (!badge.media_type_filter || i.media_type === badge.media_type_filter)
            );
            const requiredTmdbIds = [...new Set(badgeItems.map(i => i.tmdb_id).filter(Boolean))];
            const current = requiredTmdbIds.filter(id => completedTmdbSet.has(id)).length;
            if (current > 0) {
              progressEntries.push({ badge, current, total: requiredTmdbIds.length });
            }
          }
        }

        // ── Compute progress for item_set_completion badges ──
        if (unearnedItemSet.length > 0) {
          const itemSetBadgeIds = unearnedItemSet.map(b => b.id);

          const { data: biRows } = await supabase
            .from("badge_items")
            .select("badge_id, community_items!inner(tmdb_id, media_type)")
            .in("badge_id", itemSetBadgeIds);

          if (cancelled) return;

          // Group by badge
          const badgeItemsMap = {};
          for (const row of (biRows || [])) {
            if (!badgeItemsMap[row.badge_id]) badgeItemsMap[row.badge_id] = [];
            badgeItemsMap[row.badge_id].push(row.community_items?.tmdb_id);
          }

          // Get all tmdb_ids across all item-set badges
          const allItemSetTmdbIds = [...new Set(Object.values(badgeItemsMap).flat().filter(Boolean))];

          let itemSetCompleted = [];
          if (allItemSetTmdbIds.length > 0) {
            const { data: cRows } = await supabase
              .from("community_user_progress")
              .select("item_id, community_items!inner(tmdb_id)")
              .eq("user_id", userId)
              .eq("status", "completed")
              .in("community_items.tmdb_id", allItemSetTmdbIds);
            itemSetCompleted = cRows || [];
          }

          if (cancelled) return;
          const completedItemSetTmdbIds = new Set(itemSetCompleted.map(c => c.community_items?.tmdb_id));

          for (const badge of unearnedItemSet) {
            const requiredTmdbIds = [...new Set((badgeItemsMap[badge.id] || []).filter(Boolean))];
            const current = requiredTmdbIds.filter(id => completedItemSetTmdbIds.has(id)).length;
            if (current > 0) {
              progressEntries.push({ badge, current, total: requiredTmdbIds.length });
            }
          }
        }

        // Pick closest: highest current/total ratio (favor higher absolute current on ties)
        if (progressEntries.length > 0) {
          progressEntries.sort((a, b) => {
            const ratioA = a.current / a.total;
            const ratioB = b.current / b.total;
            if (ratioB !== ratioA) return ratioB - ratioA;
            return b.current - a.current;
          });

          const best = progressEntries[0];
          setClosestBadge({
            id: best.badge.id,
            name: best.badge.name,
            image_url: best.badge.image_url,
            accent_color: best.badge.accent_color,
            current: best.current,
            total: best.total,
          });
        }
      } catch (err) {
        console.error("[GlobalBadges] Error:", err);
      }

      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId]);

  return { earnedBadges, closestBadge, loading };
}
