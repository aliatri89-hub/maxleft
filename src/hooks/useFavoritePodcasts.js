import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

/**
 * useFavoritePodcasts — manages which podcasts a user has favorited.
 *
 * Favorites float to the top of coverage lists in VhsSleeveSheet
 * (handled server-side by get_episodes_for_film RPC).
 *
 * Returns:
 *   favorites        — Set of podcast UUIDs
 *   isFavorite(id)   — quick check
 *   toggle(id)       — add or remove
 *   loading          — initial load in progress
 */
export function useFavoritePodcasts(userId) {
  const [favorites, setFavorites] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // ── Load on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_podcast_favorites")
        .select("podcast_id")
        .eq("user_id", userId);

      if (!cancelled && !error) {
        setFavorites(new Set((data || []).map(r => r.podcast_id)));
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId]);

  // ── Toggle a podcast favorite ─────────────────────────────
  const toggle = useCallback(async (podcastId) => {
    if (!userId) return;
    const wasFav = favorites.has(podcastId);

    // Optimistic update
    setFavorites(prev => {
      const next = new Set(prev);
      if (wasFav) next.delete(podcastId);
      else next.add(podcastId);
      return next;
    });

    try {
      if (wasFav) {
        const { error } = await supabase
          .from("user_podcast_favorites")
          .delete()
          .eq("user_id", userId)
          .eq("podcast_id", podcastId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_podcast_favorites")
          .insert({ user_id: userId, podcast_id: podcastId });
        if (error) throw error;
      }
    } catch (err) {
      console.error("Toggle favorite error:", err);
      // Revert
      setFavorites(prev => {
        const next = new Set(prev);
        if (wasFav) next.add(podcastId);
        else next.delete(podcastId);
        return next;
      });
    }
  }, [userId, favorites]);

  // ── Quick check helper ────────────────────────────────────
  const isFavorite = useCallback((podcastId) => {
    return favorites.has(podcastId);
  }, [favorites]);

  return { favorites, isFavorite, toggle, loading };
}
