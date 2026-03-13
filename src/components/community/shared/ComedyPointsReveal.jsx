import { useState, useEffect } from "react";

/**
 * ComedyPointsReveal — Secret comedy points total display.
 *
 * Triggered by tapping the feed tab 5 times. Shows the user's
 * lifetime comedy points total with a dramatic coin vault reveal.
 * Completely hidden unless you know the secret.
 *
 * Props:
 *   userId   – for localStorage key lookup
 *   onClose  – dismiss callback
 */

const LS_KEY_PREFIX = "mantl_comedy_pts_";

export default function ComedyPointsReveal({ userId, onClose }) {
  const [phase, setPhase] = useState("enter"); // enter → show → exit
  const total = (() => {
    try {
      return parseInt(localStorage.getItem(LS_KEY_PREFIX + userId), 10) || 0;
    } catch { return 0; }
  })();

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 50);
    try {
      const audio = new Audio("https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/coin-flip-whirl-high-pitched-land-solid-surface-bounce-SBA-300083238.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {}
    return () => clearTimeout(t1);
  }, []);

  const handleClose = () => {
    setPhase("exit");
    setTimeout(() => onClose?.(), 350);
  };

  const isShow = phase === "show";
  const isExit = phase === "exit";

  return (
    <>
      <style>{`
        @keyframes cpr-coin-float {
          0%, 100% { transform: translateY(0) rotateY(0deg); }
          25% { transform: translateY(-6px) rotateY(90deg); }
          50% { transform: translateY(0) rotateY(180deg); }
          75% { transform: translateY(-3px) rotateY(270deg); }
        }
        @keyframes cpr-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes cpr-digit-pop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          opacity: isShow ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Card */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: isShow
            ? "translate(-50%, -50%) scale(1)"
            : isExit
            ? "translate(-50%, -50%) scale(0.9)"
            : "translate(-50%, -45%) scale(0.9)",
          opacity: isShow ? 1 : 0,
          transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
          zIndex: 9999,
          cursor: "pointer",
        }}
      >
        <div style={{
          width: 260,
          padding: "32px 28px 28px",
          background: "linear-gradient(145deg, #1a1608, #2a1f0a, #1a1608)",
          border: "1.5px solid rgba(245, 197, 66, 0.3)",
          borderRadius: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(245, 197, 66, 0.08)",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Shimmer */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(105deg, transparent 40%, rgba(245,197,66,0.05) 45%, rgba(245,197,66,0.1) 50%, rgba(245,197,66,0.05) 55%, transparent 60%)",
            backgroundSize: "200% 100%",
            animation: "cpr-shimmer 3s ease-in-out 0.5s infinite",
            pointerEvents: "none",
          }} />

          {/* Ambient glow */}
          <div style={{
            position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)",
            width: 200, height: 120, borderRadius: "50%",
            background: "#f5c542",
            opacity: 0.06, filter: "blur(40px)",
            pointerEvents: "none",
          }} />

          {/* Label */}
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "rgba(245, 197, 66, 0.45)",
            marginBottom: 16,
            position: "relative",
          }}>
            Your Comedy Points
          </div>

          {/* Coin */}
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "linear-gradient(145deg, #f5c542, #d4a012, #f5c542)",
            border: "2.5px solid #d4a012",
            margin: "0 auto 20px",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 20px rgba(245, 197, 66, 0.25), inset 0 -2px 6px rgba(0,0,0,0.2), inset 0 2px 6px rgba(255,255,255,0.3)",
            animation: isShow ? "cpr-coin-float 3s ease-in-out 0.3s infinite" : "none",
            position: "relative",
          }}>
            <span style={{
              fontSize: 28, fontWeight: 900,
              color: "#1a1608",
              fontFamily: "'Barlow Condensed', Georgia, serif",
              textShadow: "0 1px 0 rgba(255,255,255,0.3)",
              lineHeight: 1,
            }}>¢</span>
          </div>

          {/* Total */}
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            fontSize: total >= 10000 ? 44 : 52,
            color: "#f5c542",
            lineHeight: 1,
            textShadow: "0 0 30px rgba(245, 197, 66, 0.25)",
            animation: isShow ? "cpr-digit-pop 0.4s ease-out 0.15s both" : "none",
            position: "relative",
          }}>
            {total.toLocaleString()}
          </div>

          {/* Subtitle */}
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600,
            fontSize: 13,
            letterSpacing: "0.06em",
            color: "rgba(245, 197, 66, 0.5)",
            marginTop: 6,
            position: "relative",
          }}>
            {total === 0
              ? "Log a comedy to start earning!"
              : "Completely meaningless."}
          </div>

          {/* Tap to close hint */}
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10,
            color: "rgba(245, 197, 66, 0.2)",
            marginTop: 20,
            position: "relative",
          }}>
            tap to close
          </div>
        </div>
      </div>
    </>
  );
}
