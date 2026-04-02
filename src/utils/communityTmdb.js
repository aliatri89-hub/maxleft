// Community cover fetching — TMDB for films + shows
// All API calls now go through the api-proxy edge function (no keys in client code).
//
// OPTIMIZATION: After fetching a cover from an external API, the raw poster_path
// is written back to community_items in the DB. This means the SECOND user to visit
// a community never hits TMDB — covers load instantly from the DB.

import { apiProxy } from "./api";
import { supabase } from "../supabase";

const TMDB_IMG = "https://image.tmdb.org/t/p";

const CACHE_KEY = "mantl_cover_cache";
const CACHE_VERSION = 6; // keep at 6 — write-back is server-side, no client cache change needed
const MAX_CACHE_ENTRIES = 6000; // 8+ communities × ~500-1000 items each

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
  }

  if (url) coverCache[key] = url;
  return url;
};

// ─── Batch-fetch all covers with parallel rate limiting ───────
export const fetchCoversForItems = async (items, onUpdate) => {
  const uncached = items.filter((i) => {
    return !coverCache[cacheKey(i)];
  });

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

// ═══════════════════════════════════════════════════════════
// LOGO FETCHING — TMDB movie/show logos for VHS tape cards
// ═══════════════════════════════════════════════════════════

const LOGO_CACHE_KEY = "mantl_logo_cache";
const LOGO_CACHE_VERSION = 4;
const NULL_LOGO_TTL_MS = 3 * 24 * 60 * 60 * 1000;       // Re-check "no logo" entries after 3 days
const SOFT_LOGO_TTL_MS = 60 * 60 * 1000;                  // Re-check network failures after 1 hour

let logoCache = {};
try {
  const stored = localStorage.getItem(LOGO_CACHE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed._v === LOGO_CACHE_VERSION) {
      delete parsed._v;
      // Evict soft misses (network failures) on every app init so they retry immediately
      // rather than waiting for the 1hr TTL. True TMDB misses (no soft flag) are kept.
      for (const k of Object.keys(parsed)) {
        if (parsed[k]?.soft) delete parsed[k];
      }
      logoCache = parsed;
    }
  }
} catch {}

const saveLogoCache = () => {
  try {
    const entries = Object.entries(logoCache);
    if (entries.length > 2000) {
      logoCache = Object.fromEntries(entries.slice(-2000));
    }
    localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify({ ...logoCache, _v: LOGO_CACHE_VERSION }));
  } catch {
    try { localStorage.removeItem(LOGO_CACHE_KEY); } catch {}
  }
};

// Public getter
export const getLogoUrl = (tmdbId) => {
  if (!tmdbId) return null;
  const key = `logo:${tmdbId}`;
  const val = logoCache[key];
  if (!val) return null;
  // String = URL, object with miss = no logo (check TTL)
  if (typeof val === "string") return val;
  return null;
};

// Returns true if we've already checked this tmdb_id (and the check is still fresh)
export const isLogoChecked = (tmdbId) => {
  if (!tmdbId) return true;
  const key = `logo:${tmdbId}`;
  const val = logoCache[key];
  if (val === undefined) return false;
  // String URL = definitely checked
  if (typeof val === "string") return true;
  // Object with miss = check if TTL expired
  if (val && val.miss && val.ts) {
    const ttl = val.soft ? SOFT_LOGO_TTL_MS : NULL_LOGO_TTL_MS;
    if (Date.now() - val.ts > ttl) {
      delete logoCache[key]; // Expired, allow re-check
      return false;
    }
    return true;
  }
  // Legacy null entries from old cache version — treat as unchecked
  return false;
};

// Evict all soft misses from the live in-memory cache — called on pull-to-refresh
// so network failures from this session are retried immediately without an app restart.
export const clearSoftLogoMisses = () => {
  let changed = false;
  for (const k of Object.keys(logoCache)) {
    if (logoCache[k]?.soft) { delete logoCache[k]; changed = true; }
  }
  if (changed) saveLogoCache();
};

// Clear ALL logo misses (soft + hard) — used on explicit pull-to-refresh
export const clearAllLogoMisses = () => {
  let changed = false;
  for (const k of Object.keys(logoCache)) {
    if (logoCache[k]?.miss) { delete logoCache[k]; changed = true; }
  }
  if (changed) saveLogoCache();
};

// Fetch a single logo — returns full URL or null
export const fetchMovieLogo = async (tmdbId, mediaType = "film") => {
  if (!tmdbId) return null;
  const key = `logo:${tmdbId}`;
  if (isLogoChecked(tmdbId)) return getLogoUrl(tmdbId);

  try {
    const type = mediaType === "show" ? "tv" : "movie";
    // Use tmdb_images endpoint — it includes include_image_language=en,null
    // which catches logos with iso_639_1: null that tmdb_details misses
    const data = await apiProxy("tmdb_images", {
      tmdb_id: String(tmdbId),
      type,
    });

    // True TMDB miss (got a valid response but no logos) → cache for 3 days
    const cacheMiss = () => { logoCache[key] = { miss: true, ts: Date.now() }; saveLogoCache(); };
    // Network/proxy failure → cache for only 1 hour so native retries after cold-start
    const cacheNetworkFailure = () => { logoCache[key] = { miss: true, ts: Date.now(), soft: true }; saveLogoCache(); };

    // tmdb_images returns { logos, backdrops, posters } at top level
    if (!data || data.error) {
      // null data = network failure (edge function unreachable on native cold-start)
      cacheNetworkFailure();
      return null;
    }
    if (!data.logos) {
      cacheMiss();
      return null;
    }

    // Prefer English logo, then no-language, sorted by width (largest first)
    const logos = data.logos;
    const english = logos
      .filter(l => l.iso_639_1 === "en")
      .sort((a, b) => (b.width || 0) - (a.width || 0) || (b.vote_average || 0) - (a.vote_average || 0));
    const noLang = logos
      .filter(l => !l.iso_639_1)
      .sort((a, b) => (b.width || 0) - (a.width || 0) || (b.vote_average || 0) - (a.vote_average || 0));

    const best = english[0] || noLang[0];
    if (!best?.file_path) {
      cacheMiss();
      return null;
    }

    const url = `${TMDB_IMG}/w500${best.file_path}`;
    logoCache[key] = url;
    saveLogoCache();
    return url;
  } catch {
    // Network/exception failure → short TTL so native retries after cold-start
    logoCache[key] = { miss: true, ts: Date.now(), soft: true };
    saveLogoCache();
    return null;
  }
};

// Batch fetch logos for feed items — same pattern as fetchCoversForItems
export const fetchLogosForItems = async (items, onUpdate) => {
  const unchecked = items.filter(item => !isLogoChecked(item.tmdb_id));
  if (unchecked.length === 0) return;

  const BATCH = 4;
  for (let i = 0; i < unchecked.length; i += BATCH) {
    const batch = unchecked.slice(i, i + BATCH);
    await Promise.all(batch.map(item =>
      fetchMovieLogo(item.tmdb_id, item.media_type || "film")
    ));

    saveLogoCache();
    onUpdate?.();

    if (i + BATCH < unchecked.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
};
