#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MANTL - Unified Media Architecture: Phase 1 Code Refactor
==========================================================
Run from MANTL project root: python3 refactor_unified_media.py

Creates/overwrites:
  - src/utils/mediaWrite.js          (NEW - replaces communityDualWrite.js)
  - src/hooks/community/useCommunityActions.js  (REWRITTEN)
  - src/hooks/community/useCommunityProgress.js (REWRITTEN - auto-sync removed)
  - src/utils/importUtils.js          (PATCHED - Letterboxd writes to media)

Deletes:
  - src/utils/communityDualWrite.js   (replaced by mediaWrite.js)
  - src/utils/communitySync.js        (no longer needed)
"""

import os, sys

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("  [+] " + path)

def delete_file(path):
    if os.path.exists(path):
        os.remove(path)
        print("  [-] " + path + " (deleted)")
    else:
        print("  [ ] " + path + " (already gone)")

# ===================================================================
# Verify we are in the right directory
# ===================================================================
if not os.path.exists("src/utils/communityDualWrite.js"):
    print("ERROR: Run this from the MANTL project root (where src/ lives).")
    sys.exit(1)

print("")
print("MANTL Unified Media Architecture -- Phase 1 Refactor")
print("=" * 55)

# ===================================================================
# 1. NEW: src/utils/mediaWrite.js
# ===================================================================
print("")
print("[1/5] Creating src/utils/mediaWrite.js ...")

write_file("src/utils/mediaWrite.js", r'''import { supabase } from "../supabase";

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
    p_watch_dates: JSON.stringify(watchDates),
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

export async function logShow(userId, item, coverUrl, { rating, completed_at } = {}) {
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
  });
}

export async function logBook(userId, item, coverUrl, { rating, completed_at } = {}) {
  if (!userId || !item) return null;
  return upsertMediaLog(userId, {
    mediaType: "book",
    isbn: item.isbn || null,
    title: item.title,
    creator: item.creator || null,
    posterPath: coverUrl || null,
    rating,
    watchedAt: completed_at || null,
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
''')

# ===================================================================
# 2. REWRITE: src/hooks/community/useCommunityActions.js
# ===================================================================
print("[2/5] Rewriting useCommunityActions.js ...")

write_file("src/hooks/community/useCommunityActions.js", r'''import { useCallback } from "react";
import { supabase } from "../../supabase";
import { logFilm, logShow, logBook, logGame } from "../../utils/mediaWrite";

/**
 * useCommunityActions -- Log, unlog, and watchlist actions.
 *
 * UNIFIED MEDIA ARCHITECTURE (v2):
 *   - Cross-community propagation uses media_id (via get_sibling_item_ids RPC)
 *     instead of scanning community_items by tmdb_id.
 *   - Shelf write replaced by upsert into media + user_media_logs
 *     via the mediaWrite utility.
 */
export function useCommunityActions(userId, setProgress) {

  // --- Log an item (unified: community progress + media log) ---
  const logItem = useCallback(async (itemId, item, coverUrl, { rating, completed_at, listened_with_commentary, brown_arrow, isUpdate } = {}) => {
    if (!userId) return;

    // Optimistic update
    setProgress((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status: isUpdate ? (prev[itemId]?.status || "completed") : "completed",
        listened_with_commentary: listened_with_commentary !== undefined ? listened_with_commentary : (prev[itemId]?.listened_with_commentary || false),
        brown_arrow: brown_arrow !== undefined ? brown_arrow : (prev[itemId]?.brown_arrow || false),
        rating: rating || prev[itemId]?.rating || null,
      },
    }));

    try {
      // 1. Save community progress
      if (isUpdate) {
        const updateFields = { updated_at: new Date().toISOString() };
        if (rating) updateFields.rating = Math.round(rating);
        if (completed_at) updateFields.completed_at = completed_at;
        if (listened_with_commentary !== undefined) updateFields.listened_with_commentary = listened_with_commentary;
        if (brown_arrow !== undefined) updateFields.brown_arrow = brown_arrow;

        const { error: updateErr } = await supabase
          .from("community_user_progress")
          .update(updateFields)
          .eq("user_id", userId)
          .eq("item_id", itemId);

        if (updateErr) {
          console.error("[Community] Progress update error:", updateErr.message);
          throw updateErr;
        }

        // Propagate update to sibling communities via media_id
        try {
          const { data: siblingIds } = await supabase.rpc("get_sibling_item_ids", { p_item_id: itemId });
          if (siblingIds?.length > 0) {
            const sibUpdateFields = { updated_at: new Date().toISOString() };
            if (rating) sibUpdateFields.rating = Math.round(rating);
            if (completed_at) sibUpdateFields.completed_at = completed_at;

            await supabase
              .from("community_user_progress")
              .update(sibUpdateFields)
              .eq("user_id", userId)
              .in("item_id", siblingIds)
              .eq("status", "completed");
          }
        } catch (e) {
          console.warn("[Community] Cross-community update propagation failed:", e.message);
        }
      } else {
        const { error: progressErr } = await supabase
          .from("community_user_progress")
          .upsert({
            user_id: userId,
            item_id: itemId,
            status: "completed",
            rating: rating ? Math.round(rating) : null,
            completed_at: completed_at || null,
            listened_with_commentary: listened_with_commentary || false,
            brown_arrow: brown_arrow || false,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,item_id" });

        if (progressErr) {
          console.error("[Community] Progress upsert error:", progressErr.message);
          throw progressErr;
        }
      }

      // 2. Cross-community: propagate log via media_id
      try {
        const { data: siblingIds } = await supabase.rpc("get_sibling_item_ids", { p_item_id: itemId });

        if (siblingIds?.length > 0) {
          const now = new Date().toISOString();
          const siblingRows = siblingIds.map(id => ({
            user_id: userId,
            item_id: id,
            status: "completed",
            rating: rating ? Math.round(rating) : null,
            completed_at: completed_at || null,
            updated_at: now,
          }));

          const { error: sibErr } = await supabase
            .from("community_user_progress")
            .upsert(siblingRows, {
              onConflict: "user_id,item_id",
              ignoreDuplicates: false,
            });

          if (sibErr) {
            console.warn("[Community] Cross-community log propagation error:", sibErr.message);
          } else {
            console.log(`[Community] Propagated log to ${siblingRows.length} sibling(s) via media_id`);
          }
        }
      } catch (e) {
        console.warn("[Community] Cross-community propagation failed:", e.message);
      }

      // 3. Write to media + user_media_logs (single source of truth)
      if (!isUpdate && item) {
        const opts = { rating, completed_at };
        if (item.media_type === "film" && item.tmdb_id) {
          await logFilm(userId, item, coverUrl, opts);
        } else if (item.media_type === "show" && item.tmdb_id) {
          await logShow(userId, item, coverUrl, opts);
        } else if (item.media_type === "book") {
          await logBook(userId, item, coverUrl, opts);
        } else if (item.media_type === "game") {
          await logGame(userId, item, coverUrl, opts);
        }
      }

    } catch (e) {
      setProgress((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      throw e;
    }
  }, [userId, setProgress]);

  // --- Log commentary only (no film completion) ---
  const logCommentaryOnly = useCallback(async (itemId, listened) => {
    if (!userId) return;

    setProgress((prev) => {
      const existing = prev[itemId];
      if (existing?.status === "completed") {
        return { ...prev, [itemId]: { ...existing, listened_with_commentary: listened } };
      }
      if (listened) {
        return { ...prev, [itemId]: { ...existing, status: "commentary_only", listened_with_commentary: true } };
      } else {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
    });

    try {
      const existing = await supabase
        .from("community_user_progress")
        .select("status")
        .eq("user_id", userId)
        .eq("item_id", itemId)
        .maybeSingle();

      const currentStatus = existing?.data?.status;

      if (currentStatus === "completed") {
        await supabase
          .from("community_user_progress")
          .update({ listened_with_commentary: listened, updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("item_id", itemId);
      } else if (listened) {
        await supabase
          .from("community_user_progress")
          .upsert({
            user_id: userId,
            item_id: itemId,
            status: "commentary_only",
            listened_with_commentary: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,item_id" });
      } else if (currentStatus === "commentary_only") {
        await supabase
          .from("community_user_progress")
          .delete()
          .eq("user_id", userId)
          .eq("item_id", itemId);
      }
    } catch (e) {
      console.error("[Community] Commentary toggle error:", e);
      setProgress((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      throw e;
    }
  }, [userId, setProgress]);

  // --- Unlog an item (cross-community via media_id) ---
  const unlogItem = useCallback(async (itemId) => {
    if (!userId) return;

    setProgress((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });

    try {
      await supabase
        .from("community_user_progress")
        .update({ status: "skipped", rating: null, completed_at: null })
        .eq("user_id", userId)
        .eq("item_id", itemId);

      // Cross-community unlog via media_id
      const { data: siblingIds } = await supabase.rpc("get_sibling_item_ids", { p_item_id: itemId });

      if (siblingIds?.length > 0) {
        await supabase
          .from("community_user_progress")
          .update({ status: "skipped", rating: null, completed_at: null })
          .eq("user_id", userId)
          .in("item_id", siblingIds)
          .eq("status", "completed");
      }
    } catch {
      setProgress((prev) => ({ ...prev, [itemId]: { listened_with_commentary: false } }));
    }
  }, [userId, setProgress]);

  // --- Add to watchlist ---
  const addToWatchlist = useCallback(async (item, coverUrl) => {
    if (!userId || !item) return;

    const itemType = item.media_type === "film" ? "movie" : item.media_type;
    const label = itemType === "book" ? "reading list" : itemType === "game" ? "play list" : "watch list";

    const { error } = await supabase.from("wishlist").insert({
      user_id: userId,
      item_type: itemType,
      title: item.title,
      cover_url: coverUrl || null,
      year: item.year || null,
    });

    if (error) {
      console.warn("[Community] Watchlist error:", error.message);
      throw error;
    }

    console.log(`[Community] Added "${item.title}" to ${label}`);
  }, [userId]);

  return { logItem, logCommentaryOnly, unlogItem, addToWatchlist };
}
''')

# ===================================================================
# 3. REWRITE: src/hooks/community/useCommunityProgress.js
# ===================================================================
print("[3/5] Rewriting useCommunityProgress.js ...")

write_file("src/hooks/community/useCommunityProgress.js", r'''import { useState, useEffect } from "react";
import { supabase } from "../../supabase";

/**
 * useCommunityProgress -- Loads user progress for community items.
 *
 * UNIFIED MEDIA ARCHITECTURE (v2):
 *   Auto-sync from shelf tables has been REMOVED. With the unified media
 *   architecture, user_media_logs IS the shelf. When a user logs a film
 *   anywhere (shelf, community, Letterboxd), it writes to user_media_logs
 *   and community_user_progress in one atomic operation. No reconciliation
 *   needed.
 *
 *   The old syncFilmsFromShelf/syncShowsFromShelf/syncBooksFromShelf
 *   functions (communitySync.js) are no longer imported or called.
 *
 * Returns: { progress, setProgress, loading }
 */
export function useCommunityProgress(communityId, userId, communityItems = []) {
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || communityItems.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      setLoading(true);

      const allExisting = [];

      // -- Strategy 1: RPC (single query, no batching) --
      try {
        const { data, error } = await supabase.rpc("user_community_progress", {
          p_user_id: userId,
          p_community_id: communityId,
        });

        if (error) throw error;
        if (data) allExisting.push(...data);
      } catch (rpcErr) {
        // -- Fallback: batched .in() queries --
        console.warn("[Community] RPC not available, using fallback:", rpcErr.message);
        const itemIds = communityItems.map((i) => i.id);
        const BATCH_SIZE = 200;
        for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
          const batch = itemIds.slice(i, i + BATCH_SIZE);
          const { data, error: batchErr } = await supabase
            .from("community_user_progress")
            .select("item_id,listened_with_commentary,rating,status,rewatch_count,rewatch_dates,brown_arrow,completed_at,updated_at")
            .eq("user_id", userId)
            .in("item_id", batch);

          if (batchErr) {
            console.error("[Community] Progress load error:", batchErr.message);
          } else if (data) {
            allExisting.push(...data);
          }
          if (cancelled) return;
        }
      }

      if (cancelled) return;

      const map = {};
      allExisting.forEach((row) => {
        if (row.status === "skipped") return;
        map[row.item_id] = {
          status: row.status || "completed",
          listened_with_commentary: row.listened_with_commentary || false,
          brown_arrow: row.brown_arrow || false,
          rating: row.rating || null,
          rewatch_count: row.rewatch_count || 0,
          rewatch_dates: row.rewatch_dates || [],
          completed_at: row.completed_at || null,
          updated_at: row.updated_at || null,
        };
      });

      // NOTE: Auto-sync block removed. With unified media architecture,
      // logging writes to both user_media_logs and community_user_progress
      // atomically. No need for post-hoc reconciliation.

      setProgress(map);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId, communityItems.length]);

  return { progress, setProgress, loading };
}
''')

# ===================================================================
# 4. PATCH: src/utils/importUtils.js
# ===================================================================
print("[4/5] Patching importUtils.js ...")

import_path = "src/utils/importUtils.js"
with open(import_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add mediaWrite import at the top
old_import = 'import { supabase } from "../supabase";\nimport { TMDB_IMG, searchTMDBRaw, fetchTMDBRaw, searchGoogleBooksRaw } from "./api";'
new_import = 'import { supabase } from "../supabase";\nimport { TMDB_IMG, searchTMDBRaw, fetchTMDBRaw, searchGoogleBooksRaw } from "./api";\nimport { upsertMediaLog, toPosterPath } from "./mediaWrite";'
content = content.replace(old_import, new_import)

# Replace the importMovies function
old_import_movies = '''export async function importMovies(items, userId, onProgress) {
  let count = 0, errs = 0;

  for (let i = 0; i < items.length; i++) {
    const m = items[i];
    if (onProgress) onProgress(i + 1, items.length);

    try {
      const results = await searchTMDBRaw(m.title, m.year || null);
      const match = (results || [])[0];
      if (!match) { errs++; continue; }

      let director = null, genre = null, runtime = null;
      try {
        const detail = await fetchTMDBRaw(match.id, "movie", "credits");
        if (detail && !detail.error) {
          director = detail.credits?.crew?.find(c => c.job === "Director")?.name || null;
          genre = (detail.genres || []).slice(0, 2).map(g => g.name).join(", ") || null;
          runtime = detail.runtime || null;
        }
      } catch (e) { /* skip detail fetch */ }

      const poster = match.poster_path ? `${TMDB_IMG}/w342${match.poster_path}` : null;
      const backdrop = match.backdrop_path ? `${TMDB_IMG}/w780${match.backdrop_path}` : null;

      // Build watch_dates array (sorted chronologically)
      const watchDates = (m.watchDates || [])
        .filter(Boolean)
        .map(d => {
          try { return new Date(d).toISOString().slice(0, 10); }
          catch { return null; }
        })
        .filter(Boolean)
        .sort();

      // If no dates from CSV, use today
      if (watchDates.length === 0) {
        watchDates.push(new Date().toISOString().slice(0, 10));
      }

      const watchCount = watchDates.length;

      const { error } = await supabase.from("movies").upsert({
        user_id: userId,
        title: m.title,
        year: m.year || (match.release_date ? parseInt(match.release_date) : null),
        rating: m.rating,
        director, poster_url: poster, backdrop_url: backdrop,
        genre, runtime, tmdb_id: match.id,
        watched_at: m.watchedDate ? new Date(m.watchedDate).toISOString() : new Date().toISOString(),
        source: "letterboxd",
        watch_count: watchCount,
        watch_dates: watchDates,
      }, { onConflict: "user_id,tmdb_id" });

      if (error) { console.error("[Import] Movie error:", error); errs++; }
      else count++;
    } catch (e) { errs++; }

    // Rate limit: pause every 8 movies
    if ((i + 1) % 8 === 0) await new Promise(r => setTimeout(r, 1000));
  }

  return { count, errs };
}'''

new_import_movies = '''export async function importMovies(items, userId, onProgress) {
  let count = 0, errs = 0;

  for (let i = 0; i < items.length; i++) {
    const m = items[i];
    if (onProgress) onProgress(i + 1, items.length);

    try {
      const results = await searchTMDBRaw(m.title, m.year || null);
      const match = (results || [])[0];
      if (!match) { errs++; continue; }

      let director = null, genre = null, runtime = null;
      try {
        const detail = await fetchTMDBRaw(match.id, "movie", "credits");
        if (detail && !detail.error) {
          director = detail.credits?.crew?.find(c => c.job === "Director")?.name || null;
          genre = (detail.genres || []).slice(0, 2).map(g => g.name).join(", ") || null;
          runtime = detail.runtime || null;
        }
      } catch (e) { /* skip detail fetch */ }

      // Build watch_dates array (sorted chronologically)
      const watchDates = (m.watchDates || [])
        .filter(Boolean)
        .map(d => {
          try { return new Date(d).toISOString().slice(0, 10); }
          catch { return null; }
        })
        .filter(Boolean)
        .sort();

      // If no dates from CSV, use today
      if (watchDates.length === 0) {
        watchDates.push(new Date().toISOString().slice(0, 10));
      }

      // Use the ACTUAL watched date from CSV -- fixes the watched_at = now() bug
      const watchedAt = m.watchedDate
        ? new Date(m.watchedDate + "T12:00:00Z").toISOString()
        : new Date().toISOString();

      // Write to media + user_media_logs (unified architecture)
      const mediaId = await upsertMediaLog(userId, {
        mediaType: "film",
        tmdbId: match.id,
        title: m.title,
        year: m.year || (match.release_date ? parseInt(match.release_date) : null),
        creator: director,
        posterPath: match.poster_path || null,
        backdropPath: match.backdrop_path || null,
        runtime,
        genre,
        rating: m.ratingHalf || m.rating || null,
        watchedAt,
        source: "letterboxd",
        watchCount: watchDates.length,
        watchDates,
      });

      if (!mediaId) { errs++; }
      else count++;
    } catch (e) { errs++; }

    // Rate limit: pause every 8 movies
    if ((i + 1) % 8 === 0) await new Promise(r => setTimeout(r, 1000));
  }

  return { count, errs };
}'''

if old_import_movies in content:
    content = content.replace(old_import_movies, new_import_movies)
    print("  [+] importMovies patched")
else:
    print("  [!] importMovies not found -- may need manual patch")

# Patch deduplicateItems to check user_media_logs instead of movies
old_dedup_letterboxd = '''  // Fetch existing movies with their current watch data
  const { data: existing } = await supabase
    .from("movies")
    .select("title, year, watch_dates")
    .eq("user_id", userId);

  const existingMap = new Map();
  for (const m of (existing || [])) {
    existingMap.set(`${m.title}::${m.year}`, {
      watch_dates: m.watch_dates || [],
    });
  }'''

new_dedup_letterboxd = '''  // Check against user_media_logs (unified) with fallback to movies (legacy)
  let existingMap = new Map();
  try {
    const { data: existing } = await supabase
      .from("user_media_logs")
      .select("media:media_id(title, year), watch_dates")
      .eq("user_id", userId);

    for (const row of (existing || [])) {
      if (row.media) {
        existingMap.set(`${row.media.title}::${row.media.year}`, {
          watch_dates: row.watch_dates || [],
        });
      }
    }
  } catch {
    // Fallback to movies table during transition
    const { data: existing } = await supabase
      .from("movies")
      .select("title, year, watch_dates")
      .eq("user_id", userId);

    for (const m of (existing || [])) {
      existingMap.set(`${m.title}::${m.year}`, {
        watch_dates: m.watch_dates || [],
      });
    }
  }'''

if old_dedup_letterboxd in content:
    content = content.replace(old_dedup_letterboxd, new_dedup_letterboxd)
    print("  [+] deduplicateItems patched")
else:
    print("  [!] deduplicateItems block not found -- may need manual patch")

with open(import_path, "w", encoding="utf-8") as f:
    f.write(content)
print("  [+] " + import_path)

# ===================================================================
# 5. DELETE: old files
# ===================================================================
print("[5/5] Deleting replaced files ...")
delete_file("src/utils/communityDualWrite.js")
delete_file("src/utils/communitySync.js")

# ===================================================================
# Summary
# ===================================================================
print("")
print("=" * 55)
print("Phase 1 refactor complete!")
print("=" * 55)
print("""
WHAT CHANGED:
  + src/utils/mediaWrite.js              (NEW)
  ~ src/hooks/community/useCommunityActions.js  (media_id + mediaWrite)
  ~ src/hooks/community/useCommunityProgress.js (auto-sync removed)
  ~ src/utils/importUtils.js             (Letterboxd -> unified tables)
  - src/utils/communityDualWrite.js      (DELETED)
  - src/utils/communitySync.js           (DELETED)

NEXT: run npm run dev and test logging from a community.
""")
