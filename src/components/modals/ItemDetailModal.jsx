import { t } from "../../theme";
import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { updateMediaRating, deleteFullMediaLog } from "../../utils/mediaWrite";
import { formatDate } from "../../utils/helpers";
import BottomSheet from "../shared/BottomSheet";
import StarRating from "../shared/StarRating";

/**
 * ItemDetailModal — Dark bottom-sheet for viewing/editing any shelf item.
 * Self-contained: manages its own state and Supabase calls.
 *
 * Props:
 *   item       — shelf item object (with .shelfType added)
 *   session    — auth session
 *   profile    — user profile
 *   onClose    — () => void
 *   onRefresh  — () => void — reload shelf data after changes
 *   onToast    — (msg) => void
 */
export default function ItemDetailModal({
  item,
  session,
  profile,
  onClose,
  onRefresh,
  onToast,
}) {
  if (!item) return null;

  const { shelfType } = item;
  const userId = session?.user?.id;

  // ── Shared state ──
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // null | "saving" | "saved" | "error"
  const [editingRating, setEditingRating] = useState(false);
  const [editRatingVal, setEditRatingVal] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localItem, setLocalItem] = useState(item); // mutable copy for optimistic updates

  // ── Shared for finish flows ──
  const [finishRating, setFinishRating] = useState(0);

  // ── Styling helpers ──
  const label = (text) => (
    <div style={{
      fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
      fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
      textTransform: "uppercase", marginBottom: 8,
      color: t.textMuted,
    }}>{text}</div>
  );

  const statusMsg = () => saveStatus && (
    <div style={{
      marginTop: 10, fontSize: 12, textAlign: "center",
      color: saveStatus === "saved" ? t.green : saveStatus === "error" ? t.red : t.textMuted,
    }}>
      {saveStatus === "saving" && "Saving..."}
      {saveStatus === "saved" && "✓ Done!"}
      {saveStatus === "error" && "✗ Something went wrong. Try again."}
    </div>
  );

  const flash = (status) => {
    setSaveStatus(status);
    setTimeout(() => setSaveStatus(null), 2500);
  };

  // ── Data loading ──

  // ── Actions ──

  const updateRating = async () => {
    const ok = await updateMediaRating(item.id, editRatingVal);
    if (ok) {
      setLocalItem(prev => ({ ...prev, rating: editRatingVal || null }));
      setEditingRating(false);
      if (onRefresh) onRefresh();
    }
  };

  const removeItem = async () => {
    setDeleting(true);
    const ok = await deleteFullMediaLog(userId, item.id);
    if (ok) {
      if (onRefresh) onRefresh();
      onClose();
    } else {
      setDeleting(false);
      if (onToast) onToast("Couldn't delete — try again");
    }
  };

  const saveShowProgress = async () => {
    if (!userId || !item.id) return;
    setSaving(true);
    setSaveStatus("saving");

    try {
      await supabase.from("user_media_logs").update({
        status: "finished",
        rating: finishRating || null,
        watched_at: new Date().toISOString(),
      }).eq("id", item.id);

      setLocalItem(prev => ({
        ...prev, isWatching: false, status: "finished", rating: finishRating || null,
      }));
      setFinishRating(0);
      if (onRefresh) onRefresh();
      flash("saved");
    } catch (err) {
      console.error("Show save error:", err);
      flash("error");
    }
    setSaving(false);
  };

  // ── Render helpers ──
  const renderStars = (rating) => {
    if (!rating) return null;
    const full = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    return <span style={{ color: t.gold, letterSpacing: 1 }}>{"★".repeat(full)}{hasHalf ? "⯨" : ""}</span>;
  };

  return (
    <BottomSheet onClose={onClose} maxHeight="90vh">
      {/* ── Hero: poster + info ── */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{
          width: 100, flexShrink: 0,
          aspectRatio: "2/3",
          borderRadius: 8, overflow: "hidden",
          background: "linear-gradient(135deg, #1a1a2e, #16213e)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.2)",
        }}>
          {localItem.cover ? (
            <img src={localItem.cover} loading="lazy" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32,
            }}>
              {{ movies: "🎬", shows: "📺" }[shelfType]}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--font-display, 'Barlow Condensed', sans-serif)",
            fontSize: 22, fontWeight: 800, color: t.textPrimary,
            textTransform: "uppercase", lineHeight: 1.1, marginBottom: 4,
          }}>{localItem.title}</div>

          {localItem.year && <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 2 }}>{localItem.year}</div>}
          {localItem.director && <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 2 }}>{localItem.director}</div>}

          {localItem.rating && (
            <div style={{ marginTop: 8 }}>
              {renderStars(localItem.rating)}
              <span style={{ fontSize: 11, color: t.textSecondary, marginLeft: 6 }}>({localItem.rating})</span>
            </div>
          )}

          {/* Status badges */}
          {localItem.isWatching && (
            <div style={badgeStyle("#e94560")}>📺 Currently Watching</div>
          )}

          {localItem.watchedAt && <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>Watched {formatDate(localItem.watchedAt)}</div>}
        </div>
      </div>

      {/* ── Show: Mark as Finished ── */}
      {localItem.isWatching && shelfType === "shows" && (
        <Section>
          {label("Finished watching?")}
          <StarRating value={finishRating} onChange={setFinishRating} label="Rate This Show" />
          <button style={primaryBtn} onClick={saveShowProgress} disabled={saving}>
            {saving ? "Saving..." : "Mark as Finished"}
          </button>
          {statusMsg()}
        </Section>
      )}

      {/* ── Actions: Edit rating + Remove ── */}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {!localItem.isWatching && (
          <button style={secondaryBtn} onClick={() => {
            setEditingRating(!editingRating);
            setEditRatingVal(localItem.rating || 0);
            setConfirmDelete(false);
          }}>
            {editingRating ? "Cancel" : "Edit Rating"}
          </button>
        )}
        <button style={dangerBtn} onClick={() => { setConfirmDelete(!confirmDelete); setEditingRating(false); }}>
          Remove from Shelf
        </button>
      </div>

      {/* ── Inline edit rating ── */}
      {editingRating && (
        <Section>
          <StarRating value={editRatingVal} onChange={setEditRatingVal} label="Update Rating" />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={primaryBtn} onClick={updateRating}>Save</button>
            <button style={secondaryBtn} onClick={() => setEditingRating(false)}>Cancel</button>
          </div>
        </Section>
      )}

      {/* ── Confirm delete ── */}
      {confirmDelete && (
        <div style={{
          marginTop: 12, padding: "14px 16px",
          background: "rgba(233,69,96,0.06)",
          border: "1px solid rgba(233,69,96,0.15)",
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.5, marginBottom: 12 }}>
            Remove <strong style={{ color: t.textPrimary }}>{localItem.title}</strong> from your log? You'll lose any community and badge progress associated with this item.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...primaryBtn, background: t.red }}
              onClick={removeItem} disabled={deleting}>
              {deleting ? "Deleting..." : "Yes, Remove"}
            </button>
            <button style={secondaryBtn} onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Close ── */}
      <button style={ghostBtn} onClick={onClose}>Cancel</button>
    </BottomSheet>
  );
}

// ── Sub-components ──

function Section({ children }) {
  return <div style={{ marginBottom: 16 }}>{children}</div>;
}

// ── Style constants ──

function badgeStyle(color) {
  return {
    display: "inline-flex", alignItems: "center", gap: 4,
    marginTop: 8, padding: "3px 10px",
    background: `${color}15`, border: `1px solid ${color}40`,
    borderRadius: 20, fontSize: 11, color, fontWeight: 600,
  };
}

const primaryBtn = {
  flex: 1, width: "100%", padding: "13px 0",
  background: "linear-gradient(135deg, #4ade80, #22c55e)",
  border: "none", borderRadius: 12,
  color: "#0a0a0a", fontSize: 14, fontWeight: 700,
  fontFamily: "var(--font-display, 'Barlow Condensed', sans-serif)",
  cursor: "pointer", transition: "opacity 0.15s",
  textAlign: "center", letterSpacing: "0.02em",
};

const secondaryBtn = {
  flex: 1, width: "100%", padding: "11px 0",
  background: t.bgInput,
  border: `1px solid ${t.borderMedium}`,
  borderRadius: 12, color: t.textSecondary,
  fontSize: 13, fontWeight: 600,
  cursor: "pointer", transition: "background 0.15s",
  textAlign: "center",
};

const dangerBtn = {
  flex: 1, width: "100%", padding: "11px 0",
  background: t.redDim,
  border: "1px solid rgba(233,69,96,0.2)",
  borderRadius: 12, color: t.red,
  fontSize: 13, fontWeight: 600,
  cursor: "pointer", transition: "background 0.15s",
  textAlign: "center",
};

const ghostBtn = {
  width: "100%", padding: "10px 0", marginTop: 8,
  background: "none", border: "none",
  color: t.textMuted, fontSize: 13, cursor: "pointer",
};
