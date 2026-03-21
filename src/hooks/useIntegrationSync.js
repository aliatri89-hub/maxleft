import { useState, useRef, useCallback } from "react";
import { supabase } from "../supabase";
import { TMDB_IMG, fetchTMDBRaw, searchTMDBRaw } from "../utils/api";
import { toLogTimestamp } from "../utils/helpers";
import { upsertMediaLog, toPosterPath, logGame } from "../utils/mediaWrite";

/**
 * useIntegrationSync — Letterboxd, Goodreads, and Steam sync logic.
 *
 * Extracted from App.jsx. Owns all sync state (syncing flags, last sync times,
 * lock refs, badge toast state). Depends on session, showToast, loadShelves,
 * and setProfile from the parent.
 */
export function useIntegrationSync({ session, showToast, loadShelves, setProfile }) {
  const userId = session?.user?.id;

  // ── Sync state ──
  const [letterboxdSyncing, setLetterboxdSyncing] = useState(false);
  const [letterboxdLastSync, setLetterboxdLastSync] = useState(null);
  const [letterboxdSyncSignal, setLetterboxdSyncSignal] = useState(null);
  const [autoLogCompleteSignal, setAutoLogCompleteSignal] = useState(null);

  const [goodreadsSyncing, setGoodreadsSyncing] = useState(false);
  const [goodreadsLastSync, setGoodreadsLastSync] = useState(null);

  const [steamSyncing, setSteamSyncing] = useState(false);

  // ── Badge progress toasts (from Letterboxd sync) ──
  const [syncBadgeToasts, setSyncBadgeToasts] = useState([]);
  const syncBadgeTimers = useRef([]);

  // ── Lock refs (synchronous — prevents race conditions) ──
  const letterboxdLock = useRef(false);
  const goodreadsLock = useRef(false);
  const steamLock = useRef(false);
  const hasSyncedThisSession = useRef(false);

  // ════════════════════════════════════════════════
  // AUTO-LOG + BADGE CHECK (shared by Letterboxd sync)
  // ════════════════════════════════════════════════

  const autoLogAndCheckBadges = async (syncedFilms, uid) => {
    try {
      if (!syncedFilms.length) return;
      const tmdbIds = syncedFilms.map(f => f.tmdbId);
      const ratingMap = {};
      syncedFilms.forEach(f => { ratingMap[f.tmdbId] = f; });

      const { data: matchedItems } = await supabase
        .from("community_items")
        .select("id, tmdb_id, miniseries_id, media_type")
        .in("tmdb_id", tmdbIds);

      if (!matchedItems?.length) return;
      const matchedItemIds = matchedItems.map(i => i.id);

      const { data: existingProgress } = await supabase
        .from("community_user_progress")
        .select("item_id, status")
        .eq("user_id", uid)
        .in("item_id", matchedItemIds);

      const existingSet = new Set((existingProgress || []).filter(p => p.status !== "skipped").map(p => p.item_id));

      const newRows = matchedItems
        .filter(item => !existingSet.has(item.id))
        .map(item => {
          const filmData = ratingMap[item.tmdb_id] || {};
          return {
            user_id: uid,
            item_id: item.id,
            status: "completed",
            rating: filmData.rating ? Math.round(filmData.rating) : null,
            completed_at: filmData.watchedDate ? toLogTimestamp(filmData.watchedDate) : new Date().toISOString(),
            listened_with_commentary: false,
            brown_arrow: false,
            updated_at: new Date().toISOString(),
          };
        });

      if (newRows.length > 0) {
        const { error: upsertErr } = await supabase
          .from("community_user_progress")
          .upsert(newRows, { onConflict: "user_id,item_id" });
        if (upsertErr) console.error("[AutoLog] Community progress upsert error:", upsertErr);
        else console.log(`[AutoLog] Logged ${newRows.length} film(s) into community progress`);
      }

      // Badge progress check
      const miniseriesIds = [...new Set(matchedItems.map(i => i.miniseries_id).filter(Boolean))];
      if (!miniseriesIds.length) return;

      const { data: badges } = await supabase
        .from("badges")
        .select("id, name, image_url, accent_color, miniseries_id, media_type_filter, community_id")
        .in("miniseries_id", miniseriesIds)
        .eq("is_active", true);

      if (!badges?.length) return;

      const { data: earned } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", uid)
        .in("badge_id", badges.map(b => b.id));
      const earnedSet = new Set((earned || []).map(r => r.badge_id));

      const unearned = badges.filter(b => !earnedSet.has(b.id));
      if (!unearned.length) return;

      const communityIds = [...new Set(unearned.map(b => b.community_id).filter(Boolean))];
      const { data: communityPages } = await supabase
        .from("community_pages")
        .select("id, slug")
        .in("id", communityIds);
      const slugMap = {};
      (communityPages || []).forEach(c => { slugMap[c.id] = c.slug; });

      const { data: allItems } = await supabase
        .from("community_items")
        .select("id, miniseries_id, media_type")
        .in("miniseries_id", unearned.map(b => b.miniseries_id));

      const { data: progress } = await supabase
        .from("community_user_progress")
        .select("item_id")
        .eq("user_id", uid)
        .in("item_id", (allItems || []).map(i => i.id))
        .neq("status", "skipped");

      const progressSet = new Set((progress || []).map(p => p.item_id));

      const toasts = unearned.map(badge => {
        const items = (allItems || []).filter(i => {
          if (i.miniseries_id !== badge.miniseries_id) return false;
          if (badge.media_type_filter && i.media_type !== badge.media_type_filter) return false;
          return true;
        });
        const total = items.length;
        const current = items.filter(i => progressSet.has(i.id)).length;
        const isComplete = current === total && total > 0;
        const slug = slugMap[badge.community_id] || null;
        return { badge, current, total, isComplete, slug };
      }).filter(t => t.current > 0)
        .sort((a, b) => {
          if (a.isComplete !== b.isComplete) return b.isComplete ? 1 : -1;
          return (b.current / b.total) - (a.current / a.total);
        })
        .slice(0, 3);

      if (!toasts.length) return;

      syncBadgeTimers.current.forEach(t => clearTimeout(t));
      syncBadgeTimers.current = [];

      setSyncBadgeToasts(toasts.map(t => ({ ...t, visible: false })));

      toasts.forEach((_, i) => {
        const tid = setTimeout(() => {
          setSyncBadgeToasts(prev => prev.map((t, j) => j === i ? { ...t, visible: true } : t));
        }, i * 350);
        syncBadgeTimers.current.push(tid);
      });

      toasts.forEach((_, i) => {
        const tid = setTimeout(() => {
          setSyncBadgeToasts(prev => prev.map((t, j) => j === i ? { ...t, visible: false } : t));
        }, 4000 + i * 250);
        syncBadgeTimers.current.push(tid);
      });

      const tidClear = setTimeout(() => setSyncBadgeToasts([]), 4000 + toasts.length * 250 + 600);
      syncBadgeTimers.current.push(tidClear);
    } catch (e) {
      console.warn("[AutoLog] Auto-log + badge check failed:", e);
    }
  };

  // ════════════════════════════════════════════════
  // LETTERBOXD
  // ════════════════════════════════════════════════

  const parseLetterboxdRating = (ratingStr) => {
    if (!ratingStr) return null;
    const full = (ratingStr.match(/★/g) || []).length;
    const half = ratingStr.includes("½") ? 0.5 : 0;
    return full + half || null;
  };

  const syncLetterboxd = async (username, uid, manual = false) => {
    console.log("[Letterboxd] syncLetterboxd called", { username, uid, manual, locked: letterboxdLock.current });
    if (!username || !uid || letterboxdLock.current) {
      console.log("[Letterboxd] BAILED — guard failed", { noUsername: !username, noUid: !uid, locked: letterboxdLock.current });
      return;
    }
    letterboxdLock.current = true;
    setLetterboxdSyncing(true);

    try {
      const edgeUrl = `https://api.mymantl.app/functions/v1/letterboxd-rss?username=${encodeURIComponent(username)}&t=${Date.now()}`;
      const res = await fetch(edgeUrl);
      const data = await res.json();

      if (!res.ok || data.error) {
        console.error("[Letterboxd] Edge function error:", data.error || res.status);
        showToast(data.error || "Couldn't reach Letterboxd");
        letterboxdLock.current = false;
        setLetterboxdSyncing(false);
        return;
      }

      const rssText = data.contents;
      if (!rssText) {
        showToast("No RSS content — check username");
        letterboxdLock.current = false;
        setLetterboxdSyncing(false);
        return;
      }

      const parser = new DOMParser();
      const xml = parser.parseFromString(rssText, "text/xml");
      const items = xml.querySelectorAll("item");

      console.log(`[Letterboxd] RSS returned ${items.length} items`);

      if (items.length === 0) {
        showToast("No entries found — check your Letterboxd username is correct and profile is public");
        letterboxdLock.current = false;
        setLetterboxdSyncing(false);
        return;
      }

      const { data: existingMovies } = await supabase.from("user_films_v")
        .select("title, year, tmdb_id, watch_dates").eq("user_id", uid);
      const existingSet = new Set((existingMovies || []).map(m => `${m.title}::${m.year}`));
      const existingMap = new Map((existingMovies || []).map(m => [`${m.title}::${m.year}`, m]));
      console.log(`[Letterboxd] Existing films in DB: ${existingSet.size}`);

      const { data: existingFeed } = await supabase.from("feed_activity")
        .select("title, item_title").eq("user_id", uid).eq("activity_type", "movie");
      const feedSet = new Set((existingFeed || []).flatMap(f => [f.title, f.item_title].filter(Boolean)));

      let synced = 0;
      const maxSync = 50;
      const BATCH_SIZE = 4;

      const getTagText = (el, tagName) => {
        let nodes = el.getElementsByTagName(`letterboxd:${tagName}`);
        if (nodes.length > 0) return nodes[0].textContent;
        try {
          nodes = el.getElementsByTagNameNS("https://letterboxd.com", tagName);
          if (nodes.length > 0) return nodes[0].textContent;
        } catch (e) {}
        nodes = el.getElementsByTagName(tagName);
        if (nodes.length > 0) return nodes[0].textContent;
        return null;
      };

      const workQueue = [];
      const rewatchQueue = [];
      for (const item of items) {
        if (workQueue.length >= maxSync) break;

        const filmTitle = getTagText(item, "filmTitle");
        if (!filmTitle) continue;
        const title = filmTitle.trim();
        if (!title) continue;

        const yearStr = getTagText(item, "filmYear");
        const year = yearStr ? parseInt(yearStr) : null;
        const ratingStr = getTagText(item, "memberRating");
        const rating = ratingStr ? parseFloat(ratingStr) : null;
        const watchedDate = getTagText(item, "watchedDate");
        const titleText = getTagText(item, "title") || "";
        const ratingFromTitle = rating || parseLetterboxdRating(titleText.match(/★[★½]*/)?.[0]);

        const dedupKey = `${title}::${year}`;

        const rssTmdbId = (() => {
          let nodes = item.getElementsByTagName("tmdb:movieId");
          if (nodes.length > 0) return nodes[0].textContent;
          try { nodes = item.getElementsByTagNameNS("https://themoviedb.org", "movieId"); if (nodes.length > 0) return nodes[0].textContent; } catch (e) {}
          return null;
        })();

        if (existingSet.has(dedupKey)) {
          const existing = existingMap.get(dedupKey);
          if (existing && watchedDate) {
            const dateStr = new Date(watchedDate).toISOString().slice(0, 10);
            const knownDates = (existing.watch_dates || []).map(d => String(d).slice(0, 10));
            if (!knownDates.includes(dateStr)) {
              rewatchQueue.push({
                tmdb_id: existing.tmdb_id,
                title, year,
                newDate: dateStr,
                currentDates: existing.watch_dates || [],
                rating: ratingFromTitle || null,
              });
              existing.watch_dates = [...(existing.watch_dates || []), dateStr].sort();
            }
          }
          continue;
        }

        existingSet.add(dedupKey);
        workQueue.push({ title, year, rating, ratingFromTitle, watchedDate, dedupKey, rssTmdbId: rssTmdbId ? parseInt(rssTmdbId) : null });
      }

      console.log(`[Letterboxd] ${workQueue.length} new films to sync, ${rewatchQueue.length} rewatches`);
      if (workQueue.length > 0) console.log("[Letterboxd] First new:", workQueue.slice(0, 3).map(w => w.title));
      if (workQueue.length === 0 && rewatchQueue.length === 0) {
        // Log first few RSS items to see what was skipped
        const rssItems = [];
        for (const item of items) {
          const ft = getTagText(item, "filmTitle");
          const yr = getTagText(item, "filmYear");
          if (ft) rssItems.push(`${ft.trim()}::${yr}`);
          if (rssItems.length >= 5) break;
        }
        console.log("[Letterboxd] All RSS items already in DB. First RSS items:", rssItems);
      }

      const processMovie = async ({ title, year, ratingFromTitle, watchedDate, rssTmdbId }) => {
        let tmdbId = rssTmdbId;
        let poster = null, backdrop = null, director = null, genre = null, runtime = null, genreIds = [];

        if (!tmdbId) {
          try {
            const results = await searchTMDBRaw(title, year);
            const match = results[0];
            if (match) tmdbId = match.id;
          } catch (e) {}
        }

        if (tmdbId) {
          try {
            const detail = await fetchTMDBRaw(tmdbId, "movie", "credits");
            if (detail && !detail.error) {
              poster = detail.poster_path ? `${TMDB_IMG}/w342${detail.poster_path}` : null;
              backdrop = detail.backdrop_path ? `${TMDB_IMG}/w780${detail.backdrop_path}` : null;
              director = detail.credits?.crew?.find(c => c.job === "Director")?.name || null;
              genre = (detail.genres || []).slice(0, 2).map(g => g.name).join(", ") || null;
              genreIds = (detail.genres || []).map(g => g.id);
              runtime = detail.runtime || null;
            }
          } catch (e) { console.warn(`[Letterboxd] Detail fetch failed for tmdbId ${tmdbId}:`, e); }
        }

        if (!tmdbId) {
          console.warn(`[Letterboxd] No TMDB match for "${title}" (${year}) — skipping`);
          return null;
        }

        const watchDateStr = watchedDate ? new Date(watchedDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        const mediaId = await upsertMediaLog(uid, {
          mediaType: "film",
          tmdbId, title, year,
          creator: director,
          posterPath: poster ? toPosterPath(poster) : null,
          backdropPath: backdrop ? toPosterPath(backdrop) : null,
          runtime, genre,
          rating: ratingFromTitle || null,
          watchedAt: watchedDate ? toLogTimestamp(watchedDate) : new Date().toISOString(),
          watchedDate: watchDateStr,
          source: "letterboxd",
          watchCount: 1,
          watchDates: [watchDateStr],
        });
        if (!mediaId) console.error("[Letterboxd] upsert_media_log failed for", title);

        return { title, tmdbId, rating: ratingFromTitle || null, watchedDate, genreIds };
      };

      const syncedFilms = [];
      for (let i = 0; i < workQueue.length; i += BATCH_SIZE) {
        const batch = workQueue.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(processMovie));
        const successful = results.filter(Boolean);
        synced += successful.length;
        successful.forEach(r => { if (r.tmdbId) syncedFilms.push(r); });
        if (i + BATCH_SIZE < workQueue.length) await new Promise(r => setTimeout(r, 250));
      }

      // Process rewatch updates
      let rewatchCount = 0;
      for (const rw of rewatchQueue) {
        const newDates = [...(rw.currentDates || []), rw.newDate].sort();
        const newCount = newDates.length;
        const rewatchDatesOnly = newDates.slice(1);

        const { error: rwErr } = await supabase.rpc("update_rewatch_data", {
          p_user_id: uid,
          p_tmdb_id: rw.tmdb_id,
          p_watch_dates: newDates,
          p_watched_at: new Date(new Date(toLogTimestamp(rw.newDate)).getTime()).toISOString(),
          p_rating: rw.rating || null,
        });

        if (rwErr) {
          console.warn(`[Letterboxd] Rewatch update failed for "${rw.title}":`, rwErr.message);
          continue;
        }

        rewatchCount++;

        try {
          const { data: communityItems } = await supabase
            .from("community_items")
            .select("id")
            .eq("tmdb_id", rw.tmdb_id);

          if (communityItems && communityItems.length > 0) {
            const itemIds = communityItems.map(ci => ci.id);
            const { data: existingProgress } = await supabase
              .from("community_user_progress")
              .select("item_id")
              .eq("user_id", uid)
              .in("item_id", itemIds);

            if (existingProgress && existingProgress.length > 0) {
              const progressItemIds = existingProgress.map(p => p.item_id);
              const rewatchTimestamp = new Date(
                new Date(toLogTimestamp(rw.newDate)).getTime()
              ).toISOString();
              const updatePayload = {
                  rewatch_count: newCount - 1,
                  rewatch_dates: rewatchDatesOnly,
                  completed_at: rewatchTimestamp,
                  updated_at: rewatchTimestamp,
                };
              if (rw.rating) updatePayload.rating = Math.round(rw.rating);
              await supabase
                .from("community_user_progress")
                .update(updatePayload)
                .eq("user_id", uid)
                .in("item_id", progressItemIds);

              console.log(`[Letterboxd] Updated rewatch in ${progressItemIds.length} community(ies) for "${rw.title}"`);
            }
          }
        } catch (e) {
          console.warn(`[Letterboxd] Community rewatch propagation failed for "${rw.title}":`, e.message);
        }
      }
      if (rewatchCount > 0) {
        console.log(`[Letterboxd] Updated ${rewatchCount} rewatch(es)`);
      }

      setLetterboxdLastSync(new Date());
      if (synced > 0 || rewatchCount > 0) {
        const parts = [];
        if (synced > 0) parts.push(`${synced} new film${synced !== 1 ? "s" : ""}`);
        if (rewatchCount > 0) parts.push(`${rewatchCount} rewatch${rewatchCount !== 1 ? "es" : ""}`);
        // Signal handled via return values — parent sets letterboxdToast
        setLetterboxdSyncSignal(Date.now());
        await loadShelves(uid);
        if (syncedFilms.length > 0) {
          setTimeout(async () => {
            await autoLogAndCheckBadges(syncedFilms, uid);
            setAutoLogCompleteSignal(Date.now());
          }, 2800);
        } else {
          setTimeout(async () => {
            setAutoLogCompleteSignal(Date.now());
          }, 3200);
        }
        return { synced, rewatchCount };
      } else if (manual) {
        console.log("[Letterboxd] Sync complete — nothing new found");
        showToast("Letterboxd up to date ✓");
      } else {
        console.log("[Letterboxd] Auto-sync complete — nothing new found");
      }
      return null;
    } catch (e) {
      console.error("[Letterboxd] Sync error:", e);
      if (manual) showToast("Letterboxd sync failed — check username");
      return null;
    } finally {
      letterboxdLock.current = false;
      setLetterboxdSyncing(false);
    }
  };

  const connectLetterboxd = async (username) => {
    if (!username || !session) return;
    const clean = username.trim().toLowerCase();
    const { error } = await supabase.from("profiles").update({ letterboxd_username: clean }).eq("id", session.user.id);
    if (error) { showToast("Couldn't save username"); return; }
    setProfile(prev => ({ ...prev, letterboxd_username: clean }));
    showToast("Letterboxd connected! Syncing...");
    syncLetterboxd(clean, session.user.id, true);
  };

  const disconnectLetterboxd = async () => {
    if (!session) return;
    await supabase.from("profiles").update({ letterboxd_username: null }).eq("id", session.user.id);
    setProfile(prev => ({ ...prev, letterboxd_username: null }));
    setLetterboxdLastSync(null);
    showToast("Letterboxd disconnected");
  };

  // ════════════════════════════════════════════════
  // GOODREADS
  // ════════════════════════════════════════════════

  const syncGoodreads = async (grUserId, uid, manual = false) => {
    if (!grUserId || !uid || goodreadsLock.current) return;
    goodreadsLock.current = true;
    setGoodreadsSyncing(true);

    try {
      const edgeUrl = `https://api.mymantl.app/functions/v1/goodreads-rss?user_id=${encodeURIComponent(grUserId)}&shelf=read&t=${Date.now()}`;
      const res = await fetch(edgeUrl);
      const data = await res.json();

      if (!res.ok || data.error) {
        console.error("[Goodreads] Edge function error:", data.error || res.status);
        showToast(data.error || "Couldn't reach Goodreads");
        goodreadsLock.current = false;
        setGoodreadsSyncing(false);
        return;
      }

      const rssText = data.contents;
      if (!rssText) {
        showToast("No RSS content — check user ID");
        goodreadsLock.current = false;
        setGoodreadsSyncing(false);
        return;
      }

      const parser = new DOMParser();
      const xml = parser.parseFromString(rssText, "text/xml");
      const items = xml.querySelectorAll("item");

      console.log(`[Goodreads] RSS returned ${items.length} items`);

      if (items.length === 0) {
        showToast("No entries found — check your Goodreads user ID and that your profile is public");
        goodreadsLock.current = false;
        setGoodreadsSyncing(false);
        return;
      }

      const { data: existingBooks } = await supabase.from("user_books_v")
        .select("title, author").eq("user_id", uid);
      const existingTitleSet = new Set((existingBooks || []).map(b => `${b.title}::${b.author}`));

      const getTagText = (el, tagName) => {
        const nodes = el.getElementsByTagName(tagName);
        return nodes.length > 0 ? nodes[0].textContent?.trim() || null : null;
      };

      const workQueue = [];
      const maxSync = 100;

      for (const item of items) {
        if (workQueue.length >= maxSync) break;
        const title = getTagText(item, "title");
        if (!title) continue;
        const authorName = getTagText(item, "author_name")?.trim() || null;
        const bookId = getTagText(item, "book_id");
        const userRating = getTagText(item, "user_rating");
        const rating = userRating ? parseInt(userRating) : null;
        const numPages = getTagText(item, "num_pages");
        const totalPages = numPages ? parseInt(numPages) : null;
        const userReadAt = getTagText(item, "user_read_at");
        const coverUrl = getTagText(item, "book_large_image_url") || getTagText(item, "book_medium_image_url") || getTagText(item, "book_image_url");
        const isbn = getTagText(item, "isbn");

        const dedupKey = `${title}::${authorName}`;
        if (existingTitleSet.has(dedupKey)) continue;
        existingTitleSet.add(dedupKey);
        workQueue.push({ title, author: authorName, bookId, rating: rating || null, totalPages, userReadAt, coverUrl, isbn });
      }

      console.log(`[Goodreads] ${workQueue.length} new books to sync`);

      let synced = 0;
      const BATCH_SIZE = 6;

      const processBook = async ({ title, author, rating, userReadAt, coverUrl, isbn }) => {
        let finishedAt = null;
        if (userReadAt) {
          try { finishedAt = new Date(userReadAt).toISOString(); } catch (e) {}
        }
        const cleanCover = coverUrl && !coverUrl.includes("nophoto") ? coverUrl : null;
        const mediaId = await upsertMediaLog(uid, {
          mediaType: "book",
          isbn: isbn || null,
          title, creator: author,
          posterPath: cleanCover,
          rating: rating || null,
          watchedAt: finishedAt || new Date().toISOString(),
          source: "goodreads",
          status: "finished",
        });
        if (!mediaId) { console.error("[Goodreads] upsert_media_log failed for", title); return null; }
        return title;
      };

      for (let i = 0; i < workQueue.length; i += BATCH_SIZE) {
        const batch = workQueue.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(processBook));
        synced += results.filter(Boolean).length;
      }

      setGoodreadsLastSync(new Date());
      if (synced > 0) {
        showToast(`Synced ${synced} book${synced !== 1 ? "s" : ""} from Goodreads`);
        await loadShelves(uid);
      } else if (manual) {
        showToast("Goodreads up to date ✓");
      }
    } catch (e) {
      console.error("[Goodreads] Sync error:", e);
      if (manual) showToast("Goodreads sync failed — check user ID");
    } finally {
      goodreadsLock.current = false;
      setGoodreadsSyncing(false);
    }
  };

  const connectGoodreads = async (grUserId) => {
    if (!grUserId || !session) return;
    const clean = grUserId.trim();
    const { error } = await supabase.from("profiles").update({ goodreads_user_id: clean }).eq("id", session.user.id);
    if (error) { showToast("Couldn't save user ID"); return; }
    setProfile(prev => ({ ...prev, goodreads_user_id: clean }));
    showToast("Goodreads connected! Syncing...");
    syncGoodreads(clean, session.user.id, true);
  };

  const disconnectGoodreads = async () => {
    if (!session) return;
    await supabase.from("profiles").update({ goodreads_user_id: null }).eq("id", session.user.id);
    setProfile(prev => ({ ...prev, goodreads_user_id: null }));
    setGoodreadsLastSync(null);
    showToast("Goodreads disconnected");
  };

  // ════════════════════════════════════════════════
  // STEAM
  // ════════════════════════════════════════════════

  const STEAM_EDGE = "https://api.mymantl.app/functions/v1/steam";

  const syncSteam = async (steamId, uid, manual = false) => {
    if (!steamId || !uid || steamLock.current) return;
    steamLock.current = true;
    setSteamSyncing(true);

    const steamHeaders = {};
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.access_token) steamHeaders["Authorization"] = `Bearer ${s.access_token}`;
    } catch {}

    try {
      const [recentRes, ownedRes] = await Promise.all([
        fetch(`${STEAM_EDGE}?action=recent&steam_id=${steamId}`, { headers: steamHeaders }),
        fetch(`${STEAM_EDGE}?action=owned&steam_id=${steamId}`, { headers: steamHeaders }),
      ]);
      const recentData = await recentRes.json();
      const ownedData = await ownedRes.json();

      if (recentData.error && ownedData.error) {
        console.error("[Steam] API error:", recentData.error || ownedData.error);
        if (manual) showToast("Steam sync failed — check your profile is public");
        steamLock.current = false;
        setSteamSyncing(false);
        return;
      }

      const recentGames = recentData.games || [];
      const recentIds = new Set(recentGames.map(g => String(g.appid)));
      const recentMap = {};
      recentGames.forEach(g => { recentMap[String(g.appid)] = g; });

      const MIN_HOURS = 5;
      const allOwned = (ownedData.games || [])
        .filter(g => (g.playtime_forever || 0) >= MIN_HOURS * 60)
        .sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0));

      if (allOwned.length === 0 && recentGames.length === 0) {
        if (manual) showToast("No Steam games found — is your profile public?");
        steamLock.current = false;
        setSteamSyncing(false);
        return;
      }

      const { data: existingGames } = await supabase.from("user_games_v")
        .select("steam_app_id, game_status").eq("user_id", uid).not("steam_app_id", "is", null);
      const existingMap = {};
      (existingGames || []).forEach(g => { existingMap[String(g.steam_app_id)] = g.game_status; });

      const { data: existingFeed } = await supabase.from("feed_activity")
        .select("title, item_title").eq("user_id", uid).eq("activity_type", "game");
      const feedSet = new Set((existingFeed || []).flatMap(f => [f.title, f.item_title].filter(Boolean)));

      let synced = 0;
      const maxSync = manual ? 50 : 10;

      for (const game of allOwned) {
        if (synced >= maxSync) break;

        const appId = String(game.appid);
        const title = game.name;
        const playtimeHours = Math.round((game.playtime_forever || 0) / 60 * 10) / 10;
        const isRecentlyPlayed = recentIds.has(appId);
        const playtime2Weeks = isRecentlyPlayed
          ? Math.round((recentMap[appId]?.playtime_2weeks || 0) / 60 * 10) / 10
          : 0;

        const coverUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`;
        const headerUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;

        let achievementsEarned = null, achievementsTotal = null;
        try {
          const achRes = await fetch(`${STEAM_EDGE}?action=achievements&steam_id=${steamId}&app_id=${appId}`, { headers: steamHeaders });
          const achData = await achRes.json();
          if (achData.achievements) {
            achievementsTotal = achData.achievements.length;
            achievementsEarned = achData.achievements.filter(a => a.achieved === 1).length;
          }
        } catch (e) {}

        let noteParts = [];
        if (playtimeHours > 0) noteParts.push(`${playtimeHours}h`);
        if (achievementsTotal > 0) noteParts.push(`${achievementsEarned}/${achievementsTotal} 🏆`);
        const notesStr = noteParts.length > 0 ? noteParts.join(" · ") : null;

        const isBeat = achievementsTotal > 0 && achievementsEarned === achievementsTotal;
        let status = isRecentlyPlayed ? "playing" : "backlog";
        if (isBeat) status = "beat";

        const existingStatus = existingMap[appId];
        if (existingStatus === "beat" && !isBeat) continue;
        if (existingStatus && existingStatus === status) continue;

        await logGame(uid,
          { title, steam_app_id: parseInt(appId) },
          coverUrl,
          { status, platform: "PC", steamAppId: parseInt(appId), notes: notesStr }
        );

        existingMap[appId] = status;

        if (isRecentlyPlayed && playtime2Weeks > 0) {
          const feedKey = `steam_${appId}_active`;
          if (!feedSet.has(feedKey) && !feedSet.has(title)) {
            const feedRow = {
              user_id: uid, activity_type: "game", action: "playing",
              title: feedKey, item_title: title, item_cover: headerUrl,
              metadata: {
                source: "steam", steam_app_id: appId,
                playtime_total: playtimeHours, playtime_2weeks: playtime2Weeks,
                achievements_earned: achievementsEarned, achievements_total: achievementsTotal,
              },
            };
            const { error: feedErr } = await supabase.from("feed_activity").insert(feedRow);
            if (feedErr) console.error("[Steam] Feed insert error:", feedErr.message);
            feedSet.add(feedKey);
            feedSet.add(title);
          }
        }

        synced++;
        if (synced % 5 === 0) await new Promise(r => setTimeout(r, 300));
      }

      if (synced > 0) {
        if (manual) showToast(`Synced ${synced} game${synced !== 1 ? "s" : ""} from Steam`);
        await loadShelves(uid);
      } else if (manual) {
        showToast("Steam up to date ✓");
      }
    } catch (e) {
      console.error("[Steam] Sync error:", e);
      if (manual) showToast("Steam sync failed");
    } finally {
      steamLock.current = false;
      setSteamSyncing(false);
    }
  };

  const connectSteam = async (input) => {
    if (!input || !session) return;
    const clean = input.trim();
    setSteamSyncing(true);

    let steamId = clean;
    if (!/^\d+$/.test(clean)) {
      const headers = {};
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
      } catch {}
      try {
        const res = await fetch(`${STEAM_EDGE}?action=resolve&vanity=${encodeURIComponent(clean)}`, { headers });
        const data = await res.json();
        if (data.success === 1 && data.steamid) {
          steamId = data.steamid;
        } else {
          showToast("Couldn't find that Steam profile — try your Steam ID number");
          setSteamSyncing(false);
          return;
        }
      } catch (e) {
        showToast("Couldn't reach Steam");
        setSteamSyncing(false);
        return;
      }
    }

    const { error } = await supabase.from("profiles").update({ steam_id: steamId }).eq("id", session.user.id);
    if (error) { showToast("Couldn't save"); setSteamSyncing(false); return; }
    setProfile(prev => ({ ...prev, steam_id: steamId }));
    showToast("Steam connected! Syncing...");
    setSteamSyncing(false);
    syncSteam(steamId, session.user.id, true);
  };

  const disconnectSteam = async () => {
    if (!session) return;
    await supabase.from("profiles").update({ steam_id: null }).eq("id", session.user.id);
    setProfile(prev => ({ ...prev, steam_id: null }));
    showToast("Steam disconnected");
  };

  // ════════════════════════════════════════════════
  // SESSION-ONCE AUTO-SYNC
  // ════════════════════════════════════════════════

  const runInitialSync = useCallback((profile, uid) => {
    console.log("[InitialSync] called", { hasSynced: hasSyncedThisSession.current, uid, closureUserId: userId, lbUsername: profile.letterboxd_username });
    if (hasSyncedThisSession.current) { console.log("[InitialSync] SKIPPED — already synced this session"); return; }
    const id = uid || userId;
    if (!id) { console.log("[InitialSync] SKIPPED — no userId available"); return; }
    if (profile.letterboxd_username) syncLetterboxd(profile.letterboxd_username, id);
    if (profile.goodreads_user_id) syncGoodreads(profile.goodreads_user_id, id);
    if (profile.steam_id) syncSteam(profile.steam_id, id);
    hasSyncedThisSession.current = true;
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // Letterboxd
    letterboxdSyncing, letterboxdLastSync, letterboxdSyncSignal, autoLogCompleteSignal,
    syncLetterboxd, connectLetterboxd, disconnectLetterboxd,
    // Goodreads
    goodreadsSyncing, goodreadsLastSync,
    syncGoodreads, connectGoodreads, disconnectGoodreads,
    // Steam
    steamSyncing,
    syncSteam, connectSteam, disconnectSteam,
    // Badge toasts
    syncBadgeToasts, setSyncBadgeToasts, syncBadgeTimers,
    // Auto-sync
    runInitialSync,
  };
}
