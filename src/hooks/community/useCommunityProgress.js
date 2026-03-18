import { useState, useEffect } from "react";
import { supabase } from "../../supabase";

/**
 * useCommunityProgress -- Loads user progress for community items.
 *
 * UNIFIED MEDIA ARCHITECTURE (v2):
 *   Auto-sync from shelf tables has been REMOVED. With the unified media
 *   architecture, user_media_logs IS the shelf. When a user logs a film
 *   anywhere (shelf, community, Letterboxd), it writes to user_media_logs
 *   and community_user_progress in one atomic operation. No reconciliation
 *   needed.
 *
 *   The old syncFilmsFromShelf/syncShowsFromShelf/syncBooksFromShelf
 *   functions (communitySync.js) are no longer imported or called.
 *
 * Returns: { progress, setProgress, loading }
 */
export function useCommunityProgress(communityId, userId, communityItems = []) {
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || communityItems.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      setLoading(true);

      const allExisting = [];

      // -- Strategy 1: RPC (single query, no batching) --
      try {
        const { data, error } = await supabase.rpc("user_community_progress", {
          p_user_id: userId,
          p_community_id: communityId,
        });

        if (error) throw error;
        if (data) allExisting.push(...data);
      } catch (rpcErr) {
        // -- Fallback: batched .in() queries --
        console.warn("[Community] RPC not available, using fallback:", rpcErr.message);
        const itemIds = communityItems.map((i) => i.id);
        const BATCH_SIZE = 200;
        for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
          const batch = itemIds.slice(i, i + BATCH_SIZE);
          const { data, error: batchErr } = await supabase
            .from("community_user_progress")
            .select("item_id,listened_with_commentary,rating,status,rewatch_count,rewatch_dates,brown_arrow,completed_at,updated_at")
            .eq("user_id", userId)
            .in("item_id", batch);

          if (batchErr) {
            console.error("[Community] Progress load error:", batchErr.message);
          } else if (data) {
            allExisting.push(...data);
          }
          if (cancelled) return;
        }
      }

      if (cancelled) return;

      const map = {};
      allExisting.forEach((row) => {
        if (row.status === "skipped") return;
        map[row.item_id] = {
          status: row.status || "completed",
          listened_with_commentary: row.listened_with_commentary || false,
          brown_arrow: row.brown_arrow || false,
          rating: row.rating || null,
          rewatch_count: row.rewatch_count || 0,
          rewatch_dates: row.rewatch_dates || [],
          completed_at: row.completed_at || null,
          updated_at: row.updated_at || null,
        };
      });

      // NOTE: Auto-sync block removed. With unified media architecture,
      // logging writes to both user_media_logs and community_user_progress
      // atomically. No need for post-hoc reconciliation.

      setProgress(map);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId, communityItems.length]);

  return { progress, setProgress, loading };
}
