import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../../supabase";

/**
 * useGetPlayedBridge — Dual-write hook for the Get Played community.
 *
 * Bridges the existing `games` table (user's personal game shelf) with
 * `community_user_progress` (community tracking) so logging in either
 * place keeps both in sync.
 *
 * On load:
 *   1. Fetches community_user_progress (standard community pattern)
 *   2. Fetches user's games table entries
 *   3. Cross-references by RAWG ID to auto-mark community items as logged
 *      if the user already has them in their game shelf
 *
 * On log (from Get Played log modal):
 *   1. Upserts community_user_progress (standard)
 *   2. Upserts games table row (so it appears on main game shelf)
 *
 * On unlog:
 *   1. Deletes community_user_progress (standard)
 *   2. Does NOT delete from games — user's personal shelf stays intact
 *
 * Props:
 *   communityId  — uuid of the Get Played community_pages row
 *   userId       — current user's uuid
 *   allItems     — all community_items for this community
 */
export function useGetPlayedBridge(communityId, userId, allItems) {
  const [progress, setProgress] = useState({});
  const [userGames, setUserGames] = useState([]); // rows from `games` table
  const [playingNow, setPlayingNow] = useState([]); // games with status='playing'

  // ── Build RAWG ID → community_item_id map ─────────────────
  const rawgToItemId = useMemo(() => {
    const map = {};
    allItems.forEach((item) => {
      const rawgId = item.extra_data?.rawg_id;
      if (rawgId) map[rawgId] = item.id;
    });
    return map;
  }, [allItems]);

  const itemIdToRawg = useMemo(() => {
    const map = {};
    allItems.forEach((item) => {
      const rawgId = item.extra_data?.rawg_id;
      if (rawgId) map[item.id] = rawgId;
    });
    return map;
  }, [allItems]);

  // ── Load community progress + games table ─────────────────
  useEffect(() => {
    if (!communityId || !userId || allItems.length === 0) return;

    const load = async () => {
      // 1. Community progress (standard)
      const { data: communityProgress } = await supabase
        .from("community_user_progress")
        .select("*")
        .eq("user_id", userId)
        .in("item_id", allItems.map((i) => i.id));

      const progressMap = {};
      (communityProgress || []).forEach((row) => {
        progressMap[row.item_id] = {
          rating: row.rating,
          notes: row.notes,
          completed_at: row.completed_at,
          status: row.status,
          listened_with_commentary: row.listened_with_commentary,
          played_along: row.extra_data?.played_along || false,
          platform: row.extra_data?.platform || null,
          ...(row.extra_data || {}),
        };
      });

      // 2. User's games (for cross-reference)
      const rawgIds = Object.keys(rawgToItemId).map(Number).filter(Boolean);
      let gamesRows = [];
      if (rawgIds.length > 0) {
        const { data } = await supabase
          .from("games")
          .select("*")
          .eq("user_id", userId)
          .eq("api_source", "rawg")
          .in("external_id", rawgIds);
        gamesRows = data || [];
      }
      setUserGames(gamesRows);

      // 3. Cross-reference: if user has a game logged but NOT in community progress,
      //    auto-populate the progress map so it shows as checked off
      gamesRows.forEach((game) => {
        const itemId = rawgToItemId[game.external_id];
        if (itemId && !progressMap[itemId]) {
          progressMap[itemId] = {
            rating: game.rating ? Number(game.rating) : null,
            notes: game.notes,
            completed_at: game.finished_at,
            status: game.status || "completed",
            platform: game.platform,
            played_along: false, // can't infer this from games table
            _fromGamesTable: true, // flag so we know to create community_user_progress on next save
          };
        }
      });

      // 4. Fetch all games user is currently playing (for "What Are You Playing?")
      const { data: playingGames } = await supabase
        .from("games")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "playing")
        .order("started_at", { ascending: false, nullsFirst: false });
      setPlayingNow(playingGames || []);

      setProgress(progressMap);
    };

    load();
  }, [communityId, userId, allItems, rawgToItemId]);

  // ── Log: dual-write to community_user_progress + games ────
  const logItem = useCallback(
    async (itemId, item, coverUrl, opts = {}) => {
      if (!userId) return;

      const {
        rating,
        notes,
        completed_at,
        played_along,
        platform,
        status = "completed",
        isUpdate,
      } = opts;

      // 1. Upsert community_user_progress
      const progressRow = {
        user_id: userId,
        item_id: itemId,
        status: status,
        rating: rating || null,
        notes: notes || null,
        completed_at: completed_at || null,
        updated_at: new Date().toISOString(),
        extra_data: {
          played_along: played_along || false,
          platform: platform || null,
        },
      };

      if (isUpdate || progress[itemId]) {
        await supabase
          .from("community_user_progress")
          .update(progressRow)
          .eq("user_id", userId)
          .eq("item_id", itemId);
      } else {
        await supabase
          .from("community_user_progress")
          .upsert(progressRow, { onConflict: "user_id,item_id" });
      }

      // 2. Upsert into games table (dual-write)
      const rawgId = itemIdToRawg[itemId];
      if (rawgId && item) {
        const gameRow = {
          user_id: userId,
          external_id: rawgId,
          api_source: "rawg",
          title: item.title,
          year: item.year || null,
          cover_url: coverUrl || item.poster_path || null,
          platform: platform || null,
          genre: item.genre_bucket || null,
          status: status,
          rating: rating || null,
          notes: notes || null,
          started_at: null,
          finished_at: completed_at || null,
          source: "community_getplayed",
        };

        // Check if game already exists in user's shelf
        const { data: existing } = await supabase
          .from("games")
          .select("id")
          .eq("user_id", userId)
          .eq("external_id", rawgId)
          .eq("api_source", "rawg")
          .maybeSingle();

        if (existing) {
          // Update existing — preserve fields user may have set elsewhere
          await supabase
            .from("games")
            .update({
              status: status,
              rating: rating || null,
              platform: platform || gameRow.platform,
              finished_at: completed_at || null,
              notes: notes || null,
            })
            .eq("id", existing.id);
        } else {
          // Insert new
          await supabase
            .from("games")
            .insert(gameRow);
        }
      }

      // 3. Update local state
      setProgress((prev) => ({
        ...prev,
        [itemId]: {
          rating,
          notes,
          completed_at,
          status,
          played_along: played_along || false,
          platform: platform || null,
        },
      }));
    },
    [userId, progress, itemIdToRawg]
  );

  // ── Unlog: remove from community only, keep games table ───
  const unlogItem = useCallback(
    async (itemId) => {
      if (!userId) return;

      await supabase
        .from("community_user_progress")
        .delete()
        .eq("user_id", userId)
        .eq("item_id", itemId);

      // NOTE: We intentionally do NOT delete from the `games` table.
      // The user's personal game shelf should persist even if they
      // remove something from the community tracker.

      setProgress((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    },
    [userId]
  );

  // ── Add to wishlist (want to play) ────────────────────────
  const addToWatchlist = useCallback(
    async (item, coverUrl) => {
      if (!userId) return;

      const rawgId = itemIdToRawg[item.id];
      if (rawgId) {
        // Add to games table as "backlog"
        const { data: existing } = await supabase
          .from("games")
          .select("id")
          .eq("user_id", userId)
          .eq("external_id", rawgId)
          .eq("api_source", "rawg")
          .maybeSingle();

        if (!existing) {
          await supabase.from("games").insert({
            user_id: userId,
            external_id: rawgId,
            api_source: "rawg",
            title: item.title,
            year: item.year || null,
            cover_url: coverUrl || item.poster_path || null,
            platform: null,
            genre: item.genre_bucket || null,
            status: "backlog",
            rating: null,
            notes: null,
            source: "community_getplayed",
          });
        }
      }

      // Also add to wishlist table if it exists
      await supabase.from("wishlist").upsert({
        user_id: userId,
        media_type: "game",
        title: item.title,
        external_id: item.extra_data?.rawg_id || null,
        cover_url: coverUrl || item.poster_path || null,
      }, { onConflict: "user_id,title,media_type" }).catch(() => {});
    },
    [userId, itemIdToRawg]
  );

  // ── Helper: check if user owns game via Steam / games table ─
  const userOwnsGame = useCallback(
    (itemId) => {
      const rawgId = itemIdToRawg[itemId];
      if (!rawgId) return false;
      return userGames.some((g) => g.external_id === rawgId);
    },
    [userGames, itemIdToRawg]
  );

  return {
    progress,
    setProgress,
    logItem,
    unlogItem,
    addToWatchlist,
    userOwnsGame,
    userGames,
    playingNow,
  };
}
