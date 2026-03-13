// supabase/functions/strava/index.ts
// Deploy with: supabase functions deploy strava
// Set secrets:
//   supabase secrets set STRAVA_CLIENT_ID=203965
//   supabase secrets set STRAVA_CLIENT_SECRET=<your_secret>

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[Strava EF] Request received:", req.method);
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    console.log("[Strava EF] User:", user?.id || "NO USER");
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { action, code, after, before } = await req.json();
    console.log("[Strava EF] Action:", action, "Has code:", !!code);
    const clientId = Deno.env.get("STRAVA_CLIENT_ID");
    const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET");

    // ─── EXCHANGE: trade auth code for tokens ───
    if (action === "exchange") {
      console.log("[Strava EF] Exchanging code, client_id:", clientId);
      const tokenRes = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenRes.json();
      console.log("[Strava EF] Token response status:", tokenRes.status, "has access_token:", !!tokenData.access_token, "errors:", tokenData.errors);

      if (tokenData.errors || !tokenData.access_token) {
        return new Response(JSON.stringify({ error: "Token exchange failed", details: tokenData }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Upsert tokens
      const { error: upsertError } = await supabaseClient.from("strava_tokens").upsert({
        user_id: user.id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
        athlete_id: tokenData.athlete?.id,
      }, { onConflict: "user_id" });

      if (upsertError) {
        console.error("[Strava EF] Upsert failed:", upsertError);
        return new Response(JSON.stringify({ error: "Failed to save tokens", details: upsertError }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── DISCONNECT ───
    if (action === "disconnect") {
      await supabaseClient.from("strava_tokens").delete().eq("user_id", user.id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Get valid access token (refresh if expired) ───
    const { data: tokens } = await supabaseClient
      .from("strava_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!tokens) {
      return new Response(JSON.stringify({ error: "Not connected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = tokens.access_token;

    // Refresh if expired
    if (tokens.expires_at && tokens.expires_at < Math.floor(Date.now() / 1000)) {
      const refreshRes = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokens.refresh_token,
          grant_type: "refresh_token",
        }),
      });
      const refreshData = await refreshRes.json();

      if (refreshData.access_token) {
        accessToken = refreshData.access_token;
        await supabaseClient.from("strava_tokens").update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || tokens.refresh_token,
          expires_at: refreshData.expires_at,
        }).eq("user_id", user.id);
      } else {
        return new Response(JSON.stringify({ error: "Token refresh failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
    }

    // ─── LATEST: get recent activities ───
    if (action === "latest") {
      const activitiesRes = await fetch(
        "https://www.strava.com/api/v3/athlete/activities?per_page=5",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const activities = await activitiesRes.json();

      // Fetch detailed info for the first activity (to get photos + full polyline)
      if (Array.isArray(activities) && activities.length > 0) {
        try {
          const detailRes = await fetch(
            `https://www.strava.com/api/v3/activities/${activities[0].id}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const detail = await detailRes.json();
          if (detail) {
            activities[0] = { ...activities[0], ...detail };
          }
        } catch (e) {
          console.error("[Strava EF] Detail fetch failed:", e.message);
        }
      }

      return new Response(JSON.stringify({ activities }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── MONTHLY: get all activities for a month, return aggregated stats ───
    if (action === "monthly") {
      if (!after || !before) {
        return new Response(JSON.stringify({ error: "Missing after/before params" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Fetch up to 200 activities for the month (pagination)
      let allActivities: any[] = [];
      let page = 1;
      while (page <= 4) { // max 4 pages = 200 activities
        const res = await fetch(
          `https://www.strava.com/api/v3/athlete/activities?after=${after}&before=${before}&per_page=50&page=${page}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const batch = await res.json();
        if (!Array.isArray(batch) || batch.length === 0) break;
        allActivities = [...allActivities, ...batch];
        if (batch.length < 50) break;
        page++;
      }

      if (allActivities.length === 0) {
        return new Response(JSON.stringify({ stats: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Aggregate stats
      let totalDistance = 0;
      let totalMovingTime = 0;
      let totalElevation = 0;
      let totalRuns = 0;
      let totalRides = 0;
      let totalOther = 0;
      let longestDistance = 0;
      let totalSpeedSum = 0;
      let speedCount = 0;

      for (const act of allActivities) {
        const type = (act.sport_type || act.type || "").toLowerCase();
        const isRun = type.includes("run");
        const isRide = type.includes("ride");

        totalDistance += act.distance || 0;
        totalMovingTime += act.moving_time || 0;
        totalElevation += act.total_elevation_gain || 0;

        if (isRun) {
          totalRuns++;
          if ((act.distance || 0) > longestDistance) longestDistance = act.distance;
          if (act.average_speed > 0) {
            totalSpeedSum += act.average_speed;
            speedCount++;
          }
        } else if (isRide) {
          totalRides++;
        } else {
          totalOther++;
        }
      }

      // Calculate avg pace for runs
      const avgSpeed = speedCount > 0 ? totalSpeedSum / speedCount : 0;
      let avgPace = null;
      if (avgSpeed > 0) {
        const paceSeconds = 1000 / avgSpeed;
        const mins = Math.floor(paceSeconds / 60);
        const secs = Math.round(paceSeconds % 60);
        avgPace = `${mins}:${secs.toString().padStart(2, "0")}`;
      }

      const stats = {
        totalActivities: allActivities.length,
        totalKm: Math.round((totalDistance / 1000) * 10) / 10,
        totalRuns,
        totalRides,
        totalOther,
        totalHours: Math.round((totalMovingTime / 3600) * 10) / 10,
        elevation: Math.round(totalElevation),
        longestRun: Math.round((longestDistance / 1000) * 10) / 10,
        avgPace,
      };

      return new Response(JSON.stringify({ stats, activities: allActivities }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  } catch (err) {
    console.error("[Strava EF] UNCAUGHT ERROR:", err.message, err.stack);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
