// src/admin/AnalyticsDashboard.jsx
//
// Analytics dashboard — behavioral data from analytics_events.
// Uses server-side SQL functions for aggregation.
// Styled to match MissionControl design language.

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../supabase";

const RANGE_OPTIONS = [
  { key: 7,   label: "7d" },
  { key: 30,  label: "30d" },
  { key: 90,  label: "90d" },
  { key: 365, label: "1y" },
];

const EVENT_COLORS = {
  tab_switch:       "#C4734F",
  community_visit:  "#22d3ee",
  episode_play:     "#F5C518",
  episode_complete: "#a3e635",
  media_log:        "#e94560",
  game_played:      "#a78bfa",
  badge_earned:     "#fbbf24",
  feed_mode_switch: "#818cf8",
  search:           "#fb923c",
};

const EVENT_LABELS = {
  tab_switch:       "Tab Switch",
  community_visit:  "Community Visit",
  episode_play:     "Episode Play",
  episode_complete: "Episode Complete",
  media_log:        "Media Log",
  game_played:      "Game Played",
  badge_earned:     "Badge Earned",
  feed_mode_switch: "Feed Mode",
  search:           "Search",
};

const GAME_LABELS = {
  triple_feature:   "Triple Feature",
  reel_time:        "Reel Time",
  cast_connections: "Cast Connections",
};

export default function AnalyticsDashboard({ session }) {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: overview },
        { data: byType },
        { data: daily },
        { data: communities },
        { data: games },
        { data: searches },
        { data: feedModes },
        { data: recent },
      ] = await Promise.all([
        supabase.rpc("analytics_overview", { p_days: days }),
        supabase.rpc("analytics_events_by_type", { p_days: days }),
        supabase.rpc("analytics_daily_counts", { p_days: days }),
        supabase.rpc("analytics_top_communities", { p_days: days }),
        supabase.rpc("analytics_game_stats", { p_days: days }),
        supabase.rpc("analytics_top_searches", { p_days: days }),
        supabase.rpc("analytics_feed_modes", { p_days: days }),
        supabase.rpc("analytics_recent_events", { p_limit: 50 }),
      ]);

      setData({
        overview: overview || {},
        byType: byType || [],
        daily: daily || [],
        communities: communities || [],
        games: games || [],
        searches: searches || [],
        feedModes: feedModes || [],
        recent: recent || [],
      });
    } catch (err) {
      console.error("[Analytics] Fetch error:", err);
    }
    setLoading(false);
    setLastRefresh(new Date());
  }, [days]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading && !data) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner} />
        <div style={styles.loadingText}>Crunching the numbers…</div>
      </div>
    );
  }

  const d = data;
  const maxByType = Math.max(1, ...(d.byType || []).map(r => r.event_count));
  const maxDaily = Math.max(1, ...(d.daily || []).map(r => r.event_count));

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Analytics</h1>
          <div style={styles.subtitle}>
            {lastRefresh && (
              <span style={{ opacity: 0.5 }}>
                refreshed {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Range selector */}
          <div style={styles.rangeBar}>
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setDays(opt.key)}
                style={{
                  ...styles.rangeBtn,
                  ...(days === opt.key ? styles.rangeBtnActive : {}),
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={fetchAll} disabled={loading} style={styles.refreshBtn}>
            {loading ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={styles.tabBar}>
        {[
          { key: "overview", label: "Overview" },
          { key: "engagement", label: "Engagement" },
          { key: "live", label: "Live Stream" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              ...styles.tabBtn,
              ...(activeTab === tab.key ? styles.tabBtnActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <OverviewTab data={d} maxByType={maxByType} maxDaily={maxDaily} days={days} />
      )}
      {activeTab === "engagement" && (
        <EngagementTab data={d} />
      )}
      {activeTab === "live" && (
        <LiveStreamTab events={d.recent} />
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════

function OverviewTab({ data, maxByType, maxDaily, days }) {
  const o = data.overview;

  return (
    <>
      {/* ── KPI Row ── */}
      <SectionHeader title="Key Metrics" />
      <div style={styles.cardRow}>
        <KpiCard label="DAU" value={o.dau || 0} detail="Today" accent="#22d3ee" />
        <KpiCard label="WAU" value={o.wau || 0} detail="Last 7 days" accent="#a78bfa" />
        <KpiCard label="MAU" value={o.mau || 0} detail="Last 30 days" accent="#e94560" />
        <KpiCard label="Events" value={o.total_events || 0} detail={`Last ${days}d`} accent="#C4734F" />
        <KpiCard label="Sessions" value={o.total_sessions || 0} detail={`Last ${days}d`} accent="#fbbf24" />
      </div>

      {/* ── Daily Activity ── */}
      <SectionHeader title={`Daily Activity (${days}d)`} />
      <div style={styles.chartCard}>
        {data.daily.length === 0 ? (
          <div style={styles.emptyState}>No activity data yet</div>
        ) : (
          <div style={styles.barChart}>
            {data.daily.map((row, i) => {
              const pct = (row.event_count / maxDaily) * 100;
              const dateStr = new Date(row.day + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
              return (
                <div key={i} style={styles.barCol} title={`${dateStr}: ${row.event_count} events, ${row.user_count} users`}>
                  <div style={styles.barValue}>{row.event_count}</div>
                  <div style={styles.barTrack}>
                    <div style={{
                      ...styles.barFill,
                      height: `${Math.max(pct, 2)}%`,
                      background: `linear-gradient(180deg, #C4734F, #C4734F80)`,
                    }} />
                  </div>
                  <div style={styles.barLabel}>{dateStr}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Events by Type ── */}
      <SectionHeader title="Events by Type" />
      <div style={styles.chartCard}>
        {data.byType.length === 0 ? (
          <div style={styles.emptyState}>No events recorded yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.byType.map((row, i) => {
              const pct = (row.event_count / maxByType) * 100;
              const color = EVENT_COLORS[row.event_name] || "#888";
              return (
                <div key={i} style={styles.hBarRow}>
                  <div style={styles.hBarLabel}>
                    <span style={{ ...styles.hBarDot, background: color }} />
                    {EVENT_LABELS[row.event_name] || row.event_name}
                  </div>
                  <div style={styles.hBarTrack}>
                    <div style={{
                      ...styles.hBarFill,
                      width: `${Math.max(pct, 1)}%`,
                      background: color,
                    }} />
                  </div>
                  <div style={styles.hBarCount}>{row.event_count}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}


// ═══════════════════════════════════════════════════
// ENGAGEMENT TAB
// ═══════════════════════════════════════════════════

function EngagementTab({ data }) {
  return (
    <>
      {/* ── Communities ── */}
      <SectionHeader title="Top Communities" />
      <div style={styles.chartCard}>
        {data.communities.length === 0 ? (
          <div style={styles.emptyState}>No community visits yet</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Community</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Visits</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Users</th>
              </tr>
            </thead>
            <tbody>
              {data.communities.map((row, i) => (
                <tr key={i}>
                  <td style={styles.td}>
                    <span style={{ ...styles.hBarDot, background: "#22d3ee" }} />
                    {row.slug}
                  </td>
                  <td style={{ ...styles.td, textAlign: "right", fontFamily: "var(--font-mono)" }}>{row.visit_count}</td>
                  <td style={{ ...styles.td, textAlign: "right", fontFamily: "var(--font-mono)" }}>{row.unique_users}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Games ── */}
      <SectionHeader title="Game Stats" />
      <div style={styles.cardRow}>
        {data.games.length === 0 ? (
          <div style={{ ...styles.chartCard, flex: 1 }}>
            <div style={styles.emptyState}>No games played yet</div>
          </div>
        ) : (
          data.games.map((row, i) => (
            <KpiCard
              key={i}
              label={GAME_LABELS[row.game] || row.game}
              value={row.play_count}
              detail={`${row.unique_players} player${row.unique_players !== 1 ? "s" : ""}`}
              accent={
                row.game === "triple_feature" ? "#e94560" :
                row.game === "reel_time" ? "#22d3ee" : "#a78bfa"
              }
            />
          ))
        )}
      </div>

      {/* ── Feed Modes ── */}
      <SectionHeader title="Feed Mode Preference" />
      <div style={styles.chartCard}>
        {data.feedModes.length === 0 ? (
          <div style={styles.emptyState}>No feed mode switches yet</div>
        ) : (
          <div style={{ display: "flex", gap: 24, padding: "4px 0" }}>
            {data.feedModes.map((row, i) => {
              const total = data.feedModes.reduce((s, r) => s + parseInt(r.switch_count), 0);
              const pct = total > 0 ? Math.round((row.switch_count / total) * 100) : 0;
              const colors = { releases: "#22d3ee", podcast: "#F5C518", activity: "#e94560" };
              return (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-mono)", color: colors[row.mode] || "#888" }}>
                    {pct}%
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(240,235,225,0.45)", marginTop: 4 }}>
                    {row.mode}
                  </div>
                  <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.25)", marginTop: 2 }}>
                    {row.switch_count} switches
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Top Searches ── */}
      <SectionHeader title="Top Searches" />
      <div style={styles.chartCard}>
        {data.searches.length === 0 ? (
          <div style={styles.emptyState}>No searches yet</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Query</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Count</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Avg Results</th>
              </tr>
            </thead>
            <tbody>
              {data.searches.map((row, i) => (
                <tr key={i}>
                  <td style={styles.td}>
                    <span style={{ fontFamily: "var(--font-mono)", color: "#fb923c" }}>"{row.query}"</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: "right", fontFamily: "var(--font-mono)" }}>{row.search_count}</td>
                  <td style={{ ...styles.td, textAlign: "right", fontFamily: "var(--font-mono)" }}>{row.avg_results ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}


// ═══════════════════════════════════════════════════
// LIVE STREAM TAB
// ═══════════════════════════════════════════════════

function LiveStreamTab({ events }) {
  return (
    <>
      <SectionHeader title="Recent Events" />
      <div style={styles.chartCard}>
        {events.length === 0 ? (
          <div style={styles.emptyState}>No events yet — use the app to generate data</div>
        ) : (
          <div style={{ maxHeight: 600, overflowY: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Time</th>
                  <th style={styles.th}>Event</th>
                  <th style={styles.th}>Details</th>
                  <th style={styles.th}>Session</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => {
                  const time = new Date(ev.created_at);
                  const color = EVENT_COLORS[ev.event_name] || "#888";
                  const details = formatEventData(ev.event_name, ev.event_data);
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ ...styles.td, whiteSpace: "nowrap", fontSize: 10, color: "rgba(240,235,225,0.35)" }}>
                        {time.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {" "}
                        {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          fontFamily: "var(--font-display)",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          color,
                          background: `${color}15`,
                          border: `1px solid ${color}30`,
                        }}>
                          {EVENT_LABELS[ev.event_name] || ev.event_name}
                        </span>
                      </td>
                      <td style={{ ...styles.td, fontSize: 11, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.5)", maxWidth: 350, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {details}
                      </td>
                      <td style={{ ...styles.td, fontSize: 9, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.2)" }}>
                        {ev.session_id?.slice(0, 8)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}


// ═══════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════

function SectionHeader({ title }) {
  return (
    <div style={styles.sectionHeader}>{title}</div>
  );
}

function KpiCard({ label, value, detail, accent = "#C4734F" }) {
  return (
    <div style={{
      ...styles.kpiCard,
      borderColor: `${accent}25`,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(240,235,225,0.45)", padding: "12px 14px 0" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-mono)", color: accent, padding: "4px 14px 2px" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {detail && (
        <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.3)", padding: "0 14px 12px" }}>
          {detail}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

function formatEventData(eventName, data) {
  if (!data || Object.keys(data).length === 0) return "—";
  switch (eventName) {
    case "tab_switch":
      return `${data.from} → ${data.to}`;
    case "community_visit":
      return data.slug || "—";
    case "episode_play":
      return data.episode_title || "—";
    case "episode_complete":
      return `${data.episode_title} (${Math.round((data.duration_seconds || 0) / 60)}m)`;
    case "media_log":
      return `${data.media_type}: ${data.title}${data.rating ? ` ★${data.rating}` : ""}`;
    case "game_played":
      return `${GAME_LABELS[data.game] || data.game}${data.score != null ? ` — score: ${data.score}` : ""}${data.solved != null ? ` — ${data.solved ? "solved" : "failed"}` : ""}`;
    case "badge_earned":
      return data.badge_name || "—";
    case "feed_mode_switch":
      return `${data.from} → ${data.to}`;
    case "search":
      return `"${data.query}" → ${data.result_count} results`;
    default:
      return JSON.stringify(data).slice(0, 80);
  }
}


// ═══════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════

const styles = {
  page: {
    padding: "32px 40px 60px",
    maxWidth: 1100,
  },

  // ── Header ──
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  subtitle: {
    fontSize: 12,
    fontFamily: "var(--font-mono)",
    color: "rgba(240,235,225,0.35)",
    marginTop: 6,
  },
  refreshBtn: {
    padding: "8px 18px",
    borderRadius: 8,
    border: "1px solid rgba(196,115,79,0.25)",
    background: "rgba(196,115,79,0.08)",
    color: "#C4734F",
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    cursor: "pointer",
  },

  // ── Range selector ──
  rangeBar: {
    display: "flex",
    gap: 2,
    background: "rgba(255,255,255,0.03)",
    borderRadius: 8,
    padding: 2,
  },
  rangeBtn: {
    padding: "6px 14px",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "rgba(240,235,225,0.4)",
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  rangeBtnActive: {
    background: "rgba(196,115,79,0.15)",
    color: "#C4734F",
  },

  // ── Tab bar ──
  tabBar: {
    display: "flex",
    gap: 2,
    marginBottom: 24,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    paddingBottom: 0,
  },
  tabBtn: {
    padding: "10px 20px",
    border: "none",
    borderBottom: "2px solid transparent",
    background: "transparent",
    color: "rgba(240,235,225,0.4)",
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    cursor: "pointer",
    transition: "all 0.15s",
    marginBottom: -1,
  },
  tabBtnActive: {
    color: "#C4734F",
    borderBottomColor: "#C4734F",
  },

  // ── Section ──
  sectionHeader: {
    fontSize: 11,
    fontWeight: 800,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "rgba(240,235,225,0.3)",
    marginTop: 32,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },

  // ── Cards ──
  cardRow: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
  },
  kpiCard: {
    flex: "1 1 160px",
    minWidth: 150,
    maxWidth: 220,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
  },
  chartCard: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: "16px 18px",
  },

  // ── Vertical bar chart ──
  barChart: {
    display: "flex",
    alignItems: "flex-end",
    gap: 3,
    height: 160,
    padding: "0 4px",
  },
  barCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    height: "100%",
    minWidth: 0,
  },
  barValue: {
    fontSize: 9,
    fontFamily: "var(--font-mono)",
    color: "rgba(240,235,225,0.35)",
    marginBottom: 4,
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    width: "100%",
    display: "flex",
    alignItems: "flex-end",
    minHeight: 0,
  },
  barFill: {
    width: "100%",
    borderRadius: "3px 3px 0 0",
    minHeight: 2,
    transition: "height 0.3s ease",
  },
  barLabel: {
    fontSize: 8,
    fontFamily: "var(--font-mono)",
    color: "rgba(240,235,225,0.2)",
    marginTop: 4,
    whiteSpace: "nowrap",
    flexShrink: 0,
    writingMode: "vertical-lr",
    transform: "rotate(180deg)",
    maxHeight: 44,
    overflow: "hidden",
  },

  // ── Horizontal bar chart ──
  hBarRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "4px 0",
  },
  hBarLabel: {
    width: 140,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "var(--font-display)",
    color: "rgba(240,235,225,0.6)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  hBarDot: {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  hBarTrack: {
    flex: 1,
    height: 18,
    background: "rgba(255,255,255,0.03)",
    borderRadius: 4,
    overflow: "hidden",
  },
  hBarFill: {
    height: "100%",
    borderRadius: 4,
    opacity: 0.7,
    transition: "width 0.3s ease",
  },
  hBarCount: {
    width: 50,
    textAlign: "right",
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    color: "rgba(240,235,225,0.5)",
    flexShrink: 0,
  },

  // ── Tables ──
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "rgba(240,235,225,0.3)",
    textAlign: "left",
    padding: "6px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  td: {
    fontSize: 12,
    color: "rgba(240,235,225,0.6)",
    padding: "8px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },

  // ── Empty / Loading ──
  emptyState: {
    textAlign: "center",
    padding: "32px 0",
    fontSize: 12,
    fontFamily: "var(--font-mono)",
    color: "rgba(240,235,225,0.25)",
  },
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    gap: 12,
  },
  spinner: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "2.5px solid rgba(240,235,225,0.1)",
    borderTopColor: "#C4734F",
    animation: "admin-spin 0.8s linear infinite",
  },
  loadingText: {
    fontSize: 12,
    fontFamily: "var(--font-mono)",
    color: "rgba(240,235,225,0.3)",
  },
};
