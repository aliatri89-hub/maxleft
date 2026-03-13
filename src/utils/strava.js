// ─── STRAVA CONFIG & HELPERS ─────────────────────────────────
import { supabase } from "../supabase";

export const STRAVA_CLIENT_ID = "203965";
export const STRAVA_REDIRECT_URI = "https://mymantl.app";

export const stravaAuth = () => {
  window.location.href = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(STRAVA_REDIRECT_URI)}&approval_prompt=auto&scope=activity:read`;
};

export const stravaApi = async (action, _session, extraBody = null) => {
  const { data: { session: s } } = await supabase.auth.getSession();
  if (!s?.access_token) {
    console.warn(`[Strava] No session for action: ${action}`);
    return null;
  }
  try {
    const { data, error } = await supabase.functions.invoke("strava", {
      body: { action, ...(extraBody || {}) },
    });
    if (error) {
      console.error(`[Strava] ${action} error:`, error);
      return null;
    }
    return data;
  } catch (e) {
    console.error(`[Strava] ${action} exception:`, e);
    return null;
  }
};

export const formatPace = (avgSpeed) => {
  if (!avgSpeed || avgSpeed === 0) return null;
  const paceSeconds = 1000 / avgSpeed;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")} /km`;
};

export const formatDuration = (seconds) => {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
};

export const formatDistance = (meters) => {
  if (!meters) return "";
  const km = meters / 1000;
  return km >= 1 ? `${km.toFixed(2)} km` : `${Math.round(meters)} m`;
};

export const decodePolyline = (encoded) => {
  if (!encoded) return [];
  const points = [];
  let i = 0, lat = 0, lng = 0;
  while (i < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
};
