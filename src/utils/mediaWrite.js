import { supabase } from "../supabase";

/**
 * mediaWrite.js
 * Single source of truth for all media logging.
 * Replaces communityDualWrite.js (dual_write_film/show/book RPCs).
 *
 * Every log action -- community, shelf, Letterboxd, Goodreads, Steam --
 * goes through upsertMediaLog(). It calls the server-side upsert_media_log RPC
 * which atomically handles:
 *   1. Upsert into `media` (canonical record)
 *   2. Upsert into `user_media_logs` (user's personal log)
 *   3. Insert/update `feed_activity`
 *   4. Remove from `wishlist`
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

export function toBackdropPath(url) {
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
  rawgId = null,
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
  source = "mantl",
  watchCount = 1,
  watchDates = [],
  status = "finished",
} = {}) {
  if (!userId || !title) return null;

  const { data, error } = await supabase.rpc("upsert_media_log", {
    p_user_id: userId,
    p_media_type: mediaType,
    p_tmdb_id: tmdbId || null,
    p_isbn: isbn || null,
    p_rawg_id: rawgId || null,
    p_title: title,
    p_year: year || null,
    p_creator: creator || null,
    p_poster_path: toPosterPath(posterPath),
    p_backdrop_path: toBackdropPath(backdropPath),
    p_runtime: runtime || null,
    p_genre: genre || null,
    p_rating: rating ? Math.round(rating) : null,
    p_notes: notes || null,
    p_watched_at: watchedAt || null,
    p_source: source,
    p_watch_count: watchCount,
    p_watch_dates: watchDates,
    p_status: status,
  });

  if (error) {
    console.warn(`[mediaWrite] upsert_media_log error (${mediaType}):`, error.message);
    return null;
  }

  console.log(`[mediaWrite] Logged "${title}" -> media + user_media_logs + feed`);
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

export async function logBook(userId, item, coverUrl, { rating, completed_at, status = "finished" } = {}) {
  if (!userId || !item) return null;
  return upsertMediaLog(userId, {
    mediaType: "book",
    isbn: item.isbn || null,
    title: item.title,
    creator: item.creator || item.author || null,
    posterPath: coverUrl || null,
    rating,
    watchedAt: completed_at || null,
    status,
  });
}

export async function logGame(userId, item, coverUrl, { rating, completed_at } = {}) {
  if (!userId || !item) return null;
  return upsertMediaLog(userId, {
    mediaType: "game",
    rawgId: item.rawg_id || (item.extra_data?.rawg_id ? parseInt(item.extra_data.rawg_id) : null),
    title: item.title,
    year: item.year || null,
    creator: item.creator || null,
    posterPath: coverUrl || null,
    rating,
    watchedAt: completed_at || null,
  });
}
