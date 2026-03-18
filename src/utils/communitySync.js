import { supabase } from "../supabase";

/**
 * communitySync.js
 * Auto-sync utilities: backfill community_user_progress from movies/shows/books shelf.
 * Called by useCommunityProgress on tab load.
 *
 * All functions mutate the `map` object in place and return the count of synced items.
 */

// ─── Films: match by tmdb_id ──────────────────────────────────────────────────
export async function syncFilmsFromShelf(userId, communityItems, map, skippedIds) {
  const filmItems = communityItems.filter((i) => i.media_type === "film" && i.tmdb_id);
  if (filmItems.length === 0) return 0;

  const tmdbIds = filmItems.map((i) => i.tmdb_id);
  const { data: userMovies } = await supabase
    .from("movies")
    .select("tmdb_id, rating, watch_dates, watched_at")
    .eq("user_id", userId)
    .in("tmdb_id", tmdbIds);

  if (!userMovies || userMovies.length === 0) return 0;

  const watchedMovies = new Map(userMovies.map((m) => [m.tmdb_id, {
    rating: m.rating,
    watch_dates: m.watch_dates || [],
    watched_at: m.watched_at || null,
  }]));

  const toSync = filmItems.filter(
    (item) => watchedMovies.has(item.tmdb_id) && !map[item.id] && !skippedIds.has(item.id)
  );

  // Also find items that are already synced but have stale watch data
  const toUpdateRewatch = filmItems.filter((item) => {
    if (!watchedMovies.has(item.tmdb_id)) return false;
    const existing = map[item.id];
    if (!existing) return false; // will be handled by toSync
    const movieData = watchedMovies.get(item.tmdb_id);
    const currentRewatch = existing.rewatch_count || 0;
    const movieRewatch = Math.max(0, (movieData.watch_dates || []).length - 1);
    return movieRewatch > currentRewatch; // watch_dates has more watches
  });

  let syncCount = 0;

  if (toSync.length > 0) {
    const rows = toSync.map((item) => {
      const movieData = watchedMovies.get(item.tmdb_id);
      const rewatchCount = Math.max(0, (movieData.watch_dates || []).length - 1);
      // rewatch_dates = all dates after the first (the "rewatches")
      const rewatchDates = (movieData.watch_dates || []).slice(1);
      // Use the actual watched_at timestamp — watch_dates is for counting, not timestamping
      const completedAt = movieData.watched_at || null;

      return {
        user_id: userId,
        item_id: item.id,
        status: "completed",
        completed_at: completedAt,
        listened_with_commentary: false,
        rating: movieData.rating || null,
        rewatch_count: rewatchCount,
        rewatch_dates: rewatchDates,
      };
    });

    const { error: syncErr } = await supabase
      .from("community_user_progress")
      .upsert(rows, { onConflict: "user_id,item_id" });

    if (syncErr) {
      console.warn("[Community] Film sync error:", syncErr.message);
    } else {
      toSync.forEach((item) => {
        const movieData = watchedMovies.get(item.tmdb_id);
        map[item.id] = {
          status: "completed",
          listened_with_commentary: false,
          rating: movieData.rating || null,
          rewatch_count: Math.max(0, (movieData.watch_dates || []).length - 1),
          rewatch_dates: (movieData.watch_dates || []).slice(1),
        };
      });
      syncCount += toSync.length;
      console.log(`[Community] Auto-synced ${toSync.length} films from shelf`);
    }
  }

  // Update rewatch data for already-synced items that have new watches
  if (toUpdateRewatch.length > 0) {
    for (const item of toUpdateRewatch) {
      const movieData = watchedMovies.get(item.tmdb_id);
      const rewatchCount = Math.max(0, (movieData.watch_dates || []).length - 1);
      const rewatchDates = (movieData.watch_dates || []).slice(1);

      const { error } = await supabase
        .from("community_user_progress")
        .update({ rewatch_count: rewatchCount, rewatch_dates: rewatchDates })
        .eq("user_id", userId)
        .eq("item_id", item.id);

      if (!error) {
        map[item.id] = {
          ...map[item.id],
          rewatch_count: rewatchCount,
          rewatch_dates: rewatchDates,
        };
        syncCount++;
      }
    }
    console.log(`[Community] Updated rewatch data for ${toUpdateRewatch.length} films`);
  }

  return syncCount;
}

// ─── Shows: match by tmdb_id against shows table ─────────────────────────────
export async function syncShowsFromShelf(userId, communityItems, map, skippedIds) {
  const showItems = communityItems.filter((i) => i.media_type === "show" && i.tmdb_id);
  if (showItems.length === 0) return 0;

  const tmdbIds = showItems.map((i) => i.tmdb_id);
  const { data: userShows } = await supabase
    .from("shows")
    .select("tmdb_id, rating, status, finished_at")
    .eq("user_id", userId)
    .in("tmdb_id", tmdbIds);

  if (!userShows || userShows.length === 0) return 0;

  // Only sync shows that are marked as watched/completed
  const watchedShows = new Map(
    userShows
      .filter((s) => s.status === "watched" || s.status === "completed")
      .map((s) => [s.tmdb_id, { rating: s.rating, finished_at: s.finished_at }])
  );

  const toSync = showItems.filter(
    (item) => watchedShows.has(item.tmdb_id) && !map[item.id] && !skippedIds.has(item.id)
  );

  if (toSync.length === 0) return 0;

  const rows = toSync.map((item) => {
    const showData = watchedShows.get(item.tmdb_id);
    return {
      user_id: userId,
      item_id: item.id,
      status: "completed",
      completed_at: showData.finished_at || null,
      listened_with_commentary: false,
      rating: showData.rating || null,
    };
  });

  const { error: syncErr } = await supabase
    .from("community_user_progress")
    .upsert(rows, { onConflict: "user_id,item_id" });

  if (syncErr) {
    console.warn("[Community] Show sync error:", syncErr.message);
    return 0;
  }

  toSync.forEach((item) => {
    const showData = watchedShows.get(item.tmdb_id);
    map[item.id] = {
      status: "completed",
      listened_with_commentary: false,
      rating: showData.rating || null,
    };
  });

  console.log(`[Community] Auto-synced ${toSync.length} shows from shelf`);
  return toSync.length;
}

// ─── Normalize book title for matching ─────────────────────────────────────
function normalizeBookTitle(raw) {
  return (raw || "")
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, "")           // strip parentheticals: (Dune #3), (Southern Reach, #1)
    .replace(/\s*[-–—:]\s*part\s*\d+/gi, "") // strip "- Part 1", ": Part 2"
    .replace(/\s*,\s*vol(?:ume)?\.?\s*\d+/gi, "") // strip ", Vol. 3"
    .replace(/[''""",.:;!?]/g, "")             // strip punctuation
    .replace(/^(the|a|an)\s+/i, "")            // strip leading articles
    .replace(/\s+/g, " ")                      // collapse whitespace
    .trim();
}

// ─── Books: match by normalized title ────────────────────────────────────────
export async function syncBooksFromShelf(userId, communityItems, map, skippedIds) {
  const bookItems = communityItems.filter((i) => i.media_type === "book");
  if (bookItems.length === 0) return 0;

  // Filter to unmatched items first
  const candidates = bookItems.filter((item) => !map[item.id] && !skippedIds.has(item.id));
  if (candidates.length === 0) return 0;

  // Fetch ALL user's shelf books (no filter — Goodreads imports have inconsistent finished_at/is_active)
  const { data: userBooks, error: fetchErr } = await supabase
    .from("books")
    .select("id,title,author,rating,finished_at")
    .eq("user_id", userId);

  if (fetchErr) {
    console.warn("[Community] Book fetch error:", fetchErr.message);
    return 0;
  }
  if (!userBooks || userBooks.length === 0) return 0;

  // Build normalized shelf lookup
  const shelfLookup = userBooks.map((b) => ({
    norm: normalizeBookTitle(b.title),
    rating: b.rating,
    finished_at: b.finished_at,
  }));

  // Match: exact normalized title only (prevents "Dune" matching "Dune Messiah")
  const toSync = candidates.filter((item) => {
    const commNorm = normalizeBookTitle(item.title);
    return shelfLookup.some((shelf) => shelf.norm === commNorm);
  });

  if (toSync.length === 0) return 0;

  const rows = toSync.map((item) => {
    const commNorm = normalizeBookTitle(item.title);
    const match = shelfLookup.find((s) => s.norm === commNorm);
    return {
      user_id: userId,
      item_id: item.id,
      status: "completed",
      completed_at: match?.finished_at || null,
      listened_with_commentary: false,
      rating: match?.rating ? Math.round(match.rating) : null,
    };
  });

  const { error: syncErr } = await supabase
    .from("community_user_progress")
    .upsert(rows, { onConflict: "user_id,item_id" });

  if (syncErr) {
    console.warn("[Community] Book sync error:", syncErr.message);
    return 0;
  }

  toSync.forEach((item, idx) => {
    map[item.id] = {
      status: "completed",
      listened_with_commentary: false,
      rating: rows[idx].rating || null,
    };
  });

  console.log(`[Community] Auto-synced ${toSync.length} books from shelf`);
  return toSync.length;
}
