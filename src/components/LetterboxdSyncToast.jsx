import { useEffect, useState } from "react";

/**
 * LetterboxdSyncToast
 * VHS tape-label style toast for Letterboxd sync events.
 * Slides down from the top. Tap to dismiss, or auto-dismisses after `duration` ms.
 */
export default function LetterboxdSyncToast({ synced = 0, rewatches = 0, duration = 3600, onDone, onTap }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), duration);
    const doneTimer = setTimeout(() => onDone?.(), duration + 320);
    return () => { clearTimeout(exitTimer); clearTimeout(doneTimer); };
  }, [duration, onDone]);

  const dismiss = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => onDone?.(), 320);
  };

  const handleTap = () => {
    if (exiting) return;
    onTap?.();
    // Brief delay so the tab switch is visible before the toast exits
    setTimeout(() => dismiss(), 120);
  };

  // Build label text
  const parts = [];
  if (synced > 0) parts.push(`${synced} film${synced !== 1 ? "s" : ""}`);
  if (rewatches > 0) parts.push(`${rewatches} rewatch${rewatches !== 1 ? "es" : ""}`);
  const mainText = parts.join(" + ");
  const subText = rewatches > 0 && synced === 0 ? "Updated in your log" : "Synced from Letterboxd";

  return (
    <>
      <style>{`
        @keyframes lbd-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-110%); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes lbd-toast-out {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to   { opacity: 0; transform: translateX(-50%) translateY(-110%); }
        }
        .lbd-toast-wrap {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 600;
          width: min(88vw, 320px);
          animation: lbd-toast-in 0.38s cubic-bezier(0.2, 0.9, 0.35, 1.05) forwards;
          cursor: pointer;
        }
        .lbd-toast-wrap.exiting {
          animation: lbd-toast-out 0.3s cubic-bezier(0.4, 0, 0.8, 0.6) forwards;
        }
      `}</style>

      <div
        className={`lbd-toast-wrap${exiting ? " exiting" : ""}`}
        onClick={handleTap}
      >
        <div style={{
          background: "#f0ead8",
          borderRadius: 7,
          overflow: "hidden",
          boxShadow: "0 6px 28px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.3)",
        }}>
          <div style={{
            height: 5,
            background: "linear-gradient(to right, #f7a13a 33%, #42c75a 33% 66%, #5ab5ef 66%)",
          }} />
          <div style={{
            display: "flex", alignItems: "stretch",
            padding: "10px 0 11px 0",
          }}>
            <div style={{
              writingMode: "vertical-rl", transform: "rotate(180deg)",
              fontFamily: "'IBM Plex Mono', 'Share Tech Mono', monospace",
              fontSize: 7, letterSpacing: "2.5px", color: "#8a7a60",
              textTransform: "uppercase", padding: "0 7px 0 9px",
              borderRight: "1px solid #d8cfb8", flexShrink: 0,
              whiteSpace: "nowrap", display: "flex", alignItems: "center",
            }}>Synced</div>
            <div style={{
              flex: 1, padding: "2px 12px 0", minWidth: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", textAlign: "center",
            }}>
              <div style={{ marginBottom: 6 }}>
                <svg width="36" height="14" viewBox="0 0 54 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10.5" cy="10.5" r="10.5" fill="#F7A13A"/>
                  <circle cx="27"   cy="10.5" r="10.5" fill="#42C75A"/>
                  <circle cx="43.5" cy="10.5" r="10.5" fill="#5AB5EF"/>
                  <ellipse cx="18.75" cy="10.5" rx="2.25" ry="10.5" fill="#c8882e" opacity="0.5"/>
                  <ellipse cx="35.25" cy="10.5" rx="2.25" ry="10.5" fill="#2da048" opacity="0.5"/>
                </svg>
              </div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                fontSize: 22, color: "#1a100a", lineHeight: 1.1,
                marginBottom: 2, whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis",
              }}>{mainText}</div>
              <div style={{
                fontFamily: "'IBM Plex Mono', 'Share Tech Mono', monospace",
                fontSize: 8, letterSpacing: "1.5px", color: "#7a6a50",
                textTransform: "uppercase",
              }}>{subText}</div>
              <div style={{
                fontFamily: "'IBM Plex Mono', 'Share Tech Mono', monospace",
                fontSize: 7, letterSpacing: "1px", color: "#b0a080",
                textTransform: "uppercase", marginTop: 5,
              }}>tap to view activity →</div>
            </div>
            <div style={{
              writingMode: "vertical-rl",
              fontFamily: "'IBM Plex Mono', 'Share Tech Mono', monospace",
              fontSize: 7, letterSpacing: "2px", color: "#b0a080",
              textTransform: "uppercase", padding: "0 9px",
              borderLeft: "1px solid #d8cfb8", flexShrink: 0,
              whiteSpace: "nowrap", display: "flex", alignItems: "center",
            }}>VHS · SP</div>
          </div>
        </div>
      </div>
    </>
  );
}
