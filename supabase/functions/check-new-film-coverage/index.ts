// supabase/functions/check-new-film-coverage/index.ts
//
// "You Watched It" notification — batched per film.
// When a user logs a film, checks if any of their subscribed/favorited
// podcasts have covered it. Sends ONE notification per film:
//   "You watched Jaws — Blank Check, The Rewatchables, and 3 more covered it"
//
// Called by sync-letterboxd-cron after syncing new films, or from the
// client after a manual log.
//
// Deploy: supabase functions deploy check-new-film-coverage --no-verify-jwt
//
// POST /functions/v1/check-new-film-coverage
// Body: {
//   "user_id": "uuid",
//   "new_films": [
//     { "tmdb_id": 578, "title": "Jaws" },
//     { "tmdb_id": 680, "title": "Pulp Fiction" }
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
    const { user_id, new_films } = await req.json();

    if (!user_id || !new_films?.length) {
      return jsonRes({ sent: 0, message: "No user_id or films provided" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    console.log(
      `[WatchedCoverage] Checking coverage for ${new_films.length} film(s), user ${user_id}`
    );

    // ── 1. Check notification preferences ───────────────────
    const { data: prefs } = await sb
      .from("user_notification_preferences")
      .select("watched_coverage")
      .eq("user_id", user_id)
      .maybeSingle();

    // Default is true; only skip if explicitly false
    if (prefs?.watched_coverage === false) {
      console.log("[WatchedCoverage] User has watched_coverage disabled");
      return jsonRes({ sent: 0, message: "Notification disabled by user" });
    }

    // ── 2. Check device tokens (for push only, inbox works without) ─
    const { data: tokens } = await sb
      .from("device_tokens")
      .select("token")
      .eq("user_id", user_id);

    const hasTokens = (tokens?.length || 0) > 0;

    // ── 3. Build the user's podcast whitelist ───────────────
    //    Combines: community subscriptions + direct podcast favorites
    const userPodcastIds = await getUserPodcastIds(sb, user_id);

    if (userPodcastIds.size === 0) {
      console.log("[WatchedCoverage] User has no subscribed/favorited podcasts");
      return jsonRes({ sent: 0, message: "No podcast subscriptions" });
    }

    // ── 4. For each film, find matching coverage ────────────
    const tmdbIds = new_films.map((f: any) => f.tmdb_id);
    const filmTitleMap = new Map(
      new_films.map((f: any) => [f.tmdb_id, f.title])
    );

    // Get all coverage for these films
    const { data: coverageRows } = await sb
      .from("podcast_episode_films")
      .select(
        "tmdb_id, episode_id, podcast_episodes(id, podcast_id, podcasts(id, name, slug, artwork_url))"
      )
      .in("tmdb_id", tmdbIds);

    if (!coverageRows?.length) {
      console.log("[WatchedCoverage] No podcast coverage found for these films");
      return jsonRes({ sent: 0, message: "No coverage exists" });
    }

    // ── 5. Dedup check — load existing notifications ────────
    const refKeys = tmdbIds.map((id: number) => `watched:${id}`);
    const { data: existingNotifs } = await sb
      .from("push_notification_log")
      .select("ref_key")
      .eq("user_id", user_id)
      .in("ref_key", refKeys);

    const pushSentSet = new Set(
      (existingNotifs || []).map((n: any) => n.ref_key)
    );

    // Inbox dedup
    const { data: existingInbox } = await sb
      .from("user_notifications")
      .select("ref_key")
      .eq("user_id", user_id)
      .in("ref_key", refKeys);

    const inboxSentSet = new Set(
      (existingInbox || []).map((n: any) => n.ref_key)
    );

    // ── 6. Group coverage by film, filter by user's podcasts ─
    interface FilmCoverage {
      tmdb_id: number;
      title: string;
      podcasts: Array<{ id: string; name: string; slug: string }>;
    }

    const coverageByFilm = new Map<number, FilmCoverage>();

    for (const row of coverageRows) {
      const tmdbId = row.tmdb_id;
      const episode = row.podcast_episodes as any;
      if (!episode?.podcasts) continue;

      const podcast = episode.podcasts;
      const podcastId = episode.podcast_id;

      // Filter: only include podcasts the user follows
      if (!userPodcastIds.has(podcastId)) continue;

      if (!coverageByFilm.has(tmdbId)) {
        coverageByFilm.set(tmdbId, {
          tmdb_id: tmdbId,
          title: filmTitleMap.get(tmdbId) || "a film",
          podcasts: [],
        });
      }

      const entry = coverageByFilm.get(tmdbId)!;
      // Dedupe podcasts (same podcast may cover a film in multiple episodes)
      if (!entry.podcasts.some((p) => p.id === podcast.id)) {
        entry.podcasts.push({
          id: podcast.id,
          name: podcast.name,
          slug: podcast.slug,
        });
      }
    }

    // ── 7. Build and send notifications ─────────────────────
    let totalSent = 0;
    const logRows: any[] = [];
    const inboxRows: any[] = [];

    for (const [tmdbId, coverage] of coverageByFilm) {
      const refKey = `watched:${tmdbId}`;
      const podcastCount = coverage.podcasts.length;
      if (podcastCount === 0) continue;

      // Build notification body
      const body = buildNotificationBody(coverage.title, coverage.podcasts);

      const payload = {
        type: "watched_coverage",
        tmdb_id: String(tmdbId),
        podcast_count: String(podcastCount),
        route: `/?openFilm=${tmdbId}`,
      };

      // ── Push: only if user has tokens AND not already sent via push ──
      if (hasTokens && !pushSentSet.has(refKey)) {
        try {
          const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_ids: [user_id],
              title: "Coverage available",
              body,
              data: payload,
            }),
          });

          const result = await pushRes.json();
          if (result.sent > 0) {
            totalSent++;
          }
        } catch (err: any) {
          console.error(
            `[WatchedCoverage] send-push failed for ${coverage.title}:`,
            err.message
          );
        }

        logRows.push({
          user_id,
          notif_type: "watched_coverage",
          ref_key: refKey,
          title: "Coverage available",
          body,
          payload,
        });

        pushSentSet.add(refKey);
      }

      // ── Inbox: always write (if not already in inbox) ──
      if (!inboxSentSet.has(refKey)) {
        // Resolve podcast artwork from join data
        let artworkUrl: string | null = null;
        const firstPodcast = coverage.podcasts[0];
        for (const r of coverageRows || []) {
          const ep = r.podcast_episodes as any;
          if (ep?.podcasts?.id === firstPodcast.id && ep?.podcasts?.artwork_url) {
            artworkUrl = ep.podcasts.artwork_url;
            break;
          }
        }

        inboxRows.push({
          user_id,
          notif_type: "watched_coverage",
          title: "Coverage available",
          body,
          image_url: artworkUrl,
          payload,
          ref_key: refKey,
        });

        inboxSentSet.add(refKey);
      }
    }

    // ── 8. Log all notifications ────────────────────────────
    if (logRows.length > 0) {
      const { error: logErr } = await sb
        .from("push_notification_log")
        .insert(logRows);

      if (logErr) {
        console.error(
          "[WatchedCoverage] Failed to log push notifications:",
          logErr.message
        );
      }
    }

    // Inbox upsert — unique index handles dedup
    if (inboxRows.length > 0) {
      const { error: inboxErr } = await sb
        .from("user_notifications")
        .upsert(inboxRows, { onConflict: "user_id,ref_key", ignoreDuplicates: true });

      if (inboxErr) {
        console.error(
          "[WatchedCoverage] Failed to write inbox notifications:",
          inboxErr.message
        );
      }
    }

    console.log(
      `[WatchedCoverage] Done: ${totalSent} notification(s) sent for ${coverageByFilm.size} film(s)`
    );

    return jsonRes({
      sent: totalSent,
      films_with_coverage: coverageByFilm.size,
      films_checked: new_films.length,
    });
  } catch (err: any) {
    console.error("[WatchedCoverage] UNCAUGHT:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Build the user's combined podcast whitelist ─────────────
async function getUserPodcastIds(
  sb: any,
  userId: string
): Promise<Set<string>> {
  const podcastIds = new Set<string>();

  // 1. Direct podcast favorites
  const { data: favs } = await sb
    .from("user_podcast_favorites")
    .select("podcast_id")
    .eq("user_id", userId);

  for (const f of favs || []) {
    podcastIds.add(f.podcast_id);
  }

  // 2. Community subscriptions → podcast via community_page_id
  const { data: subs } = await sb
    .from("user_community_subscriptions")
    .select("community_id")
    .eq("user_id", userId);

  if (subs?.length) {
    const communityIds = subs.map((s: any) => s.community_id);

    const { data: podcasts } = await sb
      .from("podcasts")
      .select("id")
      .in("community_page_id", communityIds);

    for (const p of podcasts || []) {
      podcastIds.add(p.id);
    }
  }

  return podcastIds;
}

// ── Build batched notification body ─────────────────────────
function buildNotificationBody(
  filmTitle: string,
  podcasts: Array<{ name: string }>
): string {
  const count = podcasts.length;

  if (count === 1) {
    return `${podcasts[0].name} covered ${filmTitle}`;
  }

  if (count === 2) {
    return `${podcasts[0].name} and ${podcasts[1].name} covered ${filmTitle}`;
  }

  // 3+: "Blank Check, The Rewatchables, and 3 more covered Jaws"
  const remaining = count - 2;
  return `${podcasts[0].name}, ${podcasts[1].name}, and ${remaining} more covered ${filmTitle}`;
}

function jsonRes(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
