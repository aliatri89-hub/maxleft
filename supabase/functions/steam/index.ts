import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const STEAM_KEY = Deno.env.get("STEAM_API_KEY") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get("action"); // "resolve" | "recent" | "owned" | "achievements"
  const steamId = url.searchParams.get("steam_id");
  const vanityUrl = url.searchParams.get("vanity");
  const appId = url.searchParams.get("app_id");

  if (!STEAM_KEY) {
    return new Response(JSON.stringify({ error: "Steam API key not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Resolve vanity URL to Steam ID
    if (action === "resolve" && vanityUrl) {
      const res = await fetch(
        `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${STEAM_KEY}&vanityurl=${encodeURIComponent(vanityUrl)}`
      );
      const data = await res.json();
      return new Response(JSON.stringify(data.response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!steamId) {
      return new Response(JSON.stringify({ error: "Missing steam_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recently played games (last 2 weeks)
    if (action === "recent") {
      const res = await fetch(
        `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${STEAM_KEY}&steamid=${steamId}&format=json`
      );
      const data = await res.json();
      return new Response(JSON.stringify(data.response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get owned games with playtime
    if (action === "owned") {
      const res = await fetch(
        `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_KEY}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`
      );
      const data = await res.json();
      return new Response(JSON.stringify(data.response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch-fetch achievements for multiple games in one call
    if (action === "achievements_batch") {
      const appIdsParam = url.searchParams.get("app_ids"); // comma-separated
      if (!appIdsParam) {
        return new Response(JSON.stringify({ error: "app_ids required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const appIds = appIdsParam.split(",").filter(Boolean).slice(0, 60);
      const results = {};

      await Promise.all(appIds.map(async (id) => {
        try {
          const res = await fetch(
            `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${id}&key=${STEAM_KEY}&steamid=${steamId}&format=json`
          );
          const data = await res.json();
          const achs = data?.playerstats?.achievements;
          if (achs && Array.isArray(achs)) {
            results[id] = {
              earned: achs.filter((a) => a.achieved === 1).length,
              total: achs.length,
            };
          } else {
            results[id] = null;
          }
        } catch {
          results[id] = null;
        }
      }));

      return new Response(JSON.stringify({ achievements: results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get achievements for a specific game
    if (action === "achievements" && appId) {
      const res = await fetch(
        `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appId}&key=${STEAM_KEY}&steamid=${steamId}`
      );
      const data = await res.json();
      return new Response(JSON.stringify(data.playerstats || {}), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
