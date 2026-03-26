// src/admin/FeedManager.jsx
//
// Phase 2 admin: Feed & Ingest management.
// Tabs: Ingest Queue | Coming Soon | Dead Audio
//
// Ingest Queue: re-houses IngestReviewTool logic for desktop layout
// Coming Soon: episodes with future air_date — manage publish dates
// Dead Audio: reported broken audio URLs to investigate

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { supabase } from "../supabase";

const TMDB_IMG = "https://image.tmdb.org/t/p";
const ADMIN_ID = "19410e64-d610-4fab-9c26-d24fafc94696";
const SUPABASE_URL = "https://api.mymantl.app";

// Inline TMDB search
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

const TABS = [
  { key: "ingest", label: "Ingest Queue" },
  { key: "coming-soon", label: "Coming Soon" },
  { key: "dead-audio", label: "Dead Audio" },
];

export default function FeedManager({ session }) {
  const [activeTab, setActiveTab] = useState("ingest");

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Feed & Ingest</h1>
      </div>

      {/* Tab bar */}
      <div style={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.key ? styles.tabActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "ingest" && <IngestQueue session={session} />}
      {activeTab === "coming-soon" && <ComingSoon />}
      {activeTab === "dead-audio" && <DeadAudio />}
    </div>
  );
}


// ═══════════════════════════════════════════════════
// TAB 1: INGEST QUEUE
// ═══════════════════════════════════════════════════

function IngestQueue({ session }) {
  const [queue, setQueue] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);

  // Re-match state
  const [rematchId, setRematchId] = useState(null);
  const [rematchQuery, setRematchQuery] = useState("");
  const [rematchResults, setRematchResults] = useState([]);
  const [rematchSearching, setRematchSearching] = useState(false);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

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

  const handleSyncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ingest-rss`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      showToast(`Synced: ${data.total_new_episodes || 0} new eps, ${data.total_matches || 0} matches`);
      fetchQueue();
    } catch (err) {
      showToast(`Sync failed: ${err.message}`);
    }
    setSyncing(false);
  }, [fetchQueue, showToast, session]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  // Group by episode
  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of queue) {
      const key = item.episode_id;
      if (!map.has(key)) {
        map.set(key, {
          episode_id: item.episode_id,
          episode_title: item.episode_title,
          episode_air_date: item.episode_air_date,
          podcast_name: item.podcast_name,
          podcast_slug: item.podcast_slug,
          podcast_artwork: item.podcast_artwork,
          matches: [],
        });
      }
      map.get(key).matches.push(item);
    }
    return Array.from(map.values()).sort((a, b) =>
      (b.episode_air_date || "").localeCompare(a.episode_air_date || "")
    );
  }, [queue]);

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

  const handleApprove = useCallback(async () => {
    if (selected.size === 0) return;
    setApproving(true);
    try {
      const { data, error } = await supabase.rpc("approve_ingest_matches", {
        mapping_ids: Array.from(selected),
      });
      if (error) throw error;
      const result = data || {};
      const parts = [`✓ ${result.approved || 0} approved`];
      if (result.community_items_updated) parts.push(`${result.community_items_updated} community items`);
      if (result.media_ids_linked) parts.push(`${result.media_ids_linked} media linked`);
      if (result.notifications_generated) parts.push(`${result.notifications_generated} notifs`);
      showToast(parts.join(" · "));
      setSelected(new Set());
      fetchQueue();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
    setApproving(false);
  }, [selected, fetchQueue, showToast]);

  const handleReject = useCallback(async () => {
    if (selected.size === 0) return;
    setRejecting(true);
    try {
      const { data, error } = await supabase.rpc("reject_ingest_matches", {
        mapping_ids: Array.from(selected),
      });
      if (error) throw error;
      showToast(`Removed ${data || 0} bad matches`);
      setSelected(new Set());
      fetchQueue();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
    setRejecting(false);
  }, [selected, fetchQueue, showToast]);

  const handleRematchSearch = async () => {
    if (!rematchQuery.trim()) return;
    setRematchSearching(true);
    try {
      const results = await searchTMDB(rematchQuery.trim());
      setRematchResults((results || []).slice(0, 6));
    } catch { setRematchResults([]); }
    setRematchSearching(false);
  };

  const handleRematchSwap = async (mappingId, newTmdbId, newTitle, newYear, newPoster) => {
    const { error } = await supabase
      .from("podcast_episode_films")
      .update({ tmdb_id: newTmdbId, confidence_score: 1.0 })
      .eq("id", mappingId);
    if (error) { showToast(`Swap failed: ${error.message}`); return; }

    setQueue(prev => prev.map(q =>
      q.mapping_id === mappingId
        ? { ...q, tmdb_id: newTmdbId, film_title: newTitle, film_year: newYear, poster_path: newPoster, confidence_score: 1.0 }
        : q
    ));
    setRematchId(null);
    setRematchQuery("");
    setRematchResults([]);
    showToast(`Swapped to "${newTitle}" ✓`);
  };

  const selectedCount = selected.size;
  const totalCount = queue.length;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={styles.toast}>{toast}</div>
      )}

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          {totalCount > 0 && (
            <>
              <button onClick={selected.size === totalCount ? deselectAll : selectAll} style={styles.toolBtn}>
                {selected.size === totalCount ? "Deselect All" : "Select All"}
              </button>
              <span style={styles.toolCount}>{selectedCount}/{totalCount} selected</span>
            </>
          )}
        </div>
        <div style={styles.toolbarRight}>
          <button onClick={handleSyncNow} disabled={syncing} style={styles.syncBtn}>
            {syncing ? "Syncing…" : "Sync Now"}
          </button>
          {selectedCount > 0 && (
            <>
              <button onClick={handleReject} disabled={rejecting} style={styles.rejectBtn}>
                {rejecting ? "…" : "Reject"}
              </button>
              <button onClick={handleApprove} disabled={approving} style={styles.approveBtn}>
                {approving ? "…" : `Approve (${selectedCount})`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      {summary && summary.total_matches > 0 && (
        <div style={styles.summaryBar}>
          <span style={styles.summaryLabel}>Last ingest · {summary.run_date}</span>
          <span style={styles.summaryValue}>
            {summary.total_new_episodes || 0} new eps → {summary.total_matches || 0} matches
          </span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={styles.emptyState}>
          <div style={styles.spinner} />
        </div>
      )}

      {/* Empty */}
      {!loading && totalCount === 0 && (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 28, opacity: 0.4, marginBottom: 8 }}>✓</div>
          <div style={styles.emptyTitle}>All clear</div>
          <div style={styles.emptyDetail}>No matches waiting for review</div>
        </div>
      )}

      {/* Episodes */}
      <div style={styles.episodeGrid}>
        {grouped.map((group) => (
          <div key={group.episode_id} style={styles.episodeCard}>
            {/* Episode header */}
            <div style={styles.episodeHeader}>
              {group.podcast_artwork && (
                <img src={group.podcast_artwork} alt="" style={styles.podcastArt} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.podcastName}>
                  {group.podcast_name}
                  {group.episode_air_date && (
                    <span style={{ marginLeft: 8, opacity: 0.6 }}>
                      · {formatDate(group.episode_air_date)}
                    </span>
                  )}
                </div>
                <div style={styles.episodeTitle}>{group.episode_title}</div>
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
                      ...styles.matchRow,
                      background: isSelected ? "rgba(52,211,153,0.04)" : "transparent",
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      ...styles.checkbox,
                      borderColor: isSelected ? "#34d399" : "rgba(255,255,255,0.15)",
                      background: isSelected ? "rgba(52,211,153,0.15)" : "transparent",
                    }}>
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                    </div>

                    {/* Poster */}
                    {match.poster_path ? (
                      <img src={`${TMDB_IMG}/w92${match.poster_path}`} alt="" style={styles.matchPoster} />
                    ) : (
                      <div style={styles.matchPosterEmpty}>🎬</div>
                    )}

                    {/* Film info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.matchTitle}>{match.film_title || "Unknown Film"}</div>
                      <div style={styles.matchYear}>
                        {match.film_year || "—"}
                        {match.film_has_existing_coverage && (
                          <span style={styles.alreadyCovered}>already covered</span>
                        )}
                      </div>
                    </div>

                    {/* Confidence pill */}
                    <div style={{ ...styles.confidencePill, background: `${color}15`, borderColor: `${color}30`, color }}>
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
                        ...styles.rematchBtn,
                        background: rematchId === match.mapping_id ? "rgba(196,115,79,0.12)" : "rgba(255,255,255,0.06)",
                        color: rematchId === match.mapping_id ? "#c4734f" : "rgba(240,235,225,0.4)",
                      }}
                    >↻</button>
                  </div>

                  {/* Re-match search */}
                  {rematchId === match.mapping_id && (
                    <div onClick={(e) => e.stopPropagation()} style={styles.rematchPanel}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input
                          value={rematchQuery}
                          onChange={(e) => setRematchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleRematchSearch()}
                          placeholder="Search TMDB…"
                          autoFocus
                          style={styles.rematchInput}
                        />
                        <button onClick={handleRematchSearch} disabled={rematchSearching} style={styles.rematchSearchBtn}>
                          {rematchSearching ? "…" : "Search"}
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {rematchResults.map((alt) => (
                          <button
                            key={alt.id}
                            onClick={() => handleRematchSwap(
                              match.mapping_id, alt.id,
                              alt.title || alt.name,
                              parseInt((alt.release_date || "").split("-")[0]) || null,
                              alt.poster_path
                            )}
                            style={styles.rematchResult}
                          >
                            {alt.poster_path && (
                              <img src={`${TMDB_IMG}/w92${alt.poster_path}`} alt="" style={{ width: 28, height: 42, borderRadius: 3, objectFit: "cover" }} />
                            )}
                            <div style={{ fontSize: 11, whiteSpace: "nowrap", fontFamily: "var(--font-mono)" }}>
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
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════
// TAB 2: COMING SOON
// ═══════════════════════════════════════════════════

function ComingSoon() {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchComingSoon = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("community_items")
      .select("id, title, year, air_date, episode_url, episode_number_display, poster_path, extra_data, miniseries_id")
      .gt("air_date", today)
      .order("air_date", { ascending: true });

    if (error) {
      console.error("[ComingSoon] Fetch error:", error);
    }
    setEpisodes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchComingSoon(); }, [fetchComingSoon]);

  const handleUpdateAirDate = async (itemId, newDate) => {
    const { error } = await supabase
      .from("community_items")
      .update({ air_date: newDate || null })
      .eq("id", itemId);

    if (error) {
      showToast(`Update failed: ${error.message}`);
      return;
    }
    showToast("Air date updated ✓");
    fetchComingSoon();
  };

  const handlePublishNow = async (itemId) => {
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("community_items")
      .update({ air_date: today })
      .eq("id", itemId);

    if (error) {
      showToast(`Publish failed: ${error.message}`);
      return;
    }
    showToast("Published — air_date set to today ✓");
    fetchComingSoon();
  };

  if (loading) {
    return <div style={styles.emptyState}><div style={styles.spinner} /></div>;
  }

  return (
    <div>
      {toast && <div style={styles.toast}>{toast}</div>}

      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <span style={styles.toolCount}>{episodes.length} episodes upcoming</span>
        </div>
        <div style={styles.toolbarRight}>
          <button onClick={fetchComingSoon} style={styles.syncBtn}>Refresh</button>
        </div>
      </div>

      {episodes.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 28, opacity: 0.4, marginBottom: 8 }}>📭</div>
          <div style={styles.emptyTitle}>Nothing coming soon</div>
          <div style={styles.emptyDetail}>No episodes with future air dates</div>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Film</th>
                <th style={styles.th}>Episode</th>
                <th style={styles.th}>Air Date</th>
                <th style={styles.th}>Audio</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {episodes.map((ep) => {
                const daysUntil = Math.ceil((new Date(ep.air_date + "T00:00:00") - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <tr key={ep.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {ep.poster_path ? (
                          <img src={`${TMDB_IMG}/w92${ep.poster_path}`} alt="" style={{ width: 30, height: 45, borderRadius: 4, objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 30, height: 45, borderRadius: 4, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🎬</div>
                        )}
                        <div>
                          <div style={styles.cellTitle}>{ep.title}</div>
                          <div style={styles.cellSub}>{ep.year || ""}</div>
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.cellSub}>
                        {ep.episode_number_display || ep.extra_data?.episode_title || "—"}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.cellTitle}>{ep.air_date}</div>
                      <div style={{
                        ...styles.cellSub,
                        color: daysUntil <= 1 ? "#4ade80" : daysUntil <= 7 ? "#fbbf24" : "rgba(240,235,225,0.35)",
                      }}>
                        {daysUntil === 0 ? "today" : daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{
                        ...styles.audioPill,
                        background: ep.episode_url ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
                        color: ep.episode_url ? "#4ade80" : "#f87171",
                        borderColor: ep.episode_url ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)",
                      }}>
                        {ep.episode_url ? "✓ has audio" : "✗ no audio"}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => handlePublishNow(ep.id)} style={styles.publishBtn}>
                        Publish Now
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════
// TAB 3: DEAD AUDIO
// ═══════════════════════════════════════════════════

function DeadAudio() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dead_audio_reports")
      .select("*, podcast_episodes(title, audio_url, podcast_id)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[DeadAudio] Fetch error:", error);
    }
    setReports(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleDismiss = async (reportId) => {
    const { error } = await supabase
      .from("dead_audio_reports")
      .delete()
      .eq("id", reportId);

    if (error) {
      showToast(`Delete failed: ${error.message}`);
      return;
    }
    showToast("Report dismissed ✓");
    setReports(prev => prev.filter(r => r.id !== reportId));
  };

  if (loading) {
    return <div style={styles.emptyState}><div style={styles.spinner} /></div>;
  }

  return (
    <div>
      {toast && <div style={styles.toast}>{toast}</div>}

      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <span style={styles.toolCount}>{reports.length} reports</span>
        </div>
        <div style={styles.toolbarRight}>
          <button onClick={fetchReports} style={styles.syncBtn}>Refresh</button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 28, opacity: 0.4, marginBottom: 8 }}>🔇</div>
          <div style={styles.emptyTitle}>No dead audio reports</div>
          <div style={styles.emptyDetail}>All audio links are healthy</div>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Episode</th>
                <th style={styles.th}>Error</th>
                <th style={styles.th}>Audio URL</th>
                <th style={styles.th}>Reported</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.cellTitle}>
                      {report.podcast_episodes?.title || "Unknown episode"}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{
                      ...styles.audioPill,
                      background: "rgba(248,113,113,0.08)",
                      color: "#f87171",
                      borderColor: "rgba(248,113,113,0.2)",
                    }}>
                      {report.error_info || "unknown"}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ ...styles.cellSub, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {report.audio_url || "—"}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.cellSub}>
                      {report.created_at ? new Date(report.created_at).toLocaleDateString() : "—"}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => handleDismiss(report.id)} style={styles.dismissBtn}>
                      Dismiss
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return dateStr; }
}

function confidenceColor(score) {
  if (score >= 0.9) return "#34d399";
  if (score >= 0.7) return "#fbbf24";
  return "#f87171";
}

function confidenceLabel(score) {
  if (score >= 0.9) return "HIGH";
  if (score >= 0.7) return "MED";
  return "LOW";
}


// ═══════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════

const styles = {
  page: {
    padding: "32px 40px 60px",
    maxWidth: 1200,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "#f0ebe1",
    margin: 0,
  },

  // ── Tabs ──
  tabBar: {
    display: "flex",
    gap: 2,
    marginBottom: 24,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  tab: {
    padding: "10px 20px",
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    color: "rgba(240,235,225,0.4)",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  tabActive: {
    color: "#C4734F",
    borderBottomColor: "#C4734F",
  },

  // ── Toolbar ──
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    marginBottom: 12,
  },
  toolbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  toolbarRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  toolBtn: {
    padding: "6px 14px",
    borderRadius: 6,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(240,235,225,0.6)",
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    cursor: "pointer",
  },
  toolCount: {
    fontSize: 12,
    fontFamily: "var(--font-mono)",
    color: "rgba(240,235,225,0.35)",
  },
  syncBtn: {
    padding: "6px 16px",
    borderRadius: 8,
    background: "rgba(196,115,79,0.08)",
    border: "1px solid rgba(196,115,79,0.25)",
    color: "#C4734F",
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    cursor: "pointer",
  },
  approveBtn: {
    padding: "6px 16px",
    borderRadius: 8,
    background: "rgba(52,211,153,0.1)",
    border: "1px solid rgba(52,211,153,0.3)",
    color: "#34d399",
    fontSize: 11,
    fontWeight: 800,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    cursor: "pointer",
  },
  rejectBtn: {
    padding: "6px 16px",
    borderRadius: 8,
    background: "rgba(248,113,113,0.08)",
    border: "1px solid rgba(248,113,113,0.3)",
    color: "#f87171",
    fontSize: 11,
    fontWeight: 800,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    cursor: "pointer",
  },

  // ── Summary ──
  summaryBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 16px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "rgba(240,235,225,0.35)",
  },
  summaryValue: {
    fontSize: 12,
    fontFamily: "var(--font-mono)",
    color: "rgba(240,235,225,0.6)",
  },

  // ── Episode cards (ingest) ──
  episodeGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  episodeCard: {
    background: "rgba(255,255,255,0.015)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: 12,
    overflow: "hidden",
  },
  episodeHeader: {
    padding: "12px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  podcastArt: {
    width: 36,
    height: 36,
    borderRadius: 8,
    objectFit: "cover",
    flexShrink: 0,
  },
  podcastName: {
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "rgba(240,235,225,0.35)",
    marginBottom: 3,
  },
  episodeTitle: {
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    color: "rgba(240,235,225,0.8)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  matchRow: {
    padding: "10px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    borderBottom: "1px solid rgba(255,255,255,0.02)",
    transition: "background 0.15s ease",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    flexShrink: 0,
    border: "2px solid rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
  },
  matchPoster: {
    width: 36,
    height: 54,
    borderRadius: 4,
    objectFit: "cover",
    flexShrink: 0,
  },
  matchPosterEmpty: {
    width: 36,
    height: 54,
    borderRadius: 4,
    flexShrink: 0,
    background: "rgba(255,255,255,0.04)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    color: "rgba(240,235,225,0.2)",
  },
  matchTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "rgba(240,235,225,0.85)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  matchYear: {
    fontSize: 12,
    color: "rgba(240,235,225,0.4)",
    fontFamily: "var(--font-mono)",
    marginTop: 2,
  },
  alreadyCovered: {
    marginLeft: 10,
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "rgba(240,235,225,0.25)",
  },
  confidencePill: {
    padding: "3px 10px",
    borderRadius: 4,
    border: "1px solid",
    fontSize: 10,
    fontWeight: 800,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    flexShrink: 0,
  },
  rematchBtn: {
    border: "none",
    borderRadius: 6,
    width: 30,
    height: 30,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 15,
    cursor: "pointer",
  },
  rematchPanel: {
    padding: "10px 16px 14px 68px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    background: "rgba(196,115,79,0.03)",
  },
  rematchInput: {
    flex: 1,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    color: "#e4e4e7",
    padding: "7px 12px",
    fontSize: 12,
    outline: "none",
    fontFamily: "var(--font-mono)",
  },
  rematchSearchBtn: {
    padding: "7px 14px",
    borderRadius: 8,
    background: "rgba(196,115,79,0.12)",
    border: "1px solid rgba(196,115,79,0.25)",
    color: "#c4734f",
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    cursor: "pointer",
  },
  rematchResult: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: "4px 10px",
    cursor: "pointer",
    color: "#e4e4e7",
    flexShrink: 0,
  },

  // ── Table (coming soon + dead audio) ──
  tableWrap: {
    overflowX: "auto",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.015)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "10px 14px",
    fontSize: 10,
    fontWeight: 800,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "rgba(240,235,225,0.3)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  tr: {
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  td: {
    padding: "10px 14px",
    verticalAlign: "middle",
  },
  cellTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "rgba(240,235,225,0.8)",
  },
  cellSub: {
    fontSize: 11,
    fontFamily: "var(--font-mono)",
    color: "rgba(240,235,225,0.35)",
    marginTop: 2,
  },
  audioPill: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 4,
    border: "1px solid",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  publishBtn: {
    padding: "5px 12px",
    borderRadius: 6,
    background: "rgba(74,222,128,0.08)",
    border: "1px solid rgba(74,222,128,0.2)",
    color: "#4ade80",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    cursor: "pointer",
  },
  dismissBtn: {
    padding: "5px 12px",
    borderRadius: 6,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(240,235,225,0.5)",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    cursor: "pointer",
  },

  // ── Empty / Loading ──
  emptyState: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "60px 0",
    color: "rgba(240,235,225,0.3)",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  emptyDetail: {
    fontSize: 12,
    fontFamily: "var(--font-mono)",
    marginTop: 6,
    opacity: 0.6,
  },
  spinner: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "2.5px solid rgba(240,235,225,0.1)",
    borderTopColor: "#C4734F",
    animation: "admin-spin 0.8s linear infinite",
  },

  // ── Toast ──
  toast: {
    position: "fixed",
    bottom: 24,
    right: 24,
    padding: "10px 20px",
    borderRadius: 10,
    background: "rgba(196,115,79,0.15)",
    border: "1px solid rgba(196,115,79,0.3)",
    color: "#C4734F",
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    zIndex: 1000,
    animation: "admin-toast-in 0.2s ease",
  },
};
