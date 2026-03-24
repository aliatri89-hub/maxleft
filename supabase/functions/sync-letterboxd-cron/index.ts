// supabase/functions/sync-letterboxd-cron/index.ts
//
// DISPATCHER — lightweight orchestrator for Letterboxd sync at scale.
//
// Replaces the old monolithic sync function. This function:
//   1. Refreshes sync tiers (active/moderate/dormant) based on user activity
//   2. Queries users who are DUE for sync based on their tier
//   3. Chunks them into batches of BATCH_SIZE
//   4. Fires parallel edge function calls to sync-letterboxd-batch
//   5. Finishes in <5s regardless of user count
//
// Tier intervals:
//   active   (film logged in last 7 days)  → every 30 min
//   moderate (film logged in last 30 days) → every 2 hours
//   dormant  (no activity in 30+ days)     → every 6 hours
//
// Deploy: supabase functions deploy sync-letterboxd-cron --no-verify-jwt
//
// pg_cron: runs every 30 min (the dispatcher is cheap; tiers control actual sync frequency)
//   UPDATE cron.job SET schedule = '*/30 * * * *' WHERE jobid = 9;

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Max users per batch function invocation
const BATCH_SIZE = 40;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  try {
    // ── 1. Refresh sync tiers based on recent activity ──────
    const { error: tierErr } = await sb.rpc("refresh_letterboxd_sync_tiers");
    if (tierErr) {
      console.warn("[LBDispatch] Tier refresh failed:", tierErr.message);
      // Non-fatal — continue with existing tiers
    }

    // ── 2. Find users due for sync ──────────────────────────
    // A user is "due" if enough time has passed since their last sync
    // based on their tier, OR they've never been synced.
    //
    // We query directly rather than via RPC for simplicity — the
    // get_letterboxd_users_due_for_sync function is below in the migration.
    const { data: allUsers, error: queryErr } = await sb
      .from("profiles")
      .select("id, letterboxd_username, letterboxd_sync_tier, letterboxd_last_synced_at")
      .not("letterboxd_username", "is", null);

    if (queryErr) throw new Error(`Failed to load profiles: ${queryErr.message}`);
    if (!allUsers?.length) {
      return jsonRes({ message: "No users with Letterboxd connected", users_due: 0 });
    }

    // Filter to users who are due based on their tier
    const now = Date.now();
    const tierIntervalMs: Record<string, number> = {
      active: 30 * 60 * 1000,      // 30 minutes
      moderate: 2 * 60 * 60 * 1000, // 2 hours
      dormant: 6 * 60 * 60 * 1000,  // 6 hours
    };

    const dueUsers = allUsers.filter((u) => {
      if (!u.letterboxd_last_synced_at) return true; // Never synced
      const tier = u.letterboxd_sync_tier || "active";
      const interval = tierIntervalMs[tier] || tierIntervalMs.active;
      const lastSync = new Date(u.letterboxd_last_synced_at).getTime();
      return now - lastSync >= interval;
    });

    if (!dueUsers.length) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[LBDispatch] No users due for sync (${allUsers.length} total, ${elapsed}s)`);
      return jsonRes({
        message: "No users due for sync",
        users_total: allUsers.length,
        users_due: 0,
        batches_dispatched: 0,
        elapsed_seconds: parseFloat(elapsed),
      });
    }

    console.log(
      `[LBDispatch] ${dueUsers.length}/${allUsers.length} user(s) due for sync`
    );

    // ── 3. Chunk into batches and fan out ────────────────────
    const batches: typeof dueUsers[] = [];
    for (let i = 0; i < dueUsers.length; i += BATCH_SIZE) {
      batches.push(dueUsers.slice(i, i + BATCH_SIZE));
    }

    console.log(
      `[LBDispatch] Dispatching ${batches.length} batch(es)`
    );

    // Fire all batches in parallel
    const batchResults = await Promise.allSettled(
      batches.map((batch, idx) =>
        fetch(`${supabaseUrl}/functions/v1/sync-letterboxd-batch`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            users: batch.map((u) => ({
              id: u.id,
              username: u.letterboxd_username,
            })),
            batch_index: idx,
          }),
        }).then(async (res) => {
          const body = await res.json().catch(() => ({}));
          return { status: res.status, batch_index: idx, ...body };
        })
      )
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    const summary = batchResults.map((r, i) => {
      if (r.status === "fulfilled") {
        return { batch: i, ...r.value };
      }
      return { batch: i, error: (r as PromiseRejectedResult).reason?.message };
    });

    console.log(`[LBDispatch] All batches dispatched in ${elapsed}s`);

    return jsonRes({
      users_total: allUsers.length,
      users_due: dueUsers.length,
      batches_dispatched: batches.length,
      elapsed_seconds: parseFloat(elapsed),
      batch_results: summary,
    });
  } catch (err: any) {
    console.error("[LBDispatch] UNCAUGHT:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function jsonRes(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
