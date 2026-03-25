/**
 * nativeAudioBridge.js
 *
 * Unified audio abstraction for MANTL.
 *
 * - Native (Android/iOS): Uses @mediagrid/capacitor-native-audio
 *   → plays via Media3/ExoPlayer with a foreground service.
 *   → notification & lock-screen controls handled natively.
 *   → background playback survives WebView throttling.
 *
 * - Web: Uses a plain HTML <audio> element.
 *   → navigator.mediaSession for browser media keys.
 *
 * Both expose the same event-driven interface so AudioPlayerProvider
 * doesn't care which back-end is running.
 */
import { Capacitor } from "@capacitor/core";

const IS_NATIVE = Capacitor.isNativePlatform();

// Dynamically import the native plugin only on native to avoid web bundling issues
let AudioPlayer = null;
if (IS_NATIVE) {
  import("@mediagrid/capacitor-native-audio").then((mod) => {
    AudioPlayer = mod.AudioPlayer;
  });
}

// ── Event emitter mixin ──────────────────────────────────────

function createEmitter() {
  const _listeners = {};
  return {
    on(event, fn) {
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push(fn);
    },
    off(event, fn) {
      if (!_listeners[event]) return;
      _listeners[event] = _listeners[event].filter((f) => f !== fn);
    },
    emit(event, data) {
      if (!_listeners[event]) return;
      _listeners[event].forEach((fn) => {
        try { fn(data); } catch (e) { console.warn(`[AudioBridge] listener error on '${event}':`, e); }
      });
    },
    removeAllListeners() {
      Object.keys(_listeners).forEach((k) => delete _listeners[k]);
    },
  };
}

// ── Native bridge ────────────────────────────────────────────

function createNativeBridge() {
  const emitter = createEmitter();
  const AUDIO_ID = "mantl_podcast";
  let _created = false;
  let _currentTime = 0;
  let _duration = 0;
  let _playing = false;
  let _rate = 1;
  let _pollId = null;
  let _listenerCleanups = [];
  let _pendingSeek = 0;      // seek position queued for after onAudioReady
  let _readyResolve = null;  // resolves load() promise when audio is ready
  // Session recovery — stored so we can re-load if Android kills the service
  let _lastUrl = null;
  let _lastMeta = {};
  let _recovering = false;

  // Poll currentTime while playing (~500ms)
  function startPolling() {
    stopPolling();
    _pollId = setInterval(async () => {
      if (!AudioPlayer || !_created) return;
      try {
        const { currentTime } = await AudioPlayer.getCurrentTime({ audioId: AUDIO_ID });
        _currentTime = currentTime;
        emitter.emit("timeupdate", { currentTime: _currentTime, duration: _duration });
      } catch {}
    }, 500);
  }

  function stopPolling() {
    if (_pollId) { clearInterval(_pollId); _pollId = null; }
  }

  async function registerListeners() {
    // Clean up any previous listeners
    _listenerCleanups.forEach((fn) => { try { fn(); } catch {} });
    _listenerCleanups = [];

    const onReady = await AudioPlayer.onAudioReady({ audioId: AUDIO_ID }, async () => {
      try {
        const { duration } = await AudioPlayer.getDuration({ audioId: AUDIO_ID });
        _duration = duration;
        emitter.emit("durationchange", { duration: _duration });

        // Apply pending seek if resuming from a saved position
        if (_pendingSeek > 0) {
          const seekTime = Math.round(_pendingSeek);
          await AudioPlayer.seek({ audioId: AUDIO_ID, timeInSeconds: seekTime });
          _currentTime = seekTime;
          _pendingSeek = 0;
        }

        emitter.emit("canplay");

        // Resolve the load() promise so caller can chain .play()
        if (_readyResolve) {
          _readyResolve();
          _readyResolve = null;
        }
      } catch (e) {
        console.warn("[AudioBridge] getDuration/seek failed in onAudioReady:", e);
        // Still resolve so we don't hang forever
        if (_readyResolve) { _readyResolve(); _readyResolve = null; }
      }
    });
    _listenerCleanups.push(() => onReady?.remove?.());

    const onEnd = await AudioPlayer.onAudioEnd({ audioId: AUDIO_ID }, () => {
      _playing = false;
      stopPolling();
      emitter.emit("ended");
    });
    _listenerCleanups.push(() => onEnd?.remove?.());

    const onStatus = await AudioPlayer.onPlaybackStatusChange({ audioId: AUDIO_ID }, ({ status }) => {
      if (status === "playing" && !_playing) {
        _playing = true;
        emitter.emit("play");
        startPolling();
      } else if (status === "paused" && _playing) {
        _playing = false;
        stopPolling();
        emitter.emit("pause");
      } else if (status === "stopped") {
        _playing = false;
        stopPolling();
        emitter.emit("pause");
      }
    });
    _listenerCleanups.push(() => onStatus?.remove?.());

    // Focus callbacks (useful for UI sync)
    const onGain = await AudioPlayer.onAppGainsFocus({ audioId: AUDIO_ID }, async () => {
      // Sync state when app returns to foreground
      if (!_created) return;
      try {
        const { currentTime } = await AudioPlayer.getCurrentTime({ audioId: AUDIO_ID });
        _currentTime = currentTime;
        const { isPlaying } = await AudioPlayer.isPlaying({ audioId: AUDIO_ID });
        if (isPlaying !== _playing) {
          _playing = isPlaying;
          emitter.emit(isPlaying ? "play" : "pause");
          if (isPlaying) startPolling(); else stopPolling();
        }
        emitter.emit("timeupdate", { currentTime: _currentTime, duration: _duration });
        emitter.emit("focusregained");
      } catch {}
    });
    _listenerCleanups.push(() => onGain?.remove?.());
  }

  return {
    ...emitter,

    get currentTime() { return _currentTime; },
    get duration() { return _duration; },
    get playing() { return _playing; },
    get rate() { return _rate; },
    get bufferedPct() { return 0; }, // native handles buffering internally

    /**
     * Load a new episode. Destroys previous source if any.
     * Resolves when audio is ready to play (buffered + seeked).
     * @param {string} url - Audio URL
     * @param {object} meta - { title, artist, artwork }
     * @param {object} opts - { seekTo, rate }
     */
    async load(url, meta = {}, opts = {}) {
      if (!AudioPlayer) {
        // Plugin not yet loaded — wait a tick and retry
        await new Promise((r) => setTimeout(r, 100));
        if (!AudioPlayer) {
          console.error("[AudioBridge] Native AudioPlayer not available");
          emitter.emit("error", { message: "Native audio plugin not loaded" });
          return;
        }
      }

      // Destroy previous source
      if (_created) {
        try {
          stopPolling();
          await AudioPlayer.destroy({ audioId: AUDIO_ID });
        } catch {}
        _created = false;
      }

      _currentTime = opts.seekTo || 0;
      _duration = 0;
      _playing = false;
      _rate = opts.rate || 1;
      _pendingSeek = opts.seekTo || 0;
      _lastUrl = url;
      _lastMeta = meta;
      emitter.emit("waiting");

      try {
        await AudioPlayer.create({
          audioId: AUDIO_ID,
          audioSource: url,
          friendlyTitle: meta.title || "MANTL",
          artistName: meta.artist || "MANTL",
          albumTitle: meta.artist || "MANTL",
          artworkSource: meta.artwork || "",
          useForNotification: true,
          isBackgroundMusic: false,
          loop: false,
          showSeekBackward: true,
          showSeekForward: true,
          seekBackwardTime: 15,
          seekForwardTime: 15,
        });
        _created = true;

        // Create a promise that resolves when audio is ready + seeked
        // Safety timeout prevents hanging if onAudioReady never fires
        const readyPromise = new Promise((resolve) => {
          _readyResolve = resolve;
          setTimeout(() => {
            if (_readyResolve) {
              console.warn("[AudioBridge] onAudioReady timeout — resolving anyway");
              _readyResolve();
              _readyResolve = null;
            }
          }, 15000);
        });

        await registerListeners();

        // Set rate before initializing
        if (_rate !== 1) {
          await AudioPlayer.setRate({ audioId: AUDIO_ID, rate: _rate });
        }

        await AudioPlayer.initialize({ audioId: AUDIO_ID });
        // Wait for onAudioReady → getDuration → seek → resolve
        await readyPromise;
      } catch (e) {
        console.error("[AudioBridge] load failed:", e);
        _readyResolve = null;
        emitter.emit("error", { message: e.message || "Failed to load audio" });
      }
    },

    async play() {
      if (!AudioPlayer) return;
      // If session was killed (e.g. Android stopped foreground service after long pause),
      // attempt to re-load at the current position
      if (!_created && _lastUrl && !_recovering) {
        console.warn("[AudioBridge] Session lost — recovering at", Math.round(_currentTime));
        _recovering = true;
        try {
          await this.load(_lastUrl, _lastMeta, { seekTo: _currentTime, rate: _rate });
          await AudioPlayer.play({ audioId: AUDIO_ID });
        } catch (e) {
          console.warn("[AudioBridge] recovery failed:", e);
          emitter.emit("error", { message: "Session expired — tap play to retry" });
        } finally {
          _recovering = false;
        }
        return;
      }
      if (!_created) return;
      try {
        await AudioPlayer.play({ audioId: AUDIO_ID });
      } catch (e) {
        console.warn("[AudioBridge] play failed:", e);
        // Attempt recovery on play failure too (session may exist but be broken)
        if (_lastUrl && !_recovering) {
          _recovering = true;
          try {
            _created = false;
            await this.load(_lastUrl, _lastMeta, { seekTo: _currentTime, rate: _rate });
            await AudioPlayer.play({ audioId: AUDIO_ID });
          } catch (e2) {
            emitter.emit("error", { message: "Playback failed" });
          } finally {
            _recovering = false;
          }
        } else {
          emitter.emit("error", { message: "Playback failed" });
        }
      }
    },

    async pause() {
      if (!AudioPlayer || !_created) return;
      try {
        await AudioPlayer.pause({ audioId: AUDIO_ID });
      } catch (e) {
        console.warn("[AudioBridge] pause failed:", e);
      }
    },

    async stop() {
      if (!AudioPlayer || !_created) return;
      try {
        stopPolling();
        await AudioPlayer.stop({ audioId: AUDIO_ID });
        _playing = false;
        _currentTime = 0;
      } catch (e) {
        console.warn("[AudioBridge] stop failed:", e);
      }
    },

    async seek(timeInSeconds) {
      if (!AudioPlayer || !_created) return;
      try {
        // Plugin's Java code uses getInt() internally — must pass integer
        const t = Math.round(Math.max(0, timeInSeconds));
        await AudioPlayer.seek({ audioId: AUDIO_ID, timeInSeconds: t });
        _currentTime = t;
        emitter.emit("timeupdate", { currentTime: _currentTime, duration: _duration });
      } catch (e) {
        console.warn("[AudioBridge] seek failed:", e);
      }
    },

    async setRate(rate) {
      _rate = rate;
      if (!AudioPlayer || !_created) return;
      try {
        await AudioPlayer.setRate({ audioId: AUDIO_ID, rate });
      } catch (e) {
        console.warn("[AudioBridge] setRate failed:", e);
      }
    },

    async changeMetadata(meta) {
      if (!AudioPlayer || !_created) return;
      try {
        await AudioPlayer.changeMetadata({
          audioId: AUDIO_ID,
          friendlyTitle: meta.title,
          artistName: meta.artist || "MANTL",
          albumTitle: meta.artist || "MANTL",
          artworkSource: meta.artwork || "",
        });
      } catch (e) {
        console.warn("[AudioBridge] changeMetadata failed:", e);
      }
    },

    /** Get a fresh currentTime (async) — use for saves, not UI */
    async getFreshCurrentTime() {
      if (!AudioPlayer || !_created) return _currentTime;
      try {
        const { currentTime } = await AudioPlayer.getCurrentTime({ audioId: AUDIO_ID });
        _currentTime = currentTime;
        return currentTime;
      } catch { return _currentTime; }
    },

    async destroy() {
      stopPolling();
      _listenerCleanups.forEach((fn) => { try { fn(); } catch {} });
      _listenerCleanups = [];
      if (_readyResolve) { _readyResolve(); _readyResolve = null; }
      _pendingSeek = 0;
      if (AudioPlayer && _created) {
        try { await AudioPlayer.destroy({ audioId: AUDIO_ID }); } catch {}
      }
      _created = false;
      _playing = false;
      _currentTime = 0;
      _duration = 0;
      _lastUrl = null;
      _lastMeta = {};
    },

    isNative: true,
  };
}

// ── Web bridge (HTML <audio>) ────────────────────────────────

function createWebBridge() {
  const emitter = createEmitter();
  const audio = new Audio();
  audio.preload = "none";
  let _keepaliveId = null;

  // Update Media Session position state (keeps session alive while paused)
  function syncPositionState() {
    if (!("mediaSession" in navigator) || !audio.duration || !isFinite(audio.duration)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate,
        position: Math.min(audio.currentTime, audio.duration),
      });
    } catch {}
  }

  function startKeepalive() {
    stopKeepalive();
    // Refresh position state every 30s while paused to prevent session timeout
    _keepaliveId = setInterval(syncPositionState, 30000);
  }

  function stopKeepalive() {
    if (_keepaliveId) { clearInterval(_keepaliveId); _keepaliveId = null; }
  }

  // Forward native audio events
  const FORWARDED = ["play", "pause", "ended", "waiting", "canplay", "error", "stalled", "progress"];
  FORWARDED.forEach((evt) => {
    audio.addEventListener(evt, () => {
      if (evt === "error") {
        const codes = { 1: "Playback aborted", 2: "Network error", 3: "Decoding failed", 4: "Format not supported" };
        emitter.emit("error", { message: codes[audio.error?.code] || "Playback error" });
      } else {
        emitter.emit(evt);
      }
    });
  });

  // Sync playbackState + position on play/pause
  audio.addEventListener("play", () => {
    stopKeepalive();
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
    syncPositionState();
  });

  audio.addEventListener("pause", () => {
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
    syncPositionState();
    startKeepalive();
  });

  audio.addEventListener("timeupdate", () => {
    emitter.emit("timeupdate", { currentTime: audio.currentTime, duration: audio.duration || 0 });
    syncPositionState();
  });

  audio.addEventListener("durationchange", () => {
    emitter.emit("durationchange", { duration: audio.duration || 0 });
  });

  // Buffered progress
  audio.addEventListener("progress", () => {
    if (audio.buffered.length > 0 && audio.duration && isFinite(audio.duration)) {
      const end = audio.buffered.end(audio.buffered.length - 1);
      emitter.emit("bufferprogress", { bufferedPct: Math.min(100, (end / audio.duration) * 100) });
    }
  });

  return {
    ...emitter,

    get currentTime() { return audio.currentTime; },
    get duration() { return audio.duration || 0; },
    get playing() { return !audio.paused && !audio.ended; },
    get rate() { return audio.playbackRate; },
    get bufferedPct() {
      if (!audio.buffered.length || !audio.duration) return 0;
      return Math.min(100, (audio.buffered.end(audio.buffered.length - 1) / audio.duration) * 100);
    },

    async load(url, meta = {}, opts = {}) {
      audio.src = url;
      audio.playbackRate = opts.rate || 1;
      if (opts.seekTo) {
        const onLoaded = () => {
          audio.currentTime = opts.seekTo;
          audio.removeEventListener("loadedmetadata", onLoaded);
        };
        audio.addEventListener("loadedmetadata", onLoaded);
      }
      audio.load();

      // Set up Media Session for browser media keys
      if ("mediaSession" in navigator) {
        const artwork = meta.artwork ? [{ src: meta.artwork, sizes: "512x512", type: "image/png" }] : [];
        navigator.mediaSession.metadata = new MediaMetadata({
          title: meta.title || "MANTL",
          artist: meta.artist || "MANTL",
          album: meta.artist || "MANTL",
          ...(artwork.length ? { artwork } : {}),
        });
        // Action handlers
        const handlers = {
          play: () => audio.play().catch(() => {}),
          pause: () => audio.pause(),
          seekbackward: (d) => { audio.currentTime = Math.max(0, audio.currentTime - (d.seekOffset || 15)); },
          seekforward: (d) => { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + (d.seekOffset || 15)); },
          seekto: (d) => { if (d.seekTime != null) audio.currentTime = d.seekTime; },
          stop: () => { audio.pause(); audio.src = ""; },
        };
        Object.entries(handlers).forEach(([action, handler]) => {
          try { navigator.mediaSession.setActionHandler(action, handler); } catch {}
        });
        try { navigator.mediaSession.setActionHandler("previoustrack", null); } catch {}
        try { navigator.mediaSession.setActionHandler("nexttrack", null); } catch {}
      }
    },

    async play() { await audio.play().catch(() => {}); },
    async pause() { audio.pause(); },
    async stop() { audio.pause(); audio.currentTime = 0; },
    async seek(time) { audio.currentTime = Math.max(0, Math.min(audio.duration || 0, time)); },
    async setRate(rate) { audio.playbackRate = rate; },

    async changeMetadata(meta) {
      if ("mediaSession" in navigator) {
        const artwork = meta.artwork ? [{ src: meta.artwork, sizes: "512x512", type: "image/png" }] : [];
        navigator.mediaSession.metadata = new MediaMetadata({
          title: meta.title || "MANTL",
          artist: meta.artist || "MANTL",
          album: meta.artist || "MANTL",
          ...(artwork.length ? { artwork } : {}),
        });
      }
    },

    async getFreshCurrentTime() { return audio.currentTime; },

    async destroy() {
      stopKeepalive();
      audio.pause();
      audio.src = "";
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = "none";
      }
    },

    /** Direct access for web-specific needs */
    get audioElement() { return audio; },

    isNative: false,
  };
}

// ── Factory ──────────────────────────────────────────────────

let _instance = null;

export function getAudioBridge() {
  if (!_instance) {
    _instance = IS_NATIVE ? createNativeBridge() : createWebBridge();
  }
  return _instance;
}

export { IS_NATIVE };
