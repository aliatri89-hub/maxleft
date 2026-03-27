import { t } from "../../../theme";
import { useState, useEffect, useRef } from "react";

/**
 * ComedyPointsToast — Blank Check "Comedy Points" celebration.
 *
 * When a user logs a comedy in the BC community, a coin-flip sound plays
 * and a gold toast floats up showing "+X Comedy Points" (random 1–1000).
 * A perfect recreation of the podcast bit — completely meaningless,
 * completely delightful.
 *
 * Props:
 *   points   – number to display (1–1000)
 *   visible  – boolean to trigger entrance/exit
 *   onDone   – called after exit animation completes
 */

const COIN_SOUND = "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/coin-flip-whirl-high-pitched-land-solid-surface-bounce-SBA-300083238.mp3";

export default function ComedyPointsToast({ points, visible, onDone }) {
  const [phase, setPhase] = useState("idle"); // idle → entering → holding → exiting → done
  const audioRef = useRef(null);

  useEffect(() => {
    if (!visible) return;

    // Play coin sound
    try {
      audioRef.current = new Audio(COIN_SOUND);
      audioRef.current.volume = 0.6;
      audioRef.current.play().catch(() => {});
    } catch {}

    // Animation sequence
    setPhase("entering");
    const t0 = setTimeout(() => setPhase("holding"), 50);
    const t1 = setTimeout(() => setPhase("exiting"), 2850);
    const t2 = setTimeout(() => {
      setPhase("done");
      onDone?.();
    }, 3350);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (phase === "idle" || phase === "done") return null;

  const isEntering = phase === "entering";
  const isExiting = phase === "exiting";

  // Format points with dramatic flair
  const pointsStr = points.toLocaleString();

  return (
    <>
      <style>{`
        @keyframes cp-coin-spin {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(1080deg); }
        }
        @keyframes cp-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes cp-number-pop {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes cp-sparkle {
          0% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
          100% { opacity: 0; transform: scale(0.5) rotate(360deg); }
        }
      `}</style>
      <div style={{
        position: "fixed",
        bottom: 100,
        left: "50%",
        transform: `translateX(-50%) translateY(${isEntering ? 40 : isExiting ? -20 : 0}px) scale(${isEntering ? 0.8 : isExiting ? 0.9 : 1})`,
        opacity: isEntering ? 0 : isExiting ? 0 : 1,
        transition: isExiting
          ? "all 0.5s cubic-bezier(0.4, 0, 1, 1)"
          : "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        zIndex: 9999,
        pointerEvents: "none",
      }}>
        {/* Sparkle particles */}
        {phase === "holding" && [0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{
            position: "absolute",
            width: 6, height: 6,
            borderRadius: "50%",
            background: i % 2 === 0 ? "#f5c542" : "#fde68a",
            top: `${20 + Math.sin(i * 1.2) * 30}%`,
            left: `${10 + (i * 16)}%`,
            animation: `cp-sparkle ${0.6 + i * 0.15}s ease-out ${i * 0.12}s both`,
          }} />
        ))}

        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "14px 24px 14px 18px",
          background: "linear-gradient(135deg, #1a1608 0%, #2a1f0a 50%, #1a1608 100%)",
          border: "1.5px solid rgba(245, 197, 66, 0.35)",
          borderRadius: 16,
          boxShadow: "0 8px 32px rgba(245, 197, 66, 0.15), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(245, 197, 66, 0.1)",
          minWidth: 220,
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Shimmer sweep */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(105deg, transparent 40%, rgba(245,197,66,0.06) 45%, rgba(245,197,66,0.12) 50%, rgba(245,197,66,0.06) 55%, transparent 60%)",
            backgroundSize: "200% 100%",
            animation: "cp-shimmer 2s ease-in-out 0.5s 1",
            pointerEvents: "none",
          }} />

          {/* Coin */}
          <div style={{
            width: 42, height: 42, borderRadius: "50%",
            background: "linear-gradient(145deg, #f5c542, #d4a012, #f5c542)",
            border: "2px solid #d4a012",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 12px rgba(245, 197, 66, 0.3), inset 0 -2px 4px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.3)",
            animation: phase === "holding" ? "cp-coin-spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.1s 1" : "none",
            perspective: 400,
          }}>
            <span style={{
              fontSize: 20, fontWeight: 900,
              color: "#1a1608",
              fontFamily: "'Barlow Condensed', Georgia, serif",
              textShadow: "0 1px 0 rgba(255,255,255,0.3)",
              lineHeight: 1,
            }}>¢</span>
          </div>

          {/* Points text */}
          <div style={{ position: "relative" }}>
            <div style={{
              fontFamily: t.fontDisplay,
              fontWeight: 800,
              fontSize: 26,
              color: t.gold,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              animation: phase === "holding" ? "cp-number-pop 0.35s ease-out 0.2s both" : "none",
              textShadow: "0 0 20px rgba(245, 197, 66, 0.3)",
            }}>
              +{pointsStr}
            </div>
            <div style={{
              fontFamily: t.fontDisplay,
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(245, 197, 66, 0.6)",
              marginTop: 2,
            }}>
              Comedy Points
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
