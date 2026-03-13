import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "../../../supabase";

import { searchTMDBRaw } from "../../../utils/api";
const TMDB_IMG = "https://image.tmdb.org/t/p";

// ── Debounce hook ──────────────────────────────────────────────
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── TMDB search ────────────────────────────────────────────────
async function searchTMDB(query, mediaType = "movie") {
  if (!query || query.length < 2) return [];
  const results = await searchTMDBRaw(query, null, mediaType);
  return (results || []).slice(0, 8);
}

/**
 * AddItemTool — Admin tool for adding missing items to a community.
 *
 * Drop into any community screen as a modal overlay.
 * Searches TMDB, checks for dupes, writes to community_items.
 *
 * Props:
 *   community   – community_pages row (from CommunityRouter / useCommunityPage)
 *   miniseries  – full miniseries array (already loaded by parent screen)
 *   session     – supabase auth session
 *   onClose     – () => void
 *   onAdded     – (newItem) => void — callback after successful insert
 *   onToast     – (msg) => void — optional toast callback
 */
export default function AddItemTool({ community, miniseries = [], session, onClose, onAdded, onToast }) {
  const accent = community?.theme_config?.accent || "#e94560";
  const communitySlug = community?.slug;

  // ── Miniseries picker ──────────────────────────────────────
  const seriesOptions = useMemo(() => {
    return miniseries
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((s) => ({
        id: s.id,
        label: s.tab_key ? `[${s.tab_key}] ${s.title}` : s.title,
        title: s.title,
        tab_key: s.tab_key,
        itemCount: (s.items || []).length,
      }));
  }, [miniseries]);

  const [selectedShelves, setSelectedShelves] = useState([]);
  const [shelfSearch, setShelfSearch] = useState("");

  const toggleShelf = useCallback((id) => {
    setSelectedShelves((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }, []);

  const filteredShelfOptions = useMemo(() => {
    const q = shelfSearch.toLowerCase().trim();
    if (!q) return seriesOptions;
    return seriesOptions.filter((s) =>
      s.label.toLowerCase().includes(q) || s.title.toLowerCase().includes(q)
    );
  }, [seriesOptions, shelfSearch]);

  // ── TMDB Search ────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("movie");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debouncedQuery = useDebounce(searchQuery);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    searchTMDB(debouncedQuery, searchType).then((results) => {
      if (!cancelled) {
        setSearchResults(results);
        setSearching(false);
      }
    });
    return () => { cancelled = true; };
  }, [debouncedQuery, searchType]);

  // ── Selected item ──────────────────────────────────────────
  const [selectedResult, setSelectedResult] = useState(null);
  const [titleOverride, setTitleOverride] = useState("");
  const [yearOverride, setYearOverride] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [airDate, setAirDate] = useState("");
  const [episodeDisplay, setEpisodeDisplay] = useState("");
  const [hostUp, setHostUp] = useState("");
  const [hostDown, setHostDown] = useState("");
  const [hostBrown, setHostBrown] = useState("");

  // ── Duplicate check ────────────────────────────────────────
  const [existingCheck, setExistingCheck] = useState(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!selectedResult || !community?.id) {
      setExistingCheck(null);
      setEditMode(false);
      return;
    }
    let cancelled = false;
    setExistingCheck(null);
    setEditMode(false);

    async function check() {
      const seriesIds = miniseries.map((m) => m.id);
      if (seriesIds.length === 0) { setExistingCheck({ status: "clear" }); return; }

      const { data } = await supabase
        .from("community_items")
        .select("id, title, miniseries_id, extra_data")
        .eq("tmdb_id", selectedResult.id)
        .in("miniseries_id", seriesIds);

      if (!cancelled) {
        if (data && data.length > 0) {
          const match = data[0];
          const ms = miniseries.find((m) => m.id === match.miniseries_id);
          setExistingCheck({
            status: "exists",
            title: match.title,
            shelf: ms?.title || "unknown",
            itemIds: data.map((d) => d.id),
            extraData: match.extra_data || {},
          });
        } else {
          setExistingCheck({ status: "clear" });
        }
      }
    }
    check();
    return () => { cancelled = true; };
  }, [selectedResult, community?.id, miniseries]);

  // ── Enter edit mode (load existing verdicts) ───────────────
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const enterEditMode = useCallback(() => {
    if (!existingCheck || existingCheck.status !== "exists") return;
    const ed = existingCheck.extraData || {};
    setHostUp(ed.up != null ? String(ed.up) : "");
    setHostDown(ed.down != null ? String(ed.down) : "");
    setHostBrown(ed.brown != null ? String(ed.brown) : "");
    setConfirmDelete(false);
    setEditMode(true);
  }, [existingCheck]);

  // ── Update existing items' extra_data ──────────────────────
  const handleUpdate = async () => {
    if (!existingCheck?.itemIds?.length) return;
    setUpdating(true);
    setFeedback(null);

    try {
      const extraData = {};
      if (hostUp !== "") extraData.up = parseInt(hostUp, 10);
      if (hostDown !== "") extraData.down = parseInt(hostDown, 10);
      if (hostBrown !== "") extraData.brown = parseInt(hostBrown, 10);

      // Update all matching rows (same film may be in multiple shelves)
      const { error } = await supabase
        .from("community_items")
        .update({ extra_data: Object.keys(extraData).length > 0 ? extraData : null })
        .in("id", existingCheck.itemIds);

      if (error) throw error;

      const title = existingCheck.title || titleOverride;
      setFeedback({ type: "success", msg: `Updated verdicts for "${title}" (${existingCheck.itemIds.length} row${existingCheck.itemIds.length > 1 ? "s" : ""})` });
      if (onToast) onToast(`Updated ${title}! ✓`);
      if (onAdded) onAdded(null);

      // Reset
      setSelectedResult(null);
      setEditMode(false);
      setTitleOverride(""); setYearOverride("");
      setHostUp(""); setHostDown(""); setHostBrown("");
      setExistingCheck(null);
      setTimeout(() => searchRef.current?.focus(), 100);
    } catch (err) {
      setFeedback({ type: "error", msg: err.message || "Update failed" });
    } finally {
      setUpdating(false);
    }
  };

  // ── Delete existing items ──────────────────────────────────
  const handleDelete = async () => {
    if (!existingCheck?.itemIds?.length) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }

    setDeleting(true);
    setFeedback(null);

    try {
      // Clean up user progress rows first (FK constraint)
      await supabase
        .from("community_user_progress")
        .delete()
        .in("item_id", existingCheck.itemIds);

      // Clean up badge_items if they exist
      await supabase
        .from("badge_items")
        .delete()
        .in("item_id", existingCheck.itemIds)
        .then(() => {}).catch(() => {}); // table may not have this FK

      const { error } = await supabase
        .from("community_items")
        .delete()
        .in("id", existingCheck.itemIds);

      if (error) {
        if (error.message?.includes("foreign key") || error.code === "23503") {
          throw new Error("Can't delete — item is referenced by badges or other data.");
        }
        throw error;
      }

      const title = existingCheck.title || titleOverride;
      setFeedback({ type: "success", msg: `Deleted "${title}" (${existingCheck.itemIds.length} row${existingCheck.itemIds.length > 1 ? "s" : ""})` });
      if (onToast) onToast(`Deleted ${title}`);
      if (onAdded) onAdded(null);

      setSelectedResult(null);
      setEditMode(false);
      setConfirmDelete(false);
      setTitleOverride(""); setYearOverride("");
      setHostUp(""); setHostDown(""); setHostBrown("");
      setExistingCheck(null);
      setTimeout(() => searchRef.current?.focus(), 100);
    } catch (err) {
      setFeedback({ type: "error", msg: err.message || "Delete failed" });
    } finally {
      setDeleting(false);
    }
  };

  // ── Select a TMDB result ───────────────────────────────────
  const handleSelect = useCallback((result) => {
    setSelectedResult(result);
    setTitleOverride(result.title || result.name || "");
    const year = (result.release_date || result.first_air_date || "").split("-")[0] || "";
    setYearOverride(year);
    setSearchResults([]);
    setSearchQuery("");
    setHostUp(""); setHostDown(""); setHostBrown("");
    setSortOrder(""); setAirDate(""); setEpisodeDisplay("");
  }, []);

  // ── Get next sort_order for a given shelf ───────────────────
  const getNextSortOrder = useCallback(async (shelfId) => {
    if (!shelfId) return 0;
    const { data } = await supabase
      .from("community_items")
      .select("sort_order")
      .eq("miniseries_id", shelfId)
      .order("sort_order", { ascending: false })
      .limit(1);
    return data && data.length > 0 ? (data[0].sort_order || 0) + 1 : 0;
  }, []);

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedResult || selectedShelves.length === 0) {
      setFeedback({ type: "error", msg: "Pick a TMDB result and at least one shelf." });
      return;
    }
    setSaving(true);
    setFeedback(null);

    try {
      const mediaType = searchType === "tv" ? "film" : searchType === "book" ? "book" : "film";

      const extraData = {};
      if (hostUp !== "") extraData.up = parseInt(hostUp, 10);
      if (hostDown !== "") extraData.down = parseInt(hostDown, 10);
      if (hostBrown !== "") extraData.brown = parseInt(hostBrown, 10);

      const baseRow = {
        title: titleOverride || selectedResult.title || selectedResult.name,
        year: yearOverride ? parseInt(yearOverride, 10) : null,
        tmdb_id: selectedResult.id,
        media_type: mediaType,
        poster_path: selectedResult.poster_path || null,
        extra_data: Object.keys(extraData).length > 0 ? extraData : null,
      };
      if (airDate) baseRow.air_date = airDate;
      if (episodeDisplay) baseRow.episode_number_display = episodeDisplay;

      // Build one row per shelf with correct sort_order
      const rows = [];
      for (const shelfId of selectedShelves) {
        const so = sortOrder !== ""
          ? parseInt(sortOrder, 10)
          : await getNextSortOrder(shelfId);
        rows.push({ ...baseRow, miniseries_id: shelfId, sort_order: so });
      }

      const { data, error } = await supabase
        .from("community_items")
        .insert(rows)
        .select();

      if (error) {
        if (error.message?.includes("idx_community_items_no_dupes") || error.code === "23505") {
          throw new Error(`"${baseRow.title}" already exists on one of the selected shelves.`);
        }
        throw error;
      }

      const shelfNames = selectedShelves
        .map((id) => seriesOptions.find((s) => s.id === id)?.title || "?")
        .join(", ");
      setFeedback({ type: "success", msg: `Added "${baseRow.title}" → ${shelfNames}` });
      if (onToast) onToast(`Added ${baseRow.title}! ✓`);
      if (onAdded) onAdded(data);

      // Reset for next add
      setSelectedResult(null);
      setTitleOverride(""); setYearOverride("");
      setSortOrder(""); setAirDate(""); setEpisodeDisplay("");
      setHostUp(""); setHostDown(""); setHostBrown("");
      setExistingCheck(null);
      setSelectedShelves([]);
      setTimeout(() => searchRef.current?.focus(), 100);
    } catch (err) {
      setFeedback({ type: "error", msg: err.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const showVerdicts = communitySlug === "nowplaying";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
        }}
      />

      {/* Panel — slides up from bottom */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 520, maxHeight: "88vh",
        background: "#111118",
        borderRadius: "20px 20px 0 0",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
        animation: "ait-slide-up 0.25s ease forwards",
      }}>
        <style>{`
          @keyframes ait-slide-up {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .ait-scroll::-webkit-scrollbar { display: none; }
        `}</style>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 16, fontWeight: 800, color: "#fff",
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: "0.02em", textTransform: "uppercase",
          }}>
            ＋ Add to {community?.name || "Community"}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)", border: "none",
              borderRadius: 8, width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#888", fontSize: 14, cursor: "pointer",
            }}
          >✕</button>
        </div>

        {/* Scrollable body */}
        <div className="ait-scroll" style={{
          flex: 1, overflowY: "auto", padding: "16px 20px 32px",
          scrollbarWidth: "none",
        }}>

          {/* Feedback */}
          {feedback && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, marginBottom: 14,
              fontSize: 13, fontWeight: 600,
              fontFamily: "'Barlow Condensed', sans-serif",
              background: feedback.type === "success" ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)",
              color: feedback.type === "success" ? "#4ade80" : "#f87171",
              border: `1px solid ${feedback.type === "success" ? "rgba(74,222,128,0.2)" : "rgba(239,68,68,0.2)"}`,
            }}>
              {feedback.type === "success" ? "✓ " : "✗ "}{feedback.msg}
            </div>
          )}

          {/* ── Shelf picker (multi-select + search) ──────── */}
          <Label>Shelves <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#52525b" }}>— search & tap multiple</span></Label>
          <input
            type="text"
            placeholder="Filter shelves…"
            value={shelfSearch}
            onChange={(e) => setShelfSearch(e.target.value)}
            style={{
              width: "100%", marginBottom: 6,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, color: "#e4e4e7",
              padding: "7px 10px", fontSize: 12,
              fontFamily: "inherit", outline: "none",
            }}
          />
          {/* Selected pills (always visible) */}
          {selectedShelves.length > 0 && shelfSearch && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
              {selectedShelves.map((id) => {
                const s = seriesOptions.find((o) => o.id === id);
                if (!s) return null;
                return (
                  <button
                    key={id}
                    onClick={() => toggleShelf(id)}
                    style={{
                      padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                      fontFamily: "'Barlow Condensed', sans-serif",
                      border: `1.5px solid ${accent}`, background: `${accent}20`,
                      color: accent, cursor: "pointer",
                    }}
                  >✓ {s.title} ✕</button>
                );
              })}
            </div>
          )}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 6,
            maxHeight: 140, overflowY: "auto",
            padding: 2,
          }}>
            {filteredShelfOptions.map((s) => {
              const isActive = selectedShelves.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleShelf(s.id)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    letterSpacing: "0.02em",
                    cursor: "pointer",
                    border: `1.5px solid ${isActive ? accent : "rgba(255,255,255,0.08)"}`,
                    background: isActive ? `${accent}20` : "rgba(255,255,255,0.03)",
                    color: isActive ? accent : "rgba(255,255,255,0.45)",
                    transition: "all 0.15s",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {isActive ? "✓ " : ""}{s.label} ({s.itemCount})
                </button>
              );
            })}
            {filteredShelfOptions.length === 0 && (
              <div style={{ fontSize: 11, color: "#52525b", fontStyle: "italic", padding: "4px 0" }}>
                No shelves match "{shelfSearch}"
              </div>
            )}
          </div>

          {/* ── TMDB Search ───────────────────────────── */}
          <Label style={{ marginTop: 16 }}>Search TMDB</Label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={searchRef}
              type="text"
              placeholder="e.g. Deep Blue Sea"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={inputStyle(accent)}
            />
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              style={{ ...selectStyle(accent, false), width: 80, flexShrink: 0 }}
            >
              <option value="movie" style={{ background: "#1a1a2e" }}>Film</option>
              <option value="tv" style={{ background: "#1a1a2e" }}>TV</option>
            </select>
          </div>

          {searching && (
            <div style={{ fontSize: 12, color: "#555", marginTop: 6, fontFamily: "'Barlow Condensed', sans-serif" }}>
              Searching…
            </div>
          )}

          {/* Search results */}
          {searchResults.length > 0 && (
            <div style={{
              marginTop: 8, border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, overflow: "hidden", maxHeight: 280, overflowY: "auto",
            }}>
              {searchResults.map((r) => {
                const title = r.title || r.name;
                const year = (r.release_date || r.first_air_date || "").split("-")[0];
                return (
                  <button
                    key={r.id}
                    onClick={() => handleSelect(r)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%",
                      background: "#18181b", border: "none",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      padding: "8px 12px", cursor: "pointer", textAlign: "left", color: "#e4e4e7",
                    }}
                  >
                    {r.poster_path ? (
                      <img
                        src={`${TMDB_IMG}/w92${r.poster_path}`}
                        alt={title}
                        style={{ width: 36, height: 54, borderRadius: 4, objectFit: "cover", flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{
                        width: 36, height: 54, borderRadius: 4, background: "#27272a",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#52525b", fontSize: 14, flexShrink: 0,
                      }}>?</div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                      <span style={{
                        fontWeight: 600, fontSize: 13,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>{title}</span>
                      <span style={{ fontSize: 11, color: "#71717a" }}>
                        {year}{year ? " · " : ""}TMDB {r.id}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Selected item preview ─────────────────── */}
          {selectedResult && (
            <div style={{
              marginTop: 16, background: "#18181b",
              borderRadius: 14, padding: 16,
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                {selectedResult.poster_path ? (
                  <img
                    src={`${TMDB_IMG}/w154${selectedResult.poster_path}`}
                    alt={titleOverride}
                    style={{ width: 80, height: 120, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 80, height: 120, borderRadius: 10, background: "#27272a",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#52525b", fontSize: 11, flexShrink: 0,
                  }}>No Poster</div>
                )}

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                  {existingCheck?.status === "exists" && (
                    <div
                      onClick={editMode ? undefined : enterEditMode}
                      style={{
                        background: editMode ? "rgba(34,211,238,0.1)" : "rgba(251,191,36,0.1)",
                        color: editMode ? "#22d3ee" : "#fbbf24",
                        padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                        fontFamily: "'Barlow Condensed', sans-serif",
                        cursor: editMode ? "default" : "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {editMode
                        ? `✎ Editing verdicts — ${existingCheck.itemIds.length} row${existingCheck.itemIds.length > 1 ? "s" : ""}`
                        : `⚠ Already in "${existingCheck.shelf}" — tap to edit verdicts`
                      }
                    </div>
                  )}
                  {existingCheck?.status === "clear" && (
                    <div style={{ color: "#4ade80", fontSize: 11, fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif" }}>
                      ✓ Not in community yet
                    </div>
                  )}

                  <FieldRow label="Title">
                    <input
                      value={titleOverride}
                      onChange={(e) => setTitleOverride(e.target.value)}
                      style={{ ...inputStyle(accent), fontSize: 13, padding: "6px 10px" }}
                    />
                  </FieldRow>
                  <FieldRow label="Year">
                    <input
                      value={yearOverride}
                      onChange={(e) => setYearOverride(e.target.value)}
                      style={{ ...inputStyle(accent), fontSize: 13, padding: "6px 10px", width: 80 }}
                    />
                  </FieldRow>
                  <FieldRow label="TMDB">
                    <span style={{ fontSize: 12, color: "#71717a", fontFamily: "monospace" }}>
                      {selectedResult.id}
                    </span>
                  </FieldRow>
                  <FieldRow label="Poster">
                    <span style={{ fontSize: 11, color: "#52525b", fontFamily: "monospace", wordBreak: "break-all" }}>
                      {selectedResult.poster_path || "none"}
                    </span>
                  </FieldRow>
                </div>
              </div>

              {/* Optional fields */}
              <div style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                paddingTop: 12, marginTop: 4,
                display: "flex", flexWrap: "wrap", gap: 10,
              }}>
                <FieldRow label="Sort #" style={{ flex: "0 0 auto" }}>
                  <input
                    type="number"
                    placeholder="auto"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    style={{ ...inputStyle(accent), fontSize: 12, padding: "6px 8px", width: 64 }}
                  />
                </FieldRow>
                <FieldRow label="Air Date" style={{ flex: "1 1 120px" }}>
                  <input
                    type="date"
                    value={airDate}
                    onChange={(e) => setAirDate(e.target.value)}
                    style={{ ...inputStyle(accent), fontSize: 12, padding: "6px 8px" }}
                  />
                </FieldRow>
                <FieldRow label="Episode" style={{ flex: "0 0 auto" }}>
                  <input
                    placeholder="Ep. 247"
                    value={episodeDisplay}
                    onChange={(e) => setEpisodeDisplay(e.target.value)}
                    style={{ ...inputStyle(accent), fontSize: 12, padding: "6px 8px", width: 90 }}
                  />
                </FieldRow>
              </div>

              {/* Host verdicts (NPP-specific, or edit mode) */}
              {(showVerdicts || editMode) && (
                <div style={{
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  paddingTop: 12, marginTop: 12,
                }}>
                  <Label style={{ marginBottom: 8 }}>Host Verdicts</Label>
                  <div style={{ display: "flex", gap: 16 }}>
                    <VerdictInput color="#22c55e" arrow="↑" value={hostUp} onChange={setHostUp} />
                    <VerdictInput color="#ef4444" arrow="↓" value={hostDown} onChange={setHostDown} />
                    <VerdictInput color="#a16207" arrow="↑" value={hostBrown} onChange={setHostBrown} />
                  </div>
                </div>
              )}

              {/* Action button — Update (edit mode) or Add (new) */}
              {editMode ? (
                <>
                <button
                  onClick={handleUpdate}
                  disabled={updating}
                  style={{
                    marginTop: 16, width: "100%", padding: "12px 0",
                    borderRadius: 12,
                    background: updating ? "rgba(255,255,255,0.04)" : "rgba(34,211,238,0.1)",
                    border: "2px solid #22d3ee",
                    color: "#fff",
                    fontSize: 15, fontWeight: 800,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    letterSpacing: "0.03em", textTransform: "uppercase",
                    cursor: updating ? "not-allowed" : "pointer",
                    opacity: updating ? 0.4 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  {updating ? "Updating…" : "Update Verdicts"}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    marginTop: 8, width: "100%", padding: "10px 0",
                    borderRadius: 12,
                    background: confirmDelete ? "rgba(239,68,68,0.15)" : "transparent",
                    border: `1.5px solid ${confirmDelete ? "#ef4444" : "rgba(239,68,68,0.3)"}`,
                    color: confirmDelete ? "#ef4444" : "rgba(239,68,68,0.6)",
                    fontSize: 12, fontWeight: 800,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    letterSpacing: "0.03em", textTransform: "uppercase",
                    cursor: deleting ? "not-allowed" : "pointer",
                    opacity: deleting ? 0.4 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  {deleting ? "Deleting…" : confirmDelete ? "Tap again to confirm delete" : `Delete from community (${existingCheck?.itemIds?.length || 0} row${(existingCheck?.itemIds?.length || 0) > 1 ? "s" : ""})`}
                </button>
                </>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving || selectedShelves.length === 0}
                  style={{
                    marginTop: 16, width: "100%", padding: "12px 0",
                    borderRadius: 12,
                    background: saving ? "rgba(255,255,255,0.04)" : `${accent}18`,
                    border: `2px solid ${accent}`,
                    color: "#fff",
                    fontSize: 15, fontWeight: 800,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    letterSpacing: "0.03em", textTransform: "uppercase",
                    cursor: saving || selectedShelves.length === 0 ? "not-allowed" : "pointer",
                    opacity: saving || selectedShelves.length === 0 ? 0.4 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  {saving ? "Saving…" : selectedShelves.length > 1
                    ? `Add to ${selectedShelves.length} Shelves`
                    : "Add to Community"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════════ */

function Label({ children, style = {} }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.06em", color: "#71717a",
      fontFamily: "'Barlow Condensed', sans-serif",
      marginBottom: 6, ...style,
    }}>{children}</div>
  );
}

function FieldRow({ label, children, style = {} }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, ...style }}>
      <span style={{
        fontSize: 10, color: "#52525b", fontWeight: 600,
        fontFamily: "'Barlow Condensed', sans-serif",
        textTransform: "uppercase", letterSpacing: "0.04em",
        minWidth: 44, flexShrink: 0,
      }}>{label}</span>
      {children}
    </div>
  );
}

function VerdictInput({ color, arrow, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{arrow}</span>
      <input
        type="number"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 48, textAlign: "center",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8, padding: "6px 4px",
          color: "#e4e4e7", fontSize: 14,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700, outline: "none",
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Shared inline styles
   ═══════════════════════════════════════════════════════════════ */

function inputStyle(accent) {
  return {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10, color: "#e4e4e7",
    padding: "10px 12px", fontSize: 14,
    fontFamily: "inherit", outline: "none",
    WebkitAppearance: "none",
  };
}

function selectStyle(accent, hasValue) {
  return {
    width: "100%",
    appearance: "none", WebkitAppearance: "none",
    background: hasValue ? `${accent}10` : "rgba(255,255,255,0.04)",
    border: `1.5px solid ${hasValue ? `${accent}40` : "rgba(255,255,255,0.08)"}`,
    borderRadius: 10,
    color: hasValue ? accent : "rgba(255,255,255,0.5)",
    padding: "10px 12px", fontSize: 13, fontWeight: 700,
    fontFamily: "'Barlow Condensed', sans-serif",
    letterSpacing: "0.03em", cursor: "pointer", outline: "none",
  };
}
