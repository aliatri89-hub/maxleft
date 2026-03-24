// supabase/functions/notify-new-coverage/index.ts
//
// Sends push notifications to users when a podcast covers a film they've logged.
// Called by ingest-rss after new podcast_episode_films mappings are inserted.
//
// Deploy: supabase functions deploy notify-new-coverage --no-verify-jwt
//
// POST /functions/v1/notify-new-coverage
// Body: {
//   "new_mappings": [
//     { "episode_id": "uuid", "tmdb_id": 550, "podcast_id": "uuid" }
//   ]
// }

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { new_mappings } = await req.json();

    if (!new_mappings?.length) {
      return jsonRes({ sent: 0, message: "No mappings provided" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    console.log(
      `[NotifyCoverage] Processing ${new_mappings.length} new mapping(s)`
    );

    // ── 1. Gather film + podcast details for all mappings ──────────
    const tmdbIds = [...new Set(new_mappings.map((m: any) => m.tmdb_id))];
    const episodeIds = [...new Set(new_mappings.map((m: any) => m.episode_id))];

    // Film titles
    const { data: films } = await sb
      .from("media")
      .select("id, tmdb_id, title")
      .in("tmdb_id", tmdbIds)
      .eq("media_type", "film");

    const filmByTmdb = new Map(
      (films || []).map((f: any) => [f.tmdb_id, f])
    );

    // Episode + podcast details
    const { data: episodes } = await sb
      .from("podcast_episodes")
      .select("id, podcast_id, podcasts(id, name, slug)")
      .in("id", episodeIds);

    const episodeById = new Map(
      (episodes || []).map((e: any) => [e.id, e])
    );

    // ── 2. Find users who logged these films + have device tokens ──
    const mediaIds = (films || []).map((f: any) => f.id);

    if (mediaIds.length === 0) {
      console.log("[NotifyCoverage] No matching films found in media table");
      return jsonRes({ sent: 0, message: "No matching films" });
    }

    // Users who have any of these films logged
    const { data: logs } = await sb
      .from("user_media_logs")
      .select("user_id, media_id")
      .in("media_id", mediaIds);

    if (!logs?.length) {
      console.log("[NotifyCoverage] No users have these films logged");
      return jsonRes({ sent: 0, message: "No users with these films logged" });
    }

    // Unique user IDs
    const userIds = [...new Set(logs.map((l: any) => l.user_id))];

    // Device tokens for these users
    const { data: tokens } = await sb
      .from("device_tokens")
      .select("user_id, token, platform")
      .in("user_id", userIds);

    if (!tokens?.length) {
      console.log("[NotifyCoverage] No device tokens for matching users");
      return jsonRes({ sent: 0, message: "No device tokens" });
    }

    const usersWithTokens = new Set(tokens.map((t: any) => t.user_id));

    // ── 3. Load notification preferences ───────────────────────────
    const { data: prefs } = await sb
      .from("user_notification_preferences")
      .select("user_id, new_coverage, favorites_only")
      .in("user_id", [...usersWithTokens]);

    const prefByUser = new Map(
      (prefs || []).map((p: any) => [p.user_id, p])
    );

    // ── 4. Load favorites for users who have favorites_only enabled ─
    const favOnlyUsers = [...usersWithTokens].filter((uid) => {
      const p = prefByUser.get(uid);
      return p?.favorites_only === true;
    });

    let favsByUser = new Map<string, Set<string>>();
    if (favOnlyUsers.length > 0) {
      const { data: favRows } = await sb
        .from("user_podcast_favorites")
        .select("user_id, podcast_id")
        .in("user_id", favOnlyUsers);

      for (const row of favRows || []) {
        if (!favsByUser.has(row.user_id)) {
          favsByUser.set(row.user_id, new Set());
        }
        favsByUser.get(row.user_id)!.add(row.podcast_id);
      }
    }

    // ── 5. Check existing notifications for dedup ──────────────────
    const refKeys = new_mappings.map(
      (m: any) => `coverage:${m.episode_id}:${m.tmdb_id}`
    );

    const { data: existingNotifs } = await sb
      .from("push_notification_log")
      .select("user_id, ref_key")
      .in("user_id", [...usersWithTokens])
      .in("ref_key", refKeys);

    const sentSet = new Set(
      (existingNotifs || []).map((n: any) => `${n.user_id}::${n.ref_key}`)
    );

    // ── 6. Build user→media lookup from logs ───────────────────────
    // Map media_id → tmdb_id for quick lookup
    const mediaToTmdb = new Map(
      (films || []).map((f: any) => [f.id, f.tmdb_id])
    );

    // Build user → Set<tmdb_id> of logged films
    const userLoggedFilms = new Map<string, Set<number>>();
    for (const log of logs) {
      const tmdbId = mediaToTmdb.get(log.media_id);
      if (!tmdbId) continue;
      if (!userLoggedFilms.has(log.user_id)) {
        userLoggedFilms.set(log.user_id, new Set());
      }
      userLoggedFilms.get(log.user_id)!.add(tmdbId);
    }

    // ── 7. Determine notifications to send ─────────────────────────
    interface PendingNotif {
      user_id: string;
      title: string;
      body: string;
      ref_key: string;
      payload: Record<string, any>;
    }

    const pending: PendingNotif[] = [];

    for (const mapping of new_mappings) {
      const { episode_id, tmdb_id } = mapping;
      const film = filmByTmdb.get(tmdb_id);
      const episode = episodeById.get(episode_id);

      if (!film || !episode) continue;

      const podcastName = episode.podcasts?.name || "A podcast";
      const podcastId = episode.podcast_id;
      const refKey = `coverage:${episode_id}:${tmdb_id}`;

      for (const userId of usersWithTokens) {
        // Check if user has this film logged
        const logged = userLoggedFilms.get(userId);
        if (!logged?.has(tmdb_id)) continue;

        // Check notification preferences
        const pref = prefByUser.get(userId);
        // If pref exists and new_coverage is explicitly false, skip
        if (pref?.new_coverage === false) continue;

        // If favorites_only, check if this podcast is favorited
        if (pref?.favorites_only === true) {
          const favs = favsByUser.get(userId);
          if (!favs?.has(podcastId)) continue;
        }

        // Dedup check
        const dedupKey = `${userId}::${refKey}`;
        if (sentSet.has(dedupKey)) continue;

        pending.push({
          user_id: userId,
          title: "New coverage available",
          body: `${podcastName} just covered ${film.title}`,
          ref_key: refKey,
          payload: {
            route: `/?openFilm=${tmdb_id}`,
            type: "new_coverage",
            tmdb_id,
            episode_id,
          },
        });

        // Mark as "will be sent" so we don't double-send in this batch
        sentSet.add(dedupKey);
      }
    }

    if (pending.length === 0) {
      console.log("[NotifyCoverage] No notifications to send after filtering");
      return jsonRes({ sent: 0, message: "All filtered or already sent" });
    }

    console.log(`[NotifyCoverage] Sending ${pending.length} notification(s)`);

    // ── 8. Send via send-push (grouped by user) ────────────────────
    // Group by user to minimize send-push calls
    const byUser = new Map<string, PendingNotif[]>();
    for (const n of pending) {
      if (!byUser.has(n.user_id)) byUser.set(n.user_id, []);
      byUser.get(n.user_id)!.push(n);
    }

    let totalSent = 0;
    let totalFailed = 0;

    for (const [userId, notifs] of byUser) {
      // Send each notification individually (one per film)
      for (const notif of notifs) {
        try {
          const pushRes = await fetch(
            `${supabaseUrl}/functions/v1/send-push`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${serviceKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                user_ids: [userId],
                title: notif.title,
                body: notif.body,
                data: notif.payload,
              }),
            }
          );

          const result = await pushRes.json();

          if (result.sent > 0) {
            totalSent++;
          } else {
            totalFailed++;
          }
        } catch (err) {
          console.error(
            `[NotifyCoverage] send-push failed for user ${userId}:`,
            (err as Error).message
          );
          totalFailed++;
        }
      }
    }

    // ── 9. Log all sent notifications ──────────────────────────────
    const logRows = pending.map((n) => ({
      user_id: n.user_id,
      notif_type: "new_coverage",
      ref_key: n.ref_key,
      title: n.title,
      body: n.body,
      payload: n.payload,
    }));

    const { error: logErr } = await sb
      .from("push_notification_log")
      .insert(logRows);

    if (logErr) {
      console.error("[NotifyCoverage] Failed to log notifications:", logErr.message);
    }

    console.log(
      `[NotifyCoverage] Done: ${totalSent} sent, ${totalFailed} failed`
    );

    return jsonRes({
      sent: totalSent,
      failed: totalFailed,
      total_pending: pending.length,
    });
  } catch (err) {
    console.error("[NotifyCoverage] UNCAUGHT:", (err as Error).message);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
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
