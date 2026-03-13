import { useState, useEffect } from "react";
import { supabase } from "../supabase";

/**
 * useLeaderboard — Community leaderboard via server-side aggregation.
 *
 * OPTIMIZED: Uses community_leaderboard RPC that does GROUP BY + COUNT
 * in Postgres. Returns only the top 20 users instead of downloading
 * every progress row.
 *
 * Falls back to client-side counting if RPC doesn't exist yet.
 *
 * @param {string} communityId - community_pages.id
 * @param {string[]} communityItemIds - (only used in fallback)
 */
export function useLeaderboard(communityId, communityItemIds = []) {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    if (!communityId) return;
    let cancelled = false;

    (async () => {
      // ── Strategy 1: RPC (server-side aggregation) ──────
      try {
        const { data, error } = await supabase.rpc("community_leaderboard", {
          p_community_id: communityId,
          p_limit: 20,
        });

        if (error) throw error;
        if (cancelled) return;

        setLeaders((data || []).map((r) => ({
          userId: r.user_id,
          count: Number(r.log_count),
          username: r.username || "Anonymous",
          avatarUrl: r.avatar_url,
        })));
        return; // Success — skip fallback
      } catch (rpcErr) {
        console.warn("[Leaderboard] RPC not available, using fallback:", rpcErr.message);
      }

      // ── Fallback: client-side counting (pre-migration) ──
      if (communityItemIds.length === 0) return;

      const { data, error } = await supabase
        .from("community_user_progress")
        .select("user_id")
        .eq("status", "completed")
        .in("item_id", communityItemIds);

      if (error || cancelled) return;

      const counts = {};
      (data || []).forEach((row) => {
        counts[row.user_id] = (counts[row.user_id] || 0) + 1;
      });

      const userIds = Object.keys(counts);
      if (userIds.length === 0) { setLeaders([]); return; }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      if (cancelled) return;

      const profileMap = {};
      (profiles || []).forEach((p) => { profileMap[p.id] = p; });

      const sorted = userIds
        .map((uid) => ({
          userId: uid,
          count: counts[uid],
          username: profileMap[uid]?.username || "Anonymous",
          avatarUrl: profileMap[uid]?.avatar_url,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      setLeaders(sorted);
    })();

    return () => { cancelled = true; };
  }, [communityId, communityItemIds.length]);

  return leaders;
}
