// supabase/functions/sync-letterboxd-batch/index.ts
//
// BATCH WORKER — processes a chunk of Letterboxd users.
// Called by sync-letterboxd-cron dispatcher with a list of users.
//
// Enhancements over the old monolithic function:
//   - Uses ETag / If-Modified-Since headers for conditional RSS fetches
//   - Updates letterboxd_last_synced_at after each user
//   - Stores ETag / Last-Modified for next run
//   - Skips 304 (not modified) responses — no wasted TMDB calls
//
// Deploy: supabase functions deploy sync-letterboxd-batch --no-verify-jwt

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

// ── HTML entity decoder ─────────────────────────────────────
// The regex-based XML parser doesn't decode HTML entities like DOMParser does.
// Letterboxd RSS titles can contain &amp; (e.g. "Love &amp; Other Drugs").
// Without decoding, the title won't match existing user_films_v records (which
// were stored with the decoded "&"), causing duplicate logs + feed_activity rows.
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// ── XML helpers (regex-based, same pattern as ingest-rss) ───
function extractTag(content: string, tag: string): string {
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
    const filmTitle =
      extractTag(content, "letterboxd:filmTitle") ||
      extractTag(content, "filmTitle");
    if (!filmTitle) continue;

    const title = decodeHtmlEntities(filmTitle.trim());
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
    const body = await req.json();
    const users: Array<{ id: string; username: string }> = body.users || [];
    const batchIndex = body.batch_index ?? 0;

    if (!users.length) {
      return jsonRes({ message: "No users in batch", batch_index: batchIndex });
    }

    console.log(
      `[LBBatch:${batchIndex}] Processing ${users.length} user(s)`
    );

    // Fetch stored ETag/Last-Modified for conditional requests
    const userIds = users.map((u) => u.id);
    const { data: profiles } = await sb
      .from("profiles")
      .select("id, letterboxd_etag, letterboxd_last_modified, letterboxd_last_synced_at")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.id, p])
    );

    const results: any[] = [];

    for (const user of users) {
      const uid = user.id;
      const username = user.username;
      const userStart = Date.now();
      const profile = profileMap.get(uid);

      try {
        const syncResult = await syncUserLetterboxd(
          sb,
          tmdbKey,
          uid,
          username,
          profile?.letterboxd_etag,
          profile?.letterboxd_last_modified,
          profile?.letterboxd_last_synced_at ?? null
        );

        results.push({
          user_id: uid,
          username,
          ...syncResult,
          elapsed_ms: Date.now() - userStart,
        });

        // Fire "You Watched It" coverage notifications for newly synced films
        if (syncResult.synced_films && syncResult.synced_films.length > 0) {
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
                  new_films: syncResult.synced_films.map((f: any) => ({
                    tmdb_id: f.tmdbId,
                    title: f.title,
                  })),
                }),
              }
            );
            const coverageResult = await coverageRes.json();
            console.log(
              `[LBBatch:${batchIndex}:${username}] Coverage check: ${coverageResult.sent || 0} notification(s)`
            );
          } catch (notifErr: any) {
            console.warn(
              `[LBBatch:${batchIndex}:${username}] Coverage check failed:`,
              notifErr.message
            );
          }
        }
      } catch (err: any) {
        console.error(`[LBBatch:${batchIndex}] User ${username} failed:`, err.message);
        results.push({
          user_id: uid,
          username,
          error: err.message,
          synced: 0,
          rewatches: 0,
          elapsed_ms: Date.now() - userStart,
        });

        // Still update last_synced_at on failure so we don't hammer a broken account
        await sb
          .from("profiles")
          .update({ letterboxd_last_synced_at: new Date().toISOString() })
          .eq("id", uid);
      }

      // Brief pause between users to be polite to Letterboxd
      await sleep(500);
    }

    const totalSynced = results.reduce((s, r) => s + (r.synced || 0), 0);
    const totalRewatches = results.reduce((s, r) => s + (r.rewatches || 0), 0);
    const totalSkipped = results.filter((r) => r.not_modified).length;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(
      `[LBBatch:${batchIndex}] Done in ${elapsed}s: ${users.length} users, ${totalSynced} new, ${totalRewatches} rewatches, ${totalSkipped} skipped (304)`
    );

    return jsonRes({
      batch_index: batchIndex,
      users_processed: users.length,
      total_synced: totalSynced,
      total_rewatches: totalRewatches,
      total_skipped_304: totalSkipped,
      elapsed_seconds: parseFloat(elapsed),
      details: results,
    });
  } catch (err: any) {
    console.error("[LBBatch] UNCAUGHT:", err.message);
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
  username: string,
  storedEtag: string | null,
  storedLastModified: string | null,
  lastSyncedAt: string | null
): Promise<{
  synced: number;
  rewatches: number;
  community_logged: number;
  synced_films: Array<{ tmdbId: number; title: string; rating: number | null; watchedAt: string }>;
  not_modified?: boolean;
}> {
  // 1. Fetch RSS with conditional request headers
  const rssUrl = `https://letterboxd.com/${encodeURIComponent(username)}/rss/`;
  const headers: Record<string, string> = {
    "User-Agent": "MANTL/1.0 (RSS Sync)",
  };

  if (storedEtag) {
    headers["If-None-Match"] = storedEtag;
  }
  if (storedLastModified) {
    headers["If-Modified-Since"] = storedLastModified;
  }

  const rssRes = await fetch(rssUrl, { headers });

  // 304 Not Modified — nothing changed, skip this user
  if (rssRes.status === 304) {
    console.log(`[LBBatch:${username}] 304 Not Modified — skipping`);
    await sb
      .from("profiles")
      .update({ letterboxd_last_synced_at: new Date().toISOString() })
      .eq("id", uid);
    return { synced: 0, rewatches: 0, community_logged: 0, synced_films: [], not_modified: true };
  }

  if (!rssRes.ok) {
    throw new Error(`Letterboxd returned ${rssRes.status} for ${username}`);
  }

  // Store response headers for next conditional request
  const newEtag = rssRes.headers.get("etag");
  const newLastModified = rssRes.headers.get("last-modified");

  const rssText = await rssRes.text();
  const rssFilms = parseLetterboxdRSS(rssText);

  if (rssFilms.length === 0) {
    // Update sync metadata even on empty feeds
    await updateSyncMeta(sb, uid, newEtag, newLastModified);
    return { synced: 0, rewatches: 0, community_logged: 0, synced_films: [] };
  }

  // 2. Load existing films for this user
  const { data: existingMovies, error: existingErr } = await sb
    .from("user_films_v")
    .select("title, year, tmdb_id, watch_dates")
    .eq("user_id", uid);

  // Safety guard: if the dedup query fails or returns empty for a user who has
  // previously synced, abort rather than treating the full RSS as new films.
  // This prevents mass re-logging on transient DB errors.
  if (existingErr || (existingMovies?.length === 0 && lastSyncedAt !== null)) {
    if (existingErr) {
      console.error(`[LBBatch:${username}] Failed to load existing films:`, existingErr.message);
    } else {
      console.warn(`[LBBatch:${username}] Dedup returned 0 films but user has prior syncs — aborting to prevent re-log flood`);
    }
    // Do NOT save ETag here — next cron must re-fetch so new films aren’t skipped via 304.
    await sb.from("profiles").update({ letterboxd_last_synced_at: new Date().toISOString() }).eq("id", uid);
    return { synced: 0, rewatches: 0, community_logged: 0, synced_films: [] };
  }

  const existingSet = new Set(
    (existingMovies || []).map((m: any) => `${m.title}::${m.year}`)
  );
  // Fix 4: secondary dedup by tmdb_id — catches regional/encoding title mismatches
  const existingTmdbSet = new Set(
    (existingMovies || []).filter((m: any) => m.tmdb_id).map((m: any) => m.tmdb_id)
  );
  const existingMap = new Map(
    (existingMovies || []).map((m: any) => [`${m.title}::${m.year}`, m])
  );
  // Also index by tmdb_id for rewatch detection when tmdb_id is available
  const existingTmdbMap = new Map(
    (existingMovies || []).filter((m: any) => m.tmdb_id).map((m: any) => [m.tmdb_id, m])
  );

  // 3. Separate new films vs rewatches
  const workQueue: RSSFilm[] = [];
  const rewatchQueue: any[] = [];

  for (const film of rssFilms) {
    if (workQueue.length >= MAX_SYNC_PER_USER) break;

    // Fix 4: check by tmdb_id first (most reliable), fall back to title::year
    const existsByTmdb = film.tmdbId != null && existingTmdbSet.has(film.tmdbId);
    const existsByTitle = existingSet.has(film.dedupKey);
    const alreadyExists = existsByTmdb || existsByTitle;

    if (alreadyExists) {
      // Resolve the existing record — prefer tmdb_id match, fall back to title match
      const existing = (film.tmdbId != null && existingTmdbMap.get(film.tmdbId))
        || existingMap.get(film.dedupKey);
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
          existing.watch_dates = [...(existing.watch_dates || []), dateStr].sort();
        }
      }
      continue;
    }

    existingSet.add(film.dedupKey);
    if (film.tmdbId != null) existingTmdbSet.add(film.tmdbId);
    workQueue.push(film);
  }

  console.log(
    `[LBBatch:${username}] ${rssFilms.length} RSS items → ${workQueue.length} new, ${rewatchQueue.length} rewatches`
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
        p_rating: rw.rating ?? null,
      });

      if (rwErr) {
        console.warn(`[LBBatch:${username}] Rewatch failed for "${rw.title}":`, rwErr.message);
        continue;
      }

      rewatchCount++;
      await updateCommunityRewatch(sb, uid, rw);
    } catch (e: any) {
      console.warn(`[LBBatch:${username}] Rewatch error for "${rw.title}":`, e.message);
    }
  }

  // 6. Auto-log community progress for newly synced films
  let communityLogged = 0;
  if (syncedFilms.length > 0) {
    communityLogged = await autoLogCommunityProgress(sb, uid, syncedFilms);
  }

  // Fix 5: check badges when community progress was updated
  // (mirrors the CSV import path — RSS was previously silent on badge awards)
  if (communityLogged > 0) {
    try {
      const { data: subs } = await sb
        .from("user_community_subscriptions")
        .select("community_id")
        .eq("user_id", uid);
      const communityIds = (subs || []).map((s: any) => s.community_id);
      if (communityIds.length > 0) {
        await checkAndAwardBadges(sb, uid, communityIds);
      }
    } catch (e: any) {
      console.warn(`[LBBatch:${username}] Badge check failed:`, e.message);
    }
  }

  if (synced > 0 || rewatchCount > 0) {
    console.log(
      `[LBBatch:${username}] Synced ${synced} new, ${rewatchCount} rewatches, ${communityLogged} community logs`
    );
  }

  // 7. Update sync metadata (ETag, Last-Modified, last_synced_at)
  await updateSyncMeta(sb, uid, newEtag, newLastModified);

  return { synced, rewatches: rewatchCount, community_logged: communityLogged, synced_films: syncedFilms };
}

// ── Badge check (mirrors import-letterboxd-csv) ─────────────
const DB_BATCH = 50;

async function checkAndAwardBadges(
  sb: any,
  userId: string,
  communityIds: string[]
): Promise<number> {
  if (!communityIds.length) return 0;
  let awarded = 0;

  const { data: allBadges } = await sb
    .from("badges")
    .select("id, name, image_url, accent_color, community_id, badge_type, miniseries_id, media_type_filter")
    .in("community_id", communityIds)
    .eq("is_active", true);
  if (!allBadges?.length) return 0;

  const { data: earnedRows } = await sb
    .from("user_badges").select("badge_id").eq("user_id", userId)
    .in("badge_id", allBadges.map((b: any) => b.id));
  const earnedSet = new Set((earnedRows || []).map((r: any) => r.badge_id));
  const unearnedBadges = allBadges.filter((b: any) => !earnedSet.has(b.id));
  if (!unearnedBadges.length) return 0;

  // ── miniseries_completion ──
  const msBadges = unearnedBadges.filter((b: any) => b.badge_type === "miniseries_completion" && b.miniseries_id);
  if (msBadges.length > 0) {
    const msIds = [...new Set(msBadges.map((b: any) => b.miniseries_id))];
    const allItems: any[] = [];
    for (let i = 0; i < msIds.length; i += DB_BATCH) {
      const { data } = await sb.from("community_items")
        .select("id, tmdb_id, miniseries_id, media_type")
        .in("miniseries_id", msIds.slice(i, i + DB_BATCH));
      if (data) allItems.push(...data);
    }
    const allTmdbIds = [...new Set(allItems.map((i: any) => i.tmdb_id).filter(Boolean))];
    const completedSet = new Set<number>();
    for (let i = 0; i < allTmdbIds.length; i += DB_BATCH) {
      const { data } = await sb.from("community_user_progress")
        .select("community_items!inner(tmdb_id)")
        .eq("user_id", userId).eq("status", "completed")
        .in("community_items.tmdb_id", allTmdbIds.slice(i, i + DB_BATCH));
      (data || []).forEach((r: any) => { if (r.community_items?.tmdb_id) completedSet.add(r.community_items.tmdb_id); });
    }
    for (const badge of msBadges) {
      const items = allItems.filter((i: any) => i.miniseries_id === badge.miniseries_id &&
        (!badge.media_type_filter || i.media_type === badge.media_type_filter));
      const required = [...new Set(items.map((i: any) => i.tmdb_id).filter(Boolean))];
      if (required.length > 0 && required.every((id: number) => completedSet.has(id))) {
        const { error } = await sb.from("user_badges").insert({ user_id: userId, badge_id: badge.id });
        if (!error || error.message.includes("duplicate")) {
          awarded++;
          await sb.from("user_notifications").upsert({
            user_id: userId, notif_type: "badge_earned", title: "Badge unlocked",
            body: `You earned "${badge.name}"`, image_url: badge.image_url || null,
            payload: { type: "badge_earned", badge_id: badge.id, community_id: badge.community_id },
            ref_key: `badge_earned:${badge.id}`,
          }, { onConflict: "user_id,ref_key", ignoreDuplicates: true });
        }
      }
    }
  }

  // ── item_set_completion ──
  const setbadges = unearnedBadges.filter((b: any) => b.badge_type === "item_set_completion");
  if (setbadges.length > 0) {
    const badgeIds = setbadges.map((b: any) => b.id);
    const allBadgeItems: any[] = [];
    for (let i = 0; i < badgeIds.length; i += DB_BATCH) {
      const { data } = await sb.from("badge_items")
        .select("badge_id, community_items!inner(tmdb_id)")
        .in("badge_id", badgeIds.slice(i, i + DB_BATCH));
      if (data) allBadgeItems.push(...data);
    }
    const badgeItemsMap: Record<string, number[]> = {};
    allBadgeItems.forEach((r: any) => {
      if (!badgeItemsMap[r.badge_id]) badgeItemsMap[r.badge_id] = [];
      if (r.community_items?.tmdb_id) badgeItemsMap[r.badge_id].push(r.community_items.tmdb_id);
    });
    const allSetTmdbIds = [...new Set(Object.values(badgeItemsMap).flat())];
    const completedSetTmdb = new Set<number>();
    for (let i = 0; i < allSetTmdbIds.length; i += DB_BATCH) {
      const { data } = await sb.from("community_user_progress")
        .select("community_items!inner(tmdb_id)")
        .eq("user_id", userId).eq("status", "completed")
        .in("community_items.tmdb_id", allSetTmdbIds.slice(i, i + DB_BATCH));
      (data || []).forEach((r: any) => { if (r.community_items?.tmdb_id) completedSetTmdb.add(r.community_items.tmdb_id); });
    }
    for (const badge of setbadges) {
      const required = [...new Set((badgeItemsMap[badge.id] || []).filter(Boolean))];
      if (required.length > 0 && required.every((id: number) => completedSetTmdb.has(id))) {
        const { error } = await sb.from("user_badges").insert({ user_id: userId, badge_id: badge.id });
        if (!error || error.message.includes("duplicate")) {
          awarded++;
          await sb.from("user_notifications").upsert({
            user_id: userId, notif_type: "badge_earned", title: "Badge unlocked",
            body: `You earned "${badge.name}"`, image_url: badge.image_url || null,
            payload: { type: "badge_earned", badge_id: badge.id, community_id: badge.community_id },
            ref_key: `badge_earned:${badge.id}`,
          }, { onConflict: "user_id,ref_key", ignoreDuplicates: true });
        }
      }
    }
  }

  return awarded;
}


// ── Update sync metadata on profiles ────────────────────────
async function updateSyncMeta(
  sb: any,
  uid: string,
  etag: string | null,
  lastModified: string | null
) {
  const update: Record<string, any> = {
    letterboxd_last_synced_at: new Date().toISOString(),
  };
  if (etag) update.letterboxd_etag = etag;
  if (lastModified) update.letterboxd_last_modified = lastModified;

  await sb.from("profiles").update(update).eq("id", uid);
}

// ── Process a single new film ───────────────────────────────
async function processNewFilm(
  sb: any,
  tmdbKey: string,
  uid: string,
  film: RSSFilm
): Promise<{ tmdbId: number; title: string; rating: number | null; watchedAt: string } | null> {
  let tmdbId = film.tmdbId;
  let poster: string | null = null;
  let backdrop: string | null = null;
  let director: string | null = null;
  let genre: string | null = null;
  let runtime: number | null = null;

  if (!tmdbId) {
    const result = await searchTMDB(tmdbKey, film.title, film.year);
    if (result) tmdbId = result.id;
  }

  if (!tmdbId) {
    console.warn(`[LBBatch] No TMDB match for "${film.title}" (${film.year}) — skipping`);
    return null;
  }

  // Check if media already exists with full metadata — skip TMDB detail fetch
  const { data: existingMedia } = await sb
    .from("media")
    .select("id, poster_path, backdrop_path, creator, genre, runtime")
    .eq("tmdb_id", tmdbId)
    .eq("media_type", "film")
    .maybeSingle();

  if (existingMedia?.poster_path && existingMedia?.creator) {
    // Media already has full metadata — skip the TMDB detail call
    poster = existingMedia.poster_path;
    backdrop = existingMedia.backdrop_path;
    director = existingMedia.creator;
    genre = existingMedia.genre;
    runtime = existingMedia.runtime;
  } else {
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
        detail.credits?.crew?.find((c: any) => c.job === "Director")?.name ||
        null;
      genre =
        (detail.genres || [])
          .slice(0, 2)
          .map((g: any) => g.name)
          .join(", ") || null;
      runtime = detail.runtime || null;
    }
  }

  const watchDateStr = film.watchedDate
    ? new Date(film.watchedDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const watchedAt = film.watchedDate
    ? toLogTimestamp(film.watchedDate)
    : new Date().toISOString();

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
    p_rating: film.rating ?? null,
    p_notes: null,
    p_watched_at: watchedAt,
    p_source: "letterboxd",
    p_watch_count: 1,
    p_watch_dates: [watchDateStr],
    p_status: "finished",
    p_watched_date: watchDateStr,
    p_extra_data: film.reviewUrl ? { letterboxd_url: film.reviewUrl } : {},
  });

  if (error) {
    console.error(`[LBBatch] upsert_media_log failed for "${film.title}":`, error.message);
    return null;
  }

  return { tmdbId, title: film.title, rating: film.rating, watchedAt };
}

// ── Auto-log community progress ─────────────────────────────
async function autoLogCommunityProgress(
  sb: any,
  uid: string,
  syncedFilms: Array<{ tmdbId: number; title: string; rating: number | null; watchedAt: string }>
): Promise<number> {
  try {
    const tmdbIds = syncedFilms.map((f) => f.tmdbId);
    const ratingMap = new Map(syncedFilms.map((f) => [f.tmdbId, f]));

    const { data: matchedItems } = await sb
      .from("community_items")
      .select("id, tmdb_id, miniseries_id, media_type")
      .in("tmdb_id", tmdbIds);

    if (!matchedItems?.length) return 0;

    const matchedItemIds = matchedItems.map((i: any) => i.id);

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
          rating: filmData?.rating ?? null,
          completed_at: filmData?.watchedAt || new Date().toISOString(),
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
      console.error("[LBBatch] Community progress upsert error:", upsertErr.message);
      return 0;
    }

    return newRows.length;
  } catch (e: any) {
    console.warn("[LBBatch] Auto-log community progress failed:", e.message);
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
    if (rw.rating != null) updatePayload.rating = rw.rating;

    await sb
      .from("community_user_progress")
      .update(updatePayload)
      .eq("user_id", uid)
      .in("item_id", progressItemIds);
  } catch (e: any) {
    console.warn(`[LBBatch] Community rewatch update failed for "${rw.title}":`, e.message);
  }
}

// ── Utilities ───────────────────────────────────────────────
function toLogTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date().toISOString();
  // If watched date is today (UTC), use current time so the film shows as
  // "just now" rather than hours ago for non-UTC users logging late at night.
  const todayUTC = new Date().toISOString().slice(0, 10);
  if (dateStr.slice(0, 10) === todayUTC) return new Date().toISOString();
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
