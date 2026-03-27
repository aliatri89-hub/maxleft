import { t } from "../../../theme";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../../supabase";
import { logGame } from "../../../utils/mediaWrite";

/**
 * useGetPlayedBridge — Bridge hook for the Get Played community.
 *
 * Bridges `community_user_progress` with the unified `user_media_logs`
 * table (via `user_games_v` view) so logging in either place keeps
 * both in sync.
 *
 * On load:
 *   1. Fetches community_user_progress (standard)
 *   2. Fetches user's game shelf from user_games_v
 *   3. Cross-references by RAWG ID to auto-mark community items
 *
 * On log:
 *   1. Upserts community_user_progress
 *   2. Calls logGame() for unified media write
 *
 * On unlog:
 *   1. Deletes community_user_progress
 *   2. Does NOT delete from user_media_logs — personal shelf stays
 */
export function useGetPlayedBridge(communityId, userId, allItems) {
  const [progress, setProgress] = useState({});
  const [userGames, setUserGames] = useState([]);
  const [playingNow, setPlayingNow] = useState([]);

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

  // ── Load community progress + user games ─────────────────
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

      // 2. User's game shelf from unified view
      const rawgIds = Object.keys(rawgToItemId).map(Number).filter(Boolean);
      let gamesRows = [];
      if (rawgIds.length > 0) {
        const { data } = await supabase
          .from("user_games_v")
          .select("*")
          .eq("user_id", userId)
          .in("external_id", rawgIds);
        gamesRows = data || [];
      }
      setUserGames(gamesRows);

      // 3. Cross-reference: if user has a game logged but NOT in community progress
      gamesRows.forEach((game) => {
        const itemId = rawgToItemId[game.external_id];
        if (itemId && !progressMap[itemId]) {
          progressMap[itemId] = {
            rating: game.rating ? Number(game.rating) : null,
            notes: game.notes,
            completed_at: game.finished_at,
            status: game.game_status || "beat",
            platform: game.extra_data?.platform || null,
            played_along: false,
            _fromGamesTable: true,
          };
        }
      });

      // 4. Fetch all games user is currently playing
      const { data: playingGames } = await supabase
        .from("user_games_v")
        .select("*")
        .eq("user_id", userId)
        .eq("game_status", "playing")
        .order("created_at", { ascending: false });
      setPlayingNow(playingGames || []);

      setProgress(progressMap);
    };

    load();
  }, [communityId, userId, allItems, rawgToItemId]);

  // ── Log: community_user_progress + unified media ──────────
  const logItem = useCallback(
    async (itemId, item, coverUrl, opts = {}) => {
      if (!userId) return;

      const {
        rating,
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

      // 2. Write to unified media tables via logGame()
      const rawgId = itemIdToRawg[itemId];
      if (item) {
        const displayStatus = status === "completed" ? "beat" : status;
        await logGame(userId, {
          title: item.title,
          rawg_id: rawgId ? parseInt(rawgId) : null,
          year: item.year || null,
          creator: item.creator || null,
          genre: item.genre_bucket || null,
        }, coverUrl || item.poster_path || null, {
          status: displayStatus,
          rating: rating || null,
          completed_at: completed_at || null,
          platform: platform || null,
        });
      }

      // 3. Update local state
      setProgress((prev) => ({
        ...prev,
        [itemId]: {
          rating, completed_at, status,
          played_along: played_along || false,
          platform: platform || null,
        },
      }));
    },
    [userId, progress, itemIdToRawg]
  );

  // ── Unlog: remove from community only, keep shelf ─────────
  const unlogItem = useCallback(
    async (itemId) => {
      if (!userId) return;

      await supabase
        .from("community_user_progress")
        .delete()
        .eq("user_id", userId)
        .eq("item_id", itemId);

      setProgress((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    },
    [userId]
  );

  // ── Add to backlog (want to play) ────────────────────────
  const addToWatchlist = useCallback(
    async (item, coverUrl) => {
      if (!userId) return;

      const rawgId = itemIdToRawg[item.id];
      await logGame(userId, {
        title: item.title,
        rawg_id: rawgId ? parseInt(rawgId) : null,
        year: item.year || null,
        genre: item.genre_bucket || null,
      }, coverUrl || item.poster_path || null, {
        status: "backlog",
      });
    },
    [userId, itemIdToRawg]
  );

  // ── Helper: check if user owns game via shelf ──────────────
  const userOwnsGame = useCallback(
    (itemId) => {
      const rawgId = itemIdToRawg[itemId];
      if (!rawgId) return false;
      return userGames.some((g) => g.external_id === parseInt(rawgId));
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
