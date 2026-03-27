import { t } from "../../../theme";
import { useState } from "react";
import { supabase } from "../../../supabase";

const ADMIN_USER_ID = "19410e64-d610-4fab-9c26-d24fafc94696";
import { searchRAWGRaw } from "../../../utils/api";
/**
 * AdminGameEditor — inline editor for game community_items, visible only to admin.
 *
 * Like AdminItemEditor but searches RAWG instead of TMDB.
 * Features:
 *   - RAWG search: type query → pick from results → auto-fills title, year, cover, rawg_id
 *   - Edit title, year, poster_path (cover URL)
 *   - Move to different shelf (miniseries)
 *   - Delete item
 *
 * Props:
 *   item        — community_items row
 *   userId      — current user ID (only renders for admin)
 *   miniseries  — array of all miniseries for this community
 *   onSaved     — callback after save/delete
 */
export default function AdminGameEditor({ item, userId, miniseries = [], onSaved, onToast }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(item.title || "");
  const [year, setYear] = useState(item.year || "");
  const [coverUrl, setCoverUrl] = useState(item.poster_path || "");
  const [creator, setCreator] = useState(item.creator || "");
  const [shelfId, setShelfId] = useState(item.miniseries_id || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Store RAWG match data
  const [rawgId, setRawgId] = useState(item.extra_data?.rawg_id || null);
  const [rawgSlug, setRawgSlug] = useState(item.extra_data?.rawg_slug || null);

  if (userId !== ADMIN_USER_ID) return null;

const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const data = await searchRAWGRaw(searchQuery.trim(), 6);
      setSearchResults((data?.results || []).slice(0, 6));
    } catch (e) {
      console.error("[AdminGameEdit] Search error:", e);
    }
    setSearching(false);
  };

  const handlePickResult = (result) => {
    setTitle(result.name);
    setYear(result.released ? parseInt(result.released.split("-")[0]) : "");
    setCoverUrl(result.background_image || "");
    setRawgId(result.id);
    setRawgSlug(result.slug);
    // Try to get developer/publisher
    if (result.developers?.length > 0) {
      setCreator(result.developers[0].name);
    } else if (result.publishers?.length > 0) {
      setCreator(result.publishers[0].name);
    }
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const existingExtra = item.extra_data || {};
      const updates = {
        title: title.trim(),
        year: year ? parseInt(year) : null,
        poster_path: coverUrl.trim() || null,
        creator: creator.trim() || null,
        extra_data: {
          ...existingExtra,
          ...(rawgId ? { rawg_id: rawgId, rawg_slug: rawgSlug } : {}),
        },
      };
      if (shelfId && shelfId !== item.miniseries_id) {
        updates.miniseries_id = shelfId;
      }

      const { error } = await supabase
        .from("community_items")
        .update(updates)
        .eq("id", item.id);

      if (error) throw error;
      setSaved(true);
      if (onToast) onToast("Game updated ✓");
      if (onSaved) onSaved();
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("[AdminGameEdit] Save error:", e);
      alert("Save failed: " + e.message);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${title}" from this community?`)) return;
    setSaving(true);
    try {
      await supabase.from("community_user_progress").delete().eq("item_id", item.id);
      const { error } = await supabase.from("community_items").delete().eq("id", item.id);
      if (error) throw error;
      if (onToast) onToast("Game deleted");
      if (onSaved) onSaved();
    } catch (e) {
      console.error("[AdminGameEdit] Delete error:", e);
      alert("Delete failed: " + e.message);
    }
    setSaving(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          background: t.bgInput,
          border: "none", borderRadius: "50%",
          width: 28, height: 28,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: t.textMuted, fontSize: 14, cursor: "pointer",
          flexShrink: 0,
        }}
        title="Admin: Edit game"
      >⚙</button>
    );
  }

  const currentShelf = miniseries.find(m => m.id === item.miniseries_id);

  return (
    <div style={{
      marginBottom: 14, padding: "12px",
      background: "rgba(233,30,140,0.04)",
      border: "1px solid rgba(233,30,140,0.15)",
      borderRadius: 10,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 10,
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, color: "#e91e8c",
          textTransform: "uppercase", letterSpacing: "0.08em",
        }}>Game Editor</div>
        <button onClick={() => setOpen(false)} style={{
          background: "none", border: "none", color: t.textMuted,
          fontSize: 12, cursor: "pointer",
        }}>close</button>
      </div>

      {/* RAWG Search */}
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>RAWG Search</label>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search RAWG by game title..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={handleSearch} disabled={searching} style={smallBtnStyle}>
            {searching ? "..." : "Search"}
          </button>
        </div>
        {searchResults.length > 0 && (
          <div style={{
            marginTop: 6, maxHeight: 260, overflowY: "auto",
            background: "rgba(0,0,0,0.3)", borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            {searchResults.map((r) => {
              const yr = r.released ? r.released.split("-")[0] : "?";
              const platforms = (r.platforms || []).map(p => p.platform.name).slice(0, 3).join(", ");
              return (
                <div
                  key={r.id}
                  onClick={() => handlePickResult(r)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 8px", cursor: "pointer",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  {r.background_image ? (
                    <img src={r.background_image}
                      style={{ width: 48, height: 27, borderRadius: 3, objectFit: "cover" }} alt="" />
                  ) : (
                    <div style={{ width: 48, height: 27, borderRadius: 3, background: "rgba(255,255,255,0.05)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🎮</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: t.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.name}
                    </div>
                    <div style={{ fontSize: 9, color: t.textSecondary }}>
                      {yr}{platforms ? ` · ${platforms}` : ""} · rawg:{r.id}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Title */}
      <div style={{ marginBottom: 8 }}>
        <label style={labelStyle}>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
      </div>

      {/* Year + Creator */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Year</label>
          <input type="number" value={year} onChange={(e) => setYear(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Developer</label>
          <input value={creator} onChange={(e) => setCreator(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Cover URL */}
      <div style={{ marginBottom: 8 }}>
        <label style={labelStyle}>Cover URL</label>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)}
            style={{ ...inputStyle, flex: 1 }} placeholder="https://media.rawg.io/..." />
          {coverUrl && (
            <img src={coverUrl} alt="cover" style={{ width: 48, height: 27, borderRadius: 3, objectFit: "cover" }} />
          )}
        </div>
      </div>

      {/* RAWG ID (read-only indicator) */}
      {rawgId && (
        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>RAWG</label>
          <div style={{ fontSize: 10, color: t.textSecondary }}>
            ID: {rawgId} · Slug: {rawgSlug}
          </div>
        </div>
      )}

      {/* Shelf move */}
      {miniseries.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>
            Shelf {currentShelf ? `(${currentShelf.title})` : ""}
          </label>
          <select
            value={shelfId}
            onChange={(e) => setShelfId(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer", colorScheme: "dark" }}
          >
            {miniseries.map(m => (
              <option key={m.id} value={m.id}>
                {m.title} {m.id === item.miniseries_id ? "(current)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} disabled={saving} style={{
          flex: 1, padding: "8px 0",
          background: saved ? "#22c55e" : "rgba(233,30,140,0.15)",
          border: saved ? "1px solid #22c55e" : "1px solid rgba(233,30,140,0.3)",
          borderRadius: 8,
          color: saved ? "#000" : "#e91e8c",
          fontSize: 12, fontWeight: 700, cursor: "pointer",
          transition: "all 0.2s",
        }}>
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save"}
        </button>
        <button onClick={handleDelete} disabled={saving} style={{
          padding: "8px 14px",
          background: "rgba(233,69,96,0.08)",
          border: "1px solid rgba(233,69,96,0.2)",
          borderRadius: 8, color: t.red, fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}>Delete</button>
      </div>

      {rawgId && (
        <a href={`https://rawg.io/games/${rawgSlug || rawgId}`} target="_blank" rel="noopener noreferrer"
          style={{ display: "block", marginTop: 8, fontSize: 9, color: t.textSecondary, textDecoration: "none" }}>
          View on RAWG → rawg.io/games/{rawgSlug || rawgId}
        </a>
      )}
    </div>
  );
}

const labelStyle = {
  display: "block", fontSize: 9, fontWeight: 600, color: t.textSecondary,
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3,
};
const inputStyle = {
  width: "100%", padding: "6px 8px",
  background: t.bgInput, border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6, color: t.textSecondary, fontSize: 12, outline: "none", fontFamily: "inherit",
};
const smallBtnStyle = {
  padding: "0 12px", background: t.bgHover,
  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6,
  color: t.textSecondary, fontSize: 11, cursor: "pointer", flexShrink: 0,
};
