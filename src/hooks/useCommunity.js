import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

// ─── Fetch community page + miniseries + items ───────────────
export function useCommunityPage(slug) {
  const [community, setCommunity] = useState(null);
  const [miniseries, setMiniseries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // 1. Get the community page
        const { data: page, error: pageErr } = await supabase
          .from("community_pages")
          .select("*")
          .eq("slug", slug)
          .single();

        if (pageErr) throw pageErr;
        if (cancelled) return;
        setCommunity(page);

        // 2. Get miniseries
        const { data: series, error: seriesErr } = await supabase
          .from("community_miniseries")
          .select("*")
          .eq("community_id", page.id)
          .order("sort_order");

        if (seriesErr) throw seriesErr;
        if (cancelled) return;

        // 3. Get all items for all miniseries
        const seriesIds = series.map((s) => s.id);
        const { data: items, error: itemsErr } = await supabase
          .from("community_items")
          .select("*")
          .in("miniseries_id", seriesIds)
          .order("sort_order");

        if (itemsErr) throw itemsErr;
        if (cancelled) return;

        // Group items by miniseries
        const itemsByMs = {};
        (items || []).forEach((item) => {
          if (!itemsByMs[item.miniseries_id]) itemsByMs[item.miniseries_id] = [];
          itemsByMs[item.miniseries_id].push(item);
        });

        const enriched = series.map((s) => ({
          ...s,
          items: itemsByMs[s.id] || [],
        }));

        setMiniseries(enriched);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [slug]);

  return { community, miniseries, loading, error };
}

// ─── Normalize a book title for matching ─────────────────────
// Strips "The ", articles, subtitles, series labels, punctuation,
// collapses whitespace, lowercases. This gives us a clean core title
// to compare between Goodreads imports and community items.
function normalizeBookTitle(raw) {
  return (raw || "")
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, "")           // strip parentheticals like (Night Shift Collection)
    .replace(/\s*[-–—:]\s*part\s*\d+/gi, "") // strip "- Part 1", ": Part 2"
    .replace(/\s*,\s*vol(?:ume)?\.?\s*\d+/gi, "") // strip ", Vol. 3"
    .replace(/[''""",.:;!?]/g, "")             // strip punctuation
    .replace(/^(the|a|an)\s+/i, "")            // strip leading articles
    .replace(/\s+/g, " ")                      // collapse whitespace
    .trim();
}

// ─── User progress (completed items) ─────────────────────────
// Table schema: id, user_id, item_id, status, rating, completed_at, notes, listened_with_commentary, updated_at
//
// progress shape: { itemId: { status, listened_with_commentary, rating } }
export function useUserProgress(communityId, userId, communityItems = []) {
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || communityItems.length === 0) return;
    let cancelled = false;

    (async () => {
      setLoading(true);

      // Get all community item IDs to scope our query
      const itemIds = communityItems.map((i) => i.id);

      // Guard: Supabase rejects empty .in() arrays with a 400
      if (itemIds.length === 0) {
        if (!cancelled) { setProgress({}); setLoading(false); }
        return;
      }

      // 1. Load existing progress for these items
      // Chunk into batches of 200 to avoid PostgREST URL length limits
      const BATCH_SIZE = 200;
      const allExisting = [];
      for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
        const batch = itemIds.slice(i, i + BATCH_SIZE);
        const { data, error: batchErr } = await supabase
          .from("community_user_progress")
          .select("item_id,listened_with_commentary,rating,status")
          .eq("user_id", userId)
          .in("item_id", batch);

        if (batchErr) {
          console.error("[Community] Progress load error:", batchErr.message, batchErr);
        } else if (data) {
          allExisting.push(...data);
        }
        if (cancelled) return;
      }

      const map = {};
      const skippedIds = new Set();
      allExisting.forEach((row) => {
        if (row.status === "skipped") {
          skippedIds.add(row.item_id);
          return;
        }
        map[row.item_id] = {
          status: row.status || "completed",
          listened_with_commentary: row.listened_with_commentary || false,
          rating: row.rating || null,
        };
      });

      // 2. Auto-sync: check user's movies shelf for matching TMDB IDs
      const filmItems = communityItems.filter((i) => i.media_type === "film" && i.tmdb_id);
      if (filmItems.length > 0) {
        const tmdbIds = filmItems.map((i) => i.tmdb_id);
        const { data: userMovies } = await supabase
          .from("movies")
          .select("tmdb_id,rating")
          .eq("user_id", userId)
          .in("tmdb_id", tmdbIds);

        if (cancelled) return;

        if (userMovies && userMovies.length > 0) {
          const watchedMovies = new Map(userMovies.map((m) => [m.tmdb_id, m.rating]));

          const toSync = filmItems.filter(
            (item) => watchedMovies.has(item.tmdb_id) && !map[item.id] && !skippedIds.has(item.id)
          );

          if (toSync.length > 0) {
            const rows = toSync.map((item) => ({
              user_id: userId,
              item_id: item.id,
              status: "completed",
              completed_at: new Date().toISOString(),
              listened_with_commentary: false,
              rating: watchedMovies.get(item.tmdb_id) || null,
            }));

            const { error: syncErr } = await supabase
              .from("community_user_progress")
              .upsert(rows, { onConflict: "user_id,item_id" });

            if (!syncErr && !cancelled) {
              toSync.forEach((item) => {
                map[item.id] = { status: "completed", listened_with_commentary: false, rating: watchedMovies.get(item.tmdb_id) || null };
              });
              console.log(`[Community] Auto-synced ${toSync.length} films from shelf`);
            } else if (syncErr) {
              console.warn("[Community] Sync error:", syncErr.message);
            }
          }
        }
      }

      // 3. Auto-sync: check user's books shelf for matching titles
      //    Uses normalized title matching + carries over rating from shelf.
      //    Matches ALL shelf books (same as film sync — any book on shelf = completed).
      const bookItems = communityItems.filter((i) => i.media_type === "book");
      if (bookItems.length > 0) {
        const { data: userBooks } = await supabase
          .from("books")
          .select("id,title,author,rating,finished_at")
          .eq("user_id", userId);

        if (cancelled) return;

        if (userBooks && userBooks.length > 0) {
          // Build a lookup map of normalized shelf titles → book data
          const shelfLookup = userBooks.map((b) => ({
            norm: normalizeBookTitle(b.title),
            title: b.title,
            rating: b.rating,
          }));

          const toSyncBooks = bookItems.filter((item) => {
            if (map[item.id] || skippedIds.has(item.id)) return false;
            const commNorm = normalizeBookTitle(item.title);
            // Exact normalized match only — prevents "Dune" matching "Dune Messiah"
            return shelfLookup.some((shelf) => shelf.norm === commNorm);
          });

          if (toSyncBooks.length > 0) {
            const rows = toSyncBooks.map((item) => {
              const commNorm = normalizeBookTitle(item.title);
              const match = shelfLookup.find((s) => s.norm === commNorm);
              return {
                user_id: userId,
                item_id: item.id,
                status: "completed",
                completed_at: new Date().toISOString(),
                listened_with_commentary: false,
                rating: match?.rating ? Math.round(match.rating) : null,
              };
            });

            const { error: syncErr } = await supabase
              .from("community_user_progress")
              .upsert(rows, { onConflict: "user_id,item_id" });

            if (!syncErr && !cancelled) {
              toSyncBooks.forEach((item, idx) => {
                map[item.id] = {
                  status: "completed",
                  listened_with_commentary: false,
                  rating: rows[idx].rating || null,
                };
              });
              console.log(`[Community] Auto-synced ${toSyncBooks.length} books from shelf`);
            } else if (syncErr) {
              console.warn("[Community] Book sync error:", syncErr.message);
            }
          }
        }
      }

      if (!cancelled) setProgress(map);
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId, communityItems.length]);

  // ─── Log an item (dual-write: community progress + shelf) ───
  // When isUpdate=true, only update community_user_progress (skip shelf dual-write).
  const logItem = useCallback(async (itemId, item, coverUrl, { rating, notes, completed_at, listened_with_commentary, isUpdate } = {}) => {
    if (!userId) return;

    // Optimistic update
    setProgress((prev) => ({
      ...prev,
      [itemId]: {
        status: "completed",
        listened_with_commentary: listened_with_commentary !== undefined ? listened_with_commentary : (prev[itemId]?.listened_with_commentary || false),
        rating: rating || prev[itemId]?.rating || null,
      },
    }));

    try {
      // 1. Save community progress
      if (isUpdate) {
        const updateFields = { updated_at: new Date().toISOString() };
        if (rating) updateFields.rating = Math.round(rating);
        if (notes) updateFields.notes = notes;
        if (completed_at) updateFields.completed_at = completed_at;
        if (listened_with_commentary !== undefined) updateFields.listened_with_commentary = listened_with_commentary;

        const { error: updateErr } = await supabase
          .from("community_user_progress")
          .update(updateFields)
          .eq("user_id", userId)
          .eq("item_id", itemId);

        if (updateErr) {
          console.error("[Community] Progress update error:", updateErr.message);
          throw updateErr;
        }
      } else {
        const { error: progressErr } = await supabase
          .from("community_user_progress")
          .upsert({
            user_id: userId,
            item_id: itemId,
            status: "completed",
            rating: rating ? Math.round(rating) : null,
            notes: notes || null,
            completed_at: completed_at || null,
            listened_with_commentary: listened_with_commentary || false,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,item_id" });

        if (progressErr) {
          console.error("[Community] Progress upsert error:", progressErr.message);
          throw progressErr;
        }
      }

      // 2. Dual-write to shelf tables based on media type (only on first log, not updates)
      if (!isUpdate && item && item.media_type === "film" && item.tmdb_id) {
        const watchDateStr = completed_at ? new Date(completed_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        const { error: movieErr } = await supabase.from("movies").upsert({
          user_id: userId,
          tmdb_id: item.tmdb_id,
          title: item.title,
          year: item.year || null,
          director: item.creator || null,
          poster_url: coverUrl || null,
          rating: rating ? Math.round(rating) : null,
          notes: notes || null,
          watched_at: completed_at || null,
          source: "community",
          watch_count: 1,
          watch_dates: [watchDateStr],
        }, { onConflict: "user_id,tmdb_id" });

        if (movieErr) console.warn("[Community] Movie dual-write error:", movieErr.message);

        // Insert feed activity (dedup check)
        try {
          const { data: existingFeed } = await supabase.from("feed_activity")
            .select("id").eq("user_id", userId).eq("activity_type", "movie")
            .eq("item_title", item.title).limit(1);

          if (!existingFeed || existingFeed.length === 0) {
            await supabase.from("feed_activity").insert({
              user_id: userId,
              activity_type: "movie",
              action: "shelved",
              title: item.title,
              item_title: item.title,
              item_cover: coverUrl || null,
              item_author: item.creator || null,
              item_year: item.year || null,
              rating: rating ? Math.round(rating) : null,
            });
          } else if (rating) {
            await supabase.from("feed_activity")
              .update({ rating: Math.round(rating) })
              .eq("id", existingFeed[0].id);
          }
        } catch (e) { console.warn("[Community] Feed activity error:", e); }

        // Auto-remove from wishlist if it was there
        try {
          await supabase.from("wishlist").delete()
            .eq("user_id", userId).eq("title", item.title).eq("item_type", "movie");
        } catch {}

        console.log(`[Community] Dual-write: "${item.title}" → movies shelf + community progress`);
      }

      // 2b. Dual-write to books shelf (fuzzy dedup) — only on first log
      if (!isUpdate && item && item.media_type === "book") {
        // Check if a normalized match already exists on shelf
        const { data: existingBooks } = await supabase.from("books")
          .select("id, title, author").eq("user_id", userId);

        const commNorm = normalizeBookTitle(item.title);
        const fuzzyMatch = (existingBooks || []).find((b) => {
          const shelfNorm = normalizeBookTitle(b.title);
          return shelfNorm === commNorm;
        });

        if (fuzzyMatch) {
          // Book already on shelf — just update rating/notes if provided
          if (rating || notes) {
            await supabase.from("books").update({
              ...(rating ? { rating: Math.round(rating) } : {}),
              ...(notes ? { notes } : {}),
            }).eq("id", fuzzyMatch.id);
          }
          console.log(`[Community] Book "${item.title}" matched shelf entry "${fuzzyMatch.title}" — skipped duplicate`);
        } else {
          // No match — insert new
          const { error: bookErr } = await supabase.from("books").upsert({
            user_id: userId,
            habit_id: 0,
            title: item.title,
            author: item.creator || null,
            cover_url: coverUrl || null,
            rating: rating ? Math.round(rating) : null,
            notes: notes || null,
            finished_at: completed_at || new Date().toISOString(),
            is_active: false,
            source: "community",
          }, { onConflict: "user_id,title" });

          if (bookErr) console.warn("[Community] Book dual-write error:", bookErr.message);
        }

        // Insert feed activity (dedup check)
        try {
          const { data: existingFeed } = await supabase.from("feed_activity")
            .select("id").eq("user_id", userId).eq("activity_type", "book")
            .eq("item_title", item.title).limit(1);

          if (!existingFeed || existingFeed.length === 0) {
            await supabase.from("feed_activity").insert({
              user_id: userId,
              activity_type: "book",
              action: "shelved",
              title: item.title,
              item_title: item.title,
              item_cover: coverUrl || null,
              item_author: item.creator || null,
              item_year: item.year || null,
              rating: rating ? Math.round(rating) : null,
            });
          } else if (rating) {
            await supabase.from("feed_activity")
              .update({ rating: Math.round(rating) })
              .eq("id", existingFeed[0].id);
          }
        } catch (e) { console.warn("[Community] Book feed activity error:", e); }

        // Auto-remove from wishlist if it was there
        try {
          await supabase.from("wishlist").delete()
            .eq("user_id", userId).eq("title", item.title).eq("item_type", "book");
        } catch {}

        console.log(`[Community] Dual-write: "${item.title}" → books shelf + community progress`);
      }

    } catch (e) {
      // Rollback
      setProgress((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      throw e;
    }
  }, [userId]);

  // ─── Unlog an item ─────────────────────────────────────────
  const unlogItem = useCallback(async (itemId) => {
    if (!userId) return;

    // Optimistic update — remove from visible progress
    setProgress((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });

    try {
      // Set status to "skipped" instead of deleting — prevents auto-sync from re-adding
      await supabase
        .from("community_user_progress")
        .update({ status: "skipped", rating: null, completed_at: null })
        .eq("user_id", userId)
        .eq("item_id", itemId);
    } catch {
      // Rollback
      setProgress((prev) => ({ ...prev, [itemId]: { listened_with_commentary: false } }));
    }
  }, [userId]);

  // ─── Add to watchlist ──────────────────────────────────────
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

  return { progress, loading, logItem, unlogItem, addToWatchlist };
}

// ─── Leaderboard ──────────────────────────────────────────────
export function useLeaderboard(communityId, communityItemIds = []) {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    if (communityItemIds.length === 0) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("community_user_progress")
        .select("user_id")
        .in("item_id", communityItemIds);

      if (error || cancelled) return;

      const counts = {};
      (data || []).forEach((row) => {
        counts[row.user_id] = (counts[row.user_id] || 0) + 1;
      });

      const userIds = Object.keys(counts);
      if (userIds.length === 0) { setLeaders([]); return; }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      if (cancelled) return;

      const profileMap = {};
      (profiles || []).forEach((p) => { profileMap[p.id] = p; });

      const sorted = userIds
        .map((uid) => ({
          userId: uid,
          count: counts[uid],
          username: profileMap[uid]?.username || "Anonymous",
          avatarUrl: profileMap[uid]?.avatar_url,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      setLeaders(sorted);
    })();

    return () => { cancelled = true; };
  }, [communityItemIds.length]);

  return leaders;
}
