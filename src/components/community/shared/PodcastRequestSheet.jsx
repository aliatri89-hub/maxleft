import { t } from "../../../theme";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../../supabase";

// ════════════════════════════════════════════════
// PODCAST REQUEST SHEET — "Don't see your pod? Request it!"
// ════════════════════════════════════════════════
// Simple bottom sheet with form: podcast name (required), link, note.

export default function PodcastRequestSheet({ open, onClose, userId }) {
  const sheetRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const [podcastName, setPodcastName] = useState("");
  const [podcastUrl, setPodcastUrl] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  // ── Prevent background scroll ──
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // ── Submit request ──
  const handleSubmit = async () => {
    if (!podcastName.trim() || !userId) return;
    setSubmitting(true);
    setError(null);

    try {
      const { error: insertErr } = await supabase
        .from("podcast_requests")
        .insert({
          user_id: userId,
          podcast_name: podcastName.trim(),
          podcast_url: podcastUrl.trim() || null,
          note: note.trim() || null,
        });

      if (insertErr) throw insertErr;
      setSubmitted(true);
      setPodcastName("");
      setPodcastUrl("");
      setNote("");
    } catch (err) {
      console.error("[PodcastRequest] Submit error:", err);
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Drag-to-dismiss ──
  const onTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
  };
  const onTouchMove = (e) => {
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      currentY.current = diff;
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${diff}px)`;
      }
    }
  };
  const onTouchEnd = () => {
    if (currentY.current > 120) {
      handleClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = "";
    }
    currentY.current = 0;
  };

  const handleClose = () => {
    setSubmitted(false);
    setError(null);
    onClose();
  };

  if (!open) return null;

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid var(--border-medium)",
    background: "rgba(255,255,255,0.04)",
    color: "var(--text-primary)",
    fontSize: 14,
    fontFamily: t.fontBody,
    outline: "none",
  };

  const labelStyle = {
    fontSize: 10,
    fontFamily: t.fontBody,
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 6,
  };

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={handleClose}
    >
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: t.bgCard,
          borderRadius: "20px 20px 0 0",
          maxHeight: "85vh",
          overflowY: "auto",
          transition: "transform 0.2s ease",
          paddingBottom: "env(safe-area-inset-bottom, 20px)",
        }}
      >
        {/* Drag handle */}
        <div style={{
          display: "flex", justifyContent: "center",
          padding: "12px 0 8px",
        }}>
          <div style={{
            width: 40, height: 4, borderRadius: 2,
            background: "rgba(255,255,255,0.15)",
          }} />
        </div>

        {/* Header */}
        <div style={{ padding: "4px 24px 20px", textAlign: "center" }}>
          <div style={{
            fontFamily: t.fontSharpie,
            fontSize: 22,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}>
            Request a Podcast
          </div>
          <div style={{
            fontSize: 12, color: "var(--text-muted)",
            fontFamily: t.fontBody,
            lineHeight: 1.4,
          }}>
            Tell us which film podcast you want on MANTL.
          </div>
        </div>

        <div style={{ padding: "0 24px 24px" }}>
          {submitted ? (
            /* ── Success state ── */
            <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
              <div style={{
                fontSize: 16, marginBottom: 12,
                fontFamily: t.fontSharpie,
                color: "var(--text-muted)",
                letterSpacing: "0.04em",
              }}>▶ ▶ ▶</div>
              <div style={{
                fontFamily: t.fontSharpie,
                fontSize: 18, color: "var(--text-primary)",
                marginBottom: 6,
              }}>
                Request submitted!
              </div>
              <div style={{
                fontSize: 12, color: "var(--text-muted)",
                fontFamily: t.fontBody, lineHeight: 1.5,
              }}>
                We'll review it and keep you posted.
              </div>
              <button
                onClick={() => { setSubmitted(false); }}
                style={{
                  marginTop: 16,
                  padding: "10px 24px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  fontSize: 13, fontFamily: t.fontBody,
                  cursor: "pointer",
                }}
              >
                Submit another
              </button>
            </div>
          ) : (
            /* ── Request form ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Podcast name */}
              <div>
                <div style={labelStyle}>Podcast name *</div>
                <input
                  type="text"
                  value={podcastName}
                  onChange={e => setPodcastName(e.target.value)}
                  placeholder="e.g. The Rewatchables"
                  style={inputStyle}
                  maxLength={120}
                />
              </div>

              {/* Link */}
              <div>
                <div style={labelStyle}>Link (optional)</div>
                <input
                  type="url"
                  value={podcastUrl}
                  onChange={e => setPodcastUrl(e.target.value)}
                  placeholder="Apple Podcasts, Spotify, or RSS link"
                  style={inputStyle}
                />
              </div>

              {/* Note */}
              <div>
                <div style={labelStyle}>Why this pod? (optional)</div>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="What makes this podcast great for a MANTL community?"
                  rows={3}
                  maxLength={500}
                  style={{
                    ...inputStyle,
                    resize: "none",
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {error && (
                <div style={{
                  fontSize: 12, color: t.red,
                  fontFamily: t.fontBody,
                }}>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!podcastName.trim() || submitting || !userId}
                style={{
                  padding: "14px 0",
                  borderRadius: 12,
                  border: "none",
                  background: podcastName.trim() && userId
                    ? t.red
                    : "rgba(255,255,255,0.06)",
                  color: podcastName.trim() && userId
                    ? "#fff"
                    : "var(--text-faint)",
                  fontSize: 14,
                  fontFamily: t.fontBody,
                  fontWeight: 600,
                  cursor: podcastName.trim() ? "pointer" : "default",
                  opacity: submitting ? 0.6 : 1,
                  letterSpacing: "0.02em",
                }}
              >
                {submitting ? "Submitting..." : !userId ? "Sign in to request" : "Submit Request"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
