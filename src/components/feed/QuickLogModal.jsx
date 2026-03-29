import { t } from "../../theme";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../supabase";
import { logFilm, deleteFullMediaLogByTmdb } from "../../utils/mediaWrite";
import StarRating from "../shared/StarRating";

/**
 * QuickLogModal — lightweight rate + log overlay.
 *
 * Props:
 *   data      — { tmdb_id, title, year, poster_path, director, creator, cover_url }
 *   open      — boolean
 *   onClose   — () => void
 *   onLogged  — () => void  (called after successful log)
 *   isLogged  — boolean (film already in user's log)
 *   onDeleted — () => void  (called after successful delete)
 */
export default function QuickLogModal({ data, open, onClose, onLogged, isLogged, onDeleted }) {
  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const userIdRef = useRef(null);

  // Grab session once
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) userIdRef.current = session.user.id;
    });
  }, []);

  // Reset rating when modal opens with new data
  useEffect(() => {
    if (open) { setRating(0); setConfirmDelete(false); }
  }, [open, data?.tmdb_id]);

  const resolveCover = () => {
    if (!data) return null;
    if (data.poster_path?.startsWith("http")) return data.poster_path;
    if (data.poster_path) return `https://image.tmdb.org/t/p/w342${data.poster_path}`;
    return data.cover_url || null;
  };

  const handleConfirm = async () => {
    if (!userIdRef.current || !data?.tmdb_id || saving) return;
    setSaving(true);
    try {
      const coverUrl = resolveCover();
      await logFilm(userIdRef.current, {
        tmdb_id: data.tmdb_id,
        title: data.title,
        year: data.year || null,
        creator: data.director || data.creator || null,
        poster_path: coverUrl,
      }, coverUrl, {
        rating: rating || null,
        completed_at: new Date().toISOString().slice(0, 10),
      });

      // Auto-remove from watchlist
      try {
        await supabase.from("wishlist").delete()
          .eq("user_id", userIdRef.current).eq("title", data.title)
          .in("item_type", ["movie", "show"]);
      } catch {}

      onLogged?.(rating || null);
      onClose();
    } catch (e) { console.warn("[QuickLog] Log error:", e); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!userIdRef.current || !data?.tmdb_id || deleting) return;
    setDeleting(true);
    try {
      const ok = await deleteFullMediaLogByTmdb(userIdRef.current, data.tmdb_id);
      if (ok) {
        onDeleted?.();
        onClose();
      }
    } catch (e) { console.warn("[QuickLog] Delete error:", e); }
    setDeleting(false);
  };

  if (!open || !data) return null;

  const coverUrl = resolveCover();
  const thumbUrl = data.poster_path?.startsWith("http")
    ? data.poster_path
    : data.poster_path
      ? `https://image.tmdb.org/t/p/w154${data.poster_path}`
      : data.cover_url || null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: "rgba(0,0,0,0.6)",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", zIndex: 1101,
        left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(320px, 85vw)",
        background: "#1e1b17",
        borderRadius: 14,
        border: "2px solid rgba(240,235,225,0.2)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
        padding: "24px 20px 20px",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 16,
      }}>
        {/* Poster + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
          {thumbUrl && (
            <img
              src={thumbUrl}
              alt=""
              style={{ width: 48, height: 72, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: t.fontDisplay,
              fontWeight: 700, fontSize: 16,
              color: "var(--text-primary)",
              lineHeight: 1.2,
              overflow: "hidden", textOverflow: "ellipsis",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            }}>{data.title}</div>
            {data.year && (
              <div style={{
                fontFamily: t.fontBody,
                fontSize: 10, color: "var(--text-muted)",
                marginTop: 2,
              }}>{data.year}</div>
            )}
          </div>
        </div>

        {/* Star rating */}
        <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <StarRating
            value={rating}
            onChange={setRating}
            size="lg"
            showValue={false}
            color="#facc15"
          />
        </div>

        {/* Rating display */}
        {rating > 0 && (
          <div style={{
            fontFamily: t.fontDisplay,
            fontSize: 14, fontWeight: 600,
            color: t.gold,
            marginTop: -8,
          }}>
            {rating} / 5
          </div>
        )}

        {/* Log button */}
        <button
          onClick={handleConfirm}
          disabled={saving}
          style={{
            width: "100%",
            padding: "10px 0",
            borderRadius: 10,
            border: "none",
            background: saving ? "rgba(240,235,225,0.1)" : "rgba(240,235,225,0.9)",
            color: saving ? "rgba(240,235,225,0.4)" : "#1e1b17",
            fontFamily: t.fontDisplay,
            fontWeight: 700, fontSize: 14,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: saving ? "wait" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {saving ? "Logging..." : "Log This Film"}
        </button>

        {/* Skip rating link */}
        {rating === 0 && (
          <div
            onClick={handleConfirm}
            style={{
              fontFamily: t.fontBody,
              fontSize: 11, color: "var(--text-muted)",
              cursor: "pointer", marginTop: -8,
              letterSpacing: "0.04em",
            }}
          >
            or log without rating
          </div>
        )}

        {/* Remove from Log — only when already logged */}
        {isLogged && !confirmDelete && (
          <div
            onClick={() => setConfirmDelete(true)}
            style={{
              fontFamily: t.fontBody,
              fontSize: 11, color: "rgba(233,69,96,0.6)",
              cursor: "pointer", marginTop: 4,
              letterSpacing: "0.04em",
              transition: "color 0.2s",
            }}
          >
            remove from log
          </div>
        )}

        {/* Confirm delete */}
        {isLogged && confirmDelete && (
          <div style={{
            width: "100%", marginTop: 4,
            padding: "12px 14px",
            background: "rgba(233,69,96,0.06)",
            border: "1px solid rgba(233,69,96,0.15)",
            borderRadius: 10,
          }}>
            <div style={{
              fontFamily: t.fontBody,
              fontSize: 12, color: "var(--text-muted)",
              lineHeight: 1.5, marginBottom: 10, textAlign: "center",
            }}>
              Remove from log? You'll lose any community and badge progress associated with this film.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: "8px 0",
                  borderRadius: 8, border: "none",
                  background: deleting ? "rgba(233,69,96,0.2)" : "rgba(233,69,96,0.8)",
                  color: deleting ? "rgba(255,255,255,0.4)" : "#fff",
                  fontFamily: t.fontDisplay,
                  fontWeight: 700, fontSize: 12,
                  letterSpacing: "0.04em", textTransform: "uppercase",
                  cursor: deleting ? "wait" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {deleting ? "Removing..." : "Yes, Remove"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  flex: 1, padding: "8px 0",
                  borderRadius: 8, border: "1px solid rgba(240,235,225,0.1)",
                  background: "transparent",
                  color: "var(--text-muted)",
                  fontFamily: t.fontDisplay,
                  fontWeight: 600, fontSize: 12,
                  letterSpacing: "0.04em", textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>,
    document.body
  );
}
