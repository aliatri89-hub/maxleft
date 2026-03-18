import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../supabase";
import { logGame } from "../../utils/mediaWrite";

/**
 * useNowPlayingGameBridge — Bridge hook for game items in the
 * Now Playing Podcast community.
 *
 * Bridges `community_user_progress` with the unified `user_media_logs`
 * table (via `user_games_v` view) so logged games appear on the user's
 * My MANTL game shelf.
 *
 * On load:
 *   1. Fetches community_user_progress for game items only
 *   2. Fetches user's game shelf from user_games_v (by RAWG ID)
 *   3. Cross-references: if user has game in shelf → auto-mark in progress
 *   4. Fetches Steam owned games → cross-references with community items
 *
 * On log:
 *   1. Upserts community_user_progress
 *   2. Calls logGame() for unified media write
 *
 * On unlog:
 *   1. Deletes community_user_progress
 *   2. Does NOT delete from user_media_logs (personal shelf stays)
 */
export function useNowPlayingGameBridge(communityId, userId, gameItems) {
  const [gameProgress, setGameProgress] = useState({});
  const [userGames, setUserGames] = useState([]);
  const [steamGames, setSteamGames] = useState([]); // owned Steam games
  const [steamLoading, setSteamLoading] = useState(false);
  const [steamId, setSteamId] = useState(null);

  // ── Build RAWG ID ↔ community_item_id maps ────────────────
  const rawgToItemId = useMemo(() => {
    const map = {};
    gameItems.forEach((item) => {
      const rawgId = item.extra_data?.rawg_id;
      if (rawgId) map[rawgId] = item.id;
    });
    return map;
  }, [gameItems]);

  const itemIdToRawg = useMemo(() => {
    const map = {};
    gameItems.forEach((item) => {
      const rawgId = item.extra_data?.rawg_id;
      if (rawgId) map[item.id] = rawgId;
    });
    return map;
  }, [gameItems]);

  // Steam app ID map (for achievement lookups)
  const steamAppIdMap = useMemo(() => {
    const map = {};
    gameItems.forEach((item) => {
      const steamAppId = item.extra_data?.steam_app_id;
      if (steamAppId) map[item.id] = steamAppId;
    });
    return map;
  }, [gameItems]);

  // ── Load user's Steam ID from profile ─────────────────────
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("steam_id")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.steam_id) setSteamId(data.steam_id);
      });
  }, [userId]);

  // ── Load community progress + user games + Steam ─────────
  useEffect(() => {
    if (!communityId || !userId || gameItems.length === 0) return;

    const load = async () => {
      // 1. Community progress for game items
      const { data: communityProgress } = await supabase
        .from("community_user_progress")
        .select("*")
        .eq("user_id", userId)
        .in("item_id", gameItems.map((i) => i.id));

      const progressMap = {};
      (communityProgress || []).forEach((row) => {
        progressMap[row.item_id] = {
          rating: row.rating,
          notes: row.notes,
          completed_at: row.completed_at,
          status: row.status || "completed",
          platform: row.extra_data?.platform || null,
          played_along: row.extra_data?.played_along || false,
          ...(row.extra_data || {}),
        };
      });

      // 2. User's game shelf from unified view (cross-reference by RAWG ID)
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

      // 3. Cross-reference: games shelf → auto-populate progress
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

      setGameProgress(progressMap);
    };

    load();
  }, [communityId, userId, gameItems, rawgToItemId]);

  // ── Steam sync: fetch owned games + match to community items ──
  useEffect(() => {
    if (!steamId || gameItems.length === 0) return;

    const syncSteam = async () => {
      setSteamLoading(true);
      try {
        // Fetch owned games from Steam proxy
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/steam-proxy?action=owned&steam_id=${steamId}`,
          {
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
          }
        );
        const data = await res.json();
        const ownedGames = data?.games || [];
        setSteamGames(ownedGames);

        // Build Steam appid → playtime map
        const steamOwned = {};
        ownedGames.forEach((g) => {
          steamOwned[g.appid] = {
            playtime: g.playtime_forever || 0,
            name: g.name,
          };
        });

        // Cross-reference: if a community game item has a steam_app_id
        // and the user owns it on Steam, fetch achievements
        const itemsWithSteam = gameItems.filter(
          (item) => item.extra_data?.steam_app_id && steamOwned[item.extra_data.steam_app_id]
        );

        if (itemsWithSteam.length > 0) {
          const appIds = itemsWithSteam
            .map((i) => i.extra_data.steam_app_id)
            .slice(0, 60); // batch limit

          const achRes = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/steam-proxy?action=achievements_batch&steam_id=${steamId}&app_ids=${appIds.join(",")}`,
            {
              headers: {
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
            }
          );
          const achData = await achRes.json();
          const achievements = achData?.achievements || {};

          // Update progress for games based on achievements
          setGameProgress((prev) => {
            const next = { ...prev };
            itemsWithSteam.forEach((item) => {
              const ach = achievements[item.extra_data.steam_app_id];
              if (ach && ach.total > 0 && ach.earned === ach.total && !next[item.id]) {
                // 100% achievements → beat
                next[item.id] = {
                  rating: null, notes: null, completed_at: null,
                  status: "beat", platform: "pc", played_along: false,
                  _fromSteam: true, _steamAchievements: ach,
                };
              } else if (ach && !next[item.id]) {
                const steamInfo = steamOwned[item.extra_data.steam_app_id];
                if (steamInfo && steamInfo.playtime > 60) {
                  // 1+ hour played → playing
                  next[item.id] = {
                    rating: null, notes: null, completed_at: null,
                    status: "playing", platform: "pc", played_along: false,
                    _fromSteam: true, _steamAchievements: ach,
                  };
                }
              }
            });
            return next;
          });
        }
      } catch (err) {
        console.warn("[NPP GameBridge] Steam sync error:", err);
      } finally {
        setSteamLoading(false);
      }
    };

    syncSteam();
  }, [steamId, gameItems]);

  // ── Log: community_user_progress + unified media ──────────
  const logGameItem = useCallback(
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

      if (isUpdate || gameProgress[itemId]) {
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
          notes: notes || null,
        });
      }

      // 3. Update local state
      setGameProgress((prev) => ({
        ...prev,
        [itemId]: {
          rating, notes, completed_at, status,
          played_along: played_along || false,
          platform: platform || null,
        },
      }));
    },
    [userId, gameProgress, itemIdToRawg]
  );

  // ── Unlog: remove from community only ─────────────────────
  const unlogGameItem = useCallback(
    async (itemId) => {
      if (!userId) return;

      await supabase
        .from("community_user_progress")
        .delete()
        .eq("user_id", userId)
        .eq("item_id", itemId);

      setGameProgress((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    },
    [userId]
  );

  // ── Add to backlog ────────────────────────────────────────
  const addToBacklog = useCallback(
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

  // ── Helper: check if user owns game (shelf or Steam) ──────
  const userOwnsGame = useCallback(
    (itemId) => {
      const rawgId = itemIdToRawg[itemId];
      if (!rawgId) return false;
      if (userGames.some((g) => g.external_id === parseInt(rawgId))) return true;
      const steamAppId = steamAppIdMap[itemId];
      if (steamAppId && steamGames.some((g) => g.appid === Number(steamAppId)))
        return true;
      return false;
    },
    [userGames, steamGames, itemIdToRawg, steamAppIdMap]
  );

  // ── Steam achievement stats for a specific item ───────────
  const getSteamStats = useCallback(
    (itemId) => {
      const prog = gameProgress[itemId];
      if (prog?._steamAchievements) return prog._steamAchievements;
      return null;
    },
    [gameProgress]
  );

  return {
    gameProgress,
    setGameProgress,
    logGameItem,
    unlogGameItem,
    addToBacklog,
    userOwnsGame,
    getSteamStats,
    userGames,
    steamGames,
    steamLoading,
    steamId,
  };
}
