import { t } from "../../../theme";
import { useState, useEffect, useRef } from "react";
import { FadeImg } from "../../feed/FeedPrimitives";
import { useBackGesture } from "../../../hooks/useBackGesture";

/**
 * BadgeCelebration — Full-screen badge unlock celebration.
 *
 * Plays audio (or video), shows phased reveal with particles, flicker overlay,
 * and badge-specific accent color.
 *
 * If audio_url is a video format (.mp4, .webm), renders a background video
 * layer behind the badge reveal — semi-transparent, looping, with its audio
 * track playing. Otherwise falls back to the standard Audio() path for .mp3.
 *
 * Props:
 *   badge       — badge row from Supabase (name, image_url, audio_url, accent_color, tagline)
 *   onClose     — () => void
 *   onViewBadge — () => void (optional) — navigates to badge detail; falls back to onClose
 *   pushNav     — back gesture stack push
 *   removeNav   — back gesture stack remove
 */
export default function BadgeCelebration({ badge, onClose, onViewBadge, pushNav, removeNav }) {
  const [phase, setPhase] = useState(0);
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const accent = badge.accent_color || "#ff6a00";

  // Detect if audio_url is actually a video file
  const isVideo = badge.audio_url &&
    /\.(mp4|webm|mov)(\?|$)/i.test(badge.audio_url);

  useEffect(() => {
    // Start audio (non-video path)
    if (badge.audio_url && !isVideo) {
      try {
        audioRef.current = new Audio(badge.audio_url);
        audioRef.current.volume = 0.6;
        audioRef.current.play().catch(() => {});
      } catch (e) {
        console.warn("[Badge] Audio play failed:", e);
      }
    }

    // Video: start muted (iOS autoplay policy), unmute after brief delay
    if (isVideo && videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().then(() => {
        // Unmute after a tick — play() succeeded so we have interaction context
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.muted = false;
            videoRef.current.volume = 0.6;
          }
        }, 100);
      }).catch(() => {});
    }

    const t0 = setTimeout(() => setPhase(1), 300);
    const t1 = setTimeout(() => setPhase(2), 1200);
    const t2 = setTimeout(() => setPhase(3), 2200);
    const t3 = setTimeout(() => setPhase(4), 3200);

    return () => {
      clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (videoRef.current) { videoRef.current.pause(); }
    };
  }, [badge.audio_url, isVideo]);

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    onClose();
  };

  // Android back gesture — stop media and close
  useBackGesture("badgeCelebration", true, handleClose, pushNav, removeNav);

  // Generate particles once
  const particles = useRef(
    Array.from({ length: 35 }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 60,
      y: 45 + (Math.random() - 0.5) * 40,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 2,
      duration: 1.5 + Math.random() * 2.5,
      tx: (Math.random() - 0.5) * 250,
      ty: -80 - Math.random() * 150,
    }))
  ).current;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0a0600",
      overflow: "hidden",
    }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap"
        rel="stylesheet"
      />
      <style>{`
        @keyframes badgeFlicker {
          0%, 100% { opacity: 0.02; }
          10% { opacity: 0.04; }
          20% { opacity: 0.01; }
          40% { opacity: 0.05; }
          50% { opacity: 0.02; }
          70% { opacity: 0.04; }
          80% { opacity: 0.01; }
          90% { opacity: 0.03; }
        }
        @keyframes badgeRingPulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes badgeParticleFly {
          0% { opacity: 0; transform: translate(0, 0) scale(0); }
          15% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0.2); }
        }
      `}</style>

      {/* ── Video background layer ──────────────────────── */}
      {isVideo && (
        <video
          ref={videoRef}
          src={badge.audio_url}
          loop
          muted
          playsInline
          style={{
            position: "absolute", inset: 0, zIndex: 2,
            width: "100%", height: "100%",
            objectFit: "cover",
            opacity: phase >= 1 ? 1 : 0,
            transition: "opacity 1.5s ease-in",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Flicker overlay — subtle atmosphere, very low opacity */}
      {phase >= 1 && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
          background: `radial-gradient(ellipse at 50% 40%, ${accent} 0%, transparent 55%)`,
          animation: "badgeFlicker 3s ease-in-out infinite",
        }} />
      )}

      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: "35%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 300, height: 300,
        background: `radial-gradient(circle, ${accent}15 0%, transparent 70%)`,
        opacity: phase >= 2 ? 1 : 0,
        transition: "opacity 1.5s",
        zIndex: 6, pointerEvents: "none",
      }} />

      {/* Particles */}
      {phase >= 3 && (
        <div style={{ position: "absolute", inset: 0, zIndex: 15, pointerEvents: "none", overflow: "hidden" }}>
          {particles.map(p => (
            <div key={p.id} style={{
              position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
              width: p.size, height: p.size, borderRadius: "50%",
              background: accent, boxShadow: `0 0 ${p.size * 3}px ${accent}`,
              "--tx": `${p.tx}px`, "--ty": `${p.ty}px`,
              animation: `badgeParticleFly ${p.duration}s ${p.delay}s ease-out forwards`,
              opacity: 0,
            }} />
          ))}
        </div>
      )}

      {/* Badge image — top-right corner when video, centered otherwise */}
      {/* Badge image — absolute top-right for video */}
      {isVideo && (
        <div style={{
          position: "absolute", zIndex: 25,
          top: 56, right: 24,
          width: 90, height: 90,
          borderRadius: "50%", overflow: "hidden",
          border: `3px solid ${accent}80`,
          boxShadow: phase >= 2
            ? `0 0 40px ${accent}30, 0 0 80px ${accent}12, inset 0 0 20px rgba(0,0,0,0.5)`
            : "none",
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? "scale(1)" : "scale(0.4)",
          transition: "all 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        }}>
          {badge.image_url ? (
            <FadeImg src={badge.image_url} alt={badge.name}
              loading="eager"
              placeholderColor={`${accent}40`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              background: `radial-gradient(circle, ${accent}30, ${accent}08)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36,
            }}>🏆</div>
          )}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "radial-gradient(circle, transparent 50%, rgba(10,6,0,0.4) 100%)",
          }} />
        </div>
      )}

      {/* Main content */}
      <div style={{
        position: "relative", zIndex: 20,
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: 40,
      }}>
        {/* Badge image — centered in column for non-video */}
        {!isVideo && (
          <>
            <div style={{
              width: 160, height: 160,
              borderRadius: "50%", overflow: "hidden",
              border: `3px solid ${accent}80`,
              boxShadow: phase >= 2
                ? `0 0 60px ${accent}30, 0 0 120px ${accent}12, inset 0 0 30px rgba(0,0,0,0.5)`
                : "none",
              opacity: phase >= 1 ? 1 : 0,
              transform: phase >= 1 ? "scale(1)" : "scale(0.4)",
              transition: "all 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              position: "relative",
            }}>
              {badge.image_url ? (
                <FadeImg src={badge.image_url} alt={badge.name}
                  loading="eager"
                  placeholderColor={`${accent}40`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{
                  width: "100%", height: "100%",
                  background: `radial-gradient(circle, ${accent}30, ${accent}08)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 56,
                }}>🏆</div>
              )}
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: "radial-gradient(circle, transparent 50%, rgba(10,6,0,0.4) 100%)",
              }} />
            </div>

            {/* Pulse rings */}
            {phase >= 2 && (
              <div style={{
                position: "absolute", top: 40, left: "50%",
                width: 160, height: 160,
                transform: "translateX(-50%)",
                pointerEvents: "none",
              }}>
                <div style={{
                  position: "absolute", inset: -10, borderRadius: "50%",
                  border: `1px solid ${accent}35`,
                  animation: "badgeRingPulse 2.5s ease-out infinite",
                }} />
                <div style={{
                  position: "absolute", inset: -10, borderRadius: "50%",
                  border: `1px solid ${accent}20`,
                  animation: "badgeRingPulse 2.5s ease-out 0.8s infinite",
                }} />
              </div>
            )}
          </>
        )}

        {/* Badge unlocked text */}
        <div style={{
          marginTop: 32,
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? "translateY(0)" : "translateY(15px)",
          transition: "all 0.7s ease-out",
          textAlign: "center",
        }}>
          <div style={{
            fontSize: 10, letterSpacing: 6, textTransform: "uppercase",
            color: accent, fontFamily: t.fontSerif, marginBottom: 12,
          }}>
            Badge Unlocked
          </div>
          <div style={{
            fontSize: 32, fontWeight: 700, color: t.textPrimary,
            fontFamily: t.fontSerif,
            textShadow: `0 0 60px ${accent}25`,
            lineHeight: 1.15,
          }}>
            {badge.name}
          </div>
        </div>

        {/* Tagline */}
        <div style={{
          opacity: phase >= 3 ? 1 : 0,
          transition: "opacity 1.2s ease-out",
          textAlign: "center", marginTop: 18,
        }}>
          {badge.tagline && (() => {
            const parts = badge.tagline.split("\n");
            return (
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: 15, color: `${accent}bb`, fontStyle: "italic",
                  fontFamily: t.fontSerif,
                }}>
                  {parts[0]}
                </div>
                {parts[1] && (
                  <div style={{
                    fontSize: 11, color: t.textFaint,
                    marginTop: 10, letterSpacing: 1.2,
                    textTransform: "uppercase",
                    fontFamily: t.fontDisplay,
                    fontStyle: "normal",
                  }}>
                    {parts[1]}
                  </div>
                )}
              </div>
            );
          })()}
          {badge.description && (
            <div style={{ fontSize: 12, color: t.textMuted, marginTop: 14 }}>
              {badge.description}
            </div>
          )}
        </div>

        {/* View Badge / Close button */}
        <button onClick={() => {
          if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
          if (videoRef.current) { videoRef.current.pause(); }
          (onViewBadge || onClose)();
        }} style={{
          marginTop: 36,
          opacity: phase >= 4 ? 1 : 0,
          transition: "opacity 0.8s ease-out",
          background: `${accent}12`,
          border: `1px solid ${accent}30`,
          color: accent, borderRadius: 10,
          padding: "11px 36px", fontSize: 13,
          fontWeight: 600, cursor: "pointer",
          letterSpacing: 1,
        }}>
          View Badge
        </button>
      </div>
    </div>
  );
}
