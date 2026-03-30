// ─── API HELPERS ─────────────────────────────────────────────
// All external API calls now go through the api-proxy edge function.
// Keys live in Supabase secrets, never in client code.

import { supabase } from "../supabase";

const TMDB_IMG = "https://image.tmdb.org/t/p";

export { TMDB_IMG };

// ─── Edge function caller (replaces direct fetch to TMDB/RAWG/Google Books) ───
// Uses supabase.functions.invoke() so the user's JWT is attached automatically.
// Returns the parsed JSON body, or null on error.
// Retries once on timeout — the first call warms a cold edge function,
// the retry hits the warm instance and succeeds instantly.
const API_PROXY_TIMEOUT_FIRST = 15000;  // 15s — generous for cold starts
const API_PROXY_TIMEOUT_RETRY = 10000;  // 10s — warm instance should be fast

async function _invokeWithTimeout(action, params, timeout) {
  const result = await Promise.race([
    supabase.functions.invoke("api-proxy", {
      body: { action, ...params },
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`api-proxy timeout: ${action}`)), timeout)
    ),
  ]);
  const { data, error } = result;
  if (error) throw new Error(error.message || error);
  return data;
}

export const apiProxy = async (action, params = {}) => {
  try {
    return await _invokeWithTimeout(action, params, API_PROXY_TIMEOUT_FIRST);
  } catch (firstErr) {
    // Retry once — if the first call timed out on a cold start, the
    // edge function is now warm and the retry should resolve quickly.
    try {
      console.warn(`[api-proxy] ${action} failed, retrying:`, firstErr.message);
      return await _invokeWithTimeout(action, params, API_PROXY_TIMEOUT_RETRY);
    } catch (retryErr) {
      console.error(`[api-proxy] ${action} retry failed:`, retryErr.message);
      return null;
    }
  }
};

// ─── TMDB ─────────────────────────────────────────────────────

export const searchTMDB = async (query, type = "movie") => {
  if (!query || query.length < 2) return [];
  try {
    const data = await apiProxy("tmdb_search", { query, type });
    if (!data?.results) return [];
    return data.results.slice(0, 8).map((item) => ({
      tmdbId: item.id,
      title: item.title || item.name,
      year: (item.release_date || item.first_air_date || "").slice(0, 4),
      poster: item.poster_path ? `${TMDB_IMG}/w342${item.poster_path}` : null,
      posterSmall: item.poster_path ? `${TMDB_IMG}/w154${item.poster_path}` : null,
      backdrop: item.backdrop_path ? `${TMDB_IMG}/w780${item.backdrop_path}` : null,
      overview: item.overview || "",
      genre: (item.genre_ids || []).slice(0, 2),
      type,
    }));
  } catch (err) {
    console.error("TMDB search error:", err);
    return [];
  }
};

export const fetchTMDBDetails = async (tmdbId, type = "movie") => {
  try {
    const data = await apiProxy("tmdb_details", { tmdb_id: String(tmdbId), type });
    if (!data || data.error) return {};
    if (type === "movie") {
      const director = (data.credits?.crew || []).find((c) => c.job === "Director");
      return {
        director: director?.name || "",
        runtime: data.runtime || null,
        genre: (data.genres || []).map((g) => g.name).join(", "),
      };
    } else {
      const seasons = (data.seasons || [])
        .filter((s) => s.season_number > 0)
        .map((s) => ({
          number: s.season_number,
          episodes: s.episode_count,
          name: s.name,
        }));
      return {
        totalEpisodes: data.number_of_episodes || null,
        totalSeasons: data.number_of_seasons || null,
        genre: (data.genres || []).map((g) => g.name).join(", "),
        seasons,
      };
    }
  } catch (err) {
    console.error("TMDB details error:", err);
    return {};
  }
};

// ─── Standalone TMDB detail fetch (used by Letterboxd sync in App.jsx) ────────
// Returns the raw TMDB response (poster_path, credits, etc.) so the caller
// can extract exactly what it needs. This replaces the inline fetch() calls
// in syncLetterboxd that previously used the hardcoded TMDB_KEY.
export const fetchTMDBRaw = async (tmdbId, type = "movie", append = "credits") => {
  const data = await apiProxy("tmdb_details", {
    tmdb_id: String(tmdbId),
    type,
    append,
  });
  return data; // raw TMDB response or null
};

// Standalone TMDB search (returns raw results array) — used by Letterboxd sync,
// ImportCSVModal, AdminItemEditor, AddItemTool, RSSSyncTool, NPPDashboard
export const searchTMDBRaw = async (query, year = null, type = "movie") => {
  const params = { query, type };
  if (year) params.year = String(year);
  const data = await apiProxy("tmdb_search", params);
  return data?.results || [];
};

// Watch providers (used by every community LogModal)
export const fetchTMDBWatchProviders = async (tmdbId, type = "movie") => {
  const data = await apiProxy("tmdb_watch_providers", {
    tmdb_id: String(tmdbId),
    type,
  });
  return data; // raw TMDB watch/providers response or null
};

// ─── Image compression (unchanged — no API key involved) ──────

export const compressImage = (file, maxWidth = 1200, quality = 0.82) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src); // fix: prevent memory leak
      let w = img.width,
        h = img.height;
      if (w <= maxWidth) {
        resolve(file);
        return;
      }
      const scale = maxWidth / w;
      w = maxWidth;
      h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          const compressed = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
            type: "image/jpeg",
          });
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };
    img.src = URL.createObjectURL(file);
  });

// ─── Safe Supabase wrapper (unchanged) ────────────────────────

export const sb = async (query, onToast, msg) => {
  const { data, error, count } = await query;
  if (error) {
    if (onToast) onToast(msg || "Something went wrong");
    console.error(error);
  }
  return { data, error, count };
};
