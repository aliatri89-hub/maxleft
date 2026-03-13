import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../supabase";

/**
 * useNowPlayingGameBridge — Dual-write hook for game items in the
 * Now Playing Podcast community.
 *
 * NPP covers films, books, AND games. This hook handles the game
 * subset specifically, bridging `community_user_progress` with the
 * global `games` table so logged games appear on the user's My MANTL
 * game shelf.
 *
 * Steam integration:
 *   - Reads user's Steam profile (steam_id from profiles table)
 *   - Calls the `steam-proxy` Edge Function to fetch owned games + achievements
 *   - Cross-references Steam achievements to auto-mark NPP game items
 *     as "beat" if the user has completed them on Steam
 *
 * On load:
 *   1. Fetches community_user_progress for game items only
 *   2. Fetches user's games table entries (by RAWG ID)
 *   3. Cross-references: if user has game in shelf → auto-mark in progress
 *   4. Fetches Steam owned games → cross-references with community items
 *
 * On log:
 *   1. Upserts community_user_progress
 *   2. Upserts games table row (dual-write)
 *
 * On unlog:
 *   1. Deletes community_user_progress
 *   2. Does NOT delete from games table (personal shelf stays)
 *
 * Props:
 *   communityId  — NPP community_pages uuid
 *   userId       — current user uuid
 *   gameItems    — community_items WHERE media_type = 'game' for NPP
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

  // ── Load community progress + games table + Steam ─────────
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

      // 2. User's games table (cross-reference by RAWG ID)
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

      // 3. Cross-reference: games table → auto-populate progress
      gamesRows.forEach((game) => {
        const itemId = rawgToItemId[game.external_id];
        if (itemId && !progressMap[itemId]) {
          progressMap[itemId] = {
            rating: game.rating ? Number(game.rating) : null,
            notes: game.notes,
            completed_at: game.finished_at,
            status: game.status || "completed",
            platform: game.platform,
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
        // and the user owns it on Steam, fetch achievements to determine
        // if they've "beat" it
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

          // Update progress for games where user has earned all achievements
          setGameProgress((prev) => {
            const next = { ...prev };
            itemsWithSteam.forEach((item) => {
              const ach = achievements[item.extra_data.steam_app_id];
              if (ach && ach.total > 0 && ach.earned === ach.total && !next[item.id]) {
                // User has 100% achievements → mark as beat
                next[item.id] = {
                  rating: null,
                  notes: null,
                  completed_at: null,
                  status: "completed",
                  platform: "pc",
                  played_along: false,
                  _fromSteam: true,
                  _steamAchievements: ach,
                };
              } else if (ach && !next[item.id]) {
                // User owns the game, has some achievements → mark as playing
                const steamInfo = steamOwned[item.extra_data.steam_app_id];
                if (steamInfo && steamInfo.playtime > 60) {
                  // More than 1 hour played
                  next[item.id] = {
                    rating: null,
                    notes: null,
                    completed_at: null,
                    status: "playing",
                    platform: "pc",
                    played_along: false,
                    _fromSteam: true,
                    _steamAchievements: ach,
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

  // ── Log: dual-write to community_user_progress + games ────
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

      // 2. Dual-write to games table
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
          source: "community_nowplaying",
        };

        const { data: existing } = await supabase
          .from("games")
          .select("id")
          .eq("user_id", userId)
          .eq("external_id", rawgId)
          .eq("api_source", "rawg")
          .maybeSingle();

        if (existing) {
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
          await supabase.from("games").insert(gameRow);
        }
      }

      // 3. Update local state
      setGameProgress((prev) => ({
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

  // ── Add to backlog / want-to-play ─────────────────────────
  const addToBacklog = useCallback(
    async (item, coverUrl) => {
      if (!userId) return;

      const rawgId = itemIdToRawg[item.id];
      if (rawgId) {
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
            source: "community_nowplaying",
          });
        }
      }

      // Also add to wishlist
      await supabase
        .from("wishlist")
        .upsert(
          {
            user_id: userId,
            media_type: "game",
            title: item.title,
            external_id: item.extra_data?.rawg_id || null,
            cover_url: coverUrl || item.poster_path || null,
          },
          { onConflict: "user_id,title,media_type" }
        )
        .catch(() => {});
    },
    [userId, itemIdToRawg]
  );

  // ── Helper: check if user owns game (games table or Steam) ─
  const userOwnsGame = useCallback(
    (itemId) => {
      const rawgId = itemIdToRawg[itemId];
      if (!rawgId) return false;
      // Check games table
      if (userGames.some((g) => g.external_id === rawgId)) return true;
      // Check Steam
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
