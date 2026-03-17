import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../../../supabase";

import { searchTMDBRaw } from "../../../utils/api";
const TMDB_IMG = "https://image.tmdb.org/t/p";
const SUPABASE_URL = "https://api.mymantl.app";

/**
 * RSSSyncTool — One-tap podcast RSS sync.
 *
 * 1. Calls rss-sync Edge Function (server-side fetch, no CORS)
 * 2. Dedupes by rss_guid against existing community_items
 * 3. Extracts film titles from episode names → TMDB search
 * 4. Staged review: approve individually or batch
 * 5. Writes to community_items with rss_guid for future dedup
 *
 * Props:
 *   community, miniseries, session, onClose, onAdded, onToast
 */
export default function RSSSyncTool({ community, miniseries = [], session, onClose, onAdded, onToast }) {
  const accent = community?.theme_config?.accent || "#e94560";
  const rssUrl = community?.theme_config?.rss_url || "";

  // ── State ──────────────────────────────────────────────────
  const [manualUrl, setManualUrl] = useState(rssUrl);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(""); // status text during sync
  const [error, setError] = useState(null);
  const [stagedEpisodes, setStagedEpisodes] = useState([]);
  const [approving, setApproving] = useState({});
  const [approved, setApproved] = useState({});
  const [selectedShelves, setSelectedShelves] = useState([]);
  const [shelfSearch, setShelfSearch] = useState("");
  const [syncLimit, setSyncLimit] = useState(3);

  const toggleShelf = useCallback((id) => {
    setSelectedShelves((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }, []);

  // ── Shelf options ──────────────────────────────────────────
  const shelfOptions = useMemo(() => {
    return miniseries
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((s) => ({
        id: s.id,
        label: s.tab_key ? `[${s.tab_key}] ${s.title}` : s.title,
        title: s.title,
        tab_key: s.tab_key,
      }));
  }, [miniseries]);

  const filteredShelfOptions = useMemo(() => {
    const q = shelfSearch.toLowerCase().trim();
    if (!q) return shelfOptions;
    return shelfOptions.filter((s) =>
      s.label.toLowerCase().includes(q) || s.title.toLowerCase().includes(q)
    );
  }, [shelfOptions, shelfSearch]);

  // ── Fetch existing rss_guids for dedup ─────────────────────
  const fetchExistingGuids = async () => {
    const seriesIds = miniseries.map((m) => m.id);
    if (seriesIds.length === 0) return new Set();

    const { data } = await supabase
      .from("community_items")
      .select("rss_guid")
      .in("miniseries_id", seriesIds)
      .not("rss_guid", "is", null);

    return new Set((data || []).map((r) => r.rss_guid));
  };

  // ── Also check existing TMDB IDs for double-safety ─────────
  const fetchExistingTmdbIds = async () => {
    const seriesIds = miniseries.map((m) => m.id);
    if (seriesIds.length === 0) return new Set();

    const { data } = await supabase
      .from("community_items")
      .select("tmdb_id")
      .in("miniseries_id", seriesIds)
      .not("tmdb_id", "is", null);

    return new Set((data || []).map((r) => r.tmdb_id));
  };

  // ── Sync: Edge Function → dedup → TMDB match ──────────────
  const handleSync = async () => {
    const url = manualUrl.trim();
    if (!url) { setError("Enter an RSS feed URL."); return; }

    setSyncing(true);
    setError(null);
    setStagedEpisodes([]);
    setApproved({});
    setSyncProgress("Fetching RSS feed…");

    try {
      // 1. Fetch via Edge Function
      const res = await fetch(`${SUPABASE_URL}/functions/v1/rss-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ rss_url: url, limit: syncLimit }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Sync failed: ${res.status}`);
      }

      const { episodes } = await res.json();
      if (!episodes || episodes.length === 0) {
        setError("No episodes found in feed.");
        setSyncing(false);
        return;
      }

      setSyncProgress(`Found ${episodes.length} episodes. Checking for new ones…`);

      // 2. Dedup by rss_guid
      const existingGuids = await fetchExistingGuids();
      const existingTmdbIds = await fetchExistingTmdbIds();
      const newEpisodes = episodes.filter((ep) => !existingGuids.has(ep.guid));

      if (newEpisodes.length === 0) {
        setError(`All ${episodes.length} episodes already synced. You're up to date! ✓`);
        setSyncing(false);
        return;
      }

      setSyncProgress(`${newEpisodes.length} new episodes. Matching TMDB…`);

      // 3. TMDB match each new episode
      const staged = [];
      for (let i = 0; i < Math.min(newEpisodes.length, syncLimit); i++) {
        const ep = newEpisodes[i];
        const filmTitle = extractFilmTitle(ep.title, community?.name);

        setSyncProgress(`TMDB: "${filmTitle}" (${i + 1}/${Math.min(newEpisodes.length, syncLimit)})`);

        const tmdbResults = await searchTMDB(filmTitle);
        const bestMatch = tmdbResults[0] || null;

        staged.push({
          episode: ep,
          filmTitle,
          tmdbMatch: bestMatch,
          tmdbAlts: tmdbResults.slice(1, 4),
          selectedMatch: bestMatch,
          isDuplicate: bestMatch ? existingTmdbIds.has(bestMatch.id) : false,
          verdicts: { up: "", down: "", brown: "" },
        });

        // Rate limit
        if (i < newEpisodes.length - 1) {
          await new Promise((r) => setTimeout(r, 260));
        }
      }

      setStagedEpisodes(staged);
      setSyncProgress("");
    } catch (err) {
      setError(err.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // ── Get next sort_order for a shelf ────────────────────────
  const getNextSortOrder = async (shelfId) => {
    const { data } = await supabase
      .from("community_items")
      .select("sort_order")
      .eq("miniseries_id", shelfId)
      .order("sort_order", { ascending: false })
      .limit(1);
    return data?.[0] ? (data[0].sort_order || 0) + 1 : 0;
  };

  // ── Approve a single episode ───────────────────────────────
  const handleApprove = async (index) => {
    const entry = stagedEpisodes[index];
    if (!entry?.selectedMatch || selectedShelves.length === 0) return;

    setApproving((prev) => ({ ...prev, [index]: true }));

    try {
      const match = entry.selectedMatch;
      const title = match.title || match.name;
      const year = parseInt((match.release_date || match.first_air_date || "").split("-")[0]) || null;

      // Parse air_date from RSS pubDate
      let airDate = null;
      if (entry.episode.pubDate) {
        try {
          const d = new Date(entry.episode.pubDate);
          if (!isNaN(d.getTime())) airDate = d.toISOString().split("T")[0];
        } catch {}
      }

      // Build extra_data from verdicts
      const extraData = {};
      if (entry.verdicts?.up !== "") extraData.up = parseInt(entry.verdicts.up, 10);
      if (entry.verdicts?.down !== "") extraData.down = parseInt(entry.verdicts.down, 10);
      if (entry.verdicts?.brown !== "") extraData.brown = parseInt(entry.verdicts.brown, 10);
      const hasVerdicts = Object.keys(extraData).length > 0 && !Object.values(extraData).some(isNaN);

      // Insert one row per selected shelf
      const rows = [];
      for (const shelfId of selectedShelves) {
        const sortOrder = await getNextSortOrder(shelfId);
        rows.push({
          miniseries_id: shelfId,
          title,
          year,
          tmdb_id: match.id,
          media_type: "film",
          poster_path: match.poster_path || null,
          sort_order: sortOrder,
          rss_guid: entry.episode.guid,
          air_date: airDate,
          extra_data: hasVerdicts ? extraData : null,
        });
      }

      const { error: insertErr } = await supabase
        .from("community_items")
        .insert(rows);

      if (insertErr) throw insertErr;

      setApproved((prev) => ({ ...prev, [index]: true }));
      if (onToast) onToast(`Added ${title}! ✓`);
    } catch (err) {
      if (onToast) onToast(`Error: ${err.message}`);
    } finally {
      setApproving((prev) => ({ ...prev, [index]: false }));
    }
  };

  // ── Approve all ready episodes ─────────────────────────────
  const handleApproveAll = async () => {
    for (let i = 0; i < stagedEpisodes.length; i++) {
      if (approved[i] || stagedEpisodes[i].isDuplicate || !stagedEpisodes[i].selectedMatch) continue;
      await handleApprove(i);
    }
    if (onAdded) onAdded();
  };

  // ── Swap TMDB match ────────────────────────────────────────
  const swapMatch = (index, match) => {
    setStagedEpisodes((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        selectedMatch: match,
        isDuplicate: false,
      };
      return next;
    });
  };

  // ── Update verdicts for a staged episode ───────────────────
  const updateVerdict = (index, key, value) => {
    setStagedEpisodes((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        verdicts: { ...next[index].verdicts, [key]: value },
      };
      return next;
    });
  };

  const showVerdicts = community?.slug === "nowplaying";

  // ── Manual TMDB re-search for an episode ───────────────────
  const [researchIndex, setResearchIndex] = useState(null);
  const [researchQuery, setResearchQuery] = useState("");
  const [researchResults, setResearchResults] = useState([]);
  const [researching, setResearching] = useState(false);

  const handleResearch = async () => {
    if (!researchQuery.trim()) return;
    setResearching(true);
    const results = await searchTMDB(researchQuery.trim());
    setResearchResults(results);
    setResearching(false);
  };

  // ── Stats ──────────────────────────────────────────────────
  const approvedCount = Object.keys(approved).length;
  const pendingCount = stagedEpisodes.filter(
    (e, i) => !approved[i] && !e.isDuplicate && e.selectedMatch
  ).length;

  // ═══════════════════════════════════════════════════════════
  //  Render
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div onClick={onClose} style={{
        position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 520, maxHeight: "90vh",
        background: "#111118", borderRadius: "20px 20px 0 0",
        overflow: "hidden", display: "flex", flexDirection: "column",
        animation: "rss-up 0.25s ease forwards",
      }}>
        <style>{`
          @keyframes rss-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          .rss-scroll::-webkit-scrollbar { display: none; }
        `}</style>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
        }}>
          <div style={{
            fontSize: 16, fontWeight: 800, color: "#fff",
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: "0.02em", textTransform: "uppercase",
          }}>📡 RSS Sync</div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8,
            width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
            color: "#888", fontSize: 14, cursor: "pointer",
          }}>✕</button>
        </div>

        {/* Body */}
        <div className="rss-scroll" style={{
          flex: 1, overflowY: "auto", padding: "16px 20px 32px", scrollbarWidth: "none",
        }}>

          {/* RSS URL + Sync button */}
          <Label>RSS Feed URL</Label>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              placeholder="https://feeds.example.com/podcast.xml"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              style={{
                flex: 1, background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10, color: "#e4e4e7",
                padding: "10px 12px", fontSize: 13, fontFamily: "inherit", outline: "none",
              }}
            />
            <button
              onClick={handleSync}
              disabled={syncing}
              style={{
                padding: "10px 16px", borderRadius: 10,
                background: syncing ? "rgba(255,255,255,0.04)" : `${accent}20`,
                border: `1.5px solid ${accent}`,
                color: accent, fontSize: 13, fontWeight: 800,
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: "0.03em", textTransform: "uppercase",
                cursor: syncing ? "wait" : "pointer",
                opacity: syncing ? 0.5 : 1, whiteSpace: "nowrap",
              }}
            >{syncing ? "Syncing…" : "Sync"}</button>
          </div>

          {/* Fetch limit picker */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.06em", color: "#71717a",
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>Fetch latest</span>
            {[3, 5, 10, 30].map(n => (
              <button
                key={n}
                onClick={() => setSyncLimit(n)}
                style={{
                  padding: "4px 10px", borderRadius: 6,
                  fontSize: 11, fontWeight: 700,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  border: `1.5px solid ${syncLimit === n ? accent : "rgba(255,255,255,0.08)"}`,
                  background: syncLimit === n ? `${accent}20` : "rgba(255,255,255,0.03)",
                  color: syncLimit === n ? accent : "rgba(255,255,255,0.45)",
                  cursor: "pointer", transition: "all 0.15s",
                  WebkitTapHighlightColor: "transparent",
                }}
              >{n}</button>
            ))}
            <span style={{
              fontSize: 10, color: "#52525b",
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>episodes</span>
          </div>

          {/* Progress text */}
          {syncProgress && (
            <div style={{
              fontSize: 11, color: accent, marginBottom: 10,
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            }}>{syncProgress}</div>
          )}

          {/* Error / info */}
          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, marginBottom: 14,
              fontSize: 12, fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif",
              background: error.includes("up to date") ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)",
              color: error.includes("up to date") ? "#4ade80" : "#f87171",
              border: `1px solid ${error.includes("up to date") ? "rgba(74,222,128,0.2)" : "rgba(239,68,68,0.2)"}`,
            }}>{error}</div>
          )}

          {/* Shelf picker (searchable multi-select pills) */}
          {stagedEpisodes.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <Label>Add to shelves <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#52525b" }}>— search & tap</span></Label>
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
              {/* Selected pills always visible when searching */}
              {selectedShelves.length > 0 && shelfSearch && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                  {selectedShelves.map((id) => {
                    const s = shelfOptions.find((o) => o.id === id);
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
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 120, overflowY: "auto", padding: 2 }}>
                {filteredShelfOptions.map((s) => {
                  const isActive = selectedShelves.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleShelf(s.id)}
                      style={{
                        padding: "5px 10px", borderRadius: 8,
                        fontSize: 11, fontWeight: 700,
                        fontFamily: "'Barlow Condensed', sans-serif",
                        letterSpacing: "0.02em", cursor: "pointer",
                        border: `1.5px solid ${isActive ? accent : "rgba(255,255,255,0.08)"}`,
                        background: isActive ? `${accent}20` : "rgba(255,255,255,0.03)",
                        color: isActive ? accent : "rgba(255,255,255,0.45)",
                        transition: "all 0.15s", WebkitTapHighlightColor: "transparent",
                      }}
                    >{isActive ? "✓ " : ""}{s.label}</button>
                  );
                })}
                {filteredShelfOptions.length === 0 && (
                  <div style={{ fontSize: 11, color: "#52525b", fontStyle: "italic", padding: "4px 0" }}>
                    No shelves match "{shelfSearch}"
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Approve All */}
          {pendingCount > 1 && selectedShelves.length > 0 && (
            <button
              onClick={handleApproveAll}
              style={{
                width: "100%", padding: "10px 0", marginBottom: 14, borderRadius: 10,
                background: `${accent}15`, border: `1.5px solid ${accent}`,
                color: "#fff", fontSize: 13, fontWeight: 800,
                fontFamily: "'Barlow Condensed', sans-serif",
                textTransform: "uppercase", letterSpacing: "0.03em", cursor: "pointer",
              }}
            >Approve All ({pendingCount})</button>
          )}

          {/* Staged episodes */}
          {stagedEpisodes.map((entry, idx) => (
            <div key={idx} style={{
              marginBottom: 10, padding: 12, borderRadius: 12,
              background: approved[idx] ? "rgba(74,222,128,0.06)"
                : entry.isDuplicate ? "rgba(251,191,36,0.06)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${approved[idx] ? "rgba(74,222,128,0.15)"
                : entry.isDuplicate ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.06)"}`,
              opacity: approved[idx] ? 0.6 : 1, transition: "all 0.2s",
            }}>
              {/* Episode title from RSS */}
              <div style={{
                fontSize: 10, color: "#52525b", fontWeight: 600,
                fontFamily: "'Barlow Condensed', sans-serif",
                textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{entry.episode.title}</div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {/* Poster */}
                {entry.selectedMatch?.poster_path ? (
                  <img
                    src={`${TMDB_IMG}/w92${entry.selectedMatch.poster_path}`}
                    alt="" style={{ width: 40, height: 60, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 40, height: 60, borderRadius: 6, background: "#27272a",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#52525b", fontSize: 12, flexShrink: 0,
                  }}>?</div>
                )}

                {/* Match info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {entry.selectedMatch ? (
                    <>
                      <div style={{
                        fontSize: 14, fontWeight: 700, color: "#fff",
                        fontFamily: "'Barlow Condensed', sans-serif",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{entry.selectedMatch.title || entry.selectedMatch.name}</div>
                      <div style={{ fontSize: 11, color: "#71717a" }}>
                        {(entry.selectedMatch.release_date || "").split("-")[0]} · TMDB {entry.selectedMatch.id}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "#71717a", fontStyle: "italic" }}>
                      No match — "{entry.filmTitle}"
                    </div>
                  )}

                  {entry.isDuplicate && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#fbbf24", fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase" }}>
                      ⚠ Already exists
                    </span>
                  )}
                  {approved[idx] && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#4ade80", fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase" }}>
                      ✓ Added
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {/* Show alts / re-search */}
                  {!approved[idx] && (
                    <button
                      onClick={() => {
                        setResearchIndex(researchIndex === idx ? null : idx);
                        setResearchQuery(entry.filmTitle);
                        setResearchResults(entry.tmdbAlts || []);
                      }}
                      style={{
                        background: "rgba(255,255,255,0.06)", border: "none",
                        borderRadius: 6, width: 28, height: 28,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: researchIndex === idx ? accent : "#888",
                        fontSize: 11, cursor: "pointer",
                      }}
                      title="Change TMDB match"
                    >↻</button>
                  )}

                  {/* Approve */}
                  {!approved[idx] && !entry.isDuplicate && entry.selectedMatch && (
                    <button
                      onClick={() => handleApprove(idx)}
                      disabled={approving[idx] || selectedShelves.length === 0}
                      style={{
                        background: approving[idx] ? "rgba(255,255,255,0.04)" : `${accent}20`,
                        border: `1.5px solid ${accent}`, borderRadius: 8,
                        padding: "4px 12px", color: accent, fontSize: 11, fontWeight: 800,
                        fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase",
                        cursor: approving[idx] || selectedShelves.length === 0 ? "not-allowed" : "pointer",
                        opacity: approving[idx] || selectedShelves.length === 0 ? 0.4 : 1,
                      }}
                    >{approving[idx] ? "…" : "Add"}</button>
                  )}
                </div>
              </div>

              {/* Host verdicts (NPP-specific) */}
              {showVerdicts && !approved[idx] && entry.selectedMatch && (
                <div style={{
                  marginTop: 8, paddingTop: 8,
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: "#52525b",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>Verdicts</span>
                  <div style={{ display: "flex", gap: 10 }}>
                    <MiniVerdict color="#22c55e" arrow="↑" value={entry.verdicts?.up || ""} onChange={(v) => updateVerdict(idx, "up", v)} />
                    <MiniVerdict color="#ef4444" arrow="↓" value={entry.verdicts?.down || ""} onChange={(v) => updateVerdict(idx, "down", v)} />
                    <MiniVerdict color="#a16207" arrow="↑" value={entry.verdicts?.brown || ""} onChange={(v) => updateVerdict(idx, "brown", v)} />
                  </div>
                </div>
              )}

              {/* Re-search panel */}
              {researchIndex === idx && !approved[idx] && (
                <div style={{
                  marginTop: 8, paddingTop: 8,
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <input
                      type="text"
                      value={researchQuery}
                      onChange={(e) => setResearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleResearch()}
                      placeholder="Search TMDB…"
                      style={{
                        flex: 1, background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 8, color: "#e4e4e7", padding: "6px 10px",
                        fontSize: 12, outline: "none",
                      }}
                    />
                    <button
                      onClick={handleResearch}
                      disabled={researching}
                      style={{
                        padding: "6px 10px", borderRadius: 8,
                        background: `${accent}20`, border: `1px solid ${accent}40`,
                        color: accent, fontSize: 11, fontWeight: 700,
                        fontFamily: "'Barlow Condensed', sans-serif",
                        cursor: "pointer",
                      }}
                    >{researching ? "…" : "Search"}</button>
                  </div>

                  {/* Alt results */}
                  <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
                    {researchResults.map((alt) => (
                      <button
                        key={alt.id}
                        onClick={() => {
                          swapMatch(idx, alt);
                          setResearchIndex(null);
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 8, padding: "4px 8px",
                          cursor: "pointer", color: "#e4e4e7", flexShrink: 0,
                        }}
                      >
                        {alt.poster_path && (
                          <img src={`${TMDB_IMG}/w92${alt.poster_path}`} alt=""
                            style={{ width: 24, height: 36, borderRadius: 3, objectFit: "cover" }} />
                        )}
                        <div style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                          {alt.title || alt.name} ({(alt.release_date || "").split("-")[0]})
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Done message */}
          {approvedCount > 0 && pendingCount === 0 && (
            <div style={{
              textAlign: "center", padding: "20px 0",
              fontSize: 14, fontWeight: 700, color: "#4ade80",
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>All done! {approvedCount} episode{approvedCount !== 1 ? "s" : ""} added. ✓</div>
          )}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   Helpers
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

function MiniVerdict({ color, arrow, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      <span style={{ fontSize: 14, fontWeight: 800, color, lineHeight: 1 }}>{arrow}</span>
      <input
        type="number"
        placeholder="·"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 36, textAlign: "center",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 6, padding: "4px 2px",
          color: "#e4e4e7", fontSize: 12,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700, outline: "none",
        }}
      />
    </div>
  );
}

/**
 * Extract film title from a podcast episode title.
 * Strips episode numbers, podcast name, guest names, year suffixes.
 */
function extractFilmTitle(episodeTitle, podcastName) {
  let t = (episodeTitle || "").trim();

  // Remove leading episode markers
  t = t.replace(/^(episode|ep\.?)\s*#?\d+[\s:\-–—]+/i, "");
  t = t.replace(/^#\d+[\s:\-–—]+/i, "");

  // Remove podcast name prefix/suffix
  if (podcastName) {
    const escaped = podcastName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(`^${escaped}[\\s:\\-–—]+`, "i"), "");
    t = t.replace(new RegExp(`[\\s:\\-–—]+${escaped}$`, "i"), "");
  }

  // Remove guest/featuring suffixes
  t = t.replace(/\s+(w\/|with|ft\.?|featuring)\s+.+$/i, "");

  // Remove "(YEAR)" suffix
  t = t.replace(/\s*\(\d{4}\)\s*$/, "");

  // Clean up separators
  t = t.replace(/[\s:\-–—]+$/, "").replace(/^[\s:\-–—]+/, "").trim();

  return t || episodeTitle;
}

async function searchTMDB(query) {
  if (!query || query.length < 2) return [];
  try {
    const results = await searchTMDBRaw(query);
    return (results || []).slice(0, 5);
  } catch { return []; }
}