import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
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
 *   onAutoComplete — (habit, ...) => void (optional)
 */
export default function ItemDetailModal({
  item,
  session,
  profile,
  onClose,
  onRefresh,
  onToast,
  onAutoComplete,
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
      color: "rgba(255,255,255,0.5)",
    }}>{text}</div>
  );

  const statusMsg = () => saveStatus && (
    <div style={{
      marginTop: 10, fontSize: 12, textAlign: "center",
      color: saveStatus === "saved" ? "#4ade80" : saveStatus === "error" ? "#e94560" : "#888",
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

  // Books: reading log
  // ── Actions ──

  const updateRating = async () => {
    const table = ({ movies: "movies", shows: "shows", games: "games", books: "books" })[shelfType];
    if (!table) return;
    const { error } = await supabase.from(table).update({ rating: editRatingVal || null }).eq("id", item.id);
    if (!error) {
      setLocalItem(prev => ({ ...prev, rating: editRatingVal || null }));
      setEditingRating(false);
      if (onRefresh) onRefresh();
    }
  };

  const removeItem = async () => {
    setDeleting(true);
    const table = ({ movies: "movies", shows: "shows", games: "games", books: "books" })[shelfType];
    if (!table) return;
    const { error } = await supabase.from(table).delete().eq("id", item.id);
    if (!error) {
      if (onRefresh) onRefresh();
      onClose();
    } else {
      setDeleting(false);
      if (onToast) onToast("Couldn't delete — try again");
    }
  };

  const saveBookProgress = async () => {
    if (!userId || !item.id) return;
    setSaving(true);
    setSaveStatus("saving");

    try {
      await supabase.from("books").update({
        is_active: false,
        rating: finishRating || null,
        finished_at: new Date().toISOString(),
      }).eq("id", item.id);

      setLocalItem(prev => ({
        ...prev, isReading: false, rating: finishRating || null, status: "read",
      }));
      setFinishRating(0);
      if (onRefresh) onRefresh();
      if (onAutoComplete) onAutoComplete("reading", null, "book");
      flash("saved");
    } catch (err) {
      console.error("Book save error:", err);
      flash("error");
    }
    setSaving(false);
  };

  const saveShowProgress = async () => {
    if (!userId || !item.id) return;
    setSaving(true);
    setSaveStatus("saving");

    try {
      await supabase.from("shows").update({
        status: "finished",
        rating: finishRating || null,
      }).eq("id", item.id);

      setLocalItem(prev => ({
        ...prev, isWatching: false, status: "finished", rating: finishRating || null,
      }));
      setFinishRating(0);
      if (onRefresh) onRefresh();
      if (onAutoComplete) onAutoComplete("watching", null, "show");
      flash("saved");
    } catch (err) {
      console.error("Show save error:", err);
      flash("error");
    }
    setSaving(false);
  };

  const finishGame = async () => {
    if (!userId || !item.id) return;
    setSaving(true);
    setSaveStatus("saving");
    try {
      await supabase.from("games").update({
        status: "completed",
        rating: finishRating || null,
        finished_at: new Date().toISOString(),
      }).eq("id", item.id);
      setLocalItem(prev => ({ ...prev, isPlaying: false, rating: finishRating || null, status: "completed" }));
      setFinishRating(0);
      if (onRefresh) onRefresh();
      flash("saved");
    } catch (err) {
      console.error("Game save error:", err);
      flash("error");
    }
    setSaving(false);
  };

  const setGameStatus = async (status) => {
    const { error } = await supabase.from("games").update({ status }).eq("id", item.id);
    if (!error) {
      setLocalItem(prev => ({
        ...prev, status,
        isPlaying: status === "playing",
        isBeat: status === "beat",
      }));
      if (onRefresh) onRefresh();
    }
  };

  // ── Render helpers ──
  const renderStars = (rating) => {
    if (!rating) return null;
    const full = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    return <span style={{ color: "#facc15", letterSpacing: 1 }}>{"★".repeat(full)}{hasHalf ? "⯨" : ""}</span>;
  };

  return (
    <BottomSheet onClose={onClose} maxHeight="90vh">
      {/* ── Hero: poster + info ── */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{
          width: 100, flexShrink: 0,
          aspectRatio: shelfType === "games" ? "16/9" : "2/3",
          borderRadius: 8, overflow: "hidden",
          background: "linear-gradient(135deg, #1a1a2e, #16213e)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.2)",
        }}>
          {localItem.cover ? (
            <img src={localItem.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32,
            }}>
              {{ movies: "🎬", books: "📖", shows: "📺", games: "🎮" }[shelfType]}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--font-display, 'Barlow Condensed', sans-serif)",
            fontSize: 22, fontWeight: 800, color: "#fff",
            textTransform: "uppercase", lineHeight: 1.1, marginBottom: 4,
          }}>{localItem.title}</div>

          {localItem.year && <div style={{ fontSize: 12, color: "#999", marginBottom: 2 }}>{localItem.year}</div>}
          {localItem.author && <div style={{ fontSize: 12, color: "#999", marginBottom: 2 }}>{localItem.author}</div>}
          {localItem.director && <div style={{ fontSize: 12, color: "#999", marginBottom: 2 }}>{localItem.director}</div>}
          {localItem.platform && <div style={{ fontSize: 12, color: "#999", marginBottom: 2 }}>{localItem.platform}</div>}
          {shelfType === "games" && localItem.genre && <div style={{ fontSize: 12, color: "#999", marginBottom: 2 }}>{localItem.genre}</div>}

          {localItem.rating && (
            <div style={{ marginTop: 8 }}>
              {renderStars(localItem.rating)}
              <span style={{ fontSize: 11, color: "#888", marginLeft: 6 }}>({localItem.rating})</span>
            </div>
          )}

          {/* Status badges */}
          {localItem.isReading && !localItem.rating && (
            <div style={badgeStyle("#4ade80")}>📖 Currently reading</div>
          )}
          {localItem.isWatching && (
            <div style={badgeStyle("#e94560")}>📺 S{localItem.currentSeason}E{localItem.currentEpisode}</div>
          )}
          {localItem.isPlaying && (
            <div style={badgeStyle("#a78bfa")}>
              🎮 Playing
              {localItem.source === "steam" && <span style={{ opacity: 0.5, fontSize: 10, marginLeft: 4 }}>· Steam</span>}
            </div>
          )}
          {localItem.isBeat && (
            <div style={badgeStyle("#4ade80")}>✓ Beat</div>
          )}

          {localItem.watchedAt && <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>Watched {formatDate(localItem.watchedAt)}</div>}
          {localItem.finishedAt && <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>Finished {formatDate(localItem.finishedAt)}</div>}
        </div>
      </div>

      {/* ── Game: Mark as Finished ── */}
      {localItem.isPlaying && shelfType === "games" && (
        <Section>
          {label("Finished playing?")}
          <StarRating value={finishRating} onChange={setFinishRating} label="Rate This Game" />
          <button style={primaryBtn} onClick={finishGame} disabled={saving}>
            {saving ? "Saving..." : "Mark as Finished"}
          </button>
          {statusMsg()}
        </Section>
      )}

      {/* ── Book: Mark as Finished ── */}
      {localItem.isReading && shelfType === "books" && (
        <Section>
          {label("Finished reading?")}
          <StarRating value={finishRating} onChange={setFinishRating} label="Rate This Book" />
          <button style={primaryBtn} onClick={saveBookProgress} disabled={saving}>
            {saving ? "Saving..." : "Mark as Finished"}
          </button>
          {statusMsg()}
        </Section>
      )}

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

      {/* ── Steam Stats (games) ── */}
      {shelfType === "games" && localItem.source === "steam" && (() => {
        const hours = localItem.playtimeHours != null ? Math.round(localItem.playtimeHours) : null;
        const achTotal = localItem.achievementsTotal || 0;
        const achEarned = localItem.achievementsEarned || 0;
        const achPct = achTotal > 0 ? Math.round((achEarned / achTotal) * 100) : 0;
        return (hours || achTotal) ? (
          <Section>
            {label("Steam Stats")}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {hours != null && (
                <StatCard value={`${hours}h`} sub="PLAYED" />
              )}
              {achTotal > 0 && (
                <div style={{ flex: 1, minWidth: 100, padding: "14px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "var(--font-mono, monospace)" }}>
                    {achEarned}<span style={{ fontSize: 14, color: "#666" }}>/{achTotal}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: "0.05em", fontFamily: "var(--font-mono, monospace)" }}>ACHIEVEMENTS</div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${achPct}%`, background: achPct === 100 ? "#4ade80" : "#a78bfa", borderRadius: 2, transition: "width 0.3s" }} />
                  </div>
                </div>
              )}
            </div>
          </Section>
        ) : null;
      })()}


      {/* ── Game status selector ── */}
      {shelfType === "games" && (
        <Section>
          {label("Status")}
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { key: "playing", label: "🎮 Playing", bg: "linear-gradient(135deg, #a78bfa, #7c5cc4)", color: "white" },
              { key: "completed", label: "📋 Backlog", bg: "rgba(255,255,255,0.04)", color: "#888" },
              { key: "beat", label: "✓ Beat", bg: "#4ade80", color: "#0a0a0a" },
            ].map(opt => {
              const isActive = (localItem.status || "completed") === opt.key;
              return (
                <button key={opt.key} onClick={() => setGameStatus(opt.key)}
                  style={{
                    flex: 1, padding: "10px 8px", fontSize: 11, border: "none", borderRadius: 8,
                    cursor: "pointer", fontFamily: "var(--font-mono, monospace)", fontWeight: isActive ? 700 : 400,
                    background: isActive ? opt.bg : "rgba(255,255,255,0.04)",
                    color: isActive ? opt.color : "rgba(255,255,255,0.3)",
                    boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.2)" : "none",
                    border: isActive ? "none" : "1px solid rgba(255,255,255,0.06)",
                    transition: "all 0.2s",
                  }}>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Actions: Edit rating + Remove ── */}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {!localItem.isReading && !localItem.isWatching && !localItem.isPlaying && (
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
          <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.5, marginBottom: 12 }}>
            Remove <strong style={{ color: "#fff" }}>{localItem.title}</strong> from your shelf? This will also delete any journal entries and ratings.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...primaryBtn, background: "#e94560" }}
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

function StatCard({ value, sub }) {
  return (
    <div style={{
      flex: 1, minWidth: 100, padding: "14px 16px",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 10, textAlign: "center",
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "var(--font-mono, monospace)" }}>{value}</div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: "0.05em", fontFamily: "var(--font-mono, monospace)" }}>{sub}</div>
    </div>
  );
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
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12, color: "#ccc",
  fontSize: 13, fontWeight: 600,
  cursor: "pointer", transition: "background 0.15s",
  textAlign: "center",
};

const dangerBtn = {
  flex: 1, width: "100%", padding: "11px 0",
  background: "rgba(233,69,96,0.08)",
  border: "1px solid rgba(233,69,96,0.2)",
  borderRadius: 12, color: "#e94560",
  fontSize: 13, fontWeight: 600,
  cursor: "pointer", transition: "background 0.15s",
  textAlign: "center",
};

const ghostBtn = {
  width: "100%", padding: "10px 0", marginTop: 8,
  background: "none", border: "none",
  color: "#666", fontSize: 13, cursor: "pointer",
};
