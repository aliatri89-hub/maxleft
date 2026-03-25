import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
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
    const { new_mappings } = await req.json();
    if (!new_mappings?.length) return jsonRes({ sent: 0, message: "No mappings provided" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    console.log(`[NotifyCoverage] Processing ${new_mappings.length} new mapping(s)`);

    const tmdbIds = [...new Set(new_mappings.map((m: any) => m.tmdb_id))];
    const episodeIds = [...new Set(new_mappings.map((m: any) => m.episode_id))];

    const { data: films } = await sb.from("media").select("id, tmdb_id, title").in("tmdb_id", tmdbIds).eq("media_type", "film");
    const filmByTmdb = new Map((films || []).map((f: any) => [f.tmdb_id, f]));

    const { data: episodes } = await sb.from("podcast_episodes").select("id, podcast_id, podcasts(id, name, slug, artwork_url)").in("id", episodeIds);
    const episodeById = new Map((episodes || []).map((e: any) => [e.id, e]));

    const mediaIds = (films || []).map((f: any) => f.id);
    if (mediaIds.length === 0) return jsonRes({ sent: 0, message: "No matching films" });

    const { data: logs } = await sb.from("user_media_logs").select("user_id, media_id").in("media_id", mediaIds);
    if (!logs?.length) return jsonRes({ sent: 0, message: "No users with these films logged" });

    const userIds = [...new Set(logs.map((l: any) => l.user_id))];

    // Device tokens — only needed for push, not for inbox
    const { data: tokens } = await sb.from("device_tokens").select("user_id, token, platform").in("user_id", userIds);
    const usersWithTokens = new Set((tokens || []).map((t: any) => t.user_id));

    // Preferences — fetch for ALL users (not just token holders)
    const { data: prefs } = await sb.from("user_notification_preferences").select("user_id, new_coverage, favorites_only").in("user_id", userIds);
    const prefByUser = new Map((prefs || []).map((p: any) => [p.user_id, p]));

    const favOnlyUsers = userIds.filter((uid: string) => prefByUser.get(uid)?.favorites_only === true);
    let favsByUser = new Map<string, Set<string>>();
    if (favOnlyUsers.length > 0) {
      const { data: favRows } = await sb.from("user_podcast_favorites").select("user_id, podcast_id").in("user_id", favOnlyUsers);
      for (const row of favRows || []) {
        if (!favsByUser.has(row.user_id)) favsByUser.set(row.user_id, new Set());
        favsByUser.get(row.user_id)!.add(row.podcast_id);
      }
    }

    const refKeys = new_mappings.map((m: any) => `coverage:${m.episode_id}:${m.tmdb_id}`);
    const { data: existingNotifs } = await sb.from("push_notification_log").select("user_id, ref_key").in("user_id", userIds).in("ref_key", refKeys);
    const sentSet = new Set((existingNotifs || []).map((n: any) => `${n.user_id}::${n.ref_key}`));

    // Also check inbox dedup (for users who never had tokens but got inbox rows on a previous run)
    const { data: existingInbox } = await sb.from("user_notifications").select("user_id, ref_key").in("user_id", userIds).in("ref_key", refKeys);
    const inboxSentSet = new Set((existingInbox || []).map((n: any) => `${n.user_id}::${n.ref_key}`));

    const mediaToTmdb = new Map((films || []).map((f: any) => [f.id, f.tmdb_id]));
    const userLoggedFilms = new Map<string, Set<number>>();
    for (const log of logs) {
      const tmdbId = mediaToTmdb.get(log.media_id);
      if (!tmdbId) continue;
      if (!userLoggedFilms.has(log.user_id)) userLoggedFilms.set(log.user_id, new Set());
      userLoggedFilms.get(log.user_id)!.add(tmdbId);
    }

    // ── Build per-user pending items (granular, for dedup logging) ──
    interface PendingItem {
      episode_id: string;
      tmdb_id: number;
      film_title: string;
      podcast_name: string;
      podcast_artwork: string | null;
      ref_key: string;
    }
    const userPending = new Map<string, PendingItem[]>();

    for (const mapping of new_mappings) {
      const { episode_id, tmdb_id } = mapping;
      const film = filmByTmdb.get(tmdb_id);
      const episode = episodeById.get(episode_id);
      if (!film || !episode) continue;

      const podcastName = episode.podcasts?.name || "A podcast";
      const podcastId = episode.podcast_id;
      const artworkUrl = episode.podcasts?.artwork_url || null;
      const refKey = `coverage:${episode_id}:${tmdb_id}`;

      for (const userId of userIds) {
        const logged = userLoggedFilms.get(userId);
        if (!logged?.has(tmdb_id)) continue;
        const pref = prefByUser.get(userId);
        if (pref?.new_coverage === false) continue;
        if (pref?.favorites_only === true) {
          const favs = favsByUser.get(userId);
          if (!favs?.has(podcastId)) continue;
        }
        const dedupKey = `${userId}::${refKey}`;
        if (sentSet.has(dedupKey) && inboxSentSet.has(dedupKey)) continue;

        if (!userPending.has(userId)) userPending.set(userId, []);
        userPending.get(userId)!.push({
          episode_id: String(episode_id),
          tmdb_id,
          film_title: film.title,
          podcast_name: podcastName,
          podcast_artwork: artworkUrl,
          ref_key: refKey,
        });
        sentSet.add(dedupKey);
      }
    }

    if (userPending.size === 0) return jsonRes({ sent: 0, message: "All filtered or already sent" });

    console.log(`[NotifyCoverage] Batching for ${userPending.size} user(s)`);

    let totalSent = 0;
    let totalFailed = 0;
    const allLogRows: any[] = [];
    const allInboxRows: any[] = [];

    for (const [userId, items] of userPending) {
      // Deduplicate films (multiple episodes may cover the same film)
      const filmMap = new Map<number, { tmdb_id: number; title: string }>();
      for (const item of items) {
        if (!filmMap.has(item.tmdb_id)) {
          filmMap.set(item.tmdb_id, { tmdb_id: item.tmdb_id, title: item.film_title });
        }
      }
      const distinctFilms = [...filmMap.values()];
      const filmCount = distinctFilms.length;

      // ── Build batched notification message ──
      let title: string;
      let body: string;

      if (filmCount === 1) {
        // Single film — use the specific podcast name like before
        const item = items[0];
        title = "New coverage available";
        body = `${item.podcast_name} just covered ${item.film_title}`;
      } else if (filmCount === 2) {
        title = "New coverage available";
        body = `2 films got new coverage: ${distinctFilms[0].title} and ${distinctFilms[1].title}`;
      } else {
        title = "New coverage available";
        body = `${filmCount} of your films got new podcast coverage`;
      }

      // Use first item's artwork as the notification image
      const image = items[0].podcast_artwork || undefined;

      // Payload for tap routing
      const payload: Record<string, string> = {
        type: filmCount === 1 ? "new_coverage" : "new_coverage_digest",
        film_count: String(filmCount),
        films: JSON.stringify(distinctFilms.slice(0, 10)),
        route: filmCount === 1 ? `/?openFilm=${distinctFilms[0].tmdb_id}` : "/?feed=activity",
      };
      // For single film, keep tmdb_id for direct sleeve open
      if (filmCount === 1) {
        payload.tmdb_id = String(distinctFilms[0].tmdb_id);
        payload.episode_id = items[0].episode_id;
      }

      // ── Send push ONLY to users with device tokens ──
      if (usersWithTokens.has(userId)) {
        try {
          const pushBody: Record<string, any> = {
            user_ids: [userId],
            title,
            body,
            data: payload,
          };
          if (image) pushBody.image = image;

          const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
            method: "POST",
            headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
            body: JSON.stringify(pushBody),
          });
          const result = await pushRes.json();
          if (result.sent > 0) totalSent++; else totalFailed++;
        } catch (err) {
          console.error(`[NotifyCoverage] send-push failed for ${userId}:`, (err as Error).message);
          totalFailed++;
        }

        // Push dedup log — only for token holders
        for (const item of items) {
          allLogRows.push({
            user_id: userId,
            notif_type: "new_coverage",
            ref_key: item.ref_key,
            title,
            body,
            payload,
          });
        }
      }

      // ── Inbox rows for ALL users (individual items, not batched) ──
      for (const item of items) {
        allInboxRows.push({
          user_id: userId,
          notif_type: "new_coverage",
          title: "New coverage available",
          body: `${item.podcast_name} just covered ${item.film_title}`,
          image_url: item.podcast_artwork,
          payload: {
            type: "new_coverage",
            tmdb_id: String(item.tmdb_id),
            episode_id: item.episode_id,
            route: `/?openFilm=${item.tmdb_id}`,
          },
          ref_key: item.ref_key,
        });
      }
    }

    // Batch insert push dedup log rows (token holders only)
    if (allLogRows.length > 0) {
      await sb.from("push_notification_log").insert(allLogRows);
    }

    // Batch upsert inbox rows (all users) — unique index handles dedup
    if (allInboxRows.length > 0) {
      const { error: inboxErr } = await sb
        .from("user_notifications")
        .upsert(allInboxRows, { onConflict: "user_id,ref_key", ignoreDuplicates: true });
      if (inboxErr) console.error("[NotifyCoverage] Inbox insert error:", inboxErr.message);
    }

    console.log(`[NotifyCoverage] Done: ${totalSent} sent, ${totalFailed} failed, ${allLogRows.length} push rows, ${allInboxRows.length} inbox rows`);
    return jsonRes({ sent: totalSent, failed: totalFailed, users: userPending.size, dedup_rows: allLogRows.length, inbox_rows: allInboxRows.length });
  } catch (err) {
    console.error("[NotifyCoverage] UNCAUGHT:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function jsonRes(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
