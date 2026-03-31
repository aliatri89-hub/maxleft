import { useState, useRef, useCallback } from "react";
import { supabase } from "../supabase";
import { TMDB_IMG, fetchTMDBRaw, searchTMDBRaw } from "../utils/api";
import { toLogTimestamp } from "../utils/helpers";
import { upsertMediaLog, toPosterPath } from "../utils/mediaWrite";
import { useShelves } from "../contexts/ShelvesProvider";

/**
 * useIntegrationSync — Letterboxd sync logic.
 *
 * Extracted from App.jsx. Owns all sync state (syncing flags, last sync times,
 * lock refs). Gets loadShelves from ShelvesProvider context.
 */
export function useIntegrationSync({ session, showToast, setProfile }) {
  const { loadShelves } = useShelves();
  const userId = session?.user?.id;

  // ── Sync state ──
  const [letterboxdSyncing, setLetterboxdSyncing] = useState(false);
  const [letterboxdLastSync, setLetterboxdLastSync] = useState(null);
  const [letterboxdSyncSignal, setLetterboxdSyncSignal] = useState(null);
  const [autoLogCompleteSignal, setAutoLogCompleteSignal] = useState(null);

  // ── Lock refs (synchronous — prevents race conditions) ──
  const letterboxdLock = useRef(false);
  const hasSyncedThisSession = useRef(false);

  // ════════════════════════════════════════════════
  // AUTO-LOG + BADGE CHECK (shared by Letterboxd sync)
  // ════════════════════════════════════════════════

  const autoLogAndCheckBadges = async (syncedFilms, uid, isFirstImport = false) => {
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

      const badgeProgress = unearned.map(badge => {
        const items = (allItems || []).filter(i => {
          if (i.miniseries_id !== badge.miniseries_id) return false;
          if (badge.media_type_filter && i.media_type !== badge.media_type_filter) return false;
          return true;
        });
        const total = items.length;
        const current = items.filter(i => progressSet.has(i.id)).length;
        return { badge, current, total };
      }).filter(t => t.current > 0)
        .sort((a, b) => (b.current / b.total) - (a.current / a.total));

      if (!badgeProgress.length) return;

      // ── Badge digest notification — FIRST IMPORT ONLY ──
      // Only fires when this is the user's first Letterboxd sync (letterboxd_last_synced_at
      // was null before this run). Subsequent syncs skip this entirely so users who import
      // 1000 films and later add more don't keep seeing the onboarding digest.
      // ignoreDuplicates: true is an extra safety net — the row should never exist for a
      // genuine first import, but guards against edge cases (e.g. re-connecting Letterboxd).
      if (!isFirstImport) return;

      const count = badgeProgress.length;
      const topPct = Math.round((badgeProgress[0].current / badgeProgress[0].total) * 100);
      const title = "Your library has a head start!";
      const body = topPct >= 50
        ? `Your synced films already count toward ${count} badge${count > 1 ? "s" : ""} — you're over halfway to one. Tap to explore.`
        : `Your synced films already count toward ${count} badge${count > 1 ? "s" : ""}. Tap to see how close you are.`;

      supabase.from("user_notifications").upsert({
        user_id: uid,
        notif_type: "badge_digest",
        title,
        body,
        image_url: badgeProgress[0]?.badge?.image_url || null,
        payload: { type: "badge_digest", badge_count: count, top_pct: topPct },
        ref_key: "badge_digest:sync",
        created_at: new Date().toISOString(),
      }, { onConflict: "user_id,ref_key", ignoreDuplicates: true }).then(({ error }) => {
        if (error) console.error("[AutoLog] Badge digest notification error:", error.message);
      });
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
    if (!username || !uid || letterboxdLock.current) {
      return;
    }
    letterboxdLock.current = true;
    setLetterboxdSyncing(true);

    // Detect first import BEFORE anything changes — if last_synced_at is null,
    // this is the user's very first Letterboxd sync (the onboarding import).
    // We capture this now so the badge digest only fires in that scenario.
    let isFirstImport = false;
    try {
      const { data: syncMeta } = await supabase
        .from("profiles")
        .select("letterboxd_last_synced_at")
        .eq("id", uid)
        .single();
      isFirstImport = !syncMeta?.letterboxd_last_synced_at;
    } catch (_) {
      // If we can't check, default to false — safer to skip the digest than spam it
    }

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
        const reviewUrl = getTagText(item, "link") || null;

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
        workQueue.push({ title, year, rating, ratingFromTitle, watchedDate, dedupKey, rssTmdbId: rssTmdbId ? parseInt(rssTmdbId) : null, reviewUrl });
      }

      if (workQueue.length === 0 && rewatchQueue.length === 0) {
        // Log first few RSS items to see what was skipped
        const rssItems = [];
        for (const item of items) {
          const ft = getTagText(item, "filmTitle");
          const yr = getTagText(item, "filmYear");
          if (ft) rssItems.push(`${ft.trim()}::${yr}`);
          if (rssItems.length >= 5) break;
        }
      }

      const processMovie = async ({ title, year, ratingFromTitle, watchedDate, rssTmdbId, reviewUrl }) => {
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
          extraData: reviewUrl ? { letterboxd_url: reviewUrl } : {},
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

            const rewatchTimestamp = new Date(
              new Date(toLogTimestamp(rw.newDate)).getTime()
            ).toISOString();
            const existingSet = new Set((existingProgress || []).map(p => p.item_id));

            // Update rows that already exist
            if (existingSet.size > 0) {
              const updatePayload = {
                rewatch_count: newCount - 1,
                rewatch_dates: rewatchDatesOnly,
                completed_at: rewatchTimestamp,
                updated_at: rewatchTimestamp,
              };
              if (rw.rating) updatePayload.rating = Math.round(rw.rating);
              const { error: updateErr } = await supabase
                .from("community_user_progress")
                .update(updatePayload)
                .eq("user_id", uid)
                .in("item_id", [...existingSet]);
              if (updateErr) console.error("[Letterboxd] Community rewatch update error:", updateErr.message);
            }

            // Create rows for any community items with no prior progress
            const missingItems = communityItems.filter(ci => !existingSet.has(ci.id));
            if (missingItems.length > 0) {
              const newRows = missingItems.map(ci => ({
                user_id: uid,
                item_id: ci.id,
                status: "completed",
                rating: rw.rating ? Math.round(rw.rating) : null,
                rewatch_count: newCount - 1,
                rewatch_dates: rewatchDatesOnly,
                completed_at: rewatchTimestamp,
                listened_with_commentary: false,
                brown_arrow: false,
                updated_at: rewatchTimestamp,
              }));
              const { error: insertErr } = await supabase
                .from("community_user_progress")
                .upsert(newRows, { onConflict: "user_id,item_id" });
              if (insertErr) console.error("[Letterboxd] Community rewatch insert error:", insertErr.message);
            }
          }
        } catch (e) {
          console.warn(`[Letterboxd] Community rewatch propagation failed for "${rw.title}":`, e.message);
        }
      }
      if (rewatchCount > 0) {
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
          // Fire coverage check (same as cron path) — fire-and-forget
          fetch("https://api.mymantl.app/functions/v1/check-new-film-coverage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: uid,
              new_films: syncedFilms.map(f => ({ tmdb_id: f.tmdbId, title: f.title })),
            }),
          }).then(r => r.json())
            .catch(err => console.warn("[Letterboxd] Coverage check failed:", err));

          await autoLogAndCheckBadges(syncedFilms, uid, isFirstImport);
          setAutoLogCompleteSignal(Date.now());
        } else {
          setTimeout(async () => {
            setAutoLogCompleteSignal(Date.now());
          }, 3200);
        }
        return { synced, rewatchCount };
      } else if (manual) {
        showToast("Letterboxd up to date ✓");
      } else {
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
    const { error } = await supabase.from("profiles").update({ letterboxd_username: null }).eq("id", session.user.id);
    if (error) { showToast("Couldn't disconnect Letterboxd"); return; }
    setProfile(prev => ({ ...prev, letterboxd_username: null }));
    setLetterboxdLastSync(null);
    showToast("Letterboxd disconnected");
  };

  // ════════════════════════════════════════════════
  // SESSION-ONCE AUTO-SYNC
  // ════════════════════════════════════════════════

  const runInitialSync = useCallback((profile, uid, { onLetterboxdSync } = {}) => {
    if (hasSyncedThisSession.current) return;
    const id = uid || userId;
    if (!id) return;
    const letterboxdFn = onLetterboxdSync || syncLetterboxd;
    if (profile.letterboxd_username) letterboxdFn(profile.letterboxd_username, id);
    hasSyncedThisSession.current = true;
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // Letterboxd
    letterboxdSyncing, letterboxdLastSync, letterboxdSyncSignal, autoLogCompleteSignal,
    syncLetterboxd, connectLetterboxd, disconnectLetterboxd,
    // Auto-sync
    runInitialSync,
  };
}
