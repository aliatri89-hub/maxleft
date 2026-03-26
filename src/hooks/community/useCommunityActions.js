import { useCallback } from "react";
import { supabase } from "../../supabase";
import { logFilm, logShow, logBook, logGame } from "../../utils/mediaWrite";
import { trackEvent } from "../../hooks/useAnalytics";

/**
 * useCommunityActions -- Log, unlog, and watchlist actions.
 *
 * UNIFIED MEDIA ARCHITECTURE (v2):
 *   - Cross-community propagation uses media_id (via get_sibling_item_ids RPC)
 *     instead of scanning community_items by tmdb_id.
 *   - Shelf write replaced by upsert into media + user_media_logs
 *     via the mediaWrite utility.
 */
export function useCommunityActions(userId, setProgress) {

  // --- Log an item (unified: community progress + media log) ---
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

        // Propagate update to sibling communities via media_id
        try {
          const { data: siblingIds } = await supabase.rpc("get_sibling_item_ids", { p_item_id: itemId });
          if (siblingIds?.length > 0) {
            const sibUpdateFields = { updated_at: new Date().toISOString() };
            if (rating) sibUpdateFields.rating = Math.round(rating);
            if (completed_at) sibUpdateFields.completed_at = completed_at;

            await supabase
              .from("community_user_progress")
              .update(sibUpdateFields)
              .eq("user_id", userId)
              .in("item_id", siblingIds)
              .eq("status", "completed");
          }
        } catch (e) {
          console.warn("[Community] Cross-community update propagation failed:", e.message);
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

      // 2. Cross-community: propagate log via media_id
      try {
        const { data: siblingIds } = await supabase.rpc("get_sibling_item_ids", { p_item_id: itemId });

        if (siblingIds?.length > 0) {
          const now = new Date().toISOString();
          const siblingRows = siblingIds.map(id => ({
            user_id: userId,
            item_id: id,
            status: "completed",
            rating: rating ? Math.round(rating) : null,
            completed_at: completed_at || null,
            updated_at: now,
          }));

          const { error: sibErr } = await supabase
            .from("community_user_progress")
            .upsert(siblingRows, {
              onConflict: "user_id,item_id",
              ignoreDuplicates: false,
            });

          if (sibErr) {
            console.warn("[Community] Cross-community log propagation error:", sibErr.message);
          } else {
            console.log(`[Community] Propagated log to ${siblingRows.length} sibling(s) via media_id`);
          }
        }
      } catch (e) {
        console.warn("[Community] Cross-community propagation failed:", e.message);
      }

      // 3. Write to media + user_media_logs (single source of truth)
      if (!isUpdate && item) {
        const opts = { rating, completed_at };
        if (item.media_type === "film" && item.tmdb_id) {
          await logFilm(userId, item, coverUrl, opts);
        } else if (item.media_type === "show" && item.tmdb_id) {
          await logShow(userId, item, coverUrl, opts);
        } else if (item.media_type === "book") {
          await logBook(userId, item, coverUrl, opts);
        } else if (item.media_type === "game") {
          await logGame(userId, item, coverUrl, opts);
        }
      }

      // Analytics: track media log
      if (!isUpdate && item) {
        trackEvent(userId, "media_log", {
          media_type: item.media_type,
          title: item.title,
          tmdb_id: item.tmdb_id || null,
          rating: rating || null,
        });
      }

    } catch (e) {
      setProgress((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      throw e;
    }
  }, [userId, setProgress]);

  // --- Log commentary only (no film completion) ---
  const logCommentaryOnly = useCallback(async (itemId, listened) => {
    if (!userId) return;

    setProgress((prev) => {
      const existing = prev[itemId];
      if (existing?.status === "completed") {
        return { ...prev, [itemId]: { ...existing, listened_with_commentary: listened } };
      }
      if (listened) {
        return { ...prev, [itemId]: { ...existing, status: "commentary_only", listened_with_commentary: true } };
      } else {
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
        await supabase
          .from("community_user_progress")
          .update({ listened_with_commentary: listened, updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("item_id", itemId);
      } else if (listened) {
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
        await supabase
          .from("community_user_progress")
          .delete()
          .eq("user_id", userId)
          .eq("item_id", itemId);
      }
    } catch (e) {
      console.error("[Community] Commentary toggle error:", e);
      setProgress((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      throw e;
    }
  }, [userId, setProgress]);

  // --- Unlog an item (cross-community via media_id) ---
  const unlogItem = useCallback(async (itemId) => {
    if (!userId) return;

    setProgress((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });

    try {
      await supabase
        .from("community_user_progress")
        .update({ status: "skipped", rating: null, completed_at: null })
        .eq("user_id", userId)
        .eq("item_id", itemId);

      // Cross-community unlog via media_id
      const { data: siblingIds } = await supabase.rpc("get_sibling_item_ids", { p_item_id: itemId });

      if (siblingIds?.length > 0) {
        await supabase
          .from("community_user_progress")
          .update({ status: "skipped", rating: null, completed_at: null })
          .eq("user_id", userId)
          .in("item_id", siblingIds)
          .eq("status", "completed");
      }
    } catch {
      setProgress((prev) => ({ ...prev, [itemId]: { listened_with_commentary: false } }));
    }
  }, [userId, setProgress]);

  // --- Add to watchlist (films & shows only) ---
  const addToWatchlist = useCallback(async (item, coverUrl) => {
    if (!userId || !item) return;

    const itemType = item.media_type === "film" ? "movie" : item.media_type;

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

    console.log(`[Community] Added "${item.title}" to watchlist`);
  }, [userId]);

  return { logItem, logCommentaryOnly, unlogItem, addToWatchlist };
}
