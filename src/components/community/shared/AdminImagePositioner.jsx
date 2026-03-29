import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "../../../supabase";
import { bustCommunityCache } from "../../../hooks/community/useCommunityPage";

const ADMIN_IDS = ["19410e64-d610-4fab-9c26-d24fafc94696"];

/**
 * AdminImagePositioner
 *
 * Renders a small ✦ edit button over an image (admin-only).
 * Tap → full-screen editor with:
 *   - Live crop preview (exactly what the 160px header will look like)
 *   - Full image below with drag-to-reposition
 *   - Fine-tune ±1% / ±5% step buttons
 *   - Save → writes to DB + busts community cache
 *
 * Props:
 *   seriesId      — community_miniseries.id
 *   imageUrl      — thumbnail_url
 *   position      — current thumbnail_position string (e.g. "center 30%")
 *   userId        — current user id (renders nothing if not admin)
 *   onSaved       — (newPosition: string) => void
 *   accent        — accent color
 *   communitySlug — slug for cache busting (optional)
 */
export default function AdminImagePositioner({ seriesId, imageUrl, position, userId, onSaved, accent = "#e94560", communitySlug }) {
  const isAdmin = ADMIN_IDS.includes(userId);
  const [open, setOpen] = useState(false);
  const [pct, setPct] = useState(() => parsePosition(position));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dragAreaRef = useRef(null);
  const dragging = useRef(false);
  const pctRef = useRef(pct);
  pctRef.current = pct;

  // Re-sync pct when position prop changes (from parent)
  useEffect(() => {
    if (!open) setPct(parsePosition(position));
  }, [position, open]);

  // ── Native touch events with { passive: false } ──────────────
  // React synthetic touch events are passive by default on Chrome,
  // which means preventDefault() is ignored and the browser scrolls
  // underneath the drag. Native listeners fix this.
  useEffect(() => {
    if (!open) return;
    const el = dragAreaRef.current;
    if (!el) return;

    const onTouchMove = (e) => {
      if (!dragging.current) return;
      e.preventDefault(); // suppress page scroll
      const touch = e.touches[0];
      if (!touch) return;
      const rect = el.getBoundingClientRect();
      const raw = ((touch.clientY - rect.top) / rect.height) * 100;
      setPct(Math.round(Math.min(100, Math.max(0, raw))));
    };

    const onTouchEnd = () => { dragging.current = false; };

    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [open]);

  // Mouse move/up on the whole modal (desktop)
  const handleMouseMove = useCallback((e) => {
    if (!dragging.current || !dragAreaRef.current) return;
    const rect = dragAreaRef.current.getBoundingClientRect();
    const raw = ((e.clientY - rect.top) / rect.height) * 100;
    setPct(Math.round(Math.min(100, Math.max(0, raw))));
  }, []);

  const handleMouseUp = useCallback(() => { dragging.current = false; }, []);

  const nudge = useCallback((delta) => {
    setPct((prev) => Math.round(Math.min(100, Math.max(0, prev + delta))));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const newPos = `center ${pctRef.current}%`;
    const { error } = await supabase
      .from("community_miniseries")
      .update({ thumbnail_position: newPos })
      .eq("id", seriesId);

    setSaving(false);
    if (!error) {
      // Bust the community page cache so re-entering shows the new position
      if (communitySlug) bustCommunityCache(communitySlug);

      setSaved(true);
      onSaved?.(newPos);
      setTimeout(() => {
        setSaved(false);
        setOpen(false);
      }, 600);
    }
  }, [seriesId, onSaved, communitySlug]);

  if (!isAdmin || !imageUrl) return null;

  return (
    <>
      {/* Trigger button — small ✦ in corner */}
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(true); }}
        style={{
          position: "absolute",
          top: 6, left: 6,
          width: 28, height: 28,
          borderRadius: "50%",
          background: accent,
          border: "none",
          color: "#fff",
          fontSize: 14,
          fontWeight: 900,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          zIndex: 10,
          boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
          WebkitTapHighlightColor: "transparent",
        }}
      >✦</button>

      {/* Full-screen editor modal */}
      {open && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "#0a0908",
            zIndex: 9999,
            display: "flex", flexDirection: "column",
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* ── Top bar ──────────────────────────────────────────── */}
          <div style={{
            flexShrink: 0,
            padding: "12px 16px",
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <button
              onClick={() => { setPct(parsePosition(position)); setOpen(false); }}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 14, cursor: "pointer", padding: "4px 0" }}
            >Cancel</button>
            <div style={{
              fontSize: 13, color: "rgba(255,255,255,0.35)",
              fontFamily: "monospace", letterSpacing: "0.05em",
            }}>
              center {pct}%
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: saved ? "#4ade80" : accent,
                border: "none", borderRadius: 8,
                color: "#fff", fontWeight: 700,
                fontSize: 14, padding: "6px 18px",
                cursor: saving ? "default" : "pointer",
                transition: "background 0.2s",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saved ? "✓ Saved" : saving ? "Saving…" : "Save"}
            </button>
          </div>

          {/* ── Live crop preview — exactly what the 160px header shows ── */}
          <div style={{
            flexShrink: 0,
            position: "relative",
            height: 120,
            overflow: "hidden",
            borderBottom: `2px solid ${accent}`,
          }}>
            <img
              src={imageUrl}
              alt=""
              style={{
                width: "100%", height: "100%",
                objectFit: "cover",
                objectPosition: `center ${pct}%`,
                display: "block",
                opacity: 0.8,
              }}
            />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(transparent 50%, rgba(10,9,8,0.6) 100%)",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute",
              top: 6, left: 8,
              background: "rgba(0,0,0,0.7)",
              color: accent,
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
              padding: "3px 8px", borderRadius: 4,
              pointerEvents: "none",
              textTransform: "uppercase",
            }}>Live preview</div>
          </div>

          {/* ── Full image — drag area ──────────────────────────── */}
          <div
            ref={dragAreaRef}
            style={{
              flex: 1,
              position: "relative",
              overflow: "hidden",
              cursor: "ns-resize",
              touchAction: "none",
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              dragging.current = true;
              // Also jump to click position
              const rect = dragAreaRef.current.getBoundingClientRect();
              const raw = ((e.clientY - rect.top) / rect.height) * 100;
              setPct(Math.round(Math.min(100, Math.max(0, raw))));
            }}
            onTouchStart={(e) => {
              dragging.current = true;
              // Jump to touch position
              const touch = e.touches[0];
              if (touch && dragAreaRef.current) {
                const rect = dragAreaRef.current.getBoundingClientRect();
                const raw = ((touch.clientY - rect.top) / rect.height) * 100;
                setPct(Math.round(Math.min(100, Math.max(0, raw))));
              }
            }}
          >
            {/* Full uncropped image */}
            <img
              src={imageUrl}
              alt=""
              style={{
                width: "100%", height: "100%",
                objectFit: "contain",
                display: "block",
                opacity: 0.5,
              }}
            />

            {/* Drag indicator line + handle */}
            <div style={{
              position: "absolute",
              left: 0, right: 0,
              top: `${pct}%`,
              transform: "translateY(-50%)",
              pointerEvents: "none",
              transition: dragging.current ? "none" : "top 0.15s ease",
            }}>
              <div style={{
                height: 2,
                background: accent,
                boxShadow: `0 0 12px ${accent}80`,
              }} />
              {/* Handle pill */}
              <div style={{
                position: "absolute",
                left: "50%", top: "50%",
                transform: "translate(-50%, -50%)",
                background: accent,
                borderRadius: 12,
                padding: "4px 14px",
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: "0 2px 12px rgba(0,0,0,0.6)",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5" />
                  <path d="M5 12l7-7 7 7" />
                </svg>
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "monospace" }}>{pct}%</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14" />
                  <path d="M5 12l7 7 7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* ── Fine-tune controls ─────────────────────────────── */}
          <div style={{
            flexShrink: 0,
            padding: "10px 16px",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}>
            {[
              { label: "−5", delta: -5 },
              { label: "−1", delta: -1 },
            ].map(({ label, delta }) => (
              <button
                key={label}
                onClick={() => nudge(delta)}
                style={{
                  width: 44, height: 36,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 13, fontWeight: 600,
                  fontFamily: "monospace",
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >{label}</button>
            ))}

            {/* Preset positions */}
            {[
              { label: "Top", value: 0 },
              { label: "Mid", value: 50 },
              { label: "Bot", value: 100 },
            ].map(({ label, value }) => (
              <button
                key={label}
                onClick={() => setPct(value)}
                style={{
                  height: 36,
                  padding: "0 12px",
                  background: pct === value ? `${accent}30` : "rgba(255,255,255,0.04)",
                  border: pct === value ? `1px solid ${accent}` : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  color: pct === value ? accent : "rgba(255,255,255,0.4)",
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >{label}</button>
            ))}

            {[
              { label: "+1", delta: 1 },
              { label: "+5", delta: 5 },
            ].map(({ label, delta }) => (
              <button
                key={label}
                onClick={() => nudge(delta)}
                style={{
                  width: 44, height: 36,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 13, fontWeight: 600,
                  fontFamily: "monospace",
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >{label}</button>
            ))}
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
