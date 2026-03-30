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

export async function importMovies(items, userId, onProgress) {
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
    if (allTmdbIds.length > 0) {
      const ratingMap = new Map(importedTmdbIds.map(f => [f.tmdbId, f]));

      const { data: matchedItems } = await supabase
        .from("community_items")
        .select("id, tmdb_id")
        .in("tmdb_id", allTmdbIds);

      if (matchedItems?.length) {
        const matchedItemIds = matchedItems.map(i => i.id);

        const { data: existingProgress } = await supabase
          .from("community_user_progress")
          .select("item_id")
          .eq("user_id", userId)
          .in("item_id", matchedItemIds);

        const existingSet = new Set((existingProgress || []).map(p => p.item_id));

        const newRows = matchedItems
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
          await supabase
            .from("community_user_progress")
            .upsert(newRows, { onConflict: "user_id,item_id" });
        }
      }
    }
  } catch (e) {
    console.warn("[importMovies] Community progress backfill failed:", e.message);
  }

  return { count, errs };
}


