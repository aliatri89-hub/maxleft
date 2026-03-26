import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { getAudioBridge } from "../../../utils/nativeAudioBridge";
import { reportDeadAudio } from "../../../utils/reportDeadAudio";
import { trackEvent } from "../../../hooks/useAnalytics";

const AudioPlayerContext = createContext(null);
export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be inside AudioPlayerProvider");
  return ctx;
}

const SPEEDS = [1, 1.25, 1.5, 1.75, 2];
const STORAGE_KEY = "mantl_audio_state";
const RECENTS_KEY = "mantl_audio_recents";
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

function stripHtml(str) {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#?\w+;/g, "").trim();
}

const PROMO_RE = /\b(Join our Patreon|Follow us|Be sure to (?:follow|subscribe)|Learn more about your ad|Thanks to our SPONSOR|This episode is (?:brought to you|sponsored)|Go to hdtgm|Watch this episode on)/i;

// Markers that signal the start of shownotes / useful content after promos
const SHOWNOTES_RE = /\b(Shownotes|Show notes|Timestamps|Weekly Plugs|What we.ve been watching|Featured Review|Chapters|Segments|Topics)/i;

function cleanDescription(raw) {
  if (!raw) return null;
  let text = stripHtml(raw);

  const promoMatch = PROMO_RE.exec(text);
  if (promoMatch) {
    const before = text.slice(0, promoMatch.index).trim();
    const after = text.slice(promoMatch.index);

    // Look for shownotes section or timecodes after the promo
    const shownotesMatch = SHOWNOTES_RE.exec(after);
    const hasTimecodes = /\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(after);

    if (shownotesMatch) {
      // Keep before + shownotes section onward
      text = before + "\n\n" + after.slice(shownotesMatch.index).trim();
    } else if (hasTimecodes) {
      // Timecodes exist but no clear section header — keep everything
      text = before + "\n\n" + after.trim();
    } else {
      // Pure promo, no shownotes — truncate as before
      text = before;
    }
  }

  // Collapse whitespace
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return text || null;
}

/**
 * Parse timecodes (e.g. 1:23:45, 45:30) in text and return React elements
 * with tappable spans that call onSeek(seconds).
 */
const TIMECODE_RE = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/g;

function parseTimecodeSeconds(match) {
  const parts = match.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
}

function renderWithTimecodes(text, onSeek) {
  if (!text || !onSeek) return text;
  const parts = [];
  let last = 0;
  let m;
  const re = new RegExp(TIMECODE_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const sec = parseTimecodeSeconds(m[0]);
    const tc = m[0];
    parts.push(
      <span
        key={`tc-${m.index}`}
        onClick={(e) => { e.stopPropagation(); onSeek(sec); }}
        style={{
          color: ACCENT,
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 600,
          cursor: "pointer",
          textDecoration: "underline",
          textDecorationColor: `${ACCENT}44`,
          textUnderlineOffset: 2,
        }}
      >
        {tc}
      </span>
    );
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
}

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

function PlayerBubble({ episode, isPlaying, buffering, error, progress, duration, mode, queueCount, onTogglePlay, onExpand, onCollapse, onOpenFull, onDismiss, onRetry }) {
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
              {queueCount > 0 && (<>
                <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
                <span style={{ color: `${ACCENT}77` }}>{queueCount} queued</span>
              </>)}
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

// ── Full Screen Player ──────────────────────────────────────

function FullScreenPlayer({
  episode, isPlaying, buffering, error, bufferedPct, progress, duration, speed,
  recents, queue, onTogglePlay, onSkip, onSeek, onCycleSpeed, onRetry,
  onResumeRecent, onClearRecent, onStop, onClose,
  sleepTimer, onSetSleep, onClearSleep,
  onRemoveFromQueue, onClearQueue,
}) {
  const scrubberRef = useRef(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [closing, setClosing] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [skipFlash, setSkipFlash] = useState(null); // null | "back" | "fwd"
  const lastTapRef = useRef({ time: 0, x: 0 });
  const skipFlashTimer = useRef(null);

  // Double-tap artwork to skip ±15s
  const handleArtworkTap = useCallback((e) => {
    const now = Date.now();
    const last = lastTapRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const isLeft = x < rect.width / 2;

    if (now - last.time < 350) {
      // Double tap detected
      const delta = isLeft ? -15 : 15;
      onSkip(delta);
      const dir = isLeft ? "back" : "fwd";
      setSkipFlash(dir);
      clearTimeout(skipFlashTimer.current);
      skipFlashTimer.current = setTimeout(() => setSkipFlash(null), 600);
      lastTapRef.current = { time: 0, x: 0 }; // reset so triple-tap doesn't re-fire
    } else {
      lastTapRef.current = { time: now, x };
    }
  }, [onSkip]);

  // Reset description accordion when episode changes
  useEffect(() => { setDescExpanded(false); }, [episode?.guid]);

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
          {/* Artwork — double-tap left/right to skip ±15s */}
          {episode.artwork && (
            <div
              onClick={handleArtworkTap}
              style={{
                width: 120, height: 120, borderRadius: 16,
                margin: "0 auto 16px",
                overflow: "hidden",
                boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)`,
                position: "relative",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <img loading="lazy" src={episode.artwork} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {/* Skip flash overlay */}
              {skipFlash && (
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center",
                  justifyContent: skipFlash === "back" ? "flex-start" : "flex-end",
                  padding: "0 14px",
                  background: "rgba(0,0,0,0.45)",
                  borderRadius: 16,
                  animation: "skipFlashIn 0.15s ease",
                }}>
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    color: "#fff", opacity: 0.9,
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {skipFlash === "back" ? (<>
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                      </>) : (<>
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                      </>)}
                    </svg>
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>15s</span>
                  </div>
                </div>
              )}
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

        {/* Episode description — collapsible */}
        {(() => {
          const desc = cleanDescription(episode.description);
          if (!desc) return null;
          const isLong = desc.length > 120;
          return (
            <div
              onClick={() => isLong && setDescExpanded(p => !p)}
              style={{
                margin: "0 24px 12px",
                padding: "10px 14px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10,
                cursor: isLong ? "pointer" : "default",
              }}
            >
              <div style={{
                fontSize: 12, lineHeight: 1.5,
                color: "rgba(255,255,255,0.5)",
                fontFamily: "var(--font-body, system-ui)",
                overflow: "hidden",
                maxHeight: descExpanded ? "none" : 42,
                WebkitLineClamp: descExpanded ? "unset" : 2,
                WebkitBoxOrient: "vertical",
                display: descExpanded ? "block" : "-webkit-box",
                whiteSpace: "pre-line",
              }}>
                {renderWithTimecodes(desc, onSeek)}
              </div>
              {isLong && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginTop: 6,
                  fontSize: 10, fontWeight: 600,
                  color: `${ACCENT}88`,
                  fontFamily: "'IBM Plex Mono', monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  gap: 4,
                }}>
                  {descExpanded ? "Show less" : "Show more"}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: descExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              )}
            </div>
          );
        })()}

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
              {/* Buffered range — lighter bar showing downloaded audio */}
              {bufferedPct > 0 && (
                <div style={{
                  position: "absolute", top: 0, left: 0, height: "100%",
                  width: `${bufferedPct}%`,
                  background: "rgba(255,255,255,0.12)",
                  borderRadius: 2,
                  transition: "width 0.5s ease",
                }} />
              )}
              {/* Filled — playback progress */}
              <div style={{
                position: "relative", // above buffered
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
            <span>−{fmt(Math.max(0, (duration - displayProgress) / speed))}{speed !== 1 ? ` @${speed}×` : ""}</span>
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

          {/* Skip forward 15 */}
          <button
            onClick={() => onSkip(15)}
            aria-label="Forward 15 seconds"
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
            <span style={{ fontSize: 9, fontWeight: 700 }}>15</span>
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

          {/* ── Up Next (queue) ── */}
          {queue.length > 0 && (
            <>
              <div style={{
                padding: "14px 20px 8px",
                fontSize: 11, fontWeight: 700,
                color: ACCENT,
                fontFamily: "'Barlow Condensed', sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                opacity: 0.8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                  Up Next · {queue.length}
                </div>
                <button onClick={onClearQueue} style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(255,255,255,0.25)", fontSize: 10, fontWeight: 600,
                  fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase",
                  padding: "2px 4px",
                }}>
                  Clear
                </button>
              </div>

              {queue.map((q, i) => (
                <div
                  key={`queue-${i}-${q.enclosureUrl}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 20px",
                  }}
                >
                  {/* Index number */}
                  <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: `${ACCENT}15`,
                    border: `1px solid ${ACCENT}25`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 11, fontWeight: 700, color: ACCENT,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                    {i + 1}
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
                      {q.title}
                    </div>
                    {q.community && (
                      <span style={{
                        fontSize: 9, color: `${ACCENT}88`,
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}>
                        {q.community}
                      </span>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveFromQueue(i); }}
                    aria-label="Remove from queue"
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
              ))}
            </>
          )}

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

// ── Queue Toast ─────────────────────────────────────────────
// Brief notification when episode is added to queue

function QueueToast({ toast }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    setExiting(false);
    const t = setTimeout(() => setExiting(true), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div style={{
      position: "fixed",
      bottom: "calc(114px + env(safe-area-inset-bottom, 0px))",
      left: "50%", transform: "translateX(-50%)",
      zIndex: 10000,
      animation: exiting
        ? "nudgeSlideOut 0.35s ease forwards"
        : "nudgeSlideIn 0.3s cubic-bezier(0, 0.8, 0.2, 1) forwards",
      pointerEvents: "none",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 16px",
        background: "rgba(18,18,30,0.95)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${toast.duplicate ? "rgba(255,255,255,0.08)" : `${ACCENT}30`}`,
        borderRadius: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        whiteSpace: "nowrap",
      }}>
        {toast.duplicate ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: toast.duplicate ? "rgba(255,255,255,0.5)" : "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
          textTransform: "uppercase",
          letterSpacing: "0.03em",
        }}>
          {toast.duplicate ? "Already in queue" : "Added to Up Next"}
        </span>
      </div>
    </div>
  );
}

// ── Provider ────────────────────────────────────────────────

export default function AudioPlayerProvider({ children, session }) {
  const bridgeRef = useRef(null);
  // Lazily get the bridge singleton
  if (!bridgeRef.current) bridgeRef.current = getAudioBridge();
  const bridge = bridgeRef.current;

  const [currentEp, setCurrentEp] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState(null);       // null | string message
  const [bufferedPct, setBufferedPct] = useState(0); // 0-100, buffered range %
  const [fullScreen, setFullScreen] = useState(false);
  const [bubbleMode, setBubbleMode] = useState("badge"); // "badge" | "pill"
  const [activated, setActivated] = useState(false); // true once user plays something this session
  const [sleepTimer, setSleepTimer] = useState(null); // null | { label, deadline, timerId }
  const [queue, setQueue] = useState([]);             // session-only play queue
  const sleepTimerRef = useRef(null);
  const stallTimerRef = useRef(null);
  const seekTargetRef = useRef(null); // { time, ts } — holds seek position until playback catches up
  const queueRef = useRef([]);
  const advanceQueueRef = useRef(null);
  const queueToastRef = useRef(null);
  const [queueToast, setQueueToast] = useState(null); // null | { title }
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
        const idx = prev.findIndex(r => r.guid === saved.guid || r.enclosureUrl === saved.enclosureUrl);
        if (idx >= 0) {
          // Episode exists in recents — update position if bookmark is newer
          if (saved.time > prev[idx].time) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], time: saved.time, speed: saved.speed || updated[idx].speed, duration: saved.duration || updated[idx].duration, savedAt: saved.savedAt };
            return updated;
          }
          return prev;
        }
        return upsertRecent(prev, saved, saved.time, saved.speed || 1, saved.duration || 0);
      });
      localStorage.removeItem(STORAGE_KEY); // consumed — now lives in recents
    }
  }, [updateRecents]);

  // ── Bridge event listeners ────────────────────────────────
  useEffect(() => {
    const onTimeUpdate = ({ currentTime, duration: dur }) => {
      // If we're waiting for a seek to land, hold the optimistic position
      // until playback catches up (within 2s of target) or 8s timeout
      if (seekTargetRef.current) {
        const { time: target, ts } = seekTargetRef.current;
        const caught = Math.abs(currentTime - target) < 2;
        const expired = Date.now() - ts > 8000;
        if (caught || expired) {
          seekTargetRef.current = null;
        } else {
          // Suppress this timeupdate — keep showing the seek target
          return;
        }
      }
      setProgress(currentTime);
      setError(null);
      clearTimeout(stallTimerRef.current);
      const now = Date.now();
      if (now - saveThrottle.current > SAVE_INTERVAL) {
        saveThrottle.current = now;
        saveBookmark(currentEp, currentTime, speed, dur || bridge.duration);
        if (currentEp && currentTime > 15) {
          const updated = upsertRecent(recentsRef.current, currentEp, currentTime, speed, dur || bridge.duration);
          recentsRef.current = updated;
          persistRecents(updated);
        }
      }
    };
    const onDurationChange = ({ duration: dur }) => {
      setDuration(dur || 0);
    };
    const onPlay = () => {
      setIsPlaying(true); setBuffering(false); setError(null);
    };
    const onPause = () => {
      setIsPlaying(false);
      clearTimeout(stallTimerRef.current);
      const ct = bridge.currentTime;
      const dur = bridge.duration;
      saveBookmark(currentEp, ct, speed, dur);
      if (currentEp && ct > 15) {
        const updated = upsertRecent(recentsRef.current, currentEp, ct, speed, dur);
        recentsRef.current = updated;
        persistRecents(updated);
      }
    };
    const onEnded = () => {
      clearTimeout(stallTimerRef.current);
      // Analytics: track episode completion
      if (currentEp && session?.user?.id) {
        trackEvent(session.user.id, "episode_complete", {
          episode_title: currentEp.title,
          podcast_slug: currentEp.community || null,
          episode_id: currentEp.guid || null,
          duration_seconds: Math.round(bridge.duration || 0),
        });
      }
      // Sleep timer — end of episode
      if (sleepTimerRef.current?.endOfEpisode) {
        clearTimeout(sleepTimerRef.current.timerId);
        setSleepTimer(null);
        sleepTimerRef.current = null;
        setIsPlaying(false);
        return;
      }
      // Try to auto-advance from queue
      if (advanceQueueRef.current && advanceQueueRef.current()) return;
      setIsPlaying(false);
    };
    const onError = ({ message }) => {
      setError(message || "Playback error");
      setBuffering(false);
      setIsPlaying(false);
      clearTimeout(stallTimerRef.current);
      if (currentEp) reportDeadAudio(currentEp, message || "bridge_error");
    };
    const onWaiting = () => {
      setBuffering(true);
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = setTimeout(() => {
        setBuffering(false);
        setError("Stream stalled — check your connection");
        if (currentEp) reportDeadAudio(currentEp, "waiting_timeout");
      }, STALL_TIMEOUT);
    };
    const onCanPlay = () => {
      setBuffering(false); setError(null);
      clearTimeout(stallTimerRef.current);
    };
    const onBufferProgress = ({ bufferedPct: pct }) => {
      setBufferedPct(pct || 0);
    };
    // On native, sync UI when app regains focus after background playback
    const onFocusRegained = () => {
      // Force a state refresh — bridge already synced its internal state
      setProgress(bridge.currentTime);
    };

    bridge.on("timeupdate", onTimeUpdate);
    bridge.on("durationchange", onDurationChange);
    bridge.on("play", onPlay);
    bridge.on("pause", onPause);
    bridge.on("ended", onEnded);
    bridge.on("error", onError);
    bridge.on("waiting", onWaiting);
    bridge.on("canplay", onCanPlay);
    bridge.on("bufferprogress", onBufferProgress);
    bridge.on("focusregained", onFocusRegained);

    return () => {
      bridge.off("timeupdate", onTimeUpdate);
      bridge.off("durationchange", onDurationChange);
      bridge.off("play", onPlay);
      bridge.off("pause", onPause);
      bridge.off("ended", onEnded);
      bridge.off("error", onError);
      bridge.off("waiting", onWaiting);
      bridge.off("canplay", onCanPlay);
      bridge.off("bufferprogress", onBufferProgress);
      bridge.off("focusregained", onFocusRegained);
      clearTimeout(stallTimerRef.current);
    };
  }, [currentEp, speed, bridge]);

  // ── Save on visibility change / beforeunload ─────────────
  useEffect(() => {
    const save = async () => {
      if (currentEp) {
        const ct = bridge.isNative ? await bridge.getFreshCurrentTime() : bridge.currentTime;
        const dur = bridge.duration;
        saveBookmark(currentEp, ct, speed, dur);
        if (ct > 15) {
          const updated = upsertRecent(recentsRef.current, currentEp, ct, speed, dur);
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
  }, [currentEp, speed, bridge]);

  // ── Actions ──────────────────────────────────────────────

  // Legacy cleanup stub — bridge handles seeks internally now
  const cleanupPendingSeek = useCallback(() => {}, []);

  const playEpisode = useCallback((ep) => {
    if (!ep?.enclosureUrl) return;

    const isSameEp = currentEp && (currentEp.guid === ep.guid || currentEp.enclosureUrl === ep.enclosureUrl);
    if (isSameEp) {
      isPlaying ? bridge.pause() : bridge.play();
      return;
    }

    // Clean up any pending seek from a previous rapid switch
    cleanupPendingSeek();

    // Analytics: track new episode play
    trackEvent(session?.user?.id, "episode_play", {
      episode_title: ep.title,
      podcast_slug: ep.community || null,
      episode_id: ep.guid || null,
      resumed: !!(recentsRef.current.find(r => r.guid === ep.guid || r.enclosureUrl === ep.enclosureUrl)?.time > 15),
    });

    // Save current episode to recents before switching
    if (currentEp && bridge.currentTime > 15) {
      updateRecents(prev => upsertRecent(prev, currentEp, bridge.currentTime, speed, bridge.duration));
    }

    // Check if this episode has a saved position in recents (use ref for fresh value)
    const saved = recentsRef.current.find(r => r.guid === ep.guid || r.enclosureUrl === ep.enclosureUrl);

    setCurrentEp(ep);
    setBubbleMode("badge");
    setActivated(true);
    setBuffering(true);
    setError(null);
    setBufferedPct(0);

    const meta = { title: ep.title, artist: ep.community || "MANTL", artwork: ep.artwork || "" };

    if (saved && saved.time > 15) {
      setProgress(saved.time);
      setDuration(saved.duration || 0);
      setSpeed(saved.speed || speed);
      bridge.load(ep.enclosureUrl, meta, {
        seekTo: saved.time,
        rate: saved.speed || speed,
      }).then(() => bridge.play());
    } else {
      setProgress(0);
      setDuration(0);
      bridge.load(ep.enclosureUrl, meta, { rate: speed })
        .then(() => bridge.play());
    }
  }, [currentEp, isPlaying, speed, updateRecents, cleanupPendingSeek, bridge]);

  const togglePlay = useCallback(() => {
    if (!currentEp) return;
    isPlaying ? bridge.pause() : bridge.play();
  }, [isPlaying, currentEp, bridge]);

  const skip = useCallback((sec) => {
    const ct = bridge.currentTime;
    const newTime = Math.max(0, Math.min(duration || 0, ct + sec));
    bridge.seek(newTime);
  }, [bridge, duration]);

  const seekTo = useCallback((time) => {
    const clamped = Math.max(0, Math.min(duration || 0, time));
    // Optimistically show the seek target immediately
    setProgress(clamped);
    seekTargetRef.current = { time: clamped, ts: Date.now() };
    bridge.seek(clamped);
  }, [bridge, duration]);

  const cycleSpeed = useCallback(() => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    bridge.setRate(next);
  }, [speed, bridge]);

  // ── Retry — reload current episode's audio source ────────
  const retry = useCallback(() => {
    if (!currentEp?.enclosureUrl) return;
    setError(null);
    setBuffering(true);
    setBufferedPct(0);
    clearTimeout(stallTimerRef.current);
    const savedTime = bridge.currentTime || progress;
    const meta = { title: currentEp.title, artist: currentEp.community || "MANTL", artwork: currentEp.artwork || "" };
    bridge.load(currentEp.enclosureUrl, meta, { seekTo: savedTime > 5 ? savedTime : 0, rate: speed })
      .then(() => bridge.play());
  }, [currentEp, speed, progress, bridge]);

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
      bridge.pause();
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

  // ── Queue actions ──────────────────────────────────────
  const updateQueue = useCallback((updater) => {
    setQueue(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      queueRef.current = next;
      return next;
    });
  }, []);

  const addToQueue = useCallback((ep) => {
    if (!ep?.enclosureUrl) return;
    const isDuplicate = queueRef.current.some(q => q.enclosureUrl === ep.enclosureUrl);
    if (!isDuplicate) {
      updateQueue(prev => [...prev, ep]);
    }
    // Show toast
    clearTimeout(queueToastRef.current);
    setQueueToast(isDuplicate ? { title: ep.title, duplicate: true } : { title: ep.title });
    queueToastRef.current = setTimeout(() => setQueueToast(null), 2200);
  }, [updateQueue]);

  const playNextInQueue = useCallback((ep) => {
    if (!ep?.enclosureUrl) return;
    updateQueue(prev => {
      const filtered = prev.filter(q => q.enclosureUrl !== ep.enclosureUrl);
      return [ep, ...filtered];
    });
  }, [updateQueue]);

  const removeFromQueue = useCallback((index) => {
    updateQueue(prev => prev.filter((_, i) => i !== index));
  }, [updateQueue]);

  const clearQueue = useCallback(() => {
    updateQueue([]);
  }, [updateQueue]);

  // Auto-advance: play next queued episode when current one ends
  const advanceQueue = useCallback(() => {
    const next = queueRef.current[0];
    if (!next) return false;
    updateQueue(prev => prev.slice(1));
    // Save current to recents
    if (currentEp && bridge.currentTime > 15) {
      updateRecents(prev => upsertRecent(prev, currentEp, bridge.currentTime, speed, bridge.duration));
    }
    setCurrentEp(next);
    setProgress(0);
    setDuration(0);
    setBuffering(true);
    setError(null);
    setBufferedPct(0);
    const meta = { title: next.title, artist: next.community || "MANTL", artwork: next.artwork || "" };
    bridge.load(next.enclosureUrl, meta, { rate: speed })
      .then(() => bridge.play());
    return true;
  }, [currentEp, speed, updateRecents, updateQueue, bridge]);

  // Keep ref in sync so the ended handler always has the latest
  useEffect(() => { advanceQueueRef.current = advanceQueue; }, [advanceQueue]);

  const stop = useCallback(() => {
    cleanupPendingSeek();
    clearSleepTimer();
    clearQueue();
    bridge.destroy();
    setCurrentEp(null);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setError(null);
    setFullScreen(false);
    setBubbleMode("badge");
  }, [cleanupPendingSeek, clearSleepTimer, clearQueue, bridge]);

  // Dismiss — save position to recents so user can resume later, then clean up
  const dismiss = useCallback(() => {
    // Explicitly save to recents before tearing down
    const ct = bridge.currentTime;
    const dur = bridge.duration;
    if (currentEp && ct > 5) {
      updateRecents(prev => upsertRecent(prev, currentEp, ct, speed, dur));
      saveBookmark(currentEp, ct, speed, dur);
    }
    cleanupPendingSeek();
    clearSleepTimer();
    bridge.destroy();
    setCurrentEp(null);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setError(null);
    setFullScreen(false);
    setBubbleMode("badge");
  }, [currentEp, speed, updateRecents, cleanupPendingSeek, clearSleepTimer, bridge]);

  const openFullScreen = useCallback(() => { setFullScreen(true); }, []);
  const closeFullScreen = useCallback(() => setFullScreen(false), []);
  const minimize = useCallback(() => setBubbleMode("badge"), []);
  const restore = useCallback(() => setBubbleMode("pill"), []);

  // Resume a recently played episode from its saved position
  const resumeRecent = useCallback((recent) => {
    if (!recent?.enclosureUrl) return;

    cleanupPendingSeek();

    // Save current episode to recents before switching
    if (currentEp && bridge.currentTime > 15) {
      updateRecents(prev => upsertRecent(prev, currentEp, bridge.currentTime, speed, bridge.duration));
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
    setBufferedPct(0);

    const meta = { title: ep.title, artist: ep.community || "MANTL", artwork: ep.artwork || "" };
    bridge.load(ep.enclosureUrl, meta, { seekTo: resumeTime, rate: resumeSpeed })
      .then(() => bridge.play());
  }, [currentEp, speed, updateRecents, cleanupPendingSeek, bridge]);

  // Remove a single episode from recents
  const clearRecent = useCallback((guid) => {
    updateRecents(prev => prev.filter(r => r.guid !== guid));
  }, [updateRecents]);

  // ── Media notification ──────────────────────────────────────
  // On native: the @mediagrid/capacitor-native-audio plugin handles all
  // notification/lock-screen controls via its built-in foreground service.
  // On web: the bridge sets up navigator.mediaSession in load().
  // Update metadata when episode changes (web only — native sets it in load()).
  useEffect(() => {
    if (bridge.isNative || !currentEp) return;
    bridge.changeMetadata({
      title: currentEp.title || "Unknown Episode",
      artist: currentEp.community || "MANTL",
      artwork: currentEp.artwork || currentEp.image || "",
    });
  }, [currentEp, bridge]);

  // ── Context value ────────────────────────────────────────

  const value = useMemo(() => ({
    currentEp, isPlaying, progress, duration, speed, buffering, error, bufferedPct, recents, queue,
    bubbleMode, activated, play: playEpisode, togglePlay, skip, stop, dismiss, cycleSpeed, retry,
    openFullScreen, fullScreen, resumeRecent, clearRecent, minimize, restore,
    sleepTimer, setSleepTimer: setSleepTimerAction, clearSleepTimer,
    addToQueue, playNext: playNextInQueue, removeFromQueue, clearQueue,
  }), [
    currentEp, isPlaying, progress, duration, speed, buffering, error, bufferedPct, recents, queue,
    bubbleMode, activated, playEpisode, togglePlay, skip, stop, dismiss, cycleSpeed, retry, openFullScreen, fullScreen,
    resumeRecent, clearRecent, minimize, restore,
    sleepTimer, setSleepTimerAction, clearSleepTimer,
    addToQueue, playNextInQueue, removeFromQueue, clearQueue,
  ]);

  // ── Render ───────────────────────────────────────────────

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}

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
        @keyframes skipFlashIn {
          from { opacity: 0; }
          to { opacity: 1; }
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
          queueCount={queue.length}
          onTogglePlay={togglePlay}
          onExpand={restore}
          onCollapse={minimize}
          onOpenFull={openFullScreen}
          onDismiss={dismiss}
          onRetry={retry}
        />,
        document.body
      )}


      {/* Queue toast — brief feedback when episode is added */}
      {queueToast && createPortal(
        <QueueToast toast={queueToast} />,
        document.body
      )}

      {/* Full-screen sheet — can open with or without a current episode */}
      {fullScreen && createPortal(
        <FullScreenPlayer
          episode={currentEp}
          isPlaying={isPlaying}
          buffering={buffering}
          error={error}
          bufferedPct={bufferedPct}
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
          queue={queue}
          onRemoveFromQueue={removeFromQueue}
          onClearQueue={clearQueue}
        />,
        document.body
      )}
    </AudioPlayerContext.Provider>
  );
}
