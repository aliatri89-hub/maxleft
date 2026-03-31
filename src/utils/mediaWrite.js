import { supabase } from "../supabase";

/**
 * mediaWrite.js
 * Single source of truth for all media logging.
 *
 * Every log action -- community, shelf, Letterboxd, Goodreads, Steam --
 * goes through upsertMediaLog(). It calls the server-side upsert_media_log RPC
 * which atomically handles:
 *   1. Upsert into `media` (canonical record)
 *   2. Upsert into `user_media_logs` (user's personal log)
 *
 * Returns the media.id (uuid) on success, null on error.
 */

// --- Helper: extract TMDB poster path from full URL ---
// "https://image.tmdb.org/t/p/w342/xxxxx.jpg" -> "/xxxxx.jpg"
// Already a path like "/xxxxx.jpg" -> pass through unchanged
export function toPosterPath(url) {
  if (!url) return null;
  if (url.startsWith("/")) return url;
  const match = url.match(/\/t\/p\/[^/]+(\/.*)/);
  return match ? match[1] : url;
}

function toBackdropPath(url) {
  if (!url) return null;
  if (url.startsWith("/")) return url;
  const match = url.match(/\/t\/p\/[^/]+(\/.*)/);
  return match ? match[1] : url;
}

// --- Core: upsert a media log via RPC ---
export async function upsertMediaLog(userId, {
  mediaType,
  tmdbId = null,
  isbn = null,
  title,
  year = null,
  creator = null,
  posterPath = null,
  backdropPath = null,
  runtime = null,
  genre = null,
  rating = null,
  notes = null,
  watchedAt = null,
  watchedDate = null, // "YYYY-MM-DD" string — timezone-safe display date
  source = "mantl",
  watchCount = 1,
  watchDates = [],
  status = "finished",
  extraData = {},
} = {}) {
  if (!userId || !title) return null;

  // Upgrade date-only strings ("2026-03-31") to real timestamps.
  // Callers like QuickLogModal pass .slice(0,10) — without this,
  // Postgres casts to midnight UTC and diary ordering breaks.
  const resolvedWatchedAt = (() => {
    if (!watchedAt) return new Date().toISOString();
    if (typeof watchedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(watchedAt)) return new Date().toISOString();
    return watchedAt;
  })();

  const { data, error } = await supabase.rpc("upsert_media_log", {
    p_user_id: userId,
    p_media_type: mediaType,
    p_tmdb_id: tmdbId || null,
    p_isbn: isbn || null,
    p_title: title,
    p_year: year || null,
    p_creator: creator || null,
    p_poster_path: toPosterPath(posterPath),
    p_backdrop_path: toBackdropPath(backdropPath),
    p_runtime: runtime || null,
    p_genre: genre || null,
    p_rating: rating ? Math.round(rating) : null,
    p_notes: notes || null,
    p_watched_at: resolvedWatchedAt,
    p_source: source,
    p_watch_count: watchCount,
    p_watch_dates: watchDates,
    p_status: status,
    p_watched_date: watchedDate || null,
    p_extra_data: extraData,
  });

  if (error) {
    console.warn(`[mediaWrite] upsert_media_log error (${mediaType}):`, error.message);
    return null;
  }

  return data;
}

// --- Convenience wrappers ---

export async function logFilm(userId, item, coverUrl, { rating, completed_at } = {}) {
  if (!userId || !item?.tmdb_id) return null;
  return upsertMediaLog(userId, {
    mediaType: "film",
    tmdbId: item.tmdb_id,
    title: item.title,
    year: item.year || null,
    creator: item.creator || null,
    posterPath: coverUrl || item.poster_path || null,
    rating,
    watchedAt: completed_at || null,
  });
}

export async function logShow(userId, item, coverUrl, { rating, completed_at, status = "finished" } = {}) {
  if (!userId || !item?.tmdb_id) return null;
  return upsertMediaLog(userId, {
    mediaType: "show",
    tmdbId: item.tmdb_id,
    title: item.title,
    year: item.year || null,
    creator: item.creator || null,
    posterPath: coverUrl || item.poster_path || null,
    rating,
    watchedAt: completed_at || null,
    status,
  });
}

/**
 * deleteFullMediaLog — Cascading delete via server RPC.
 * Removes: user_media_logs, feed_activity, community_user_progress,
 * and revokes any badges that are no longer complete.
 *
 * @param {string} userId - user's UUID
 * @param {string} logId  - user_media_logs.id (from shelf views)
 */
export async function deleteFullMediaLog(userId, logId) {
  if (!userId || !logId) return false;

  const { error } = await supabase.rpc("delete_media_log_by_log_id", {
    p_user_id: userId,
    p_log_id: logId,
  });

  if (error) {
    console.warn("[mediaWrite] deleteFullMediaLog error:", error.message);
    return false;
  }
  return true;
}

/**
 * deleteFullMediaLogByTmdb — Cascading delete by TMDB ID.
 * For use from activity feed / QuickLogModal where we have tmdb_id but not log_id.
 */
export async function deleteFullMediaLogByTmdb(userId, tmdbId) {
  if (!userId || !tmdbId) return false;

  // Look up media_id from the media table
  const { data: mediaRow, error: lookupErr } = await supabase
    .from("media")
    .select("id")
    .eq("media_type", "film")
    .eq("tmdb_id", tmdbId)
    .limit(1)
    .maybeSingle();

  if (lookupErr || !mediaRow) {
    console.warn("[mediaWrite] deleteFullMediaLogByTmdb: media not found", lookupErr?.message);
    return false;
  }

  const { error } = await supabase.rpc("delete_media_log", {
    p_user_id: userId,
    p_media_id: mediaRow.id,
  });

  if (error) {
    console.warn("[mediaWrite] deleteFullMediaLogByTmdb error:", error.message);
    return false;
  }
  return true;
}

/**
 * updateMediaRating — Update rating on a user_media_logs row.
 * Works for any media type.
 */
export async function updateMediaRating(logId, rating) {
  const { error } = await supabase
    .from("user_media_logs")
    .update({ rating: rating || null, updated_at: new Date().toISOString() })
    .eq("id", logId);

  if (error) {
    console.warn("[mediaWrite] updateMediaRating error:", error.message);
    return false;
  }
  return true;
}
