/**
 * FullScreenPlayer.jsx
 * Full-screen sheet player — artwork, scrubber, transport controls,
 * sleep timer, queue list, and recents list.
 * Receives all state and callbacks via props — no context reads.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { t } from "../../../../theme";
import { FadeImg } from "../../../feed/FeedPrimitives";
import {
  ACCENT,
  SLEEP_OPTIONS,
  fmt,
  cleanDescription,
  renderWithTimecodes,
} from "./audioHelpers";

export default function FullScreenPlayer({
  episode, isPlaying, buffering, error, bufferedPct, progress, duration, speed,
  recents, queue, onTogglePlay, onSkip, onSeek, onCycleSpeed, onRetry,
  onResumeRecent, onClearRecent, onStop, onClose,
  sleepTimer, onSetSleep, onClearSleep,
  onRemoveFromQueue, onClearQueue,
}) {
  const scrubberRef = useRef(null);
  const sheetRef = useRef(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [closing, setClosing] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [skipFlash, setSkipFlash] = useState(null); // null | "back" | "fwd"
  const lastTapRef = useRef({ time: 0, x: 0 });
  const skipFlashTimer = useRef(null);
  const dragRef = useRef({ startY: 0, currentY: 0, dragging: false });

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

  // ── Swipe-down to dismiss ──
  const handleSheetTouchStart = useCallback((e) => {
    // Only start drag if the scrollable content is at top (or touch is on the handle area)
    const sheet = sheetRef.current;
    if (!sheet) return;
    const scrollable = sheet.querySelector("[data-scroll]");
    const atTop = !scrollable || scrollable.scrollTop <= 0;
    if (!atTop) return;
    dragRef.current = { startY: e.touches[0].clientY, currentY: e.touches[0].clientY, dragging: false };
  }, []);

  const handleSheetTouchMove = useCallback((e) => {
    const d = dragRef.current;
    if (d.startY === 0) return;
    const y = e.touches[0].clientY;
    const delta = y - d.startY;
    // Only drag downward
    if (delta > 8) {
      d.dragging = true;
      d.currentY = y;
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${delta}px)`;
        sheetRef.current.style.transition = "none";
      }
      e.preventDefault();
    }
  }, []);

  const handleSheetTouchEnd = useCallback(() => {
    const d = dragRef.current;
    if (!d.dragging) { dragRef.current = { startY: 0, currentY: 0, dragging: false }; return; }
    const delta = d.currentY - d.startY;
    if (delta > 120) {
      // Past threshold — dismiss
      if (sheetRef.current) {
        sheetRef.current.style.transform = "translateY(100%)";
        sheetRef.current.style.transition = "transform 0.25s ease";
      }
      setTimeout(onClose, 250);
    } else {
      // Snap back
      if (sheetRef.current) {
        sheetRef.current.style.transform = "translateY(0)";
        sheetRef.current.style.transition = "transform 0.2s ease";
      }
    }
    dragRef.current = { startY: 0, currentY: 0, dragging: false };
  }, [onClose]);

  // ── Attach swipe-down listeners as non-passive (needed for preventDefault) ──
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const onStart = (e) => handleSheetTouchStart(e);
    const onMove = (e) => handleSheetTouchMove(e);
    const onEnd = () => handleSheetTouchEnd();
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [handleSheetTouchStart, handleSheetTouchMove, handleSheetTouchEnd]);

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
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(180deg, #16162a 0%, #0d0d1a 100%)",
          borderRadius: "24px 24px 0 0",
          maxHeight: "80dvh",
          display: "flex", flexDirection: "column",
          animation: closing ? "audioSheetSlideOut 0.28s ease forwards" : "audioSheetSlideIn 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)",
          paddingBottom: "var(--sab)",
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
              color: t.textSecondary, cursor: "pointer",
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
              <FadeImg src={episode.artwork} alt="" placeholderColor="#2a2520"
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                    color: t.textPrimary, opacity: 0.9,
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
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: t.fontMono }}>15s</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Title */}
          <div style={{
            fontSize: 20, fontWeight: 800,
            color: t.textPrimary,
            fontFamily: t.fontDisplay,
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
            color: t.textSecondary,
            fontFamily: t.fontMono,
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
                fontSize: 14, lineHeight: 1.55,
                color: t.textSecondary,
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
                  fontFamily: t.fontMono,
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
            <div style={{ flex: 1, fontSize: 11, color: t.textSecondary, fontFamily: t.fontMono }}>
              {error}
            </div>
            <button onClick={onRetry} style={{
              background: "rgba(255,68,68,0.2)", border: "1px solid rgba(255,68,68,0.3)",
              borderRadius: 6, padding: "4px 10px", cursor: "pointer",
              color: t.red, fontSize: 11, fontWeight: 700,
              fontFamily: t.fontDisplay, textTransform: "uppercase",
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
            color: t.textSecondary,
            fontFamily: t.fontMono,
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
              color: speed !== 1 ? ACCENT : t.textFaint,
              fontSize: 13, fontWeight: 700,
              cursor: "pointer",
              fontFamily: t.fontMono,
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
              color: t.textSecondary, padding: 8,
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
              color: t.textSecondary, padding: 8,
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
              color: sleepTimer ? ACCENT : t.textFaint,
              fontSize: 11, fontWeight: 700,
              cursor: "pointer",
              fontFamily: t.fontMono,
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
                  fontFamily: t.fontMono,
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
              color: t.textSecondary,
              fontSize: 11, fontWeight: 700,
              cursor: "pointer",
              fontFamily: t.fontDisplay,
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
              width: 80, height: 80, borderRadius: "50%",
              margin: "0 auto 16px",
              overflow: "hidden",
              opacity: 0.55,
            }}>
              <img src="/icons/icon-512.png" alt="MANTL" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{
              fontSize: 16, fontWeight: 700,
              color: t.textSecondary,
              fontFamily: t.fontDisplay,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}>
              {recents.length > 0 ? "Pick Up Where You Left Off" : "Nothing Playing"}
            </div>
            <div style={{
              fontSize: 11,
              color: t.textSecondary,
              fontFamily: t.fontMono,
              marginTop: 4,
            }}>
              {recents.length > 0 ? "Resume a recent episode below" : "Log something in a community to find episodes"}
            </div>
          </div>
        )}

        {/* ── Scrollable content: Recents ── */}
        <div data-scroll style={{
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
                fontFamily: t.fontDisplay,
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
                  color: t.textSecondary, fontSize: 10, fontWeight: 600,
                  fontFamily: t.fontMono, textTransform: "uppercase",
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
                    fontFamily: t.fontMono,
                  }}>
                    {i + 1}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700,
                      color: t.textSecondary,
                      fontFamily: t.fontDisplay,
                      textTransform: "uppercase",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      lineHeight: 1.3,
                    }}>
                      {q.title}
                    </div>
                    {q.community && (
                      <span style={{
                        fontSize: 9, color: `${ACCENT}88`,
                        fontFamily: t.fontMono,
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
                      color: t.textSecondary,
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
                    fontSize: 13,
                    color: t.textSecondary,
                    fontFamily: t.fontSerif,
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
                fontFamily: t.fontDisplay,
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
                        color: t.textSecondary,
                        fontFamily: t.fontDisplay,
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
                            fontFamily: t.fontMono,
                            whiteSpace: "nowrap",
                          }}>
                            {r.community}
                          </span>
                        )}
                        {r.community && <span style={{ color: t.textFaint, fontSize: 9 }}>·</span>}
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
                          color: t.textSecondary,
                          fontFamily: t.fontMono,
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
                        color: t.textSecondary,
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
