import { useState } from "react";
import { supabase } from "../../../supabase";
import { searchTMDBRaw, apiProxy } from "../../../utils/api";

const ADMIN_USER_ID = "19410e64-d610-4fab-9c26-d24fafc94696";

/**
 * AdminItemEditor — inline editor for community_items, visible only to admin.
 *
 * Features:
 *   - Edit title, year, tmdb_id, sort_order (fixes wrong posters, reorder items)
 *   - TMDB search: type query → pick from results → auto-fills fields
 *   - Move to different shelf (miniseries)
 *   - Delete item
 *
 * Props:
 *   item        — community_items row ({ id, title, year, tmdb_id, sort_order, miniseries_id })
 *   userId      — current user ID (only renders for admin)
 *   miniseries  — array of all miniseries for this community [{ id, title }]
 *   onSaved     — optional callback after save/delete
 */
export default function AdminItemEditor({ item, userId, miniseries = [], onSaved, onToast }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(item.title || "");
  const [year, setYear] = useState(item.year || "");
  const [tmdbId, setTmdbId] = useState(item.tmdb_id || "");
  const [shelfId, setShelfId] = useState(item.miniseries_id || "");
  const [sortOrder, setSortOrder] = useState(item.sort_order ?? "");
  const [mediaType, setMediaType] = useState(item.media_type || "film");
  const [episodeUrl, setEpisodeUrl] = useState(item.extra_data?.episode_url || "");
  const [episodeTitle, setEpisodeTitle] = useState(item.extra_data?.episode_title || "");
  const [coverImage, setCoverImage] = useState(item.extra_data?.cover_image || item.poster_path || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [coverSearching, setCoverSearching] = useState(false);

  if (userId !== ADMIN_USER_ID) return null;
const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchTMDBRaw(searchQuery.trim());
      setSearchResults((results || []).slice(0, 6));
    } catch (e) {
      console.error("[AdminEdit] Search error:", e);
    }
    setSearching(false);
  };

  const handlePickResult = (result) => {
    setTitle(result.title);
    setYear(result.release_date ? parseInt(result.release_date.split("-")[0]) : "");
    setTmdbId(result.id);
    setSearchResults([]);
    setSearchQuery("");
  };

  // Google Books cover search (for books)
  const handleCoverSearch = async () => {
    setCoverSearching(true);
    try {
      const query = item.isbn
        ? `isbn:${item.isbn}`
        : `intitle:${title}+inauthor:${item.creator || ""}`;
      const data = await apiProxy("google_books", { query, max_results: "3" });
      if (data?.items) {
        for (const vol of data.items) {
          const links = vol.volumeInfo?.imageLinks;
          if (links) {
            const url = (links.thumbnail || links.smallThumbnail || "")
              .replace("&edge=curl", "")
              .replace("http://", "https://")
              .replace("zoom=1", "zoom=2");
            if (url) {
              setCoverImage(url);
              break;
            }
          }
        }
      }
    } catch (e) {
      console.error("[AdminEdit] Cover search error:", e);
    }
    setCoverSearching(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updates = {
        title: title.trim(),
        year: year ? parseInt(year) : null,
        tmdb_id: tmdbId ? parseInt(tmdbId) : null,
        sort_order: sortOrder !== "" ? parseInt(sortOrder) : null,
        media_type: mediaType,
      };

      // Clear cached poster when tmdb_id OR media_type changes — but ONLY for TMDB media
      const newTmdbId = tmdbId ? parseInt(tmdbId) : null;
      const mediaTypeChanged = mediaType !== (item.media_type || "film");
      const tmdbIdChanged = (newTmdbId || null) !== (item.tmdb_id || null);
      const isTmdbMedia = mediaType === "film" || mediaType === "show";

      if (isTmdbMedia && (tmdbIdChanged || mediaTypeChanged)) {
        updates.poster_path = null;
      }
      // Only include miniseries_id if changed
      if (shelfId && shelfId !== item.miniseries_id) {
        updates.miniseries_id = shelfId;
      }

      // Merge episode_url into extra_data (preserves host verdicts)
      const existingExtra = item.extra_data || {};
      const newExtra = { ...existingExtra };
      if (episodeUrl.trim()) {
        newExtra.episode_url = episodeUrl.trim();
        newExtra.episode_title = episodeTitle.trim() || null;
      } else {
        delete newExtra.episode_url;
        delete newExtra.episode_title;
      }
      // Cover image for books/games (stored in extra_data + poster_path)
      if (coverImage.trim()) {
        newExtra.cover_image = coverImage.trim();
        updates.poster_path = coverImage.trim(); // always wins over any earlier null
      } else if (!isTmdbMedia) {
        // Book/game with no cover — don't null poster_path, leave as-is
        delete newExtra.cover_image;
      } else {
        delete newExtra.cover_image;
      }
      updates.extra_data = Object.keys(newExtra).length > 0 ? newExtra : null;

      // Reflow sort_order on the target shelf when position changes
      const newSort = sortOrder !== "" ? parseInt(sortOrder) : null;
      const oldSort = item.sort_order;
      const targetShelfId = shelfId || item.miniseries_id;
      const shelfChanged = shelfId && shelfId !== item.miniseries_id;

      if (newSort !== null && (newSort !== oldSort || shelfChanged)) {
        // Shift siblings on the target shelf to make room at the new position
        // All items with sort_order >= newSort (excluding this item) get bumped +1
        await supabase.rpc("reflow_sort_order", {
          p_miniseries_id: targetShelfId,
          p_target_sort: newSort,
          p_exclude_item_id: item.id,
        });
      }

      const { error } = await supabase
        .from("community_items")
        .update(updates)
        .eq("id", item.id);

      if (error) {
        if (error.message?.includes("idx_community_items_no_dupes") || error.code === "23505") {
          throw new Error("This TMDB ID already exists on this shelf. Duplicate not allowed.");
        }
        throw error;
      }

      // Bust localStorage cover cache — clear ALL possible keys for this item
      const coverChanged = coverImage.trim() !== (item.extra_data?.cover_image || item.poster_path || "");
      if (tmdbIdChanged || mediaTypeChanged || coverChanged) {
        try {
          const cacheKey = "mantl_cover_cache";
          const stored = localStorage.getItem(cacheKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            // Clear old keys (whatever the item was before)
            if (item.tmdb_id) delete parsed[`tmdb:${item.tmdb_id}`];
            if (item.tmdb_id) delete parsed[`tmdb_tv:${item.tmdb_id}`];
            delete parsed[`book:${item.isbn || item.title}`];
            delete parsed[`book:${title.trim()}`];
            delete parsed[`game:${item.title}`];
            delete parsed[`game:${title.trim()}`];
            // Clear new keys (force fresh fetch)
            if (newTmdbId) delete parsed[`tmdb:${newTmdbId}`];
            if (newTmdbId) delete parsed[`tmdb_tv:${newTmdbId}`];
            localStorage.setItem(cacheKey, JSON.stringify(parsed));
          }
        } catch {}
      }

      setSaved(true);
      if (onToast) onToast("Item updated ✓");
      if (onSaved) onSaved();
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("[AdminEdit] Save error:", e);
      alert("Save failed: " + e.message);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${title}" from this community?`)) return;
    setSaving(true);
    try {
      // Clean up references first (FK constraints)
      await supabase.from("community_user_progress").delete().eq("item_id", item.id);
      try { await supabase.from("badge_items").delete().eq("item_id", item.id); } catch {} // may not exist

      const { error } = await supabase.from("community_items").delete().eq("id", item.id);
      if (error) {
        if (error.message?.includes("foreign key") || error.code === "23503") {
          throw new Error("Can't delete — this item is referenced elsewhere. Try removing it from badges/progress first.");
        }
        throw error;
      }
      if (onToast) onToast("Item deleted");
      if (onSaved) onSaved();
    } catch (e) {
      console.error("[AdminEdit] Delete error:", e);
      alert("Delete failed: " + e.message);
    }
    setSaving(false);
  };

  // Collapsed: just a gear icon
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "none", borderRadius: "50%",
          width: 28, height: 28,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#555", fontSize: 14, cursor: "pointer",
          flexShrink: 0,
        }}
        title="Admin: Edit item"
      >⚙</button>
    );
  }

  // Current shelf name
  const currentShelf = miniseries.find(m => m.id === item.miniseries_id);

  return (
    <div style={{
      marginBottom: 14, padding: "12px",
      background: "rgba(250,204,21,0.04)",
      border: "1px solid rgba(250,204,21,0.15)",
      borderRadius: 10,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 10,
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, color: "#facc15",
          textTransform: "uppercase", letterSpacing: "0.08em",
        }}>Admin Editor</div>
        <button onClick={() => setOpen(false)} style={{
          background: "none", border: "none", color: "#666",
          fontSize: 12, cursor: "pointer",
        }}>close</button>
      </div>

      {/* TMDB Search */}
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>TMDB Search</label>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search TMDB by title..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={handleSearch} disabled={searching} style={smallBtnStyle}>
            {searching ? "..." : "Search"}
          </button>
        </div>
        {searchResults.length > 0 && (
          <div style={{
            marginTop: 6, maxHeight: 220, overflowY: "auto",
            background: "rgba(0,0,0,0.3)", borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            {searchResults.map((r) => {
              const yr = r.release_date ? r.release_date.split("-")[0] : "?";
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
                  {r.poster_path ? (
                    <img src={`https://image.tmdb.org/t/p/w45${r.poster_path}`}
                      style={{ width: 28, height: 42, borderRadius: 3, objectFit: "cover" }} alt="" />
                  ) : (
                    <div style={{ width: 28, height: 42, borderRadius: 3, background: "rgba(255,255,255,0.05)" }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.title}
                    </div>
                    <div style={{ fontSize: 9, color: "#888" }}>{yr} · tmdb:{r.id}</div>
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

      {/* Year + TMDB ID + Sort Order */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Year</label>
          <input type="number" value={year} onChange={(e) => setYear(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>TMDB ID</label>
          <input type="number" value={tmdbId} onChange={(e) => setTmdbId(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Sort Order</label>
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Media Type */}
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Media Type</label>
        <select
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value)}
          style={{
            ...inputStyle,
            cursor: "pointer",
            colorScheme: "dark",
          }}
        >
          <option value="film">Film</option>
          <option value="show">TV Show</option>
          <option value="book">Book</option>
          <option value="game">Game</option>
        </select>
      </div>

      {/* Book Cover Image (books & games — non-TMDB media) */}
      {(mediaType === "book" || mediaType === "game") && (
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>
            Cover Image {coverImage ? "✓" : "⚠ missing"}
          </label>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
            {coverImage && (
              <img
                src={coverImage}
                alt=""
                style={{ width: 36, height: 54, borderRadius: 3, objectFit: "cover", flexShrink: 0 }}
                onError={(e) => { e.target.style.display = "none"; }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <input
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="Paste cover image URL..."
                style={inputStyle}
              />
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                {mediaType === "book" && (
                  <button onClick={handleCoverSearch} disabled={coverSearching} style={smallBtnStyle}>
                    {coverSearching ? "..." : "Search Google Books"}
                  </button>
                )}
                {coverImage && (
                  <button
                    onClick={() => setCoverImage("")}
                    style={{ ...smallBtnStyle, color: "#e94560", borderColor: "rgba(233,69,96,0.2)" }}
                  >Clear</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shelf / Miniseries move */}
      {miniseries.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>
            Shelf {currentShelf ? `(currently: ${currentShelf.title})` : ""}
          </label>
          <select
            value={shelfId}
            onChange={(e) => setShelfId(e.target.value)}
            style={{
              ...inputStyle,
              cursor: "pointer",
              colorScheme: "dark",
            }}
          >
            {miniseries.map(m => (
              <option key={m.id} value={m.id}>
                {m.title} {m.id === item.miniseries_id ? "(current)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Episode Audio Link */}
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>
          Episode URL {episodeUrl ? "🎧" : ""}
        </label>
        <input
          value={episodeUrl}
          onChange={(e) => setEpisodeUrl(e.target.value)}
          placeholder="https://...mp3 (paste audio URL or clear to remove)"
          style={inputStyle}
        />
        {episodeUrl && (
          <div style={{ marginTop: 4 }}>
            <label style={labelStyle}>Episode Title</label>
            <input
              value={episodeTitle}
              onChange={(e) => setEpisodeTitle(e.target.value)}
              placeholder="Episode display name"
              style={inputStyle}
            />
            <button
              onClick={() => { setEpisodeUrl(""); setEpisodeTitle(""); }}
              style={{
                marginTop: 4, padding: "3px 10px",
                background: "rgba(233,69,96,0.08)",
                border: "1px solid rgba(233,69,96,0.2)",
                borderRadius: 4, color: "#e94560", fontSize: 9,
                fontWeight: 600, cursor: "pointer",
              }}
            >Remove episode link</button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1, padding: "8px 0",
            background: saved ? "#22c55e" : "rgba(250,204,21,0.15)",
            border: saved ? "1px solid #22c55e" : "1px solid rgba(250,204,21,0.3)",
            borderRadius: 8,
            color: saved ? "#000" : "#facc15",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save"}
        </button>
        <button onClick={handleDelete} disabled={saving} style={{
          padding: "8px 14px",
          background: "rgba(233,69,96,0.08)",
          border: "1px solid rgba(233,69,96,0.2)",
          borderRadius: 8, color: "#e94560", fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}>Delete</button>
      </div>

      {tmdbId && (
        <a href={`https://www.themoviedb.org/${mediaType === "show" ? "tv" : "movie"}/${tmdbId}`} target="_blank" rel="noopener noreferrer"
          style={{ display: "block", marginTop: 8, fontSize: 9, color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>
          View on TMDB → themoviedb.org/{mediaType === "show" ? "tv" : "movie"}/{tmdbId}
        </a>
      )}
    </div>
  );
}

const labelStyle = {
  display: "block", fontSize: 9, fontWeight: 600, color: "#888",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3,
};
const inputStyle = {
  width: "100%", padding: "6px 8px",
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6, color: "#e0e0e0", fontSize: 12, outline: "none", fontFamily: "inherit",
};
const smallBtnStyle = {
  padding: "0 12px", background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6,
  color: "#ccc", fontSize: 11, cursor: "pointer", flexShrink: 0,
};
