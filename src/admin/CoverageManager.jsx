import { t } from "../theme";
// src/admin/CoverageManager.jsx
//
// Admin tool to manually attach external podcast coverage to films.
// Use case: a podcast outside the MANTL network covered a film —
// add it here so it shows up in the VHS sleeve for that film.

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabase";

const SUPABASE_URL = "https://api.mymantl.app";
const TMDB_IMG = "https://image.tmdb.org/t/p";

async function searchTMDB(query) {
  if (!query || query.length < 2) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/api-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "tmdb_search", query, type: "movie" }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.results || []).slice(0, 6);
  } catch { return []; }
}

export default function CoverageManager() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Form state
  const [filmQuery, setFilmQuery] = useState("");
  const [filmResults, setFilmResults] = useState([]);
  const [selectedFilm, setSelectedFilm] = useState(null);
  const [searching, setSearching] = useState(false);
  const [podcastName, setPodcastName] = useState("");
  const [podcastArtworkUrl, setPodcastArtworkUrl] = useState("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [episodeUrl, setEpisodeUrl] = useState("");
  const [episodeDescription, setEpisodeDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const searchTimer = useRef(null);

  // ── Load all links ──
  const loadLinks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_coverage_links")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setLinks(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  // ── Film search ──
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!filmQuery.trim()) { setFilmResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchTMDB(filmQuery);
      setFilmResults(results);
      setSearching(false);
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [filmQuery]);

  // ── Toast helper ──
  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Save ──
  const handleSave = async () => {
    if (!selectedFilm) return showToast("Select a film first", true);
    if (!podcastName.trim()) return showToast("Podcast name is required", true);
    setSaving(true);
    const { error } = await supabase.from("admin_coverage_links").insert({
      tmdb_id: selectedFilm.id,
      film_title: selectedFilm.title,
      poster_path: selectedFilm.poster_path || null,
      podcast_name: podcastName.trim(),
      podcast_artwork_url: podcastArtworkUrl.trim() || null,
      episode_title: episodeTitle.trim() || null,
      episode_url: episodeUrl.trim() || null,
      episode_description: episodeDescription.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) { showToast("Error saving: " + error.message, true); return; }
    showToast("Coverage link saved ✓");
    // Reset form
    setSelectedFilm(null);
    setFilmQuery("");
    setFilmResults([]);
    setPodcastName("");
    setPodcastArtworkUrl("");
    setEpisodeTitle("");
    setEpisodeUrl("");
    setEpisodeDescription("");
    setNotes("");
    loadLinks();
  };

  // ── Delete ──
  const handleDelete = async (id, label) => {
    if (!confirm(`Delete coverage link for "${label}"?`)) return;
    const { error } = await supabase.from("admin_coverage_links").delete().eq("id", id);
    if (error) { showToast("Delete failed", true); return; }
    setLinks(prev => prev.filter(l => l.id !== id));
    showToast("Deleted");
  };

  return (
    <div style={styles.page}>
      {/* Toast */}
      {toast && (
        <div style={{ ...styles.toast, background: toast.isError ? "rgba(239,68,68,0.9)" : "rgba(34,197,94,0.9)" }}>
          {toast.msg}
        </div>
      )}

      <div style={styles.header}>
        <h1 style={styles.title}>Coverage Links</h1>
        <p style={styles.subtitle}>
          Manually attach external podcast coverage to films in your catalog.
          Shows up in the VHS sleeve alongside regular episode coverage.
        </p>
      </div>

      {/* ── ADD FORM ── */}
      <div style={styles.formCard}>
        <div style={styles.formTitle}>Add Coverage Link</div>

        {/* Film search */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Film</label>
          {selectedFilm ? (
            <div style={styles.selectedFilm}>
              {selectedFilm.poster_path && (
                <img
                  src={`${TMDB_IMG}/w92${selectedFilm.poster_path}`}
                  alt={selectedFilm.title}
                  style={styles.selectedPoster}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={styles.selectedTitle}>{selectedFilm.title}</div>
                <div style={styles.selectedYear}>
                  {selectedFilm.release_date?.slice(0, 4)}
                </div>
              </div>
              <button
                onClick={() => { setSelectedFilm(null); setFilmQuery(""); }}
                style={styles.clearBtn}
              >
                ✕
              </button>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <input
                value={filmQuery}
                onChange={e => setFilmQuery(e.target.value)}
                placeholder="Search by film title…"
                style={styles.input}
              />
              {searching && (
                <div style={styles.searchSpinner} />
              )}
              {filmResults.length > 0 && (
                <div style={styles.dropdown}>
                  {filmResults.map(film => (
                    <div
                      key={film.id}
                      onClick={() => { setSelectedFilm(film); setFilmQuery(""); setFilmResults([]); }}
                      style={styles.dropdownItem}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(240,235,225,0.06)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {film.poster_path && (
                        <img
                          src={`${TMDB_IMG}/w45${film.poster_path}`}
                          alt={film.title}
                          style={styles.dropdownPoster}
                        />
                      )}
                      <div>
                        <div style={styles.dropdownTitle}>{film.title}</div>
                        <div style={styles.dropdownYear}>{film.release_date?.slice(0, 4)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Two-col: podcast name + artwork URL */}
        <div style={styles.twoCol}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Podcast Name *</label>
            <input
              value={podcastName}
              onChange={e => setPodcastName(e.target.value)}
              placeholder="e.g. Romancing the Pod"
              style={styles.input}
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Podcast Artwork URL</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={podcastArtworkUrl}
                onChange={e => setPodcastArtworkUrl(e.target.value)}
                placeholder="https://… (podcast cover image)"
                style={{ ...styles.input, flex: 1 }}
              />
              {podcastArtworkUrl && (
                <img
                  src={podcastArtworkUrl}
                  alt="artwork preview"
                  onError={e => e.target.style.display = "none"}
                  style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0, border: "1px solid rgba(240,235,225,0.1)" }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Two-col: episode title + episode URL */}
        <div style={styles.twoCol}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Episode Title</label>
            <input
              value={episodeTitle}
              onChange={e => setEpisodeTitle(e.target.value)}
              placeholder="e.g. Overboard (1987)"
              style={styles.input}
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Episode URL</label>
            <input
              value={episodeUrl}
              onChange={e => setEpisodeUrl(e.target.value)}
              placeholder="https://…  (optional)"
              style={styles.input}
            />
          </div>
        </div>

        {/* Episode description */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Episode Description</label>
          <textarea
            value={episodeDescription}
            onChange={e => setEpisodeDescription(e.target.value)}
            placeholder="Paste the episode description / show notes here…"
            rows={3}
            style={{ ...styles.input, resize: "vertical", lineHeight: 1.5 }}
          />
        </div>

        {/* Notes */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Notes</label>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional internal note"
            style={styles.input}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !selectedFilm || !podcastName.trim()}
          style={{
            ...styles.saveBtn,
            opacity: (saving || !selectedFilm || !podcastName.trim()) ? 0.45 : 1,
          }}
        >
          {saving ? "Saving…" : "Save Coverage Link"}
        </button>
      </div>

      {/* ── EXISTING LINKS ── */}
      <div style={styles.tableSection}>
        <div style={styles.tableHeader}>
          <span style={styles.tableTitle}>
            All Coverage Links
            <span style={styles.count}>{links.length}</span>
          </span>
        </div>

        {loading ? (
          <div style={styles.emptyState}>
            <div style={styles.spinner} />
          </div>
        ) : links.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>◎</div>
            <div style={styles.emptyText}>No coverage links yet</div>
          </div>
        ) : (
          <div style={styles.table}>
            {/* Header row */}
            <div style={styles.tableRow}>
              <div style={{ ...styles.cell, ...styles.cellHeader, flex: 2 }}>Film</div>
              <div style={{ ...styles.cell, ...styles.cellHeader, flex: 2 }}>Podcast</div>
              <div style={{ ...styles.cell, ...styles.cellHeader, flex: 3 }}>Episode</div>
              <div style={{ ...styles.cell, ...styles.cellHeader, flex: 1, textAlign: "right" }}>Link</div>
              <div style={{ ...styles.cell, ...styles.cellHeader, width: 40 }}></div>
            </div>
            {links.map(link => (
              <div key={link.id} style={styles.tableRow}>
                <div style={{ ...styles.cell, flex: 2 }}>
                  <div style={styles.cellFilm}>
                    {link.poster_path && (
                      <img
                        src={`${TMDB_IMG}/w45${link.poster_path}`}
                        alt={link.film_title}
                        style={styles.tablePoster}
                      />
                    )}
                    <div>
                      <div style={styles.cellTitle}>{link.film_title}</div>
                      <div style={styles.cellMeta}>tmdb:{link.tmdb_id}</div>
                    </div>
                  </div>
                </div>
                <div style={{ ...styles.cell, flex: 2 }}>
                  <div style={styles.cellTitle}>{link.podcast_name}</div>
                </div>
                <div style={{ ...styles.cell, flex: 3 }}>
                  <div style={styles.cellTitle}>{link.episode_title || "—"}</div>
                  {link.notes && <div style={styles.cellMeta}>{link.notes}</div>}
                </div>
                <div style={{ ...styles.cell, flex: 1, textAlign: "right" }}>
                  {link.episode_url ? (
                    <a
                      href={link.episode_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.linkBtn}
                    >
                      ↗
                    </a>
                  ) : (
                    <span style={{ color: "rgba(240,235,225,0.15)", fontSize: 12 }}>—</span>
                  )}
                </div>
                <div style={{ ...styles.cell, width: 40, justifyContent: "center" }}>
                  <button
                    onClick={() => handleDelete(link.id, link.film_title)}
                    style={styles.deleteBtn}
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════

const styles = {
  page: {
    padding: "32px 40px",
    maxWidth: 900,
    position: "relative",
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontFamily: t.fontDisplay,
    fontWeight: 800,
    fontSize: 24,
    color: t.cream,
    margin: 0,
    letterSpacing: "0.02em",
    textTransform: "uppercase",
  },
  subtitle: {
    fontFamily: t.fontBody,
    fontSize: 13,
    color: "rgba(240,235,225,0.4)",
    margin: "8px 0 0",
    lineHeight: 1.5,
  },

  // ── Form ──
  formCard: {
    background: "rgba(240,235,225,0.03)",
    border: "1px solid rgba(240,235,225,0.08)",
    borderRadius: 10,
    padding: 24,
    marginBottom: 32,
  },
  formTitle: {
    fontFamily: t.fontDisplay,
    fontWeight: 700,
    fontSize: 13,
    color: "rgba(240,235,225,0.5)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    display: "block",
    fontFamily: t.fontDisplay,
    fontWeight: 700,
    fontSize: 10,
    color: "rgba(240,235,225,0.4)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    background: "rgba(240,235,225,0.05)",
    border: "1px solid rgba(240,235,225,0.1)",
    borderRadius: 6,
    padding: "9px 12px",
    fontFamily: t.fontBody,
    fontSize: 13,
    color: t.cream,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  saveBtn: {
    marginTop: 8,
    padding: "10px 24px",
    background: "rgba(196,115,79,0.15)",
    border: "1px solid rgba(196,115,79,0.35)",
    borderRadius: 6,
    color: t.terra,
    fontFamily: t.fontDisplay,
    fontWeight: 700,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    cursor: "pointer",
    transition: "all 0.15s",
  },

  // ── Film selector ──
  selectedFilm: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "rgba(240,235,225,0.04)",
    border: "1px solid rgba(196,115,79,0.25)",
    borderRadius: 6,
    padding: "8px 12px",
  },
  selectedPoster: {
    width: 28,
    height: 42,
    borderRadius: 3,
    objectFit: "cover",
    flexShrink: 0,
  },
  selectedTitle: {
    fontFamily: t.fontDisplay,
    fontWeight: 700,
    fontSize: 13,
    color: t.cream,
  },
  selectedYear: {
    fontFamily: t.fontMono,
    fontSize: 11,
    color: "rgba(240,235,225,0.35)",
    marginTop: 2,
  },
  clearBtn: {
    background: "none",
    border: "none",
    color: "rgba(240,235,225,0.3)",
    fontSize: 13,
    cursor: "pointer",
    padding: "0 4px",
    flexShrink: 0,
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    background: "#1a1714",
    border: "1px solid rgba(240,235,225,0.12)",
    borderRadius: 8,
    overflow: "hidden",
    zIndex: 100,
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    cursor: "pointer",
    transition: "background 0.1s",
  },
  dropdownPoster: {
    width: 24,
    height: 36,
    borderRadius: 3,
    objectFit: "cover",
    flexShrink: 0,
  },
  dropdownTitle: {
    fontFamily: t.fontDisplay,
    fontWeight: 600,
    fontSize: 13,
    color: t.cream,
  },
  dropdownYear: {
    fontFamily: t.fontMono,
    fontSize: 11,
    color: "rgba(240,235,225,0.35)",
  },
  searchSpinner: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    width: 14,
    height: 14,
    borderRadius: "50%",
    border: "2px solid rgba(240,235,225,0.1)",
    borderTopColor: "rgba(240,235,225,0.4)",
    animation: "admin-spin 0.7s linear infinite",
  },

  // ── Table ──
  tableSection: {
    border: "1px solid rgba(240,235,225,0.08)",
    borderRadius: 10,
    overflow: "hidden",
  },
  tableHeader: {
    padding: "14px 20px",
    borderBottom: "1px solid rgba(240,235,225,0.06)",
    background: "rgba(240,235,225,0.02)",
  },
  tableTitle: {
    fontFamily: t.fontDisplay,
    fontWeight: 700,
    fontSize: 12,
    color: "rgba(240,235,225,0.5)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  count: {
    background: "rgba(196,115,79,0.15)",
    color: t.terra,
    fontSize: 10,
    fontFamily: t.fontMono,
    padding: "1px 7px",
    borderRadius: 10,
    fontWeight: 700,
  },
  table: {
    display: "flex",
    flexDirection: "column",
  },
  tableRow: {
    display: "flex",
    alignItems: "center",
    borderBottom: "1px solid rgba(240,235,225,0.04)",
    padding: "0 12px",
    minHeight: 48,
  },
  cell: {
    display: "flex",
    alignItems: "center",
    padding: "8px",
    overflow: "hidden",
  },
  cellHeader: {
    fontFamily: t.fontDisplay,
    fontWeight: 700,
    fontSize: 9,
    color: "rgba(240,235,225,0.25)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  cellFilm: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
  },
  tablePoster: {
    width: 20,
    height: 30,
    borderRadius: 2,
    objectFit: "cover",
    flexShrink: 0,
  },
  cellTitle: {
    fontFamily: t.fontDisplay,
    fontWeight: 600,
    fontSize: 12,
    color: "rgba(240,235,225,0.8)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cellMeta: {
    fontFamily: t.fontMono,
    fontSize: 10,
    color: "rgba(240,235,225,0.25)",
    marginTop: 2,
  },
  linkBtn: {
    color: t.terra,
    textDecoration: "none",
    fontFamily: t.fontDisplay,
    fontWeight: 700,
    fontSize: 14,
  },
  deleteBtn: {
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: "50%",
    width: 24,
    height: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "rgba(239,68,68,0.6)",
    fontSize: 10,
    fontWeight: 700,
  },

  // ── Empty / loading ──
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    gap: 10,
  },
  emptyIcon: {
    fontSize: 28,
    color: "rgba(240,235,225,0.1)",
  },
  emptyText: {
    fontFamily: t.fontDisplay,
    fontSize: 13,
    color: "rgba(240,235,225,0.25)",
    fontWeight: 600,
    letterSpacing: "0.04em",
  },
  spinner: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    border: "2.5px solid rgba(240,235,225,0.08)",
    borderTopColor: t.terra,
    animation: "admin-spin 0.8s linear infinite",
  },

  // ── Toast ──
  toast: {
    position: "fixed",
    bottom: 28,
    right: 28,
    padding: "10px 20px",
    borderRadius: 8,
    fontFamily: t.fontDisplay,
    fontWeight: 700,
    fontSize: 13,
    color: "white",
    zIndex: 999,
    animation: "admin-toast-in 0.2s ease",
    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
  },
};
