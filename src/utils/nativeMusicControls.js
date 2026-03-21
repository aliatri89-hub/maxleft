/**
 * nativeMusicControls.js
 * Thin wrapper around capacitor-music-controls-plugin-new.
 * Lazy-loads the plugin only on native platforms; every export
 * is a silent no-op when running in a browser.
 */
import { Capacitor } from "@capacitor/core";

let _plugin = null;
const _isNative = Capacitor.isNativePlatform();

async function getPlugin() {
  if (!_isNative) return null;
  if (!_plugin) {
    try {
      const mod = await import("capacitor-music-controls-plugin-new");
      _plugin = mod.CapacitorMusicControls;
    } catch (e) {
      console.warn("[MusicControls] plugin not available:", e);
      return null;
    }
  }
  return _plugin;
}

/**
 * Create (or re-create) the native media notification.
 * Call on new episode, duration change, or speed change.
 */
export async function createControls({
  track,
  artist,
  cover,
  isPlaying,
  duration,
  elapsed,
}) {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    await plugin.create({
      track: track || "",
      artist: artist || "MANTL",
      album: artist || "MANTL",
      cover: cover || "",
      hasPrev: false,
      hasNext: false,
      hasClose: true,
      hasSkipForward: true,
      hasSkipBackward: true,
      skipForwardInterval: 30,
      skipBackwardInterval: 15,
      duration: Math.floor(duration || 0),
      elapsed: Math.floor(elapsed || 0),
      isPlaying: isPlaying ?? true,
      dismissable: true,
      hasScrubbing: true,
      ticker: track ? `Now playing "${track}"` : "",
      notificationIcon: "ic_notification",
    });
  } catch (e) {
    console.warn("[MusicControls] create failed:", e);
  }
}

/**
 * Update playing state and elapsed time on the existing notification.
 */
export async function updatePlaying(isPlaying, elapsed) {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    await plugin.updateState({
      isPlaying,
      elapsed: Math.floor(elapsed || 0),
    });
  } catch (e) {
    console.warn("[MusicControls] updateState failed:", e);
  }
}

/**
 * Tear down the native notification.
 */
export async function destroyControls() {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    await plugin.destroy();
  } catch {}
}

/**
 * Subscribe to native control events (play, pause, skip, destroy).
 * Returns the listener handle (call .remove() to unsub) or null on web.
 */
export async function listenControls(handler) {
  const plugin = await getPlugin();
  if (!plugin) return null;
  try {
    return await plugin.addListener("controlsNotification", handler);
  } catch {
    return null;
  }
}
