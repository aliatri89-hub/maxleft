import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../supabase";
import { logFilm } from "../../utils/mediaWrite";
import StarRating from "../shared/StarRating";

/**
 * QuickLogModal — lightweight rate + log overlay.
 *
 * Props:
 *   data     — { tmdb_id, title, year, poster_path, director, creator, cover_url }
 *   open     — boolean
 *   onClose  — () => void
 *   onLogged — () => void  (called after successful log)
 */
export default function QuickLogModal({ data, open, onClose, onLogged }) {
  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const userIdRef = useRef(null);

  // Grab session once
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) userIdRef.current = session.user.id;
    });
  }, []);

  // Reset rating when modal opens with new data
  useEffect(() => {
    if (open) setRating(0);
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

      // Write to feed_activity (dedup with Letterboxd sync)
      try {
        const { data: existingFeed } = await supabase.from("feed_activity")
          .select("id").eq("user_id", userIdRef.current).eq("activity_type", "movie")
          .eq("item_title", data.title).limit(1);

        if (!existingFeed || existingFeed.length === 0) {
          await supabase.from("feed_activity").insert({
            user_id: userIdRef.current,
            activity_type: "movie",
            action: "shelved",
            title: data.title,
            item_title: data.title,
            item_cover: coverUrl,
            item_author: data.director || data.creator || null,
            item_year: data.year ? parseInt(data.year) : null,
            rating: rating ? Math.round(rating) : null,
          });
        } else if (rating) {
          await supabase.from("feed_activity")
            .update({ rating: Math.round(rating) })
            .eq("id", existingFeed[0].id);
        }
      } catch (e) { console.warn("[QuickLog] Feed activity error:", e); }

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
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: 16,
              color: "#f0ebe1",
              lineHeight: 1.2,
              overflow: "hidden", textOverflow: "ellipsis",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            }}>{data.title}</div>
            {data.year && (
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10, color: "rgba(240,235,225,0.45)",
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
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 14, fontWeight: 600,
            color: "#facc15",
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
            fontFamily: "'Barlow Condensed', sans-serif",
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
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, color: "rgba(240,235,225,0.3)",
              cursor: "pointer", marginTop: -8,
              letterSpacing: "0.04em",
            }}
          >
            or log without rating
          </div>
        )}
      </div>
    </>,
    document.body
  );
}
