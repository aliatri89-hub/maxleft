// Community cover fetching — TMDB for films + shows, Google Books for books, RAWG for games
// All API calls now go through the api-proxy edge function (no keys in client code).
//
// OPTIMIZATION: After fetching a cover from an external API, the raw poster_path
// is written back to community_items in the DB. This means the SECOND user to visit
// a community never hits TMDB/Google Books/RAWG — covers load instantly from the DB.

import { apiProxy } from "./api";
import { supabase } from "../supabase";

const TMDB_IMG = "https://image.tmdb.org/t/p";

const CACHE_KEY = "mantl_cover_cache";
const CACHE_VERSION = 6; // keep at 6 — write-back is server-side, no client cache change needed
const MAX_CACHE_ENTRIES = 3000; // NPP alone is ~1000, 8+ communities need headroom

// ─── Persistent cache: load from localStorage on init ────────
let coverCache = {};
try {
  const stored = localStorage.getItem(CACHE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed._v === CACHE_VERSION) {
      delete parsed._v;
      coverCache = parsed;
    }
  }
} catch {}

const saveCache = () => {
  try {
    const entries = Object.entries(coverCache);
    if (entries.length > MAX_CACHE_ENTRIES) {
      // Keep the most recently added entries
      coverCache = Object.fromEntries(entries.slice(-MAX_CACHE_ENTRIES));
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...coverCache, _v: CACHE_VERSION }));
  } catch {
    // Quota exceeded — clear stale cache so it can rebuild
    try { localStorage.removeItem(CACHE_KEY); } catch {}
  }
};

// ─── Public getter ───────────────────────────────────────────
export const getCoverUrl = (item) => {
  const key = cacheKey(item);
  return coverCache[key] || null;
};

// Get a snapshot of the entire cache (for initializing React state)
export const getCoverCacheSnapshot = () => ({ ...coverCache });

// For backwards compat with CommunityItemCard
export const getPosterUrl = (tmdbId) => {
  const key = `tmdb:${tmdbId}`;
  return coverCache[key] || null;
};

// ─── Single poster fetch (for feed fallback) ─────────────────
// Checks cache first, then hits TMDB if needed. Returns full URL.
export const fetchSinglePoster = async (tmdbId, mediaType = "film") => {
  if (!tmdbId) return null;
  const key = mediaType === "show" ? `tmdb_tv:${tmdbId}` : `tmdb:${tmdbId}`;
  if (coverCache[key]) return coverCache[key];

  const fetchFn = mediaType === "show" ? fetchShowPosterPath : fetchFilmPosterPath;
  const rawPath = await fetchFn(tmdbId);
  if (!rawPath) return null;

  const url = `${TMDB_IMG}/w342${rawPath}`;
  coverCache[key] = url;
  saveCache();
  return url;
};

// ─── Cache key by media type ─────────────────────────────────
const cacheKey = (item) => {
  if (item.media_type === "film") return `tmdb:${item.tmdb_id}`;
  if (item.media_type === "show") return `tmdb_tv:${item.tmdb_id}`;
  if (item.media_type === "book") return `book:${item.isbn || item.title}`;
  if (item.media_type === "game") return `game:${item.title}`;
  return `other:${item.id}`;
};

// ─── DB write-back queue ─────────────────────────────────────
// Collects {id, poster_path} pairs during batch fetches, flushes
// to Supabase via bulk RPC so the DB has the resolved path for
// all future visitors.

let pendingWriteBacks = [];

const flushWriteBacks = async () => {
  if (pendingWriteBacks.length === 0) return;
  const batch = pendingWriteBacks.splice(0);
  try {
    await supabase.rpc("bulk_update_poster_paths", {
      p_updates: batch,
    });
  } catch (err) {
    // Non-fatal — covers still work from client cache, DB just won't
    // have the path for next visitor. RPC might not exist yet.
    console.warn("[CoverCache] Write-back failed:", err.message);
  }
};

// ─── TMDB (films) — returns raw poster_path for DB write-back ─
const fetchFilmPosterPath = async (tmdbId) => {
  if (!tmdbId) return null;
  try {
    const data = await apiProxy("tmdb_details", {
      tmdb_id: String(tmdbId),
      type: "movie",
      append: "",
    });
    if (!data || data.error) return null;
    return data.poster_path || null; // raw path like /abc123.jpg
  } catch {
    return null;
  }
};

// ─── TMDB (TV shows) — returns raw poster_path ───────────────
const fetchShowPosterPath = async (tmdbId) => {
  if (!tmdbId) return null;
  try {
    const data = await apiProxy("tmdb_details", {
      tmdb_id: String(tmdbId),
      type: "tv",
      append: "",
    });
    if (!data || data.error) return null;
    return data.poster_path || null;
  } catch {
    return null;
  }
};

// ─── Image validation helper (for fallback sources only) ─────
const testImageUrl = (url) => new Promise((resolve) => {
  if (!url) return resolve(false);
  const img = new Image();
  img.onload = () => resolve(img.naturalWidth > 50 && img.naturalHeight > 50);
  img.onerror = () => resolve(false);
  img.src = url;
});

// ─── Google Books (books via ISBN) ───────────────────────────
const fetchBookCover = async (item) => {
  // For books: extra_data.cover_image is the source of truth (seeded by us)
  // Check it BEFORE poster_path to avoid stale write-backs overriding good URLs
  if (item.extra_data?.cover_image) return item.extra_data.cover_image;
  if (item.poster_path) return item.poster_path;

  // 3. Try Open Library by ISBN — validate to skip placeholders
  if (item.isbn) {
    const olUrl = `https://covers.openlibrary.org/b/isbn/${item.isbn}-L.jpg`;
    const olReal = await testImageUrl(olUrl);
    if (olReal) return olUrl;
  }

  // 4. Last resort: Google Books API live lookup
  const query = item.isbn
    ? `isbn:${item.isbn}`
    : `intitle:${item.title}+inauthor:${item.creator || ""}`;
  try {
    const data = await apiProxy("google_books", { query, max_results: "1" });
    if (!data || data.error) return null;
    const vol = data.items?.[0]?.volumeInfo;
    if (!vol?.imageLinks) return null;
    const url = (vol.imageLinks.thumbnail || vol.imageLinks.smallThumbnail || "")
      .replace("&edge=curl", "")
      .replace("http://", "https://")
      .replace("zoom=1", "zoom=2");
    return url || null;
  } catch {
    return null;
  }
};

// ─── RAWG (games) ────────────────────────────────────────────
const fetchGameCover = async (item) => {
  if (item.poster_path) return item.poster_path;
  const title = item.title || item;
  if (!title) return null;
  try {
    const data = await apiProxy("rawg_search", { query: title, page_size: "1" });
    if (!data || data.error) return null;
    return data.results?.[0]?.background_image || null;
  } catch {
    return null;
  }
};

// ─── Fetch single item cover ─────────────────────────────────
const fetchCover = async (item) => {
  const key = cacheKey(item);
  if (coverCache[key]) return coverCache[key];

  let url = null;

  if (item.media_type === "film") {
    if (item.poster_path) {
      url = `${TMDB_IMG}/w342${item.poster_path}`;
    } else {
      const rawPath = await fetchFilmPosterPath(item.tmdb_id);
      if (rawPath) {
        url = `${TMDB_IMG}/w342${rawPath}`;
        if (item.id) pendingWriteBacks.push({ id: item.id, poster_path: rawPath });
      }
    }
  } else if (item.media_type === "show") {
    if (item.poster_path) {
      url = `${TMDB_IMG}/w342${item.poster_path}`;
    } else {
      const rawPath = await fetchShowPosterPath(item.tmdb_id);
      if (rawPath) {
        url = `${TMDB_IMG}/w342${rawPath}`;
        if (item.id) pendingWriteBacks.push({ id: item.id, poster_path: rawPath });
      }
    }
  } else if (item.media_type === "book") {
    url = await fetchBookCover(item);
    // Only write back if it came from a live API lookup (not from extra_data)
    if (url && item.id && !item.poster_path && !item.extra_data?.cover_image) {
      pendingWriteBacks.push({ id: item.id, poster_path: url });
    }
  } else if (item.media_type === "game") {
    url = await fetchGameCover(item);
    // Write back full URL for games
    if (url && item.id && !item.poster_path) {
      pendingWriteBacks.push({ id: item.id, poster_path: url });
    }
  }

  if (url) coverCache[key] = url;
  return url;
};

// ─── Batch-fetch all covers with parallel rate limiting ───────
export const fetchCoversForItems = async (items, onUpdate) => {
  const uncached = items.filter((i) => !coverCache[cacheKey(i)]);

  // If everything is cached, return immediately — no state update needed.
  // Calling onUpdate here would create a new object reference every time,
  // triggering React re-renders and image remounts for no reason.
  if (uncached.length === 0) {
    return { ...coverCache };
  }

  const BATCH = 4;
  for (let i = 0; i < uncached.length; i += BATCH) {
    const batch = uncached.slice(i, i + BATCH);
    await Promise.all(batch.map((item) => fetchCover(item)));

    // Progressive update + persist to localStorage
    saveCache();
    onUpdate?.({ ...coverCache });

    // Flush DB write-backs accumulated during this batch (fire-and-forget)
    flushWriteBacks();

    // Rate limit between batches (not after the last one)
    if (i + BATCH < uncached.length) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  return { ...coverCache };
};
