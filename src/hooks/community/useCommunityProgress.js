import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { syncFilmsFromShelf, syncShowsFromShelf, syncBooksFromShelf } from "../../utils/communitySync";

/**
 * useCommunityProgress — Loads user progress for community items
 * and auto-syncs from the movies/shows/books shelf tables.
 *
 * OPTIMIZED: Uses server-side RPC (user_community_progress) instead of
 * batched .in() queries. Single round trip, no URL length limits.
 * Falls back to batched .in() if RPC doesn't exist yet.
 *
 * Auto-sync is throttled to once per 5 minutes per community to reduce
 * unnecessary shelf table queries on repeat visits.
 *
 * Returns: { progress, setProgress, loading }
 */
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

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

      // ── Strategy 1: RPC (single query, no batching) ──────
      try {
        const { data, error } = await supabase.rpc("user_community_progress", {
          p_user_id: userId,
          p_community_id: communityId,
        });

        if (error) throw error;
        if (data) allExisting.push(...data);
      } catch (rpcErr) {
        // ── Fallback: batched .in() queries (for pre-migration) ──
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
      const skippedIds = new Set();
      allExisting.forEach((row) => {
        if (row.status === "skipped") {
          skippedIds.add(row.item_id);
          return;
        }
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

      // ── Auto-sync (throttled) ─────────────────────────────
      const lastSyncKey = `mantl_sync_${communityId}_${userId}`;
      const lastSync = localStorage.getItem(lastSyncKey);
      const now = Date.now();
      const shouldSync = !lastSync || (now - parseInt(lastSync)) > SYNC_INTERVAL;

      if (shouldSync) {
        await syncFilmsFromShelf(userId, communityItems, map, skippedIds);
        if (cancelled) return;
        await syncShowsFromShelf(userId, communityItems, map, skippedIds);
        if (cancelled) return;
        await syncBooksFromShelf(userId, communityItems, map, skippedIds);
        if (cancelled) return;
        try { localStorage.setItem(lastSyncKey, String(now)); } catch {}
      }

      setProgress(map);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId, communityItems.length]);

  return { progress, setProgress, loading };
}
