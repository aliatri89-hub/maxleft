/**
 * importUtils.js
 * Shared import logic for Letterboxd CSVs.
 * Used by both ImportCSVModal (settings) and UsernameSetup (onboarding).
 *
 * Lives in: src/utils/importUtils.js
 */

import { supabase } from "../supabase";
import { TMDB_IMG, searchTMDBRaw, fetchTMDBRaw } from "./api";
import { upsertMediaLog, toPosterPath } from "./mediaWrite";

// ═══════════════════════════════════════════════════════════
//  CSV PARSING
// ═══════════════════════════════════════════════════════════

function parseCSV(text) {
  const result = [];
  let current = "";
  let fields = [];
  let inQuotes = false;
  for (let i = 0; i <= text.length; i++) {
    const ch = text[i];
    if (i === text.length || ((ch === "\n" || ch === "\r") && !inQuotes)) {
      if (current.length > 0 || fields.length > 0) { fields.push(current); current = ""; }
      if (fields.length > 0) result.push([...fields]);
      fields = [];
      if (ch === "\r" && text[i + 1] === "\n") i++;
    } else if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current); current = "";
    } else {
      current += ch;
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════
//  FORMAT DETECTION
// ═══════════════════════════════════════════════════════════

function detectFormat(headers) {
  const h = headers.map(c => c.toLowerCase().trim());
  if (h.includes("letterboxd uri") || (h.includes("name") && h.includes("year") && h.includes("rewatch"))) return "letterboxd";
  return null;
}

export const FORMAT_LABELS = { letterboxd: "Letterboxd" };

// ═══════════════════════════════════════════════════════════
//  ROW → ITEM PARSING (per format)
// ═══════════════════════════════════════════════════════════

function parseRows(rows, headers, format) {
  const headerMap = {};
  headers.forEach((h, i) => { headerMap[h.trim().toLowerCase()] = i; });
  const get = (row, key) => {
    const idx = headerMap[key];
    return idx !== undefined ? (row[idx] || "").trim() : "";
  };

  const items = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    if (format === "letterboxd") {
      const title = get(row, "name");
      if (!title) continue;
      const ratingRaw = parseFloat(get(row, "rating"));
      items.push({
        title,
        year: parseInt(get(row, "year")) || null,
        rating: ratingRaw ? Math.round(ratingRaw) : null,
        ratingHalf: ratingRaw || null,
        watchedDate: get(row, "date") || get(row, "watched date") || null,
        rewatch: get(row, "rewatch")?.toLowerCase() === "yes",
        source: "letterboxd",
      });
    }
  }
  return items;
}

// ═══════════════════════════════════════════════════════════
//  DEDUP AGAINST EXISTING DATA
// ═══════════════════════════════════════════════════════════

async function deduplicateItems(items, format, userId) {
  // ── Letterboxd: consolidate multiple watches into one item per movie ──
  // Group by title::year — count watches, collect dates, keep latest rating
  const groups = new Map();
  for (const item of items) {
    const key = `${item.title}::${item.year}`;
    if (!groups.has(key)) {
      groups.set(key, { ...item, watchDates: [], watchCount: 0 });
    }
    const group = groups.get(key);
    group.watchCount++;
    if (item.watchedDate) {
      group.watchDates.push(item.watchedDate);
    }
    // Keep latest rating (non-null)
    if (item.rating && (!group.rating || item.watchedDate > group.watchedDate)) {
      group.rating = item.rating;
      group.ratingHalf = item.ratingHalf;
    }
    // Keep latest watchedDate as the primary
    if (item.watchedDate && (!group.watchedDate || item.watchedDate > group.watchedDate)) {
      group.watchedDate = item.watchedDate;
    }
  }

  // Check against user_media_logs (unified)
  let existingMap = new Map();
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

  const consolidated = [];
  let dupeCount = 0;

  for (const [key, group] of groups) {
    const ex = existingMap.get(key);
    if (ex) {
      // Movie exists — only include if CSV has more watches (new data)
      if (group.watchCount > (ex.watch_dates || []).length) {
        // Merge: CSV dates are authoritative for the full history
        consolidated.push(group);
      } else {
        dupeCount++;
      }
    } else {
      // New movie
      consolidated.push(group);
    }
  }

  return { unique: consolidated, dupeCount };
}

// ═══════════════════════════════════════════════════════════
//  FULL FILE → PARSED ITEMS PIPELINE
// ═══════════════════════════════════════════════════════════

export async function parseFile(file, userId) {
  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length < 2) return { error: "CSV appears empty", format: null, items: [], dupeCount: 0 };

  const headers = rows[0];
  const format = detectFormat(headers);
  if (!format) return { error: "Couldn't detect CSV format", format: null, items: [], dupeCount: 0 };

  const rawItems = parseRows(rows, headers, format);
  const { unique, dupeCount } = await deduplicateItems(rawItems, format, userId);

  return { error: null, format, items: unique, dupeCount };
}

// ═══════════════════════════════════════════════════════════
//  IMPORT MOVIES (Letterboxd)
// ═══════════════════════════════════════════════════════════

export async function importMovies(items, userId, onProgress, { communityIds: providedCommunityIds } = {}) {
  let count = 0, errs = 0;
  const CONCURRENCY = 6;
  const importedTmdbIds = []; // track successfully imported tmdb_ids

  const processItem = async (m, tmdbId) => {
    try {
      const results = await searchTMDBRaw(m.title, m.year || null);
      const match = (results || [])[0];
      if (!match) { errs++; return; }

      const watchDates = (m.watchDates || [])
        .filter(Boolean)
        .map(d => {
          try { return new Date(d).toISOString().slice(0, 10); }
          catch { return null; }
        })
        .filter(Boolean)
        .sort();

      if (watchDates.length === 0) {
        watchDates.push(new Date().toISOString().slice(0, 10));
      }

      const watchedAt = m.watchedDate
        ? new Date(m.watchedDate + "T12:00:00Z").toISOString()
        : new Date().toISOString();

      const mediaId = await upsertMediaLog(userId, {
        mediaType: "film",
        tmdbId: match.id,
        title: m.title,
        year: m.year || (match.release_date ? parseInt(match.release_date) : null),
        creator: null,
        posterPath: match.poster_path || null,
        backdropPath: match.backdrop_path || null,
        runtime: null,
        genre: null,
        rating: m.ratingHalf || m.rating || null,
        watchedAt,
        watchedDate: m.watchedDate || null,
        source: "letterboxd",
        watchCount: watchDates.length,
        watchDates,
      });

      if (!mediaId) { errs++; return; }
      count++;
      importedTmdbIds.push({ tmdbId: match.id, rating: m.ratingHalf || m.rating || null, watchedAt });
    } catch (e) { errs++; }
  };

  // Process in concurrent batches
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(m => processItem(m)));
    await new Promise(r => setTimeout(r, 150)); // avoid TMDB rate limit
    if (onProgress) onProgress(Math.min(i + CONCURRENCY, items.length), items.length);
  }

  // ── Backfill community_user_progress ──────────────────────
  // Match imported tmdb_ids to community_items and write progress rows
  try {
    const allTmdbIds = importedTmdbIds.map(f => f.tmdbId);
    console.log(`[importMovies] Backfill: ${allTmdbIds.length} tmdb_ids to match against community_items`);

    if (allTmdbIds.length > 0) {
      const ratingMap = new Map(importedTmdbIds.map(f => [f.tmdbId, f]));

      // Batch the community_items lookup to avoid URL length limits
      const BATCH = 100;
      const allMatchedItems = [];
      for (let i = 0; i < allTmdbIds.length; i += BATCH) {
        const chunk = allTmdbIds.slice(i, i + BATCH);
        const { data, error } = await supabase
          .from("community_items")
          .select("id, tmdb_id")
          .in("tmdb_id", chunk);
        if (error) console.error("[importMovies] community_items query error:", error.message);
        if (data) allMatchedItems.push(...data);
      }

      console.log(`[importMovies] Backfill: ${allMatchedItems.length} community_items matched`);

      if (allMatchedItems.length > 0) {
        // Batch the existing progress lookup too
        const matchedItemIds = allMatchedItems.map(i => i.id);
        const allExisting = [];
        for (let i = 0; i < matchedItemIds.length; i += BATCH) {
          const chunk = matchedItemIds.slice(i, i + BATCH);
          const { data } = await supabase
            .from("community_user_progress")
            .select("item_id")
            .eq("user_id", userId)
            .in("item_id", chunk);
          if (data) allExisting.push(...data);
        }

        const existingSet = new Set(allExisting.map(p => p.item_id));
        console.log(`[importMovies] Backfill: ${existingSet.size} already have progress, ${allMatchedItems.length - existingSet.size} new`);

        const newRows = allMatchedItems
          .filter(item => !existingSet.has(item.id))
          .map(item => {
            const filmData = ratingMap.get(item.tmdb_id);
            return {
              user_id: userId,
              item_id: item.id,
              status: "completed",
              rating: filmData?.rating ? Math.round(filmData.rating) : null,
              completed_at: filmData?.watchedAt || new Date().toISOString(),
              listened_with_commentary: false,
              brown_arrow: false,
              updated_at: new Date().toISOString(),
            };
          });

        if (newRows.length > 0) {
          // Batch the upsert too
          for (let i = 0; i < newRows.length; i += BATCH) {
            const chunk = newRows.slice(i, i + BATCH);
            const { error: upsertErr } = await supabase
              .from("community_user_progress")
              .upsert(chunk, { onConflict: "user_id,item_id" });
            if (upsertErr) console.error("[importMovies] Backfill upsert error:", upsertErr.message);
          }
          console.log(`[importMovies] Backfill: wrote ${newRows.length} community_user_progress rows`);
        } else {
          console.log("[importMovies] Backfill: no new rows to write (all already existed)");
        }
      }
    }
  } catch (e) {
    console.error("[importMovies] Community progress backfill FAILED:", e.message, e);
  }

  // ── Award badges earned by the import ──────────────────────
  // Normally badges are checked in useBadges when visiting a community.
  // After a bulk import we need to check here so badges are awarded immediately.
  try {
    console.log("[importMovies] Checking for earned badges...");

    // 1. Get subscribed communities (use provided IDs during onboarding, since subscriptions aren't seeded yet)
    let communityIds = providedCommunityIds || [];
    if (communityIds.length === 0) {
      const { data: subs } = await supabase
        .from("user_community_subscriptions")
        .select("community_id")
        .eq("user_id", userId);
      communityIds = (subs || []).map(s => s.community_id);
    }
    if (communityIds.length === 0) { console.log("[importMovies] No community subscriptions, skipping badge check"); }

    if (communityIds.length > 0) {
      // 2. Get all active badges + already earned
      const { data: allBadges } = await supabase
        .from("badges")
        .select("id, name, image_url, accent_color, community_id, badge_type, miniseries_id, media_type_filter")
        .in("community_id", communityIds)
        .eq("is_active", true);

      const { data: earnedRows } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", userId)
        .in("badge_id", (allBadges || []).map(b => b.id));

      const earnedSet = new Set((earnedRows || []).map(r => r.badge_id));
      const unearnedBadges = (allBadges || []).filter(b => !earnedSet.has(b.id));
      console.log(`[importMovies] ${(allBadges || []).length} badges total, ${earnedSet.size} already earned, ${unearnedBadges.length} to check`);

      let awarded = 0;
      const BATCH = 100;

      // 3. Check miniseries_completion badges
      const miniseriesBadges = unearnedBadges.filter(b => b.badge_type === "miniseries_completion" && b.miniseries_id);
      if (miniseriesBadges.length > 0) {
        const msIds = [...new Set(miniseriesBadges.map(b => b.miniseries_id))];
        const allItems = [];
        for (let i = 0; i < msIds.length; i += BATCH) {
          const { data } = await supabase.from("community_items").select("id, tmdb_id, miniseries_id, media_type").in("miniseries_id", msIds.slice(i, i + BATCH));
          if (data) allItems.push(...data);
        }

        const allTmdbIds = [...new Set(allItems.map(i => i.tmdb_id).filter(Boolean))];
        const completedTmdbSet = new Set();
        for (let i = 0; i < allTmdbIds.length; i += BATCH) {
          const { data } = await supabase
            .from("community_user_progress")
            .select("community_items!inner(tmdb_id)")
            .eq("user_id", userId).eq("status", "completed")
            .in("community_items.tmdb_id", allTmdbIds.slice(i, i + BATCH));
          (data || []).forEach(r => { if (r.community_items?.tmdb_id) completedTmdbSet.add(r.community_items.tmdb_id); });
        }

        for (const badge of miniseriesBadges) {
          const items = allItems.filter(i => i.miniseries_id === badge.miniseries_id && (!badge.media_type_filter || i.media_type === badge.media_type_filter));
          const required = [...new Set(items.map(i => i.tmdb_id).filter(Boolean))];
          if (required.length > 0 && required.every(id => completedTmdbSet.has(id))) {
            const { error } = await supabase.from("user_badges").insert({ user_id: userId, badge_id: badge.id });
            if (!error || error.message.includes("duplicate")) {
              awarded++;
              await supabase.from("user_notifications").upsert({
                user_id: userId, notif_type: "badge_earned", title: "Badge unlocked",
                body: `You earned "${badge.name}"`, image_url: badge.image_url || null,
                payload: { type: "badge_earned", badge_id: badge.id, community_id: badge.community_id },
                ref_key: `badge_earned:${badge.id}`,
              }, { onConflict: "user_id,ref_key", ignoreDuplicates: true });
            }
          }
        }
      }

      // 4. Check item_set_completion badges
      const itemSetBadges = unearnedBadges.filter(b => b.badge_type === "item_set_completion");
      if (itemSetBadges.length > 0) {
        const badgeIds = itemSetBadges.map(b => b.id);
        const allBadgeItems = [];
        for (let i = 0; i < badgeIds.length; i += BATCH) {
          const { data } = await supabase.from("badge_items").select("badge_id, community_items!inner(tmdb_id)").in("badge_id", badgeIds.slice(i, i + BATCH));
          if (data) allBadgeItems.push(...data);
        }

        const badgeItemsMap = {};
        allBadgeItems.forEach(r => {
          if (!badgeItemsMap[r.badge_id]) badgeItemsMap[r.badge_id] = [];
          if (r.community_items?.tmdb_id) badgeItemsMap[r.badge_id].push(r.community_items.tmdb_id);
        });

        const allSetTmdbIds = [...new Set(Object.values(badgeItemsMap).flat())];
        const completedSetTmdb = new Set();
        for (let i = 0; i < allSetTmdbIds.length; i += BATCH) {
          const { data } = await supabase
            .from("community_user_progress")
            .select("community_items!inner(tmdb_id)")
            .eq("user_id", userId).eq("status", "completed")
            .in("community_items.tmdb_id", allSetTmdbIds.slice(i, i + BATCH));
          (data || []).forEach(r => { if (r.community_items?.tmdb_id) completedSetTmdb.add(r.community_items.tmdb_id); });
        }

        for (const badge of itemSetBadges) {
          const required = [...new Set((badgeItemsMap[badge.id] || []).filter(Boolean))];
          if (required.length > 0 && required.every(id => completedSetTmdb.has(id))) {
            const { error } = await supabase.from("user_badges").insert({ user_id: userId, badge_id: badge.id });
            if (!error || error.message.includes("duplicate")) {
              awarded++;
              await supabase.from("user_notifications").upsert({
                user_id: userId, notif_type: "badge_earned", title: "Badge unlocked",
                body: `You earned "${badge.name}"`, image_url: badge.image_url || null,
                payload: { type: "badge_earned", badge_id: badge.id, community_id: badge.community_id },
                ref_key: `badge_earned:${badge.id}`,
              }, { onConflict: "user_id,ref_key", ignoreDuplicates: true });
            }
          }
        }
      }

      console.log(`[importMovies] Badge check complete: ${awarded} badges awarded`);

      // ── Badge digest notification — "Your library has a head start!" ──
      // Collect progress for unearned badges to show how close the user is.
      // Only fires during the import (first time), not on re-imports.
      try {
        const progressEntries = [];

        // Re-check unearned badges (excluding just-awarded ones) for partial progress
        const { data: freshEarned } = await supabase
          .from("user_badges").select("badge_id").eq("user_id", userId)
          .in("badge_id", unearnedBadges.map(b => b.id));
        const freshEarnedSet = new Set((freshEarned || []).map(r => r.badge_id));
        const stillUnearned = unearnedBadges.filter(b => !freshEarnedSet.has(b.id));

        for (const badge of stillUnearned) {
          let required = [], current = 0;
          if (badge.badge_type === "miniseries_completion" && badge.miniseries_id) {
            const { data: items } = await supabase.from("community_items")
              .select("tmdb_id").eq("miniseries_id", badge.miniseries_id);
            required = [...new Set((items || []).map(i => i.tmdb_id).filter(Boolean))];
            const { data: done } = required.length > 0
              ? await supabase.from("community_user_progress")
                  .select("community_items!inner(tmdb_id)")
                  .eq("user_id", userId).eq("status", "completed")
                  .in("community_items.tmdb_id", required)
              : { data: [] };
            current = new Set((done || []).map(r => r.community_items?.tmdb_id).filter(Boolean)).size;
          }
          if (current > 0 && current < required.length) {
            progressEntries.push({ badge, current, total: required.length });
          }
        }

        if (progressEntries.length > 0) {
          progressEntries.sort((a, b) => (b.current / b.total) - (a.current / a.total));
          const count = progressEntries.length + awarded; // include just-earned badges in the count
          const topPct = Math.round((progressEntries[0].current / progressEntries[0].total) * 100);
          const title = "Your library has a head start!";
          const body = topPct >= 50
            ? `Your synced films already count toward ${count} badge${count > 1 ? "s" : ""} — you're over halfway to one. Tap to explore.`
            : `Your synced films already count toward ${count} badge${count > 1 ? "s" : ""}. Tap to see how close you are.`;

          await supabase.from("user_notifications").upsert({
            user_id: userId, notif_type: "badge_digest", title, body,
            image_url: progressEntries[0]?.badge?.image_url || null,
            payload: { type: "badge_digest", badge_count: count, top_pct: topPct },
            ref_key: "badge_digest:sync",
            created_at: new Date().toISOString(),
          }, { onConflict: "user_id,ref_key", ignoreDuplicates: true });
          console.log(`[importMovies] Badge digest: ${count} badges with progress, top at ${topPct}%`);
        }
      } catch (e) {
        console.warn("[importMovies] Badge digest failed:", e.message);
      }
    }
  } catch (e) {
    console.error("[importMovies] Badge check failed:", e.message, e);
  }

  return { count, errs };
}


