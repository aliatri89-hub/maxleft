import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";

const AudioPlayerContext = createContext(null);
export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be inside AudioPlayerProvider");
  return ctx;
}

const SPEEDS = [1, 1.25, 1.5, 1.75, 2];
const STORAGE_KEY = "mantl_audio_state";
const RECENTS_KEY = "mantl_audio_recents";
const NUDGE_DISMISSED_KEY = "mantl_audio_nudge_dismissed";
const ACCENT = "#F5C518";
const SAVE_INTERVAL = 5000;
const BOOKMARK_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_RECENTS = 20;
const SLEEP_OPTIONS = [
  { label: "5 min", minutes: 5 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 hour", minutes: 60 },
  { label: "End of episode", minutes: -1 },
];
const STALL_TIMEOUT = 15000; // 15s before showing stall error

// ── Helpers ─────────────────────────────────────────────────

function fmt(sec) {
  if (!sec || !isFinite(sec)) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function saveBookmark(ep, time, spd, dur) {
  try {
    if (!ep) { localStorage.removeItem(STORAGE_KEY); return; }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      guid: ep.guid,
      title: ep.title,
      enclosureUrl: ep.enclosureUrl,
      community: ep.community || null,
      artwork: ep.artwork || null,
      time: Math.floor(time),
      speed: spd,
      duration: dur || 0,
      savedAt: Date.now(),
    }));
  } catch {}
}

function loadBookmark() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (Date.now() - s.savedAt > BOOKMARK_EXPIRY) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return s;
  } catch { return null; }
}

// ── Recents persistence ─────────────────────────────────────

function loadRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    // Filter out expired entries
    const now = Date.now();
    return arr.filter(r => now - r.savedAt < BOOKMARK_EXPIRY);
  } catch { return []; }
}

function persistRecents(recents) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, MAX_RECENTS)));
  } catch {}
}

function upsertRecent(recents, ep, time, spd, dur) {
  if (!ep || !ep.enclosureUrl) return recents;
  // Don't save if barely started (< 15s) and no meaningful progress
  if (time < 15 && (!dur || time / dur < 0.01)) return recents;
  const entry = {
    guid: ep.guid,
    title: ep.title,
    enclosureUrl: ep.enclosureUrl,
    community: ep.community || null, // e.g. "Now Playing Podcast", "Big Picture"
    artwork: ep.artwork || null,
    time: Math.floor(time),
    speed: spd,
    duration: dur || 0,
    savedAt: Date.now(),
  };
  // Remove existing entry for this episode, add to front
  const filtered = recents.filter(r => r.guid !== ep.guid && r.enclosureUrl !== ep.enclosureUrl);
  return [entry, ...filtered].slice(0, MAX_RECENTS);
}

// ── Player Bubble ────────────────────────────────────────────
// Single element that morphs between two states:
//   badge → small circle, EQ bars / spinner / play icon
//   pill  → horizontal strip with title + play/pause + progress

function PlayerBubble({ episode, isPlaying, buffering, error, progress, duration, mode, onTogglePlay, onExpand, onCollapse, onOpenFull, onDismiss, onRetry }) {
  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const isBadge = mode === "badge";

  // Remaining time for pill
  const remainingMin = duration > 0 ? Math.ceil((duration - progress) / 60) : null;

  // ── Swipe-down-to-dismiss ──
  const swipeRef = useRef(null);       // { startY, startX, locked: bool }
  const [dragY, setDragY] = useState(0);
  const [dismissing, setDismissing] = useState(false);
  const DISMISS_THRESHOLD = 60;

  const handleTouchStart = (e) => {
    if (dismissing) return;
    swipeRef.current = { startY: e.touches[0].clientY, startX: e.touches[0].clientX, locked: false };
  };

  const handleTouchMove = (e) => {
    if (!swipeRef.current || dismissing) return;
    const dy = e.touches[0].clientY - swipeRef.current.startY;
    const dx = e.touches[0].clientX - swipeRef.current.startX;
    // Lock direction — if horizontal swipe, bail
    if (!swipeRef.current.locked) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) { swipeRef.current = null; return; }
      if (Math.abs(dy) > 8) swipeRef.current.locked = true;
    }
    if (swipeRef.current.locked && dy > 0) {
      setDragY(dy);
    }
  };

  const handleTouchEnd = () => {
    if (!swipeRef.current || dismissing) { swipeRef.current = null; return; }
    if (dragY > DISMISS_THRESHOLD) {
      // Animate out then dismiss
      setDismissing(true);
      setTimeout(() => { onDismiss(); setDismissing(false); setDragY(0); }, 250);
    } else {
      setDragY(0);
    }
    swipeRef.current = null;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => {
        if (dragY > 5) return; // don't fire click during drag
        if (isBadge) { e.stopPropagation(); onExpand(); }
      }}
      style={{
        position: "fixed",
        bottom: "calc(62px + env(safe-area-inset-bottom, 0px))",
        right: isBadge ? 16 : 12,
        left: "auto",
        zIndex: 9999,
        width: isBadge ? 44 : "auto",
        maxWidth: isBadge ? 44 : "calc(100% - 24px)",
        height: 44,
        borderRadius: isBadge ? "50%" : 22,
        background: isBadge
          ? ((isPlaying || buffering) ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT}dd)` : "rgba(24,24,40,0.97)")
          : "rgba(12,12,22,0.97)",
        backdropFilter: isBadge ? "none" : "blur(20px)",
        WebkitBackdropFilter: isBadge ? "none" : "blur(20px)",
        border: isBadge
          ? `1.5px solid ${(isPlaying || buffering) ? ACCENT : `${ACCENT}40`}`
          : `1px solid ${ACCENT}25`,
        display: "flex", alignItems: "center",
        justifyContent: isBadge ? "center" : "flex-start",
        overflow: "hidden",
        touchAction: "none",
        cursor: isBadge ? "pointer" : "default",
        boxShadow: isBadge
          ? ((isPlaying || buffering) ? `0 2px 12px ${ACCENT}44` : "0 2px 8px rgba(0,0,0,0.3)")
          : `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)`,
        transform: dismissing ? `translateY(${dragY + 80}px) scale(0.9)` : dragY > 0 ? `translateY(${dragY}px)` : "none",
        opacity: dismissing ? 0 : dragY > 0 ? Math.max(0, 1 - dragY / 150) : 1,
        transition: (dragY > 0 && !dismissing)
          ? "none"
          : dismissing
            ? "transform 0.25s cubic-bezier(0.4, 0, 1, 1), opacity 0.25s ease"
            : "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        WebkitTapHighlightColor: "transparent",
      }}
    >

      {/* ═══ BADGE content ═══ */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: isBadge ? 1 : 0,
        transition: "opacity 0.2s ease",
        pointerEvents: isBadge ? "auto" : "none",
      }}>
        {error ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff4444" stroke="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        ) : buffering ? (
          <div style={{
            width: 18, height: 18,
            border: `2.5px solid ${isPlaying ? "#0a0a0a" : ACCENT}`,
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "audioSpin 0.8s linear infinite",
          }} />
        ) : isPlaying ? (
          <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 14 }}>
            {[0, 1, 2].map(j => (
              <div key={j} style={{
                width: 3, borderRadius: 1, background: "#0a0a0a",
                animation: `audioEqBar 0.5s ease ${j * 0.12}s infinite alternate`,
              }} />
            ))}
          </div>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill={ACCENT}><path d="M8 5v14l11-7z" /></svg>
        )}
      </div>

      {/* ═══ PILL content ═══ */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: isBadge ? "0" : "0 6px 0 4px",
        width: "100%", height: "100%",
        opacity: isBadge ? 0 : 1,
        transition: "opacity 0.15s ease",
        pointerEvents: isBadge ? "none" : "auto",
        position: isBadge ? "absolute" : "relative",
        top: 0, left: 0, right: 0,
      }}>
        {/* Play/Pause */}
        <button
          onClick={(e) => { e.stopPropagation(); error ? onRetry() : onTogglePlay(); }}
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: error ? "#ff4444" : ACCENT, border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0,
          }}
        >
          {error ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M17.65 6.35A7.96 7.96 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
          ) : buffering ? (
            <div style={{ width: 14, height: 14, border: "2px solid #0a0a0a", borderTopColor: "transparent", borderRadius: "50%", animation: "audioSpin 0.8s linear infinite" }} />
          ) : isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>

        {/* Title — tap to open full screen */}
        <div onClick={(e) => { e.stopPropagation(); onOpenFull(); }} style={{
          flex: 1, minWidth: 0, cursor: "pointer", padding: "4px 0",
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: "#fff",
            fontFamily: "'Barlow Condensed', sans-serif",
            textTransform: "uppercase", letterSpacing: "0.02em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            lineHeight: 1.2,
          }}>
            {episode.title}
          </div>
          <div style={{
            fontSize: 9, color: "rgba(255,255,255,0.3)",
            fontFamily: "'IBM Plex Mono', monospace", marginTop: 1,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            {error ? (
              <span style={{ color: "#ff4444" }}>Tap to retry</span>
            ) : (<>
              {episode.community && <span style={{ color: `${ACCENT}77` }}>{episode.community}</span>}
              {episode.community && <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>}
              <span>{remainingMin ? `${remainingMin}m left` : fmt(progress)}</span>
            </>)}
          </div>
        </div>

        {/* Collapse to badge */}
        <button onClick={(e) => { e.stopPropagation(); onCollapse(); }} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.2)", padding: 6, display: "flex", flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Progress line along bottom */}
        <div style={{
          position: "absolute", bottom: 0, left: 8, right: 8,
          height: 2, borderRadius: 1, background: "rgba(255,255,255,0.06)",
        }}>
          <div style={{
            height: "100%", borderRadius: 1,
            width: `${pct}%`,
            background: `${ACCENT}88`,
            transition: "width 0.4s linear",
          }} />
        </div>
      </div>

    </div>
  );
}

// ── Resume Nudge ────────────────────────────────────────────
// Thin, temporary toast that appears when there's a saved position.
// Tap to resume → becomes mini bar. Auto-dismisses after 8s. Swipe to dismiss.

function ResumeNudge({ recent, onResume, onDismiss, onFade }) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);
  const touchStart = useRef(null);

  // Auto-dismiss after 8 seconds — doesn't persist, nudge will return next session
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(onFade, 350);
    }, 8000);
    return () => clearTimeout(timerRef.current);
  }, [onFade]);

  const dismiss = useCallback(() => {
    clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(onDismiss, 350);
  }, [onDismiss]);

  const handleTouchStart = (e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    // Swipe down or right to dismiss
    if (dy > 40 || Math.abs(dx) > 60) dismiss();
    touchStart.current = null;
  };

  const remainingMin = recent.duration > 0
    ? Math.ceil((recent.duration - recent.time) / 60)
    : null;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed",
        bottom: "calc(58px + env(safe-area-inset-bottom, 0px))",
        left: 12, right: 12,
        zIndex: 9998,
        animation: exiting
          ? "nudgeSlideOut 0.35s cubic-bezier(0.4, 0, 1, 1) forwards"
          : "nudgeSlideIn 0.4s cubic-bezier(0, 0.8, 0.2, 1) forwards",
      }}
    >
      <div
        onClick={() => {
          clearTimeout(timerRef.current);
          onResume(recent);
        }}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px",
          background: "rgba(18,18,30,0.95)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${ACCENT}25`,
          borderRadius: 14,
          cursor: "pointer",
          boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)`,
        }}
      >
        {/* Play icon */}
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: ACCENT,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M8 5v14l11-7z" /></svg>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 700,
            color: "#fff",
            fontFamily: "'Barlow Condensed', sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.02em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            lineHeight: 1.2,
          }}>
            {recent.title}
          </div>
          <div style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.35)",
            fontFamily: "'IBM Plex Mono', monospace",
            marginTop: 2,
            display: "flex", alignItems: "center", gap: 5,
          }}>
            {recent.community && (
              <span style={{ color: `${ACCENT}88` }}>{recent.community}</span>
            )}
            {recent.community && <span style={{ color: "rgba(255,255,255,0.12)" }}>·</span>}
            <span>{remainingMin ? `${remainingMin} min left` : fmt(recent.time)}</span>
          </div>
        </div>

        {/* Dismiss X */}
        <button
          onClick={(e) => { e.stopPropagation(); dismiss(); }}
          aria-label="Dismiss"
          style={{
            background: "none", border: "none",
            cursor: "pointer", padding: 4,
            color: "rgba(255,255,255,0.2)",
            fontSize: 14, lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* Auto-dismiss progress line */}
      <div style={{
        position: "absolute", bottom: 2, left: 20, right: 20, height: 2,
        borderRadius: 1, overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          background: `${ACCENT}40`,
          borderRadius: 1,
          animation: exiting ? "none" : "nudgeTimer 8s linear forwards",
        }} />
      </div>
    </div>
  );
}

// ── Full Screen Player ──────────────────────────────────────

function FullScreenPlayer({
  episode, isPlaying, buffering, error, progress, duration, speed,
  recents, onTogglePlay, onSkip, onSeek, onCycleSpeed, onRetry,
  onResumeRecent, onClearRecent, onStop, onClose,
  sleepTimer, onSetSleep, onClearSleep,
}) {
  const scrubberRef = useRef(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [closing, setClosing] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);

  const displayProgress = scrubbing ? scrubValue : progress;
  const pct = duration > 0 ? (displayProgress / duration) * 100 : 0;

  // Scrubber touch/mouse handling
  const getScrubTime = useCallback((e) => {
    const bar = scrubberRef.current;
    if (!bar || !duration) return 0;
    const rect = bar.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(duration, ((clientX - rect.left) / rect.width) * duration));
  }, [duration]);

  const handleScrubStart = useCallback((e) => {
    e.preventDefault();
    setScrubbing(true);
    setScrubValue(getScrubTime(e));
  }, [getScrubTime]);

  const handleScrubMove = useCallback((e) => {
    if (!scrubbing) return;
    e.preventDefault();
    setScrubValue(getScrubTime(e));
  }, [scrubbing, getScrubTime]);

  const handleScrubEnd = useCallback(() => {
    if (!scrubbing) return;
    onSeek(scrubValue);
    setScrubbing(false);
  }, [scrubbing, scrubValue, onSeek]);

  // Global move/end listeners for scrubber
  useEffect(() => {
    if (!scrubbing) return;
    const move = (e) => handleScrubMove(e);
    const end = () => handleScrubEnd();
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
    };
  }, [scrubbing, handleScrubMove, handleScrubEnd]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 280);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100000,
      background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
      display: "flex", flexDirection: "column",
      justifyContent: "flex-end",
      animation: closing ? "audioSheetOut 0.28s ease forwards" : "audioSheetBgIn 0.25s ease",
    }} onClick={handleClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(180deg, #16162a 0%, #0d0d1a 100%)",
          borderRadius: "24px 24px 0 0",
          maxHeight: "80dvh",
          display: "flex", flexDirection: "column",
          animation: closing ? "audioSheetSlideOut 0.28s ease forwards" : "audioSheetSlideIn 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Handle + close */}
        <div style={{ padding: "12px 20px 0", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
          <button
            onClick={handleClose}
            aria-label="Close"
            style={{
              position: "absolute", right: 16, top: 10,
              background: "rgba(255,255,255,0.06)", border: "none",
              borderRadius: "50%", width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(255,255,255,0.5)", cursor: "pointer",
              fontSize: 14,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" style={{ transform: "rotate(180deg)", transformOrigin: "center" }} />
            </svg>
          </button>
        </div>

        {/* ── Now Playing section (only when an episode is active) ── */}
        {episode && (<>
        <div style={{ padding: "20px 24px 16px", textAlign: "center" }}>
          {/* Artwork */}
          {episode.artwork && (
            <div style={{
              width: 120, height: 120, borderRadius: 16,
              margin: "0 auto 16px",
              overflow: "hidden",
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)`,
            }}>
              <img src={episode.artwork} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          {/* Title */}
          <div style={{
            fontSize: 20, fontWeight: 800,
            color: "#fff",
            fontFamily: "'Barlow Condensed', sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            lineHeight: 1.2,
            padding: "0 8px",
            marginBottom: 4,
          }}>
            {episode.title}
          </div>
          <div style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            fontFamily: "'IBM Plex Mono', monospace",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}>
            {episode.community || "Podcast"}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            margin: "0 24px 12px",
            padding: "10px 14px",
            background: "rgba(255,68,68,0.1)",
            border: "1px solid rgba(255,68,68,0.25)",
            borderRadius: 10,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff4444" flexShrink="0">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <div style={{ flex: 1, fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "'IBM Plex Mono', monospace" }}>
              {error}
            </div>
            <button onClick={onRetry} style={{
              background: "rgba(255,68,68,0.2)", border: "1px solid rgba(255,68,68,0.3)",
              borderRadius: 6, padding: "4px 10px", cursor: "pointer",
              color: "#ff6666", fontSize: 11, fontWeight: 700,
              fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase",
            }}>
              Retry
            </button>
          </div>
        )}

        {/* ── Scrubber ── */}
        <div style={{ padding: "0 24px 8px" }}>
          <div
            ref={scrubberRef}
            onMouseDown={handleScrubStart}
            onTouchStart={handleScrubStart}
            style={{
              position: "relative",
              height: 32, // generous touch area
              cursor: "pointer",
              display: "flex", alignItems: "center",
            }}
          >
            {/* Track */}
            <div style={{
              position: "absolute", left: 0, right: 0, height: 4,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 2,
            }}>
              {/* Filled */}
              <div style={{
                height: "100%",
                width: `${pct}%`,
                background: ACCENT,
                borderRadius: 2,
                transition: scrubbing ? "none" : "width 0.3s linear",
              }} />
            </div>
            {/* Thumb */}
            <div style={{
              position: "absolute",
              left: `${pct}%`,
              transform: "translateX(-50%)",
              width: scrubbing ? 18 : 14,
              height: scrubbing ? 18 : 14,
              borderRadius: "50%",
              background: ACCENT,
              boxShadow: `0 0 12px ${ACCENT}66`,
              transition: scrubbing ? "none" : "left 0.3s linear, width 0.15s, height 0.15s",
            }} />
          </div>

          {/* Time labels */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            fontFamily: "'IBM Plex Mono', monospace",
            marginTop: -2,
          }}>
            <span>{fmt(displayProgress)}</span>
            <span>−{fmt(Math.max(0, duration - displayProgress))}</span>
          </div>
        </div>

        {/* ── Transport controls ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 24, padding: "8px 24px 16px",
        }}>
          {/* Speed */}
          <button
            onClick={onCycleSpeed}
            style={{
              background: speed !== 1 ? `${ACCENT}18` : "rgba(255,255,255,0.04)",
              border: `1px solid ${speed !== 1 ? `${ACCENT}33` : "rgba(255,255,255,0.06)"}`,
              borderRadius: 8, padding: "6px 12px",
              color: speed !== 1 ? ACCENT : "rgba(255,255,255,0.4)",
              fontSize: 13, fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
              minWidth: 48,
              transition: "all 0.2s",
            }}
          >
            {speed}×
          </button>

          {/* Skip back 15 */}
          <button
            onClick={() => onSkip(-15)}
            aria-label="Back 15 seconds"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.5)", padding: 8,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
              transition: "color 0.15s",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
            </svg>
            <span style={{ fontSize: 9, fontWeight: 700 }}>15</span>
          </button>

          {/* Play/Pause — hero button */}
          <button
            onClick={error ? onRetry : onTogglePlay}
            aria-label={error ? "Retry" : isPlaying ? "Pause" : "Play"}
            style={{
              width: 64, height: 64,
              borderRadius: "50%",
              background: error ? "#ff4444" : ACCENT,
              border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              boxShadow: error ? "0 4px 24px rgba(255,68,68,0.3)" : `0 4px 24px ${ACCENT}44`,
              transition: "transform 0.1s, box-shadow 0.3s",
            }}
          >
            {error ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M17.65 6.35A7.96 7.96 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
            ) : buffering ? (
              <div style={{
                width: 24, height: 24,
                border: "3px solid #0a0a0a",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "audioSpin 0.8s linear infinite",
              }} />
            ) : isPlaying ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#0a0a0a">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#0a0a0a">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Skip forward 30 */}
          <button
            onClick={() => onSkip(30)}
            aria-label="Forward 30 seconds"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.5)", padding: 8,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
              transition: "color 0.15s",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
            <span style={{ fontSize: 9, fontWeight: 700 }}>30</span>
          </button>

          {/* Sleep timer */}
          <button
            onClick={() => sleepTimer ? onClearSleep() : setShowSleepPicker(p => !p)}
            aria-label="Sleep timer"
            style={{
              background: sleepTimer ? `${ACCENT}18` : "rgba(255,255,255,0.04)",
              border: `1px solid ${sleepTimer ? `${ACCENT}33` : "rgba(255,255,255,0.06)"}`,
              borderRadius: 8, padding: "6px 10px",
              color: sleepTimer ? ACCENT : "rgba(255,255,255,0.4)",
              fontSize: 11, fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
              minWidth: 48,
              transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
            {sleepTimer ? sleepTimer.label : ""}
          </button>
        </div>

        {/* Sleep timer picker */}
        {showSleepPicker && !sleepTimer && (
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 8,
            padding: "0 24px 12px", justifyContent: "center",
          }}>
            {SLEEP_OPTIONS.map(opt => (
              <button
                key={opt.minutes}
                onClick={() => { onSetSleep(opt); setShowSleepPicker(false); }}
                style={{
                  background: `${ACCENT}10`, border: `1px solid ${ACCENT}20`,
                  borderRadius: 8, padding: "6px 14px",
                  color: ACCENT, fontSize: 12, fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'IBM Plex Mono', monospace",
                  transition: "all 0.15s",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Stop / close player */}
        <div style={{ display: "flex", justifyContent: "center", paddingBottom: 8 }}>
          <button
            onClick={onStop}
            aria-label="Close player"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8, padding: "6px 12px",
              color: "rgba(255,255,255,0.3)",
              fontSize: 11, fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              transition: "all 0.2s",
            }}
          >
            Stop &amp; Close
          </button>
        </div>
        </>)}

        {/* ── No episode playing — show browse header ── */}
        {!episode && (
          <div style={{ padding: "24px 24px 16px", textAlign: "center" }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: `linear-gradient(135deg, ${ACCENT}15, ${ACCENT}08)`,
              border: `1px solid ${ACCENT}15`,
              margin: "0 auto 16px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
                <path d="M3 18v-6a9 9 0 0118 0v6" />
                <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
              </svg>
            </div>
            <div style={{
              fontSize: 16, fontWeight: 700,
              color: "rgba(255,255,255,0.8)",
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}>
              {recents.length > 0 ? "Pick Up Where You Left Off" : "Nothing Playing"}
            </div>
            <div style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.3)",
              fontFamily: "'IBM Plex Mono', monospace",
              marginTop: 4,
            }}>
              {recents.length > 0 ? "Resume a recent episode below" : "Log something in a community to find episodes"}
            </div>
          </div>
        )}

        {/* ── Scrollable content: Recents ── */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          flex: 1, minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          maxHeight: episode ? "35vh" : "70vh",
        }}>

          {/* ── Recently Played ── */}
          {(() => {
            // Filter out the currently playing episode
            const filteredRecents = recents.filter(r =>
              r.guid !== episode?.guid && r.enclosureUrl !== episode?.enclosureUrl
            );
            if (filteredRecents.length === 0) {
              // Empty state — no recents to show
              return !episode ? (
                <div style={{
                  padding: "40px 24px", textAlign: "center",
                }}>
                  <div style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.2)",
                    fontFamily: "'IBM Plex Mono', monospace",
                    lineHeight: 1.6,
                  }}>
                    Play an episode from any community to start listening
                  </div>
                </div>
              ) : null;
            }
            return (
            <>
              <div style={{
                padding: "14px 20px 8px",
                fontSize: 11, fontWeight: 700,
                color: ACCENT,
                fontFamily: "'Barlow Condensed', sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                display: "flex", alignItems: "center", gap: 8,
                opacity: 0.8,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Recently Played
              </div>

              {filteredRecents.map((r) => {
                const recentPct = r.duration > 0 ? (r.time / r.duration) * 100 : 0;
                const timeAgo = (() => {
                  const mins = Math.floor((Date.now() - r.savedAt) / 60000);
                  if (mins < 1) return "just now";
                  if (mins < 60) return `${mins}m ago`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs}h ago`;
                  const days = Math.floor(hrs / 24);
                  return `${days}d ago`;
                })();

                return (
                  <div
                    key={`recent-${r.guid}`}
                    onClick={() => onResumeRecent(r)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 20px",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                  >
                    {/* Resume button with progress ring */}
                    <div
                      style={{
                        width: 36, height: 36,
                        borderRadius: 10,
                        background: `${ACCENT}15`,
                        border: `1px solid ${ACCENT}30`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <svg width="36" height="36" viewBox="0 0 36 36" style={{ position: "absolute", inset: 0 }}>
                        <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2" />
                        <circle cx="18" cy="18" r="15" fill="none" stroke={ACCENT} strokeWidth="2"
                          strokeDasharray={`${recentPct * 0.942} 100`}
                          strokeLinecap="round"
                          transform="rotate(-90 18 18)"
                          opacity="0.5"
                        />
                      </svg>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill={ACCENT}>
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 700,
                        color: "rgba(255,255,255,0.8)",
                        fontFamily: "'Barlow Condensed', sans-serif",
                        textTransform: "uppercase",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        lineHeight: 1.3,
                      }}>
                        {r.title}
                      </div>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 8,
                        marginTop: 3,
                      }}>
                        {/* Community tag */}
                        {r.community && (
                          <span style={{
                            fontSize: 9,
                            color: `${ACCENT}88`,
                            fontFamily: "'IBM Plex Mono', monospace",
                            whiteSpace: "nowrap",
                          }}>
                            {r.community}
                          </span>
                        )}
                        {r.community && <span style={{ color: "rgba(255,255,255,0.1)", fontSize: 9 }}>·</span>}
                        {/* Progress bar */}
                        <div style={{
                          flex: 1, height: 3, borderRadius: 2,
                          background: "rgba(255,255,255,0.06)",
                          maxWidth: 80,
                        }}>
                          <div style={{
                            height: "100%", borderRadius: 2,
                            width: `${recentPct}%`,
                            background: `${ACCENT}88`,
                          }} />
                        </div>
                        <span style={{
                          fontSize: 9,
                          color: "rgba(255,255,255,0.25)",
                          fontFamily: "'IBM Plex Mono', monospace",
                          whiteSpace: "nowrap",
                        }}>
                          {fmt(r.time)} / {fmt(r.duration)} · {timeAgo}
                        </span>
                      </div>
                    </div>

                    {/* Clear button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onClearRecent(r.guid); }}
                      aria-label="Remove from recents"
                      style={{
                        background: "none", border: "none",
                        cursor: "pointer", padding: 4,
                        color: "rgba(255,255,255,0.15)",
                        fontSize: 12, lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </>
            );
          })()}

        </div>
      </div>
    </div>
  );
}

// ── Provider ────────────────────────────────────────────────

export default function AudioPlayerProvider({ children, session }) {
  const audioRef = useRef(null);
  const [currentEp, setCurrentEp] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState(null);       // null | string message
  const [fullScreen, setFullScreen] = useState(false);
  const [bubbleMode, setBubbleMode] = useState("badge"); // "badge" | "pill"
  const [activated, setActivated] = useState(false); // true once user plays something this session
  const [sleepTimer, setSleepTimer] = useState(null); // null | { label, deadline, timerId }
  const sleepTimerRef = useRef(null);
  const stallTimerRef = useRef(null);
  const [nudgeDismissedGuid, setNudgeDismissedGuid] = useState(() => {
    try { return localStorage.getItem(NUDGE_DISMISSED_KEY) || null; } catch { return null; }
  });
  const dismissNudge = useCallback((guid) => {
    setNudgeDismissedGuid(guid);
    try { localStorage.setItem(NUDGE_DISMISSED_KEY, guid); } catch {}
  }, []);
  const [nudgeFaded, setNudgeFaded] = useState(false); // auto-dismiss this session only
  const [recents, setRecents] = useState(() => loadRecents());
  const recentsRef = useRef(recents);
  const saveThrottle = useRef(0);
  const restoredRef = useRef(false);

  // Keep ref in sync — but also update ref immediately in updateRecents
  const updateRecents = useCallback((updater) => {
    setRecents(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      recentsRef.current = next;
      persistRecents(next);
      return next;
    });
  }, []);

  // ── Restore bookmark into recents on mount ─────────────────
  // Don't restore to currentEp — player stays dormant until user plays from a community.
  // Saved progress gets merged into recents so it's available when they do engage.
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = loadBookmark();
    if (saved?.enclosureUrl && saved.time > 15) {
      updateRecents(prev => {
        // Only add if not already in recents (avoid duplicating on every mount)
        const exists = prev.some(r => r.guid === saved.guid || r.enclosureUrl === saved.enclosureUrl);
        if (exists) return prev;
        return upsertRecent(prev, saved, saved.time, saved.speed || 1, saved.duration || 0);
      });
      localStorage.removeItem(STORAGE_KEY); // consumed — now lives in recents
    }
  }, [updateRecents]);

  // ── Audio event listeners ────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const ms = "mediaSession" in navigator ? navigator.mediaSession : null;
    const h = {
      timeupdate: () => {
        const t = audio.currentTime;
        setProgress(t);
        setError(null); // clear error on successful playback
        clearTimeout(stallTimerRef.current);
        const now = Date.now();
        if (now - saveThrottle.current > SAVE_INTERVAL) {
          saveThrottle.current = now;
          saveBookmark(currentEp, t, speed, audio.duration);
          // Update OS scrubber position on the same throttle
          if (ms && audio.duration && isFinite(audio.duration)) {
            try {
              ms.setPositionState({
                duration: audio.duration,
                playbackRate: audio.playbackRate,
                position: Math.min(t, audio.duration),
              });
            } catch {}
          }
        }
      },
      durationchange: () => {
        setDuration(audio.duration || 0);
        // Push position state when duration becomes known
        if (ms && audio.duration && isFinite(audio.duration)) {
          try {
            ms.setPositionState({
              duration: audio.duration,
              playbackRate: audio.playbackRate,
              position: Math.min(audio.currentTime, audio.duration),
            });
          } catch {}
        }
      },
      play: () => {
        setIsPlaying(true); setBuffering(false); setError(null);
        if (ms) ms.playbackState = "playing";
      },
      pause: () => {
        setIsPlaying(false);
        clearTimeout(stallTimerRef.current);
        saveBookmark(currentEp, audio.currentTime, speed, audio.duration);
        if (ms) ms.playbackState = "paused";
        // Persist recents on pause so position survives app close
        if (currentEp && audio.currentTime > 15) {
          const updated = upsertRecent(recentsRef.current, currentEp, audio.currentTime, speed, audio.duration);
          recentsRef.current = updated;
          persistRecents(updated);
        }
      },
      waiting: () => {
        setBuffering(true);
        // Start stall timer — if we're still buffering after STALL_TIMEOUT, show error
        clearTimeout(stallTimerRef.current);
        stallTimerRef.current = setTimeout(() => {
          setBuffering(false);
          setError("Stream stalled — check your connection");
        }, STALL_TIMEOUT);
      },
      canplay: () => {
        setBuffering(false); setError(null);
        clearTimeout(stallTimerRef.current);
      },
      ended: () => {
        setIsPlaying(false);
        clearTimeout(stallTimerRef.current);
        if (ms) ms.playbackState = "none";
        // If sleep timer is set to "end of episode", clear it
        if (sleepTimerRef.current?.endOfEpisode) {
          clearTimeout(sleepTimerRef.current.timerId);
          setSleepTimer(null);
          sleepTimerRef.current = null;
        }
      },
      error: () => {
        const e = audio.error;
        const msgs = {
          1: "Playback aborted",
          2: "Network error — check your connection",
          3: "Audio decoding failed",
          4: "Audio format not supported",
        };
        setError(msgs[e?.code] || "Playback error");
        setBuffering(false);
        setIsPlaying(false);
        clearTimeout(stallTimerRef.current);
      },
      stalled: () => {
        // Audio download stalled — start a timer before showing error
        clearTimeout(stallTimerRef.current);
        stallTimerRef.current = setTimeout(() => {
          setBuffering(false);
          setError("Stream stalled — check your connection");
        }, STALL_TIMEOUT);
      },
    };
    Object.entries(h).forEach(([e, fn]) => audio.addEventListener(e, fn));
    return () => {
      Object.entries(h).forEach(([e, fn]) => audio.removeEventListener(e, fn));
      clearTimeout(stallTimerRef.current);
    };
  }, [currentEp, speed]);

  // ── Save on visibility change / beforeunload ─────────────
  useEffect(() => {
    const save = () => {
      const a = audioRef.current;
      if (a && currentEp) {
        saveBookmark(currentEp, a.currentTime, speed, a.duration);
        // Also persist to recents so position survives app kills / deploys
        if (a.currentTime > 15) {
          const updated = upsertRecent(recentsRef.current, currentEp, a.currentTime, speed, a.duration);
          recentsRef.current = updated;
          persistRecents(updated);
        }
      }
    };
    const onVis = () => { if (document.hidden) save(); };
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeunload", save);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [currentEp, speed]);

  // ── Actions ──────────────────────────────────────────────

  // Track pending loadedmetadata listener for cleanup
  const pendingSeekRef = useRef(null);

  const cleanupPendingSeek = useCallback(() => {
    if (pendingSeekRef.current) {
      const { audio, handler } = pendingSeekRef.current;
      audio.removeEventListener("loadedmetadata", handler);
      pendingSeekRef.current = null;
    }
  }, []);

  const playEpisode = useCallback((ep) => {
    const audio = audioRef.current;
    if (!audio || !ep?.enclosureUrl) return;

    const isSameEp = currentEp && (currentEp.guid === ep.guid || currentEp.enclosureUrl === ep.enclosureUrl);
    if (isSameEp) {
      isPlaying ? audio.pause() : audio.play().catch(() => {});
      return;
    }

    // Clean up any pending seek from a previous rapid switch
    cleanupPendingSeek();

    // Save current episode to recents before switching
    if (currentEp && audio.currentTime > 15) {
      updateRecents(prev => upsertRecent(prev, currentEp, audio.currentTime, speed, audio.duration));
    }

    // Check if this episode has a saved position in recents (use ref for fresh value)
    const saved = recentsRef.current.find(r => r.guid === ep.guid || r.enclosureUrl === ep.enclosureUrl);

    setCurrentEp(ep);
    setBubbleMode("badge");
    setActivated(true);
    setBuffering(true);
    setError(null);

    // Active listening intent — clear any nudge dismissal for this episode
    // and reset session fade so nudge can appear again after this episode
    setNudgeFaded(false);
    setNudgeDismissedGuid(prev => {
      if (prev === ep.guid) {
        try { localStorage.removeItem(NUDGE_DISMISSED_KEY); } catch {}
        return null;
      }
      return prev;
    });

    if (saved && saved.time > 15) {
      // Resume from saved position
      setProgress(saved.time);
      setDuration(saved.duration || 0);
      setSpeed(saved.speed || speed);
      audio.src = ep.enclosureUrl;
      audio.playbackRate = saved.speed || speed;

      const onLoaded = () => {
        audio.currentTime = saved.time;
        audio.play().catch(() => {});
        pendingSeekRef.current = null;
      };
      pendingSeekRef.current = { audio, handler: onLoaded };
      audio.addEventListener("loadedmetadata", onLoaded, { once: true });
      audio.load();
      // Don't remove from recents here — if app dies before new position saves,
      // the episode would be lost. FullScreenPlayer filters currentEp from display.
    } else {
      // Fresh start
      setProgress(0);
      setDuration(0);
      audio.src = ep.enclosureUrl;
      audio.playbackRate = speed;
      audio.play().catch(() => {});
    }
  }, [currentEp, isPlaying, speed, updateRecents, cleanupPendingSeek]);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a || !currentEp) return;
    isPlaying ? a.pause() : a.play().catch(() => {});
  }, [isPlaying, currentEp]);

  const skip = useCallback((sec) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + sec));
  }, []);

  const seekTo = useCallback((time) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(a.duration || 0, time));
  }, []);

  const cycleSpeed = useCallback(() => {
    const a = audioRef.current;
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (a) {
      a.playbackRate = next;
      if ("mediaSession" in navigator && a.duration && isFinite(a.duration)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: a.duration,
            playbackRate: next,
            position: Math.min(a.currentTime, a.duration),
          });
        } catch {}
      }
    }
  }, [speed]);

  // ── Retry — reload current episode's audio source ────────
  const retry = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentEp?.enclosureUrl) return;
    setError(null);
    setBuffering(true);
    clearTimeout(stallTimerRef.current);
    const savedTime = audio.currentTime || progress;
    audio.src = currentEp.enclosureUrl;
    audio.playbackRate = speed;
    const onLoaded = () => {
      if (savedTime > 5) audio.currentTime = savedTime;
      audio.play().catch(() => {});
      pendingSeekRef.current = null;
    };
    cleanupPendingSeek();
    pendingSeekRef.current = { audio, handler: onLoaded };
    audio.addEventListener("loadedmetadata", onLoaded, { once: true });
    audio.load();
  }, [currentEp, speed, progress, cleanupPendingSeek]);

  // ── Sleep timer ─────────────────────────────────────────
  const setSleepTimerAction = useCallback((option) => {
    // Clear any existing timer
    if (sleepTimerRef.current?.timerId) clearTimeout(sleepTimerRef.current.timerId);

    if (option.minutes === -1) {
      // "End of episode" — no real timer, just flag it
      const st = { label: "End of ep", endOfEpisode: true, timerId: null };
      sleepTimerRef.current = st;
      setSleepTimer(st);
      return;
    }

    const ms = option.minutes * 60 * 1000;
    const timerId = setTimeout(() => {
      const audio = audioRef.current;
      if (audio) audio.pause();
      setSleepTimer(null);
      sleepTimerRef.current = null;
    }, ms);
    const st = { label: option.label, endOfEpisode: false, timerId, deadline: Date.now() + ms };
    sleepTimerRef.current = st;
    setSleepTimer(st);
  }, []);

  const clearSleepTimer = useCallback(() => {
    if (sleepTimerRef.current?.timerId) clearTimeout(sleepTimerRef.current.timerId);
    sleepTimerRef.current = null;
    setSleepTimer(null);
  }, []);

  // Clean up sleep timer on unmount
  useEffect(() => {
    return () => {
      if (sleepTimerRef.current?.timerId) clearTimeout(sleepTimerRef.current.timerId);
    };
  }, []);

  const stop = useCallback(() => {
    cleanupPendingSeek();
    clearSleepTimer();
    const a = audioRef.current;
    // pause() triggers the pause event handler which saves position to recents
    if (a) { a.pause(); a.src = ""; }
    // Clear OS media session
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
    }
    setCurrentEp(null);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setError(null);
    setFullScreen(false);
    setBubbleMode("badge");
    setNudgeFaded(true); // Don't nudge immediately after user explicitly closed
  }, [cleanupPendingSeek, clearSleepTimer]);

  // Dismiss — save position to recents so user can resume later, then clean up
  const dismiss = useCallback(() => {
    const a = audioRef.current;
    // Explicitly save to recents before tearing down
    if (currentEp && a && a.currentTime > 5) {
      updateRecents(prev => upsertRecent(prev, currentEp, a.currentTime, speed, a.duration));
      saveBookmark(currentEp, a.currentTime, speed, a.duration);
    }
    cleanupPendingSeek();
    clearSleepTimer();
    if (a) { a.pause(); a.src = ""; }
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
    }
    setCurrentEp(null);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setError(null);
    setFullScreen(false);
    setBubbleMode("badge");
    setNudgeFaded(true); // Don't nudge immediately — will show on next app open
    // Clear dismissed guid so this episode's nudge isn't blocked next session
    setNudgeDismissedGuid(null);
    try { localStorage.removeItem(NUDGE_DISMISSED_KEY); } catch {}
  }, [currentEp, speed, updateRecents, cleanupPendingSeek, clearSleepTimer]);

  const openFullScreen = useCallback(() => { setFullScreen(true); }, []);
  const closeFullScreen = useCallback(() => setFullScreen(false), []);
  const minimize = useCallback(() => setBubbleMode("badge"), []);
  const restore = useCallback(() => setBubbleMode("pill"), []);

  // Resume a recently played episode from its saved position
  const resumeRecent = useCallback((recent) => {
    const audio = audioRef.current;
    if (!audio || !recent?.enclosureUrl) return;

    cleanupPendingSeek();

    // Save current episode to recents before switching
    if (currentEp && audio.currentTime > 15) {
      updateRecents(prev => upsertRecent(prev, currentEp, audio.currentTime, speed, audio.duration));
    }

    const ep = { guid: recent.guid, title: recent.title, enclosureUrl: recent.enclosureUrl, community: recent.community || null, artwork: recent.artwork || null };
    const resumeTime = recent.time || 0;
    const resumeSpeed = recent.speed || 1;

    setCurrentEp(ep);
    setBubbleMode("badge");
    setActivated(true);
    setProgress(resumeTime);
    setDuration(recent.duration || 0);
    setSpeed(resumeSpeed);
    setBuffering(true);

    audio.src = recent.enclosureUrl;
    audio.playbackRate = resumeSpeed;

    const onLoaded = () => {
      audio.currentTime = resumeTime;
      audio.play().catch(() => {});
      pendingSeekRef.current = null;
    };
    pendingSeekRef.current = { audio, handler: onLoaded };
    audio.addEventListener("loadedmetadata", onLoaded, { once: true });
    audio.load();
    // Don't remove from recents — display filters currentEp, and keeping it
    // protects against data loss if the app dies before new position saves.
  }, [currentEp, speed, updateRecents, cleanupPendingSeek]);

  // Remove a single episode from recents
  const clearRecent = useCallback((guid) => {
    updateRecents(prev => prev.filter(r => r.guid !== guid));
  }, [updateRecents]);

  // ── Media Session API ──────────────────────────────────────
  // Sets metadata and action handlers so the OS notification widget
  // shows episode info and working controls.

  // Metadata — update when episode changes
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentEp) return;
    const artwork = [];
    const artUrl = currentEp.artwork || currentEp.image || null;
    if (artUrl) {
      artwork.push({ src: artUrl, sizes: "512x512", type: "image/png" });
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentEp.title || "Unknown Episode",
      artist: currentEp.community || "MANTL",
      album: currentEp.community || "MANTL",
      ...(artwork.length > 0 ? { artwork } : {}),
    });
  }, [currentEp]);

  // Action handlers — keeps the OS session alive while paused
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const actions = {
      play: () => { const a = audioRef.current; if (a && currentEp) a.play().catch(() => {}); },
      pause: () => { const a = audioRef.current; if (a) a.pause(); },
      seekbackward: (details) => {
        const a = audioRef.current;
        if (a) a.currentTime = Math.max(0, a.currentTime - (details.seekOffset || 15));
      },
      seekforward: (details) => {
        const a = audioRef.current;
        if (a) a.currentTime = Math.min(a.duration || 0, a.currentTime + (details.seekOffset || 30));
      },
      seekto: (details) => {
        const a = audioRef.current;
        if (a && details.seekTime != null) a.currentTime = details.seekTime;
      },
      stop: () => stop(),
    };
    Object.entries(actions).forEach(([action, handler]) => {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch {}
    });
    // Null out track-skip to free slots for seek buttons on Android
    try { navigator.mediaSession.setActionHandler("previoustrack", null); } catch {}
    try { navigator.mediaSession.setActionHandler("nexttrack", null); } catch {}
    return () => {
      Object.keys(actions).forEach((action) => {
        try { navigator.mediaSession.setActionHandler(action, null); } catch {}
      });
    };
  }, [currentEp, stop]);

  // ── Context value ────────────────────────────────────────

  const value = useMemo(() => ({
    currentEp, isPlaying, progress, duration, speed, buffering, error, recents,
    bubbleMode, activated, play: playEpisode, togglePlay, skip, stop, dismiss, cycleSpeed, retry,
    openFullScreen, fullScreen, resumeRecent, clearRecent, minimize, restore,
    sleepTimer, setSleepTimer: setSleepTimerAction, clearSleepTimer,
  }), [
    currentEp, isPlaying, progress, duration, speed, buffering, error, recents,
    bubbleMode, activated, playEpisode, togglePlay, skip, stop, dismiss, cycleSpeed, retry, openFullScreen, fullScreen,
    resumeRecent, clearRecent, minimize, restore,
    sleepTimer, setSleepTimerAction, clearSleepTimer,
  ]);

  // ── Render ───────────────────────────────────────────────

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="none" />

      <style>{`
        @keyframes audioEqBar {
          0% { height: 4px; }
          100% { height: 16px; }
        }
        @keyframes audioSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes audioSheetBgIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes audioSheetSlideIn {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes audioSheetOut {
          to { opacity: 0; }
        }
        @keyframes audioSheetSlideOut {
          to { transform: translateY(100%); }
        }
        @keyframes nudgeSlideIn {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes nudgeSlideOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(24px); }
        }
        @keyframes nudgeTimer {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>

      {/* Player bubble — morphs between badge and pill */}
      {activated && currentEp && !fullScreen && createPortal(
        <PlayerBubble
          episode={currentEp}
          isPlaying={isPlaying}
          buffering={buffering}
          error={error}
          progress={progress}
          duration={duration}
          mode={bubbleMode}
          onTogglePlay={togglePlay}
          onExpand={restore}
          onCollapse={minimize}
          onOpenFull={openFullScreen}
          onDismiss={dismiss}
          onRetry={retry}
        />,
        document.body
      )}

      {/* Resume nudge — temporary toast when there's a saved position but nothing playing */}
      {session && !currentEp && !fullScreen && !nudgeFaded && recents.length > 0 && recents[0].guid !== nudgeDismissedGuid && createPortal(
        <ResumeNudge
          recent={recents[0]}
          onResume={(r) => { resumeRecent(r); }}
          onDismiss={() => dismissNudge(recents[0].guid)}
          onFade={() => setNudgeFaded(true)}
        />,
        document.body
      )}

      {/* Full-screen sheet — can open with or without a current episode */}
      {fullScreen && createPortal(
        <FullScreenPlayer
          episode={currentEp}
          isPlaying={isPlaying}
          buffering={buffering}
          error={error}
          progress={progress}
          duration={duration}
          speed={speed}
          recents={recents}
          onTogglePlay={togglePlay}
          onSkip={skip}
          onSeek={seekTo}
          onCycleSpeed={cycleSpeed}
          onRetry={retry}
          onResumeRecent={(r) => { resumeRecent(r); }}
          onClearRecent={(guid) => { clearRecent(guid); }}
          onStop={() => { stop(); }}
          onClose={closeFullScreen}
          sleepTimer={sleepTimer}
          onSetSleep={setSleepTimerAction}
          onClearSleep={clearSleepTimer}
        />,
        document.body
      )}
    </AudioPlayerContext.Provider>
  );
}
