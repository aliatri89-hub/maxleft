/**
 * PlayerBubble.jsx
 * Mini floating player — morphs between badge (circle) and pill (strip) states.
 * Receives all state and callbacks via props — no context reads.
 */

import { useRef, useState } from "react";
import { t } from "../../../../theme";
import { ACCENT, fmt } from "./audioHelpers";

const DISMISS_THRESHOLD = 60;

export default function PlayerBubble({
  episode,
  isPlaying,
  buffering,
  error,
  progress,
  duration,
  mode,
  queueCount,
  onTogglePlay,
  onExpand,
  onCollapse,
  onOpenFull,
  onDismiss,
  onRetry,
}) {
  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const isBadge = mode === "badge";

  // Remaining time for pill
  const remainingMin = duration > 0 ? Math.ceil((duration - progress) / 60) : null;

  // ── Swipe-down-to-dismiss ──
  const swipeRef = useRef(null); // { startY, startX, locked: bool }
  const [dragY, setDragY] = useState(0);
  const [dismissing, setDismissing] = useState(false);

  const handleTouchStart = (e) => {
    if (dismissing) return;
    swipeRef.current = {
      startY: e.touches[0].clientY,
      startX: e.touches[0].clientX,
      locked: false,
    };
  };

  const handleTouchMove = (e) => {
    if (!swipeRef.current || dismissing) return;
    const dy = e.touches[0].clientY - swipeRef.current.startY;
    const dx = e.touches[0].clientX - swipeRef.current.startX;
    // Lock direction — if horizontal swipe, bail
    if (!swipeRef.current.locked) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
        swipeRef.current = null;
        return;
      }
      if (Math.abs(dy) > 8) swipeRef.current.locked = true;
    }
    if (swipeRef.current.locked && dy > 0) {
      setDragY(dy);
    }
  };

  const handleTouchEnd = () => {
    if (!swipeRef.current || dismissing) {
      swipeRef.current = null;
      return;
    }
    if (dragY > DISMISS_THRESHOLD) {
      setDismissing(true);
      setTimeout(() => {
        onDismiss();
        setDismissing(false);
        setDragY(0);
      }, 250);
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
        bottom: "calc(62px + var(--sab))",
        right: isBadge ? 16 : 12,
        left: "auto",
        zIndex: 9999,
        width: isBadge ? 44 : "auto",
        maxWidth: isBadge ? 44 : "calc(100% - 24px)",
        height: 44,
        borderRadius: isBadge ? "50%" : 22,
        background: isBadge
          ? (isPlaying || buffering)
            ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT}dd)`
            : "rgba(24,24,40,0.97)"
          : "rgba(12,12,22,0.97)",
        backdropFilter: isBadge ? "none" : "blur(20px)",
        WebkitBackdropFilter: isBadge ? "none" : "blur(20px)",
        border: isBadge
          ? `1.5px solid ${(isPlaying || buffering) ? ACCENT : `${ACCENT}40`}`
          : `1px solid ${ACCENT}25`,
        display: "flex",
        alignItems: "center",
        justifyContent: isBadge ? "center" : "flex-start",
        overflow: "hidden",
        touchAction: "none",
        cursor: isBadge ? "pointer" : "default",
        boxShadow: isBadge
          ? (isPlaying || buffering)
            ? `0 2px 12px ${ACCENT}44`
            : "0 2px 8px rgba(0,0,0,0.3)"
          : `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)`,
        transform: dismissing
          ? `translateY(${dragY + 80}px) scale(0.9)`
          : dragY > 0
          ? `translateY(${dragY}px)`
          : "none",
        opacity: dismissing ? 0 : dragY > 0 ? Math.max(0, 1 - dragY / 150) : 1,
        transition:
          dragY > 0 && !dismissing
            ? "none"
            : dismissing
            ? "transform 0.25s cubic-bezier(0.4, 0, 1, 1), opacity 0.25s ease"
            : "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* ═══ BADGE content ═══ */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: isBadge ? 1 : 0,
          transition: "opacity 0.2s ease",
          pointerEvents: isBadge ? "auto" : "none",
        }}
      >
        {error ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff4444" stroke="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        ) : buffering ? (
          <div
            style={{
              width: 18,
              height: 18,
              border: `2.5px solid ${isPlaying ? "#0a0a0a" : ACCENT}`,
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "audioSpin 0.8s linear infinite",
            }}
          />
        ) : isPlaying ? (
          <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 14 }}>
            {[0, 1, 2].map((j) => (
              <div
                key={j}
                style={{
                  width: 3,
                  borderRadius: 1,
                  background: t.bgPrimary,
                  animation: `audioEqBar 0.5s ease ${j * 0.12}s infinite alternate`,
                }}
              />
            ))}
          </div>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill={ACCENT}>
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </div>

      {/* ═══ PILL content ═══ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: isBadge ? "0" : "0 6px 0 4px",
          width: "100%",
          height: "100%",
          opacity: isBadge ? 0 : 1,
          transition: "opacity 0.15s ease",
          pointerEvents: isBadge ? "none" : "auto",
          position: isBadge ? "absolute" : "relative",
          top: 0,
          left: 0,
          right: 0,
        }}
      >
        {/* Play/Pause */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            error ? onRetry() : onTogglePlay();
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: error ? "#ff4444" : ACCENT,
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {error ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" stroke="none">
              <path d="M17.65 6.35A7.96 7.96 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
            </svg>
          ) : buffering ? (
            <div
              style={{
                width: 14,
                height: 14,
                border: "2px solid #0a0a0a",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "audioSpin 0.8s linear infinite",
              }}
            />
          ) : isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Title — tap to open full screen */}
        <div
          onClick={(e) => { e.stopPropagation(); onOpenFull(); }}
          style={{ flex: 1, minWidth: 0, cursor: "pointer", padding: "4px 0" }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: t.textPrimary,
              fontFamily: t.fontDisplay,
              textTransform: "uppercase",
              letterSpacing: "0.02em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.2,
            }}
          >
            {episode.title}
          </div>
          <div
            style={{
              fontSize: 9,
              color: t.textSecondary,
              fontFamily: t.fontMono,
              marginTop: 1,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {error ? (
              <span style={{ color: t.red }}>Tap to retry</span>
            ) : (
              <>
                {episode.community && (
                  <span style={{ color: `${ACCENT}77` }}>{episode.community}</span>
                )}
                {episode.community && (
                  <span style={{ color: t.textFaint }}>·</span>
                )}
                <span>{remainingMin ? `${remainingMin}m left` : fmt(progress)}</span>
                {queueCount > 0 && (
                  <>
                    <span style={{ color: t.textFaint }}>·</span>
                    <span style={{ color: `${ACCENT}77` }}>{queueCount} queued</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Collapse to badge */}
        <button
          onClick={(e) => { e.stopPropagation(); onCollapse(); }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: t.textSecondary,
            padding: 6,
            display: "flex",
            flexShrink: 0,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Progress line along bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 8,
            right: 8,
            height: 2,
            borderRadius: 1,
            background: "rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 1,
              width: `${pct}%`,
              background: `${ACCENT}88`,
              transition: "width 0.4s linear",
            }}
          />
        </div>
      </div>
    </div>
  );
}
