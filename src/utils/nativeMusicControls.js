/**
 * nativeMusicControls.js
 * Wrapper around @capgo/capacitor-media-session.
 * Uses the native MediaSession bridge on Android/iOS.
 * Every export is a silent no-op when running in a browser
 * (where the existing navigator.mediaSession code handles it).
 */
import { Capacitor } from "@capacitor/core";
import { MediaSession } from "@capgo/capacitor-media-session";

const _isNative = Capacitor.isNativePlatform();
const plugin = _isNative ? MediaSession : null;

// Track registered handlers so we can clean up
let _handlersRegistered = false;

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
  playbackRate,
}) {
  if (!plugin) return;
  try {
    // Set metadata (title, artist, artwork)
    const artwork = cover ? [{ src: cover, sizes: "512x512", type: "image/png" }] : [];
    await plugin.setMetadata({
      title: track || "",
      artist: artist || "MANTL",
      album: artist || "MANTL",
      artwork,
    });
    // Set position state (enables scrubber)
    if (duration && isFinite(duration)) {
      await plugin.setPositionState({
        duration: Math.max(0, duration),
        playbackRate: playbackRate || 1,
        position: Math.min(Math.max(0, elapsed || 0), duration),
      });
    }
    // Set playback state
    await plugin.setPlaybackState({
      playbackState: isPlaying ? "playing" : "paused",
    });
  } catch (e) {
    console.warn("[MusicControls] create failed:", e);
  }
}

/**
 * Update playing state and position on the existing notification.
 */
export async function updatePlaying(isPlaying, elapsed, duration, playbackRate) {
  if (!plugin) return;
  try {
    await plugin.setPlaybackState({
      playbackState: isPlaying ? "playing" : "paused",
    });
    if (duration && isFinite(duration)) {
      await plugin.setPositionState({
        duration: Math.max(0, duration),
        playbackRate: playbackRate || 1,
        position: Math.min(Math.max(0, elapsed || 0), duration),
      });
    }
  } catch (e) {
    console.warn("[MusicControls] updatePlaying failed:", e);
  }
}

/**
 * Tear down the native notification.
 */
export async function destroyControls() {
  if (!plugin) return;
  try {
    await plugin.setPlaybackState({ playbackState: "none" });
  } catch {}
}

/**
 * Register native action handlers (play, pause, skip, seek, stop).
 * Returns a cleanup function that removes all handlers.
 */
export async function registerActionHandlers({
  onPlay,
  onPause,
  onSeekForward,
  onSeekBackward,
  onSeekTo,
  onStop,
}) {
  if (!plugin) return null;
  try {
    const actions = [
      { action: "play", handler: onPlay },
      { action: "pause", handler: onPause },
      { action: "seekforward", handler: onSeekForward },
      { action: "seekbackward", handler: onSeekBackward },
      { action: "seekto", handler: onSeekTo },
      { action: "stop", handler: onStop },
    ];
    for (const { action, handler } of actions) {
      if (handler) {
        await plugin.setActionHandler({ action }, handler);
      }
    }
    _handlersRegistered = true;
    // Return cleanup function
    return async () => {
      for (const { action } of actions) {
        try {
          await plugin.setActionHandler({ action }, null);
        } catch {}
      }
      _handlersRegistered = false;
    };
  } catch (e) {
    console.warn("[MusicControls] registerActionHandlers failed:", e);
    return null;
  }
}
