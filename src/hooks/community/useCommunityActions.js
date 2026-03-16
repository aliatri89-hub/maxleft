import { useCallback } from "react";
import { supabase } from "../../supabase";
import { dualWriteFilm, dualWriteShow, dualWriteBook } from "../../utils/communityDualWrite";

/**
 * useCommunityActions — Log, unlog, and watchlist actions.
 * Handles dual-write to movies/shows/books/feed_activity/wishlist.
 *
 * Requires setProgress from useCommunityProgress for optimistic updates.
 */
export function useCommunityActions(userId, setProgress) {

  // ─── Log an item (dual-write: community progress + shelf) ───
  const logItem = useCallback(async (itemId, item, coverUrl, { rating, completed_at, listened_with_commentary, brown_arrow, isUpdate } = {}) => {
    if (!userId) return;

    // Optimistic update
    setProgress((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status: isUpdate ? (prev[itemId]?.status || "completed") : "completed",
        listened_with_commentary: listened_with_commentary !== undefined ? listened_with_commentary : (prev[itemId]?.listened_with_commentary || false),
        brown_arrow: brown_arrow !== undefined ? brown_arrow : (prev[itemId]?.brown_arrow || false),
        rating: rating || prev[itemId]?.rating || null,
      },
    }));

    try {
      // 1. Save community progress
      if (isUpdate) {
        const updateFields = { updated_at: new Date().toISOString() };
        if (rating) updateFields.rating = Math.round(rating);
        if (completed_at) updateFields.completed_at = completed_at;
        if (listened_with_commentary !== undefined) updateFields.listened_with_commentary = listened_with_commentary;
        if (brown_arrow !== undefined) updateFields.brown_arrow = brown_arrow;

        const { error: updateErr } = await supabase
          .from("community_user_progress")
          .update(updateFields)
          .eq("user_id", userId)
          .eq("item_id", itemId);

        if (updateErr) {
          console.error("[Community] Progress update error:", updateErr.message);
          throw updateErr;
        }
      } else {
        const { error: progressErr } = await supabase
          .from("community_user_progress")
          .upsert({
            user_id: userId,
            item_id: itemId,
            status: "completed",
            rating: rating ? Math.round(rating) : null,
            completed_at: completed_at || null,
            listened_with_commentary: listened_with_commentary || false,
            brown_arrow: brown_arrow || false,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,item_id" });

        if (progressErr) {
          console.error("[Community] Progress upsert error:", progressErr.message);
          throw progressErr;
        }
      }

      // 2. Dual-write to shelf (only on first log, not updates)
      if (!isUpdate && item) {
        const opts = { rating, completed_at };
        if (item.media_type === "film" && item.tmdb_id) {
          await dualWriteFilm(userId, item, coverUrl, opts);
        } else if (item.media_type === "show" && item.tmdb_id) {
          await dualWriteShow(userId, item, coverUrl, opts);
        } else if (item.media_type === "book") {
          await dualWriteBook(userId, item, coverUrl, opts);
        }
      }

    } catch (e) {
      // Rollback optimistic update
      setProgress((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      throw e;
    }
  }, [userId, setProgress]);

  // ─── Log commentary only (no film completion) ──────────────
  const logCommentaryOnly = useCallback(async (itemId, listened) => {
    if (!userId) return;

    setProgress((prev) => {
      const existing = prev[itemId];
      // If already completed, just toggle the flag — don't downgrade status
      if (existing?.status === "completed") {
        return { ...prev, [itemId]: { ...existing, listened_with_commentary: listened } };
      }
      // Otherwise create/update as commentary_only
      if (listened) {
        return { ...prev, [itemId]: { ...existing, status: "commentary_only", listened_with_commentary: true } };
      } else {
        // Turning off commentary on a commentary_only row — remove it
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
    });

    try {
      const existing = await supabase
        .from("community_user_progress")
        .select("status")
        .eq("user_id", userId)
        .eq("item_id", itemId)
        .maybeSingle();

      const currentStatus = existing?.data?.status;

      if (currentStatus === "completed") {
        // Film is logged — just toggle the commentary flag
        await supabase
          .from("community_user_progress")
          .update({ listened_with_commentary: listened, updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("item_id", itemId);
      } else if (listened) {
        // No film log (or was commentary_only) — upsert as commentary_only
        await supabase
          .from("community_user_progress")
          .upsert({
            user_id: userId,
            item_id: itemId,
            status: "commentary_only",
            listened_with_commentary: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,item_id" });
      } else if (currentStatus === "commentary_only") {
        // Turning off commentary on a commentary_only row — delete it
        await supabase
          .from("community_user_progress")
          .delete()
          .eq("user_id", userId)
          .eq("item_id", itemId);
      }
    } catch (e) {
      console.error("[Community] Commentary toggle error:", e);
      // Rollback
      setProgress((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      throw e;
    }
  }, [userId, setProgress]);

  // ─── Unlog an item (cross-community by tmdb_id) ─────────────
  const unlogItem = useCallback(async (itemId) => {
    if (!userId) return;

    // Optimistic update (current community only — other screens refresh on mount)
    setProgress((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });

    try {
      // Set status to "skipped" instead of deleting — prevents auto-sync from re-adding
      await supabase
        .from("community_user_progress")
        .update({ status: "skipped", rating: null, completed_at: null })
        .eq("user_id", userId)
        .eq("item_id", itemId);

      // Cross-community: find same tmdb_id in other communities and unlog there too
      const { data: itemRow } = await supabase
        .from("community_items")
        .select("tmdb_id, media_type")
        .eq("id", itemId)
        .single();

      if (itemRow?.tmdb_id) {
        // Find all other community_items with this tmdb_id
        const { data: siblings } = await supabase
          .from("community_items")
          .select("id")
          .eq("tmdb_id", itemRow.tmdb_id)
          .neq("id", itemId);

        if (siblings?.length > 0) {
          const siblingIds = siblings.map(s => s.id);
          await supabase
            .from("community_user_progress")
            .update({ status: "skipped", rating: null, completed_at: null })
            .eq("user_id", userId)
            .in("item_id", siblingIds)
            .eq("status", "completed");
        }
      }
    } catch {
      // Rollback
      setProgress((prev) => ({ ...prev, [itemId]: { listened_with_commentary: false } }));
    }
  }, [userId, setProgress]);

  // ─── Add to watchlist ──────────────────────────────────────
  const addToWatchlist = useCallback(async (item, coverUrl) => {
    if (!userId || !item) return;

    const itemType = item.media_type === "film" ? "movie" : item.media_type;
    const label = itemType === "book" ? "reading list" : itemType === "game" ? "play list" : "watch list";

    const { error } = await supabase.from("wishlist").insert({
      user_id: userId,
      item_type: itemType,
      title: item.title,
      cover_url: coverUrl || null,
      year: item.year || null,
    });

    if (error) {
      console.warn("[Community] Watchlist error:", error.message);
      throw error;
    }

    console.log(`[Community] Added "${item.title}" to ${label}`);
  }, [userId]);

  return { logItem, logCommentaryOnly, unlogItem, addToWatchlist };
}
