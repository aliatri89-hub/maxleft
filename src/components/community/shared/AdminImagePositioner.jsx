import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "../../../supabase";

const ADMIN_IDS = ["19410e64-d610-4fab-9c26-d24fafc94696"];

/**
 * AdminImagePositioner
 *
 * Renders a small ✦ edit button over an image (admin-only).
 * Tap → full-screen drag UI to set thumbnail_position.
 * Drag the horizontal line up/down to choose the Y crop %.
 * Hit Save → writes to community_miniseries.thumbnail_position.
 *
 * Props:
 *   seriesId     — community_miniseries.id
 *   imageUrl     — thumbnail_url
 *   position     — current thumbnail_position string (e.g. "center 30%")
 *   userId       — current user id (renders nothing if not admin)
 *   onSaved      — (newPosition: string) => void
 *   accent       — accent color
 */
export default function AdminImagePositioner({ seriesId, imageUrl, position, userId, onSaved, accent = "#e94560" }) {
  const [open, setOpen] = useState(false);
  const [pct, setPct] = useState(() => parsePosition(position));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  if (!ADMIN_IDS.includes(userId)) return null;
  if (!imageUrl) return null;

  // Re-sync pct when position prop changes
  useEffect(() => {
    if (!open) setPct(parsePosition(position));
  }, [position, open]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const raw = ((clientY - rect.top) / rect.height) * 100;
    setPct(Math.round(Math.min(100, Math.max(0, raw))));
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const newPos = `center ${pct}%`;
    const { error } = await supabase
      .from("community_miniseries")
      .update({ thumbnail_position: newPos })
      .eq("id", seriesId);

    setSaving(false);
    if (!error) {
      setSaved(true);
      onSaved?.(newPos);
      setTimeout(() => {
        setSaved(false);
        setOpen(false);
      }, 800);
    }
  }, [pct, seriesId, onSaved]);

  return (
    <>
      {/* Trigger button — small ✦ in corner */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        style={{
          position: "absolute",
          top: 6, left: 6,
          width: 26, height: 26,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.7)",
          border: `1px solid ${accent}`,
          color: accent,
          fontSize: 13,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          zIndex: 5,
          WebkitTapHighlightColor: "transparent",
        }}
      >✦</button>

      {/* Full-screen editor modal */}
      {open && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.95)",
            zIndex: 9999,
            display: "flex", flexDirection: "column",
          }}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        >
          {/* Header */}
          <div style={{
            padding: "14px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 15, cursor: "pointer" }}
            >✕ Cancel</button>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
              center {pct}%
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: saved ? "#4ade80" : accent,
                border: "none", borderRadius: 8,
                color: "#fff", fontWeight: 700,
                fontSize: 14, padding: "6px 16px",
                cursor: saving ? "default" : "pointer",
                transition: "background 0.2s",
              }}
            >
              {saved ? "Saved ✓" : saving ? "Saving…" : "Save"}
            </button>
          </div>

          {/* Full image with drag line */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <img
              src={imageUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `center ${pct}%`, display: "block" }}
            />

            {/* Crop preview overlay — shows what the header will look like */}
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0.4)",
              pointerEvents: "none",
            }} />

            {/* Crop window highlight — 160px tall like the header */}
            <div
              ref={containerRef}
              style={{
                position: "absolute", inset: 0,
                cursor: "ns-resize",
              }}
              onMouseDown={(e) => { e.preventDefault(); dragging.current = true; }}
              onTouchStart={(e) => { dragging.current = true; }}
            >
              {/* The draggable line */}
              <div style={{
                position: "absolute",
                left: 0, right: 0,
                top: `${pct}%`,
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}>
                <div style={{
                  height: 2,
                  background: accent,
                  boxShadow: `0 0 8px ${accent}`,
                }} />
                {/* Handle */}
                <div style={{
                  position: "absolute",
                  left: "50%", top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 36, height: 36,
                  borderRadius: "50%",
                  background: accent,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.6)",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12l7-7 7 7M5 12l7 7 7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Crop window indicator */}
            <div style={{
              position: "absolute",
              top: 0, left: 0, right: 0,
              height: 160,
              border: `2px dashed ${accent}`,
              pointerEvents: "none",
              opacity: 0.6,
            }} />
            <div style={{
              position: "absolute",
              top: 6, right: 8,
              background: "rgba(0,0,0,0.7)",
              color: accent,
              fontSize: 10, fontWeight: 700,
              padding: "2px 6px", borderRadius: 4,
              pointerEvents: "none",
            }}>HEADER CROP</div>
          </div>

          {/* Hint */}
          <div style={{
            padding: "12px 0",
            textAlign: "center",
            fontSize: 12,
            color: "rgba(255,255,255,0.3)",
          }}>
            Drag up/down to reposition · Dashed box = header preview
          </div>
        </div>
      )}
    </>
  );
}

function parsePosition(pos) {
  if (!pos) return 0;
  const match = pos.match(/(\d+)%/);
  return match ? parseInt(match[1], 10) : 0;
}
