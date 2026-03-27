import { t } from "../../../theme";
import { useState, useEffect, useRef } from "react";

/**
 * BadgeProgressToast — Animated toast for badge progress and completion.
 *
 * Two modes:
 *   Progress   — compact, brief slide-up with progress tagline
 *   Completion — larger, dramatic entrance with glow + shimmer, holds longer
 *
 * Props:
 *   badge       — badge row (name, image_url, accent_color, progress_tagline)
 *   current     — number of items completed
 *   total       — total items required
 *   isComplete  — whether this log just completed the badge
 *   visible     — controls show/hide (parent still controls timing)
 *   bottomOffset — px from bottom
 *   onTap       — tap handler (usually opens celebration or badge detail)
 *
 * Suggested parent timing:
 *   Progress:   show 2.5s
 *   Completion: show 4.5s
 */
export default function BadgeProgressToast({ badge, current, total, isComplete, visible, bottomOffset, onTap }) {
  const accent = badge?.accent_color || "#ff6a00";
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const [phase, setPhase] = useState(0); // 0=hidden, 1=entering, 2=visible, 3=exiting
  const prevVisible = useRef(false);

  // Blur scales inversely with progress — matches BadgePage reveal
  const blurAmount = Math.round(20 - ((pct / 100) * 14));

  // Internal phase management for richer animation sequencing
  useEffect(() => {
    if (visible && !prevVisible.current) {
      setPhase(1);
      const t = setTimeout(() => setPhase(2), 50);
      return () => clearTimeout(t);
    }
    if (!visible && prevVisible.current) {
      setPhase(3);
      const t = setTimeout(() => setPhase(0), 500);
      return () => clearTimeout(t);
    }
    prevVisible.current = visible;
  }, [visible]);

  // Keep ref in sync outside of effect
  useEffect(() => { prevVisible.current = visible; });

  if (!badge || phase === 0) return null;

  const isShowing = phase === 2;
  const isLeaving = phase === 3;

  // ── Completion mode: bigger, bolder ──
  if (isComplete) {
    return (
      <div
        onClick={onTap || undefined}
        style={{
          position: "fixed",
          bottom: bottomOffset ?? 24,
          left: "50%",
          transform: isShowing
            ? "translateX(-50%) translateY(0) scale(1)"
            : isLeaving
              ? "translateX(-50%) translateY(20px) scale(0.92)"
              : "translateX(-50%) translateY(60px) scale(0.85)",
          opacity: isShowing ? 1 : 0,
          transition: isLeaving
            ? "all 0.4s cubic-bezier(0.4, 0, 1, 1)"
            : "all 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          zIndex: 900,
          background: "#0f1a10",
          border: "1px solid #22c55e44",
          borderRadius: 18,
          padding: "18px 22px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          minWidth: 320,
          maxWidth: 400,
          pointerEvents: onTap ? "auto" : "none",
          cursor: onTap ? "pointer" : "default",
          boxShadow: `
            0 16px 50px rgba(0,0,0,0.8),
            0 0 40px #22c55e15,
            inset 0 1px 0 rgba(34,197,94,0.1)
          `,
        }}
      >
        <style>{`
          @keyframes badgeToastGlow {
            0%, 100% { box-shadow: 0 0 12px #22c55e25, inset 0 0 8px #22c55e08; }
            50% { box-shadow: 0 0 24px #22c55e40, inset 0 0 12px #22c55e15; }
          }
          @keyframes badgeToastShimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
          @keyframes badgeToastCheck {
            0% { transform: scale(0) rotate(-45deg); opacity: 0; }
            50% { transform: scale(1.3) rotate(0deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
        `}</style>

        {/* Badge icon — larger, with glow ring */}
        <div style={{
          width: 50, height: 50, borderRadius: "50%",
          overflow: "hidden", flexShrink: 0,
          border: "2px solid #22c55e55",
          animation: isShowing ? "badgeToastGlow 2s ease-in-out infinite" : "none",
          position: "relative",
        }}>
          {badge.image_url ? (
            <img
              src={badge.image_url}
              alt=""
              style={{
                width: "100%", height: "100%", objectFit: "cover",
                filter: `blur(${blurAmount}px) brightness(0.7)`,
                transform: "scale(1.15)",
              }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              background: "#22c55e18",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22,
            }}>🏆</div>
          )}
          {/* Check overlay */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.3)",
          }}>
            <span style={{
              fontSize: 20, color: t.green,
              animation: isShowing ? "badgeToastCheck 0.5s 0.3s ease-out both" : "none",
              textShadow: "0 0 12px #22c55e60",
            }}>✓</span>
          </div>
        </div>

        {/* Completion info */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase",
            color: t.green, fontWeight: 700, marginBottom: 4,
          }}>
            Badge Unlocked
          </div>
          <div style={{
            fontSize: 16, color: t.textPrimary, fontWeight: 700, marginBottom: 8,
            lineHeight: 1.2,
          }}>
            {badge.name}
          </div>
          {/* Filled progress bar with shimmer */}
          <div style={{
            height: 5, borderRadius: 3, background: "#ffffff10",
            overflow: "hidden", position: "relative",
          }}>
            <div style={{
              height: "100%", width: "100%",
              background: "linear-gradient(90deg, #22c55e, #16a34a)",
              borderRadius: 3,
            }} />
            {/* Shimmer sweep */}
            <div style={{
              position: "absolute", inset: 0,
              overflow: "hidden", borderRadius: 3,
            }}>
              <div style={{
                width: "40%", height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                animation: isShowing ? "badgeToastShimmer 1.5s 0.4s ease-in-out infinite" : "none",
              }} />
            </div>
          </div>
          <div style={{
            fontSize: 10, color: "#ffffff35", marginTop: 5,
            letterSpacing: 0.5,
          }}>
            Tap to celebrate
          </div>
        </div>
      </div>
    );
  }

  // ── Progress mode: compact, snappy ──
  return (
    <div
      onClick={onTap || undefined}
      style={{
        position: "fixed",
        bottom: bottomOffset ?? 24,
        left: "50%",
        transform: isShowing
          ? "translateX(-50%) translateY(0)"
          : isLeaving
            ? "translateX(-50%) translateY(60px)"
            : "translateX(-50%) translateY(80px)",
        opacity: isShowing ? 1 : 0,
        transition: isLeaving
          ? "all 0.35s cubic-bezier(0.4, 0, 1, 1)"
          : "all 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        zIndex: 900,
        background: "#1c1710",
        border: `1px solid ${accent}35`,
        borderRadius: 14,
        padding: "12px 18px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: `0 12px 40px rgba(0,0,0,0.7), 0 0 20px ${accent}08`,
        minWidth: 280,
        maxWidth: 360,
        pointerEvents: onTap ? "auto" : "none",
        cursor: onTap ? "pointer" : "default",
      }}
    >
      <style>{`
        @keyframes badgeProgressFill {
          from { width: var(--from-pct); }
          to { width: var(--to-pct); }
        }
      `}</style>

      {/* Badge icon — compact */}
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        overflow: "hidden", flexShrink: 0,
        border: `1.5px solid ${accent}30`,
      }}>
        {badge.image_url ? (
          <img
            src={badge.image_url}
            alt=""
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              filter: `blur(${blurAmount}px) brightness(0.7)`,
              transform: "scale(1.15)",
            }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: `${accent}20`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>🏆</div>
        )}
      </div>

      {/* Progress info */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 12, color: t.textPrimary, fontWeight: 600, marginBottom: 3,
          display: "flex", alignItems: "center", gap: 7,
        }}>
          <span>{current}/{total}</span>
          <span style={{ color: t.textFaint }}>·</span>
          <span style={{
            color: `${accent}cc`,
            fontSize: 11, fontWeight: 600,
          }}>
            {badge.name}
          </span>
        </div>
        {badge.progress_tagline && (
          <div style={{
            fontSize: 10, color: t.textFaint, fontStyle: "italic",
            marginBottom: 4,
            lineHeight: 1.25,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {badge.progress_tagline}
          </div>
        )}
        <div style={{
          height: 3, borderRadius: 2, background: "#ffffff0a", overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${accent}, ${accent}dd)`,
            borderRadius: 2,
            transition: "width 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }} />
        </div>
      </div>
    </div>
  );
}
