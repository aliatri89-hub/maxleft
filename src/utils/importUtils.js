/**
 * importUtils.js
 * Shared import logic for Letterboxd, Goodreads, StoryGraph CSVs.
 * Used by both ImportCSVModal (settings) and UsernameSetup (onboarding).
 *
 * Lives in: src/utils/importUtils.js
 */

import { supabase } from "../supabase";
import { TMDB_IMG, searchTMDBRaw, fetchTMDBRaw, searchGoogleBooksRaw } from "./api";
import { upsertMediaLog, toPosterPath } from "./mediaWrite";

// ═══════════════════════════════════════════════════════════
//  CSV PARSING
// ═══════════════════════════════════════════════════════════

export function parseCSV(text) {
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

export function detectFormat(headers) {
  const h = headers.map(c => c.toLowerCase().trim());
  if (h.includes("book id") || h.includes("exclusive shelf")) return "goodreads";
  if (h.includes("read status") || (h.includes("star rating") && h.includes("title"))) return "storygraph";
  if (h.includes("letterboxd uri") || (h.includes("name") && h.includes("year") && h.includes("rewatch"))) return "letterboxd";
  return null;
}

export const FORMAT_LABELS = { goodreads: "Goodreads", storygraph: "StoryGraph", letterboxd: "Letterboxd" };

// ═══════════════════════════════════════════════════════════
//  ROW → ITEM PARSING (per format)
// ═══════════════════════════════════════════════════════════

export function parseRows(rows, headers, format) {
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

    if (format === "goodreads") {
      const shelf = get(row, "exclusive shelf");
      if (shelf === "to-read") continue;
      const title = get(row, "title");
      if (!title) continue;
      items.push({
        title,
        author: get(row, "author") || get(row, "author l-f") || null,
        rating: parseInt(get(row, "my rating")) || null,
        pages: parseInt(get(row, "number of pages")) || null,
        dateRead: get(row, "date read") || null,
        dateAdded: get(row, "date added") || null,
        isReading: shelf === "currently-reading",
        source: "goodreads",
      });
    } else if (format === "storygraph") {
      const status = get(row, "read status");
      if (status === "to-read") continue;
      const title = get(row, "title");
      if (!title) continue;
      items.push({
        title,
        author: get(row, "authors") || null,
        rating: parseFloat(get(row, "star rating")) || null,
        pages: parseInt(get(row, "number of pages")) || null,
        dateRead: get(row, "date read") || null,
        dateAdded: get(row, "date added") || null,
        isReading: status === "currently-reading",
        source: "storygraph",
      });
    } else if (format === "letterboxd") {
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

export async function deduplicateItems(items, format, userId) {
  // ── Books: unchanged — true dedup ──
  if (format !== "letterboxd") {
    const { data } = await supabase.from("books").select("title, author").eq("user_id", userId);
    const existingSet = new Set((data || []).map(b => `${b.title}::${b.author}`));

    let dupeCount = 0;
    const unique = items.filter(item => {
      const key = `${item.title}::${item.author}`;
      if (existingSet.has(key)) { dupeCount++; return false; }
      existingSet.add(key);
      return true;
    });

    return { unique, dupeCount };
  }

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

  // Check against user_media_logs (unified) with fallback to movies (legacy)
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
}

// ═══════════════════════════════════════════════════════════
//  IMPORT BOOKS (Goodreads / StoryGraph)
// ═══════════════════════════════════════════════════════════

export async function importBooks(items, userId, onProgress) {
  let count = 0, errs = 0;

  const safeDate = (str, fallback) => {
    if (!str) return fallback || null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? (fallback || null) : d.toISOString();
  };

  const fetchCover = async (title, author, retries = 3) => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const q = `${title} ${author || ""}`;
        const data = await searchGoogleBooksRaw(q, 1);
        if (data?.status === 429) {
          const wait = Math.pow(2, attempt + 1) * 1000;
          console.warn(`[Import] 429 rate limited, waiting ${wait / 1000}s... ("${title}")`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        if (!data || data.error) { console.warn(`[Import] Google Books error for "${title}"`); return null; }
        return data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail || null;
      } catch (e) { console.warn("[Import] Cover fetch error:", e); return null; }
    }
    console.warn(`[Import] Gave up on cover for "${title}" after ${retries} retries`);
    return null;
  };

  for (let i = 0; i < items.length; i += 10) {
    const chunk = items.slice(i, i + 10);

    // Fetch covers sequentially to avoid 429
    const covers = [];
    for (const b of chunk) {
      const cover = await fetchCover(b.title, b.author);
      covers.push(cover);
      await new Promise(r => setTimeout(r, 350));
    }

    const batch = chunk.map((b, j) => ({
      user_id: userId,
      habit_id: 0,
      title: b.title,
      author: b.author,
      total_pages: b.pages,
      current_page: b.isReading ? 0 : (b.pages || 0),
      cover_url: covers[j] || null,
      is_active: b.isReading,
      started_at: safeDate(b.dateAdded, new Date().toISOString()),
      finished_at: b.isReading ? null : safeDate(b.dateRead),
      rating: (b.rating && b.rating > 0) ? b.rating : null,
      source: b.source,
    }));

    const { error } = await supabase.from("books").insert(batch);
    if (error) { console.error("[Import] Book batch error:", error); errs += batch.length; }
    else count += batch.length;

    if (onProgress) onProgress(Math.min(i + 10, items.length), items.length);

    // Rate limit pause
    if ((i + 1) % 8 === 0) await new Promise(r => setTimeout(r, 1000));
  }

  return { count, errs };
}
