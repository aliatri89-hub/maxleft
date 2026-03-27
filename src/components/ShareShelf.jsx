import { t } from "../theme";
import { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";

// ── Brand data (mirrors FeedScreen) ──
const VHS_BRANDS = [
  { color: "#0d5a2d", text: "FUJI", sub: "HQ", weight: 900 },
  { color: t.bgCard, text: "Memorex", sub: "HS", weight: 800 },
  { color: "#b8860b", text: "TDK", sub: "SA", weight: 900 },
  { color: "#c41e1e", text: "Kodak", sub: "T-120", weight: 800 },
  { color: "#14398a", text: "Maxell", sub: "HGX", weight: 800 },
  { color: "#9b1b1b", text: "BASF", sub: "E-180", weight: 900 },
];

function getShareBrands(title) {
  const hash = (title || "").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const brand = VHS_BRANDS[hash % VHS_BRANDS.length];
  const vhsOnLeft = hash % 2 === 0;
  return { left: vhsOnLeft ? null : brand, right: vhsOnLeft ? brand : null };
}

// ── Sharpie star for the share image ──
function SharpieStars({ rating, size = 13 }) {
  if (!rating || rating <= 0) return null;
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.25;
  const paths = [
    "M12 1 L14.5 8 L22 9.5 L16.5 14.5 L18 22 L12 18 L6 22 L7.5 14.5 L2 9.5 L9.5 8 Z",
    "M11.5 2 L14 9 L21.5 10 L15.5 14 L17 21 L11.5 17.5 L5.5 20.5 L7.5 13.5 L2.5 9 L10 8.5 Z",
    "M12 2.5 L15 8.5 L22.5 9 L17 13.5 L18.5 20.5 L12 17 L5.5 20.5 L7 13.5 L1.5 9 L9 8.5 Z",
  ];
  return (
    <div style={{ display: "flex", gap: 0, alignItems: "center" }}>
      {Array.from({ length: full }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24">
          <path d={paths[i % 3]} fill="none" stroke="#6b5a10" strokeWidth="2.8"
            strokeLinejoin="round" strokeLinecap="round"
            style={{ transform: `rotate(${[-3, 2, -1][i % 3]}deg)`, transformOrigin: "center" }} />
        </svg>
      ))}
      {half && (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <defs><clipPath id="shareHalfClip"><rect x="0" y="0" width="12" height="24" /></clipPath></defs>
          <path d={paths[full % 3]} fill="none" stroke="#6b5a10" strokeWidth="2.8"
            strokeLinejoin="round" strokeLinecap="round" clipPath="url(#shareHalfClip)" />
        </svg>
      )}
    </div>
  );
}

// ── Brand endcap on tape ──
function ShareBrandStamp({ brand, side }) {
  if (!brand) {
    // VHS logo side
    return (
      <div style={{
        position: "absolute", top: 0, bottom: 0, [side]: 4,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          writingMode: "vertical-rl", transform: "rotate(180deg)",
          fontFamily: t.fontDisplay, fontWeight: 800,
          fontSize: 9, letterSpacing: "0.05em", color: t.creamDark, opacity: 0.6,
        }}>
          VHS
        </div>
      </div>
    );
  }
  const brandFontSize = brand.text && brand.text.length > 4 ? 7 : 9;
  return (
    <div style={{
      position: "absolute", top: 0, bottom: 0, [side]: 4,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
    }}>
      <div style={{
        writingMode: "vertical-rl", fontFamily: t.fontDisplay,
        fontWeight: brand.weight, fontSize: brandFontSize, letterSpacing: "0.05em",
        textTransform: "uppercase", color: brand.color, transform: "rotate(180deg)", lineHeight: 1,
      }}>
        {brand.text}
      </div>
      {brand.sub && (
        <div style={{
          writingMode: "vertical-rl", fontFamily: t.fontBody,
          fontWeight: 600, fontSize: 5, letterSpacing: "0.06em",
          color: brand.color, opacity: 0.6, transform: "rotate(180deg)",
        }}>
          {brand.sub}
        </div>
      )}
    </div>
  );
}

// ── Single tape for the share image ──
function ShareTape({ item }) {
  const { left, right } = getShareBrands(item.title);
  const titleLen = (item.title || "").length;
  const fontSize = Math.max(14, Math.min(26, 300 / Math.max(titleLen, 1)));

  return (
    <div style={{
      background: "#1a1612",
      borderRadius: 5,
      overflow: "hidden",
      boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
    }}>
      <div style={{
        display: "flex",
        minHeight: 72,
      }}>
        {/* Left tape end */}
        <div style={{ width: 5, flexShrink: 0, background: "#1a1612" }} />

        {/* Cream label */}
        <div style={{
          flex: 1,
          background: t.cream,
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Grid lines */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 17px, rgba(0,0,0,0.03) 17px, rgba(0,0,0,0.03) 18px)",
          }} />

          {/* Brand stamps */}
          <ShareBrandStamp brand={left} side="left" />
          <ShareBrandStamp brand={right} side="right" />

          {/* Logo or text title */}
          {item.logo_url ? (
            <img
              src={item.logo_url}
              alt={item.title}
              crossOrigin="anonymous"
              style={{
                maxHeight: 48,
                minHeight: 32,
                maxWidth: "80%",
                width: "auto",
                objectFit: "contain",
                filter: "brightness(0)",
                opacity: 0.8,
                position: "relative",
              }}
            />
          ) : (
            <div style={{
              fontFamily: t.fontSharpie,
              fontSize,
              lineHeight: 1.1,
              color: t.creamDark,
              textTransform: "uppercase",
              letterSpacing: "0.02em",
              position: "relative",
              textAlign: "center",
              transform: `rotate(${((item.tmdb_id || 0) % 5) * 0.6 - 1.2}deg)`,
              textShadow: "1px 1px 0px rgba(44,40,36,0.08)",
              padding: "0 8px",
              maxWidth: "85%",
              wordBreak: "break-word",
            }}>
              {item.title}
            </div>
          )}

          {/* Year */}
          {item.year && (
            <div style={{
              fontFamily: t.fontSharpie,
              fontSize: 9, color: "rgba(44,40,36,0.5)",
              marginTop: 2, position: "relative", textAlign: "center",
            }}>
              {item.year}
            </div>
          )}

          {/* Stars — bottom right */}
          {item.rating > 0 && (
            <div style={{ position: "absolute", bottom: 4, right: 24 }}>
              <SharpieStars rating={item.rating} size={12} />
            </div>
          )}
        </div>

        {/* Right tape end */}
        <div style={{ width: 5, flexShrink: 0, background: "#1a1612" }} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// SHARE SHELF — renders + captures the Last 6
// ════════════════════════════════════════════════
export default function ShareShelf({ items = [], username, onClose, onToast }) {
  const canvasRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const last6 = items.slice(0, 6);

  const handleCapture = useCallback(async () => {
    if (!canvasRef.current || capturing) return;
    setCapturing(true);

    try {
      // Wait a tick for logos to render
      await new Promise(r => setTimeout(r, 300));

      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: "#0f0d0b",
        scale: 2, // retina quality
        useCORS: true,
        allowTaint: false,
        logging: false,
        // Fallback: if CORS fails on logos, they just won't render
        onclone: (doc) => {
          // Force fonts to be available in cloned doc
          const el = doc.querySelector("[data-share-shelf]");
          if (el) el.style.fontFamily = "'Oswald', 'Barlow Condensed', sans-serif";
        },
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          onToast?.("Couldn't generate image");
          setCapturing(false);
          return;
        }

        const file = new File([blob], "mantl-last-6.png", { type: "image/png" });

        // Try native share (mobile)
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "My MANTL Last 6",
              text: "My recent shelf on MANTL — mymantl.app",
            });
            onClose?.();
            setCapturing(false);
            return;
          } catch (e) {
            // User cancelled or share failed — fall through to download
            if (e.name === "AbortError") {
              setCapturing(false);
              return;
            }
          }
        }

        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "mantl-last-6.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onToast?.("Saved to downloads!");
        onClose?.();
        setCapturing(false);
      }, "image/png");
    } catch (err) {
      console.error("Share capture failed:", err);
      onToast?.("Something went wrong — try again");
      setCapturing(false);
    }
  }, [capturing, onClose, onToast]);

  if (last6.length === 0) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.85)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "20px 16px",
      animation: "shareShelfFadeIn 0.2s ease-out",
    }}>
      <style>{`
        @keyframes shareShelfFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Close button */}
      <div style={{
        position: "absolute", top: 16, right: 16,
        width: 36, height: 36, borderRadius: "50%",
        background: t.bgHover,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
      }} onClick={onClose}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="#8a7d68" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>

      {/* ── The capturable share image ── */}
      <div
        ref={canvasRef}
        data-share-shelf
        style={{
          width: 360,
          maxWidth: "100%",
          background: t.bgPrimary,
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "18px 16px 10px",
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 3,
        }}>
          {/* M▶NTL logo */}
          <div style={{
            fontFamily: "'Oswald', sans-serif", fontWeight: 700,
            fontSize: 24, letterSpacing: 4, color: "#f0e8d8",
            display: "flex", alignItems: "center",
          }}>
            M
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 18, height: 18, background: "#e8dcc8", borderRadius: 3,
              margin: "0 2px",
            }}>
              <span style={{ fontSize: 10, color: t.bgPrimary, marginLeft: 2 }}>▶</span>
            </span>
            NTL
          </div>
          <div style={{
            fontFamily: "'Oswald', sans-serif", fontSize: 8,
            letterSpacing: 3, color: "#5a5040", fontWeight: 500,
            textTransform: "uppercase",
          }}>
            PRESS PLAY
          </div>
          {/* Color bar */}
          <div style={{ display: "flex", gap: 2, marginTop: 5 }}>
            <div style={{ width: 24, height: 2.5, background: "#c41e1e", borderRadius: 2 }} />
            <div style={{ width: 24, height: 2.5, background: "#2d8c3c", borderRadius: 2 }} />
            <div style={{ width: 24, height: 2.5, background: "#f0e8d8", borderRadius: 2 }} />
          </div>
        </div>

        {/* LAST 6 divider */}
        <div style={{
          padding: "0 16px 8px",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, #3a342a)" }} />
          <span style={{
            fontFamily: "'Oswald', sans-serif", fontSize: 9,
            letterSpacing: 3, color: "#5a5040", fontWeight: 600,
          }}>
            LAST 6
          </span>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(270deg, transparent, #3a342a)" }} />
        </div>

        {/* Tape stack */}
        <div style={{
          padding: "0 12px",
          display: "flex", flexDirection: "column", gap: 5,
        }}>
          {last6.map((item, i) => (
            <ShareTape key={item.id || i} item={item} />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 16px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{
            fontFamily: "'Oswald', sans-serif", fontSize: 9,
            letterSpacing: 2, color: "#4a4438", fontWeight: 400,
          }}>
            mymantl.app
          </span>
          {username && (
            <span style={{
              fontFamily: t.fontSharpie, fontSize: 9,
              color: "#3a342a",
            }}>
              @{username}
            </span>
          )}
          <span style={{
            fontFamily: "'Oswald', sans-serif", fontSize: 8,
            letterSpacing: 2, color: "#3a342a", fontWeight: 500,
            textTransform: "uppercase",
          }}>
            Track what you watch
          </span>
        </div>
      </div>

      {/* Share / Save button */}
      <button
        onClick={handleCapture}
        disabled={capturing}
        style={{
          marginTop: 16,
          padding: "12px 32px",
          background: capturing ? "#3a342a" : t.cream,
          color: capturing ? "#8a7d68" : "#1a1612",
          border: "none",
          borderRadius: 8,
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 600,
          fontSize: 14,
          letterSpacing: 2,
          textTransform: "uppercase",
          cursor: capturing ? "wait" : "pointer",
          transition: "all 0.2s ease",
        }}
      >
        {capturing ? "Generating..." : "Share Shelf"}
      </button>

      <div style={{
        marginTop: 8,
        fontFamily: "'Oswald', sans-serif",
        fontSize: 10, letterSpacing: 1.5,
        color: "#5a5040", textTransform: "uppercase",
      }}>
        Saves as image or opens share sheet
      </div>
    </div>
  );
}
