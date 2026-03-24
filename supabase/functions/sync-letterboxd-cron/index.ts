// supabase/functions/sync-letterboxd-cron/index.ts
//
// Server-side Letterboxd sync for all users with a letterboxd_username.
// Runs on pg_cron (hourly) so films appear in MANTL without opening the app.
//
// Replicates the client-side sync from useIntegrationSync.js:
//   1. Fetch Letterboxd RSS
//   2. Parse films (title, year, rating, watchedDate, tmdb_id)
//   3. Diff against existing user_media_logs
//   4. TMDB search + detail fetch for new films
//   5. upsert_media_log RPC (media + user_media_logs + feed_activity)
//   6. update_rewatch_data RPC for rewatches
//   7. Auto-log community progress (community_items → community_user_progress)
//
// Deploy: supabase functions deploy sync-letterboxd-cron --no-verify-jwt
//
// pg_cron setup:
//   SELECT cron.schedule('sync-letterboxd-hourly', '15 * * * *',
//     $$SELECT net.http_post(
//       url := 'https://gfjobhkofftvmluocxyw.supabase.co/functions/v1/sync-letterboxd-cron',
//       headers := jsonb_build_object(
//         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
//         'Content-Type', 'application/json'
//       ),
//       body := '{}'::jsonb
//     )$$
//   );

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Config ──────────────────────────────────────────────────
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";
const MAX_SYNC_PER_USER = 50;
const TMDB_BATCH_SIZE = 4;
const TMDB_BATCH_DELAY_MS = 300;

// ── XML helpers (regex-based, same pattern as ingest-rss) ───
function extractTag(content: string, tag: string): string {
  // Handle namespaced tags like letterboxd:filmTitle or tmdb:movieId
  const regex = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  );
  const match = content.match(regex);
  return (match?.[1] || match?.[2] || "").trim();
}

function extractItems(xml: string): string[] {
  const items: string[] = [];
  const regex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    items.push(match[1]);
  }
  return items;
}

// ── TMDB helpers ────────────────────────────────────────────
function toPosterPath(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return url;
  const match = url.match(/\/t\/p\/[^/]+(\/.*)/);
  return match ? match[1] : url;
}

async function searchTMDB(
  apiKey: string,
  title: string,
  year: number | null
): Promise<any | null> {
  const yearParam = year ? `&year=${year}` : "";
  const url = `${TMDB_BASE}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
    title
  )}&page=1${yearParam}&include_adult=false`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.results?.[0] || null;
  } catch {
    return null;
  }
}

async function fetchTMDBDetail(
  apiKey: string,
  tmdbId: number
): Promise<any | null> {
  const url = `${TMDB_BASE}/movie/${tmdbId}?api_key=${apiKey}&append_to_response=credits&language=en-US`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Letterboxd RSS parser ───────────────────────────────────
interface RSSFilm {
  title: string;
  year: number | null;
  rating: number | null;
  watchedDate: string | null;
  tmdbId: number | null;
  reviewUrl: string | null;
  dedupKey: string;
}

function parseLetterboxdRSS(xml: string): RSSFilm[] {
  const items = extractItems(xml);
  const films: RSSFilm[] = [];

  for (const content of items) {
    // Try namespaced and non-namespaced variants
    const filmTitle =
      extractTag(content, "letterboxd:filmTitle") ||
      extractTag(content, "filmTitle");
    if (!filmTitle) continue;

    const title = filmTitle.trim();
    if (!title) continue;

    const yearStr =
      extractTag(content, "letterboxd:filmYear") ||
      extractTag(content, "filmYear");
    const year = yearStr ? parseInt(yearStr) : null;

    const ratingStr =
      extractTag(content, "letterboxd:memberRating") ||
      extractTag(content, "memberRating");
    const rating = ratingStr ? parseFloat(ratingStr) : null;

    const watchedDate =
      extractTag(content, "letterboxd:watchedDate") ||
      extractTag(content, "watchedDate") ||
      null;

    const tmdbIdStr =
      extractTag(content, "tmdb:movieId") ||
      extractTag(content, "movieId");
    const tmdbId = tmdbIdStr ? parseInt(tmdbIdStr) : null;

    const reviewUrl = extractTag(content, "link") || null;

    films.push({
      title,
      year,
      rating: rating || null,
      watchedDate: watchedDate || null,
      tmdbId: !isNaN(tmdbId!) ? tmdbId : null,
      reviewUrl,
      dedupKey: `${title}::${year}`,
    });
  }

  return films;
}

// ── Main handler ────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const tmdbKey = Deno.env.get("TMDB_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  try {
    // ── 1. Get all users with Letterboxd connected ──────────
    const { data: users, error: usersErr } = await sb
      .from("profiles")
      .select("id, letterboxd_username")
      .not("letterboxd_username", "is", null);

    if (usersErr) throw new Error(`Failed to load profiles: ${usersErr.message}`);
    if (!users?.length) {
      return jsonRes({ message: "No users with Letterboxd connected", users_processed: 0 });
    }

    console.log(`[LBSync] Starting sync for ${users.length} user(s)`);

    const results: any[] = [];

    // ── 2. Process each user sequentially ───────────────────
    for (const user of users) {
      const uid = user.id;
      const username = user.letterboxd_username;
      const userStart = Date.now();

      try {
        const syncResult = await syncUserLetterboxd(sb, tmdbKey, uid, username);
        results.push({
          user_id: uid,
          username,
          ...syncResult,
          elapsed_ms: Date.now() - userStart,
        });

        // Fire "You Watched It" coverage notifications for newly synced films
        if (syncResult.synced_films.length > 0) {
          try {
            const coverageRes = await fetch(
              `${supabaseUrl}/functions/v1/check-new-film-coverage`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${serviceKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  user_id: uid,
                  new_films: syncResult.synced_films.map((f) => ({
                    tmdb_id: f.tmdbId,
                    title: f.title,
                  })),
                }),
              }
            );
            const coverageResult = await coverageRes.json();
            console.log(
              `[LBSync:${username}] Coverage check: ${coverageResult.sent || 0} notification(s)`
            );
          } catch (notifErr: any) {
            console.warn(
              `[LBSync:${username}] Coverage check failed:`,
              notifErr.message
            );
          }
        }
      } catch (err: any) {
        console.error(`[LBSync] User ${username} failed:`, err.message);
        results.push({
          user_id: uid,
          username,
          error: err.message,
          synced: 0,
          rewatches: 0,
          elapsed_ms: Date.now() - userStart,
        });
      }

      // Brief pause between users to be polite to Letterboxd
      await sleep(500);
    }

    const totalSynced = results.reduce((s, r) => s + (r.synced || 0), 0);
    const totalRewatches = results.reduce((s, r) => s + (r.rewatches || 0), 0);
    const totalErrors = results.filter((r) => r.error).length;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(
      `[LBSync] Done in ${elapsed}s: ${users.length} users, ${totalSynced} new films, ${totalRewatches} rewatches, ${totalErrors} errors`
    );

    return jsonRes({
      users_processed: users.length,
      total_synced: totalSynced,
      total_rewatches: totalRewatches,
      total_errors: totalErrors,
      elapsed_seconds: parseFloat(elapsed),
      details: results,
    });
  } catch (err: any) {
    console.error("[LBSync] UNCAUGHT:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Per-user sync logic ─────────────────────────────────────
async function syncUserLetterboxd(
  sb: any,
  tmdbKey: string,
  uid: string,
  username: string
): Promise<{ synced: number; rewatches: number; community_logged: number; synced_films: Array<{ tmdbId: number; title: string }> }> {
  // 1. Fetch RSS directly (no CORS proxy needed server-side)
  const rssUrl = `https://letterboxd.com/${encodeURIComponent(username)}/rss/`;
  const rssRes = await fetch(rssUrl, {
    headers: { "User-Agent": "MANTL/1.0 (RSS Sync)" },
  });

  if (!rssRes.ok) {
    throw new Error(`Letterboxd returned ${rssRes.status} for ${username}`);
  }

  const rssText = await rssRes.text();
  const rssFilms = parseLetterboxdRSS(rssText);

  if (rssFilms.length === 0) {
    return { synced: 0, rewatches: 0, community_logged: 0, synced_films: [] };
  }

  // 2. Load existing films for this user
  const { data: existingMovies } = await sb
    .from("user_films_v")
    .select("title, year, tmdb_id, watch_dates")
    .eq("user_id", uid);

  const existingSet = new Set(
    (existingMovies || []).map((m: any) => `${m.title}::${m.year}`)
  );
  const existingMap = new Map(
    (existingMovies || []).map((m: any) => [`${m.title}::${m.year}`, m])
  );

  // 3. Separate new films vs rewatches
  const workQueue: RSSFilm[] = [];
  const rewatchQueue: any[] = [];

  for (const film of rssFilms) {
    if (workQueue.length >= MAX_SYNC_PER_USER) break;

    if (existingSet.has(film.dedupKey)) {
      // Check for rewatch (new watch date not already recorded)
      const existing = existingMap.get(film.dedupKey);
      if (existing && film.watchedDate) {
        const dateStr = new Date(film.watchedDate).toISOString().slice(0, 10);
        const knownDates = (existing.watch_dates || []).map((d: string) =>
          String(d).slice(0, 10)
        );
        if (!knownDates.includes(dateStr)) {
          rewatchQueue.push({
            tmdb_id: existing.tmdb_id,
            title: film.title,
            year: film.year,
            newDate: dateStr,
            currentDates: existing.watch_dates || [],
            rating: film.rating,
          });
          // Update local state so we don't double-count within this run
          existing.watch_dates = [...(existing.watch_dates || []), dateStr].sort();
        }
      }
      continue;
    }

    existingSet.add(film.dedupKey);
    workQueue.push(film);
  }

  console.log(
    `[LBSync:${username}] ${rssFilms.length} RSS items → ${workQueue.length} new, ${rewatchQueue.length} rewatches`
  );

  // 4. Process new films in batches (TMDB search + detail + upsert)
  const syncedFilms: Array<{ tmdbId: number; title: string; rating: number | null }> = [];
  let synced = 0;

  for (let i = 0; i < workQueue.length; i += TMDB_BATCH_SIZE) {
    const batch = workQueue.slice(i, i + TMDB_BATCH_SIZE);
    const results = await Promise.all(
      batch.map((film) => processNewFilm(sb, tmdbKey, uid, film))
    );

    for (const r of results) {
      if (r) {
        synced++;
        syncedFilms.push(r);
      }
    }

    if (i + TMDB_BATCH_SIZE < workQueue.length) {
      await sleep(TMDB_BATCH_DELAY_MS);
    }
  }

  // 5. Process rewatches
  let rewatchCount = 0;
  for (const rw of rewatchQueue) {
    try {
      const newDates = [...(rw.currentDates || []), rw.newDate].sort();

      const watchedTimestamp = toLogTimestamp(rw.newDate);

      const { error: rwErr } = await sb.rpc("update_rewatch_data", {
        p_user_id: uid,
        p_tmdb_id: rw.tmdb_id,
        p_watch_dates: newDates,
        p_watched_at: new Date(watchedTimestamp).toISOString(),
        p_rating: rw.rating ? Math.round(rw.rating) : null,
      });

      if (rwErr) {
        console.warn(`[LBSync:${username}] Rewatch failed for "${rw.title}":`, rwErr.message);
        continue;
      }

      rewatchCount++;

      // Update community progress rewatch data too
      await updateCommunityRewatch(sb, uid, rw);
    } catch (e: any) {
      console.warn(`[LBSync:${username}] Rewatch error for "${rw.title}":`, e.message);
    }
  }

  // 6. Auto-log community progress for newly synced films
  let communityLogged = 0;
  if (syncedFilms.length > 0) {
    communityLogged = await autoLogCommunityProgress(sb, uid, syncedFilms);
  }

  if (synced > 0 || rewatchCount > 0) {
    console.log(
      `[LBSync:${username}] Synced ${synced} new, ${rewatchCount} rewatches, ${communityLogged} community logs`
    );
  }

  return { synced, rewatches: rewatchCount, community_logged: communityLogged, synced_films: syncedFilms };
}

// ── Process a single new film ───────────────────────────────
async function processNewFilm(
  sb: any,
  tmdbKey: string,
  uid: string,
  film: RSSFilm
): Promise<{ tmdbId: number; title: string; rating: number | null } | null> {
  let tmdbId = film.tmdbId;
  let poster: string | null = null;
  let backdrop: string | null = null;
  let director: string | null = null;
  let genre: string | null = null;
  let runtime: number | null = null;

  // TMDB search if no ID from RSS
  if (!tmdbId) {
    const result = await searchTMDB(tmdbKey, film.title, film.year);
    if (result) tmdbId = result.id;
  }

  if (!tmdbId) {
    console.warn(`[LBSync] No TMDB match for "${film.title}" (${film.year}) — skipping`);
    return null;
  }

  // Fetch TMDB details
  const detail = await fetchTMDBDetail(tmdbKey, tmdbId);
  if (detail && !detail.error) {
    poster = detail.poster_path
      ? `${TMDB_IMG}/w342${detail.poster_path}`
      : null;
    backdrop = detail.backdrop_path
      ? `${TMDB_IMG}/w780${detail.backdrop_path}`
      : null;
    director =
      detail.credits?.crew?.find((c: any) => c.job === "Director")?.name || null;
    genre =
      (detail.genres || [])
        .slice(0, 2)
        .map((g: any) => g.name)
        .join(", ") || null;
    runtime = detail.runtime || null;
  }

  // Upsert via same RPC the client uses
  const watchDateStr = film.watchedDate
    ? new Date(film.watchedDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const { data: mediaId, error } = await sb.rpc("upsert_media_log", {
    p_user_id: uid,
    p_media_type: "film",
    p_tmdb_id: tmdbId,
    p_isbn: null,
    p_rawg_id: null,
    p_steam_app_id: null,
    p_title: film.title,
    p_year: film.year || null,
    p_creator: director,
    p_poster_path: toPosterPath(poster),
    p_backdrop_path: toPosterPath(backdrop),
    p_runtime: runtime,
    p_genre: genre,
    p_rating: film.rating ? Math.round(film.rating) : null,
    p_notes: null,
    p_watched_at: film.watchedDate
      ? toLogTimestamp(film.watchedDate)
      : new Date().toISOString(),
    p_source: "letterboxd",
    p_watch_count: 1,
    p_watch_dates: [watchDateStr],
    p_status: "finished",
    p_watched_date: watchDateStr,
    p_extra_data: film.reviewUrl ? { letterboxd_url: film.reviewUrl } : {},
  });

  if (error) {
    console.error(`[LBSync] upsert_media_log failed for "${film.title}":`, error.message);
    return null;
  }

  return { tmdbId, title: film.title, rating: film.rating };
}

// ── Auto-log community progress (mirrors autoLogAndCheckBadges) ──
async function autoLogCommunityProgress(
  sb: any,
  uid: string,
  syncedFilms: Array<{ tmdbId: number; title: string; rating: number | null }>
): Promise<number> {
  try {
    const tmdbIds = syncedFilms.map((f) => f.tmdbId);
    const ratingMap = new Map(syncedFilms.map((f) => [f.tmdbId, f]));

    // Find community items matching these TMDB IDs
    const { data: matchedItems } = await sb
      .from("community_items")
      .select("id, tmdb_id, miniseries_id, media_type")
      .in("tmdb_id", tmdbIds);

    if (!matchedItems?.length) return 0;

    const matchedItemIds = matchedItems.map((i: any) => i.id);

    // Check existing progress (skip already-logged items)
    const { data: existingProgress } = await sb
      .from("community_user_progress")
      .select("item_id, status")
      .eq("user_id", uid)
      .in("item_id", matchedItemIds);

    const existingSet = new Set(
      (existingProgress || [])
        .filter((p: any) => p.status !== "skipped")
        .map((p: any) => p.item_id)
    );

    const newRows = matchedItems
      .filter((item: any) => !existingSet.has(item.id))
      .map((item: any) => {
        const filmData = ratingMap.get(item.tmdb_id);
        return {
          user_id: uid,
          item_id: item.id,
          status: "completed",
          rating: filmData?.rating ? Math.round(filmData.rating) : null,
          completed_at: new Date().toISOString(),
          listened_with_commentary: false,
          brown_arrow: false,
          updated_at: new Date().toISOString(),
        };
      });

    if (newRows.length === 0) return 0;

    const { error: upsertErr } = await sb
      .from("community_user_progress")
      .upsert(newRows, { onConflict: "user_id,item_id" });

    if (upsertErr) {
      console.error("[LBSync] Community progress upsert error:", upsertErr.message);
      return 0;
    }

    return newRows.length;
  } catch (e: any) {
    console.warn("[LBSync] Auto-log community progress failed:", e.message);
    return 0;
  }
}

// ── Update community rewatch data ───────────────────────────
async function updateCommunityRewatch(
  sb: any,
  uid: string,
  rw: any
): Promise<void> {
  try {
    const { data: communityItems } = await sb
      .from("community_items")
      .select("id")
      .eq("tmdb_id", rw.tmdb_id);

    if (!communityItems?.length) return;

    const itemIds = communityItems.map((ci: any) => ci.id);

    const { data: existingProgress } = await sb
      .from("community_user_progress")
      .select("item_id")
      .eq("user_id", uid)
      .in("item_id", itemIds);

    if (!existingProgress?.length) return;

    const progressItemIds = existingProgress.map((p: any) => p.item_id);
    const newDates = [...(rw.currentDates || []), rw.newDate].sort();
    const rewatchDatesOnly = newDates.slice(1);
    const rewatchTimestamp = new Date(toLogTimestamp(rw.newDate)).toISOString();

    const updatePayload: any = {
      rewatch_count: newDates.length - 1,
      rewatch_dates: rewatchDatesOnly,
      completed_at: rewatchTimestamp,
      updated_at: rewatchTimestamp,
    };
    if (rw.rating) updatePayload.rating = Math.round(rw.rating);

    await sb
      .from("community_user_progress")
      .update(updatePayload)
      .eq("user_id", uid)
      .in("item_id", progressItemIds);
  } catch (e: any) {
    console.warn(`[LBSync] Community rewatch update failed for "${rw.title}":`, e.message);
  }
}

// ── Utilities ───────────────────────────────────────────────
function toLogTimestamp(dateStr: string): string {
  // "2024-03-15" → ISO timestamp at noon UTC (same as client helper)
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date().toISOString();
  d.setUTCHours(12, 0, 0, 0);
  return d.toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function jsonRes(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
