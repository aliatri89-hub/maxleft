/**
 * importUtils.js
 * Shared import logic for Letterboxd CSVs.
 * Used by both ImportCSVModal (settings) and UsernameSetup (onboarding).
 *
 * Lives in: src/utils/importUtils.js
 */

import { supabase, supabaseUrl } from "../supabase";

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
//  IMPORT MOVIES (Letterboxd) — streams via Edge Function
// ═══════════════════════════════════════════════════════════
//
// Sends pre-parsed items to the import-letterboxd-csv Edge Function,
// which handles all TMDB lookups, DB writes, community backfill, and
// badge checks entirely server-side. Fully backgroundable — the client
// just reads the NDJSON stream for progress updates.

export async function importMovies(items, userId, onProgress, { communityIds: providedCommunityIds } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");

  const fnUrl = `${supabaseUrl}/functions/v1/import-letterboxd-csv`;

  const response = await fetch(fnUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      items,
      communityIds: providedCommunityIds || [],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Import function error: ${err}`);
  }

  // Read NDJSON stream for live progress updates
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let count = 0;
  let errs = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep incomplete last line

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.type === "progress") {
          count = msg.count;
          errs = msg.errs;
          if (onProgress) onProgress(msg.progress, msg.total);
        } else if (msg.type === "done") {
          count = msg.count;
          errs = msg.errs;
        }
      } catch {
        // malformed line — ignore
      }
    }
  }

  return { count, errs };
}
