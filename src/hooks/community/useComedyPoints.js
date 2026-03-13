import { useState, useCallback, useRef } from "react";
import { apiProxy } from "../../utils/api";

/**
 * useComedyPoints — Blank Check comedy points system.
 *
 * Checks if a logged film's PRIMARY genre is Comedy (TMDB genre_id 35).
 * If so, awards a random 1–1000 comedy points with a coin-drop toast.
 * Persists the running total in localStorage.
 *
 * Genre check priority:
 *   1. item.extra_data.genre_ids[0] (TMDB int array, most common)
 *   2. item.extra_data.genres[0].id  (TMDB detailed format)
 *   3. Live TMDB API lookup via apiProxy (fallback for unseeded items)
 */

const COMEDY_GENRE_ID = 35;
const LS_KEY_PREFIX = "mantl_comedy_pts_";

function getStoredPoints(userId) {
  if (!userId) return 0;
  try {
    return parseInt(localStorage.getItem(`${LS_KEY_PREFIX}${userId}`), 10) || 0;
  } catch {
    return 0;
  }
}

function storePoints(userId, total) {
  if (!userId) return;
  try {
    localStorage.setItem(`${LS_KEY_PREFIX}${userId}`, String(total));
  } catch {}
}

export function useComedyPoints(userId) {
  const [comedyToast, setComedyToast] = useState(null); // { points, visible }
  const [totalPoints, setTotalPoints] = useState(() => getStoredPoints(userId));
  const pendingRef = useRef(false); // prevent double-fires

  /**
   * checkAndAward(item) — Call after a successful film log.
   * Returns the awarded points (0 if not a comedy).
   */
  const checkAndAward = useCallback(async (item) => {
    if (!item || pendingRef.current) return 0;
    if (item.media_type && item.media_type !== "film") return 0;

    pendingRef.current = true;

    try {
      const primaryGenreId = await getPrimaryGenreId(item);
      if (primaryGenreId !== COMEDY_GENRE_ID) return 0;

      // Comedy! Roll the dice
      const points = Math.floor(Math.random() * 1000) + 1;

      // Persist
      const newTotal = getStoredPoints(userId) + points;
      storePoints(userId, newTotal);
      setTotalPoints(newTotal);

      // Show toast
      setComedyToast({ points, visible: true });

      return points;
    } finally {
      pendingRef.current = false;
    }
  }, [userId]);

  const dismissToast = useCallback(() => {
    setComedyToast(null);
  }, []);

  return {
    checkAndAward,
    comedyToast,
    dismissToast,
    totalPoints,
  };
}

// ── Genre resolution ────────────────────────────────────────

async function getPrimaryGenreId(item) {
  // 1. Check extra_data.genre_ids (array of TMDB int IDs)
  const genreIds = item.extra_data?.genre_ids;
  if (Array.isArray(genreIds) && genreIds.length > 0) {
    return genreIds[0];
  }

  // 2. Check extra_data.genres (array of {id, name} objects)
  const genres = item.extra_data?.genres;
  if (Array.isArray(genres) && genres.length > 0 && genres[0].id) {
    return genres[0].id;
  }

  // 3. Fallback: live TMDB lookup
  if (item.tmdb_id) {
    try {
      const data = await apiProxy("tmdb_details", {
        tmdb_id: String(item.tmdb_id),
        type: "movie",
        append: "",
      });
      if (data?.genres?.[0]?.id) {
        return data.genres[0].id;
      }
    } catch {}
  }

  return null;
}
