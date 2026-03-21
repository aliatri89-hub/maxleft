import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { supabase } from "../../supabase";
import { searchTMDBRaw } from "../../utils/api";

/**
 * IngestReviewTool — Admin review queue for auto-matched podcast episodes.
 *
 * Lives inside the Feed screen as a fourth "Inbox" tab (admin-only).
 * Reads from ingest_review_queue view, allows batch approve/reject.
 *
 * Flow:
 *   1. Cron ingests RSS → new episodes → auto-matches films
 *   2. Matches land here with admin_reviewed = false
 *   3. Admin reviews: approve (→ live) or reject (→ deleted)
 *   4. generate_coverage_notifications() fires on approve
 */

const TMDB_IMG = "https://image.tmdb.org/t/p";
const ADMIN_ID = "19410e64-d610-4fab-9c26-d24fafc94696";

function confidenceColor(score) {
  if (score >= 0.9) return "#34d399";   // green — high
  if (score >= 0.7) return "#fbbf24";   // amber — medium
  return "#f87171";                      // red — low
}

function confidenceLabel(score) {
  if (score >= 0.9) return "HIGH";
  if (score >= 0.7) return "MED";
  return "LOW";
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return dateStr; }
}

export default function IngestReviewTool({ userId, onToast }) {
  const [queue, setQueue] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // ── Re-match state ──
  const [rematchId, setRematchId] = useState(null);       // mapping_id being re-matched
  const [rematchQuery, setRematchQuery] = useState("");
  const [rematchResults, setRematchResults] = useState([]);
  const [rematchSearching, setRematchSearching] = useState(false);

  // ── On-demand sync state ──
  const [syncing, setSyncing] = useState(false);

  const isAdmin = userId === ADMIN_ID;

  // ── Trigger ingest on demand ──
  const handleSyncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("https://api.mymantl.app/functions/v1/ingest-rss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (onToast) onToast(`Synced: ${data.total_new_episodes || 0} new eps, ${data.total_matches || 0} matches`);
      fetchQueue();
    } catch (err) {
      if (onToast) onToast(`Sync failed: ${err.message}`);
    }
    setSyncing(false);
  }, [fetchQueue, onToast]);

  // ── Fetch review queue ──
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    const [queueRes, summaryRes] = await Promise.all([
      supabase.from("ingest_review_queue").select("*"),
      supabase.from("daily_ingest_summary").select("*").limit(3),
    ]);

    setQueue(queueRes.data || []);
    setSummary((summaryRes.data || [])[0] || null);
    setLoading(false);

    // Auto-select high-confidence matches
    const highConf = new Set();
    for (const item of (queueRes.data || [])) {
      if (parseFloat(item.confidence_score) >= 0.9) {
        highConf.add(item.mapping_id);
      }
    }
    setSelected(highConf);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchQueue();
  }, [isAdmin, fetchQueue]);

  // ── Group by episode for display ──
  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of queue) {
      const key = item.episode_id;
      if (!map.has(key)) {
        map.set(key, {
          episode_id: item.episode_id,
          episode_title: item.episode_title,
          episode_air_date: item.episode_air_date,
          episode_description: item.episode_description,
          podcast_name: item.podcast_name,
          podcast_slug: item.podcast_slug,
          podcast_artwork: item.podcast_artwork,
          matches: [],
        });
      }
      map.get(key).matches.push(item);
    }
    // Sort: newest episodes first
    return Array.from(map.values()).sort((a, b) =>
      (b.episode_air_date || "").localeCompare(a.episode_air_date || "")
    );
  }, [queue]);

  // ── Toggle selection ──
  const toggle = useCallback((mappingId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(mappingId)) next.delete(mappingId);
      else next.add(mappingId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(queue.map(q => q.mapping_id)));
  }, [queue]);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  // ── Approve selected ──
  const handleApprove = useCallback(async () => {
    if (selected.size === 0) return;
    setApproving(true);
    try {
      const { data, error } = await supabase.rpc("approve_ingest_matches", {
        mapping_ids: Array.from(selected),
      });
      if (error) throw error;
      const result = data || {};
      if (onToast) onToast(`Approved ${result.approved || 0} matches, ${result.notifications_generated || 0} notifications sent`);
      setSelected(new Set());
      fetchQueue();
    } catch (err) {
      if (onToast) onToast(`Error: ${err.message}`);
    }
    setApproving(false);
  }, [selected, fetchQueue, onToast]);

  // ── Reject selected ──
  const handleReject = useCallback(async () => {
    if (selected.size === 0) return;
    setRejecting(true);
    try {
      const { data, error } = await supabase.rpc("reject_ingest_matches", {
        mapping_ids: Array.from(selected),
      });
      if (error) throw error;
      if (onToast) onToast(`Removed ${data || 0} bad matches`);
      setSelected(new Set());
      fetchQueue();
    } catch (err) {
      if (onToast) onToast(`Error: ${err.message}`);
    }
    setRejecting(false);
  }, [selected, fetchQueue, onToast]);

  if (!isAdmin) return null;

  // ── Re-match: search TMDB ──
  const handleRematchSearch = async () => {
    if (!rematchQuery.trim()) return;
    setRematchSearching(true);
    try {
      const results = await searchTMDBRaw(rematchQuery.trim());
      setRematchResults((results || []).slice(0, 6));
    } catch { setRematchResults([]); }
    setRematchSearching(false);
  };

  // ── Re-match: swap tmdb_id on the mapping ──
  const handleRematchSwap = async (mappingId, newTmdbId, newTitle, newYear, newPoster) => {
    const { error } = await supabase
      .from("podcast_episode_films")
      .update({ tmdb_id: newTmdbId, confidence_score: 1.0 })
      .eq("id", mappingId);

    if (error) {
      if (onToast) onToast(`Swap failed: ${error.message}`);
      return;
    }

    // Update local queue state so UI reflects the swap immediately
    setQueue(prev => prev.map(q =>
      q.mapping_id === mappingId
        ? { ...q, tmdb_id: newTmdbId, film_title: newTitle, film_year: newYear, poster_path: newPoster, confidence_score: 1.0 }
        : q
    ));
    setRematchId(null);
    setRematchQuery("");
    setRematchResults([]);
    if (onToast) onToast(`Swapped to "${newTitle}" ✓`);
  };

  const selectedCount = selected.size;
  const totalCount = queue.length;

  // ═══════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════

  return (
    <div style={{ minHeight: "50vh" }}>
      {/* ── Sync Now ── */}
      <div style={{
        display: "flex", justifyContent: "flex-end",
        padding: "10px 16px 0",
      }}>
        <button
          onClick={handleSyncNow}
          disabled={syncing}
          style={{
            padding: "6px 14px", borderRadius: 8,
            background: syncing ? "rgba(255,255,255,0.02)" : "rgba(196,115,79,0.1)",
            border: `1px solid ${syncing ? "rgba(255,255,255,0.06)" : "rgba(196,115,79,0.25)"}`,
            color: syncing ? "rgba(240,235,225,0.4)" : "#c4734f",
            fontSize: 10, fontWeight: 800,
            fontFamily: "'Barlow Condensed', sans-serif",
            textTransform: "uppercase", letterSpacing: "0.06em",
            cursor: syncing ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          {syncing && (
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              border: "1.5px solid #c4734f",
              borderTopColor: "transparent",
              animation: "ptr-spin 0.8s linear infinite",
            }} />
          )}
          {syncing ? "Syncing…" : "Sync Now"}
        </button>
      </div>

      {/* ── Summary header ── */}
      {summary && summary.total_matches > 0 && (
        <div style={{
          margin: "8px 16px 0",
          padding: "10px 14px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "rgba(52,211,153,0.1)",
            border: "1px solid rgba(52,211,153,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>📡</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 700,
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: "uppercase", letterSpacing: "0.06em",
              color: "rgba(240,235,225,0.5)",
            }}>
              Last ingest · {summary.run_date}
            </div>
            <div style={{
              fontSize: 12, color: "rgba(240,235,225,0.8)",
              fontFamily: "'IBM Plex Mono', monospace",
              marginTop: 2,
            }}>
              {summary.total_new_episodes || 0} new eps → {summary.total_matches || 0} matches
              {summary.podcasts_with_new_eps?.length > 0 && (
                <span style={{ color: "rgba(240,235,225,0.4)" }}>
                  {" "}from {summary.podcasts_with_new_eps.join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Action bar ── */}
      {totalCount > 0 && (
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          padding: "10px 16px 8px",
          background: "linear-gradient(to bottom, var(--color-bg, #0f0d0b) 70%, transparent)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {/* Select toggles */}
          <button
            onClick={selected.size === totalCount ? deselectAll : selectAll}
            style={{
              padding: "5px 10px", borderRadius: 6,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(240,235,225,0.6)",
              fontSize: 10, fontWeight: 700,
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: "uppercase", letterSpacing: "0.06em",
              cursor: "pointer",
            }}
          >
            {selected.size === totalCount ? "None" : "All"}
          </button>

          <div style={{
            flex: 1, fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
            color: "rgba(240,235,225,0.4)",
          }}>
            {selectedCount}/{totalCount} selected
          </div>

          {/* Reject */}
          <button
            onClick={handleReject}
            disabled={selectedCount === 0 || rejecting}
            style={{
              padding: "6px 14px", borderRadius: 8,
              background: selectedCount > 0 ? "rgba(248,113,113,0.08)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${selectedCount > 0 ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.06)"}`,
              color: selectedCount > 0 ? "#f87171" : "rgba(240,235,225,0.3)",
              fontSize: 11, fontWeight: 800,
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: "uppercase", letterSpacing: "0.04em",
              cursor: selectedCount > 0 ? "pointer" : "not-allowed",
              opacity: rejecting ? 0.5 : 1,
            }}
          >
            {rejecting ? "…" : "Reject"}
          </button>

          {/* Approve */}
          <button
            onClick={handleApprove}
            disabled={selectedCount === 0 || approving}
            style={{
              padding: "6px 14px", borderRadius: 8,
              background: selectedCount > 0 ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${selectedCount > 0 ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.06)"}`,
              color: selectedCount > 0 ? "#34d399" : "rgba(240,235,225,0.3)",
              fontSize: 11, fontWeight: 800,
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: "uppercase", letterSpacing: "0.04em",
              cursor: selectedCount > 0 ? "pointer" : "not-allowed",
              opacity: approving ? 0.5 : 1,
            }}
          >
            {approving ? "…" : `Approve${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
          </button>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "2.5px solid rgba(240,235,225,0.2)",
            borderTopColor: "transparent",
            animation: "ptr-spin 0.8s linear infinite",
          }} />
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && totalCount === 0 && (
        <div style={{
          padding: "60px 24px", textAlign: "center",
          color: "rgba(240,235,225,0.4)",
        }}>
          <div style={{
            fontSize: 32, marginBottom: 12, opacity: 0.6,
          }}>✓</div>
          <div style={{
            fontSize: 14, fontWeight: 700,
            fontFamily: "'Barlow Condensed', sans-serif",
            textTransform: "uppercase", letterSpacing: "0.08em",
            marginBottom: 6,
          }}>
            All clear
          </div>
          <div style={{
            fontSize: 12, fontFamily: "'IBM Plex Mono', monospace",
            lineHeight: 1.5,
          }}>
            No matches waiting for review.
            <br />
            Hit Sync Now or wait for the 22:00 UTC cron.
          </div>
        </div>
      )}

      {/* ── Episode groups ── */}
      {grouped.map((group) => (
        <div key={group.episode_id} style={{
          margin: "8px 16px",
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 10,
          overflow: "hidden",
        }}>
          {/* Episode header */}
          <div style={{
            padding: "10px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            {group.podcast_artwork && (
              <img
                src={group.podcast_artwork}
                alt=""
                style={{
                  width: 32, height: 32, borderRadius: 6,
                  objectFit: "cover", flexShrink: 0,
                }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 9, fontWeight: 700,
                fontFamily: "'Barlow Condensed', sans-serif",
                textTransform: "uppercase", letterSpacing: "0.08em",
                color: "rgba(240,235,225,0.35)",
                marginBottom: 2,
              }}>
                {group.podcast_name}
                {group.episode_air_date && (
                  <span style={{ marginLeft: 6, fontWeight: 600, opacity: 0.8 }}>
                    · {formatDate(group.episode_air_date)}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 12, fontWeight: 600,
                color: "rgba(240,235,225,0.75)",
                fontFamily: "'IBM Plex Mono', monospace",
                overflow: "hidden", textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {group.episode_title}
              </div>
            </div>
          </div>

          {/* Matched films */}
          {group.matches.map((match) => {
            const isSelected = selected.has(match.mapping_id);
            const confidence = parseFloat(match.confidence_score) || 0;
            const color = confidenceColor(confidence);

            return (
              <Fragment key={match.mapping_id}>
              <div
                onClick={() => toggle(match.mapping_id)}
                style={{
                  padding: "8px 12px",
                  display: "flex", alignItems: "center", gap: 10,
                  cursor: "pointer",
                  background: isSelected ? "rgba(52,211,153,0.03)" : "transparent",
                  borderBottom: "1px solid rgba(255,255,255,0.02)",
                  transition: "background 0.15s ease",
                }}
              >
                {/* Checkbox */}
                <div style={{
                  width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                  border: `2px solid ${isSelected ? "#34d399" : "rgba(255,255,255,0.15)"}`,
                  background: isSelected ? "rgba(52,211,153,0.15)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s ease",
                }}>
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>

                {/* Poster */}
                {match.poster_path ? (
                  <img
                    src={`${TMDB_IMG}/w92${match.poster_path}`}
                    alt=""
                    style={{
                      width: 34, height: 51, borderRadius: 4,
                      objectFit: "cover", flexShrink: 0,
                    }}
                  />
                ) : (
                  <div style={{
                    width: 34, height: 51, borderRadius: 4, flexShrink: 0,
                    background: "rgba(255,255,255,0.04)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, color: "rgba(240,235,225,0.2)",
                  }}>🎬</div>
                )}

                {/* Film info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    color: "rgba(240,235,225,0.85)",
                    overflow: "hidden", textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {match.film_title || "Unknown Film"}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: "rgba(240,235,225,0.4)",
                    fontFamily: "'IBM Plex Mono', monospace",
                    marginTop: 1,
                  }}>
                    {match.film_year || "—"}
                    {match.film_has_existing_coverage && (
                      <span style={{
                        marginLeft: 8, fontSize: 9,
                        color: "rgba(240,235,225,0.3)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}>
                        already covered
                      </span>
                    )}
                  </div>
                </div>

                {/* Confidence pill */}
                <div style={{
                  padding: "3px 8px", borderRadius: 4,
                  background: `${color}15`,
                  border: `1px solid ${color}30`,
                  fontSize: 9, fontWeight: 800,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  color: color,
                  flexShrink: 0,
                }}>
                  {confidenceLabel(confidence)}
                  <span style={{ marginLeft: 4, opacity: 0.7, fontWeight: 600 }}>
                    {(confidence * 100).toFixed(0)}
                  </span>
                </div>

                {/* Re-match button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (rematchId === match.mapping_id) {
                      setRematchId(null);
                    } else {
                      setRematchId(match.mapping_id);
                      setRematchQuery(match.film_title || "");
                      setRematchResults([]);
                    }
                  }}
                  style={{
                    background: rematchId === match.mapping_id ? "rgba(196,115,79,0.12)" : "rgba(255,255,255,0.06)",
                    border: "none", borderRadius: 6,
                    width: 26, height: 26, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: rematchId === match.mapping_id ? "#c4734f" : "rgba(240,235,225,0.4)",
                    fontSize: 13, cursor: "pointer",
                  }}
                  title="Change TMDB match"
                >↻</button>
              </div>

              {/* Re-match search panel */}
              {rematchId === match.mapping_id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    padding: "8px 12px 10px 54px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: "rgba(196,115,79,0.03)",
                  }}
                >
                  <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <input
                      type="text"
                      value={rematchQuery}
                      onChange={(e) => setRematchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRematchSearch()}
                      placeholder="Search TMDB…"
                      autoFocus
                      style={{
                        flex: 1, background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 8, color: "#e4e4e7", padding: "6px 10px",
                        fontSize: 12, outline: "none",
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}
                    />
                    <button
                      onClick={handleRematchSearch}
                      disabled={rematchSearching}
                      style={{
                        padding: "6px 10px", borderRadius: 8,
                        background: "rgba(196,115,79,0.12)",
                        border: "1px solid rgba(196,115,79,0.25)",
                        color: "#c4734f", fontSize: 11, fontWeight: 700,
                        fontFamily: "'Barlow Condensed', sans-serif",
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                    >{rematchSearching ? "…" : "Search"}</button>
                  </div>

                  {/* Results */}
                  <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
                    {rematchResults.map((alt) => (
                      <button
                        key={alt.id}
                        onClick={() => handleRematchSwap(
                          match.mapping_id,
                          alt.id,
                          alt.title || alt.name,
                          parseInt((alt.release_date || "").split("-")[0]) || null,
                          alt.poster_path
                        )}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 8, padding: "4px 8px",
                          cursor: "pointer", color: "#e4e4e7", flexShrink: 0,
                        }}
                      >
                        {alt.poster_path && (
                          <img
                            src={`${TMDB_IMG}/w92${alt.poster_path}`}
                            alt=""
                            style={{ width: 24, height: 36, borderRadius: 3, objectFit: "cover" }}
                          />
                        )}
                        <div style={{ fontSize: 11, whiteSpace: "nowrap", fontFamily: "'IBM Plex Mono', monospace" }}>
                          {alt.title || alt.name} ({(alt.release_date || "").split("-")[0]})
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              </Fragment>
            );
          })}
        </div>
      ))}

      {/* ── Refresh button at bottom ── */}
      {!loading && totalCount > 0 && (
        <div style={{ display: "flex", justifyContent: "center", padding: "16px 0 24px" }}>
          <button
            onClick={fetchQueue}
            style={{
              padding: "8px 20px", borderRadius: 8,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "rgba(240,235,225,0.4)",
              fontSize: 10, fontWeight: 700,
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: "uppercase", letterSpacing: "0.06em",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
