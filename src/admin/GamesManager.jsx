import { t } from "../theme";
// src/admin/GamesManager.jsx
//
// Games admin: puzzle runway, today's preview, recent results.
// Read-only — puzzles are cron-generated, this is for monitoring.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

const TODAY = () => new Date().toISOString().split("T")[0];
const POSTER = (path) => path ? `https://image.tmdb.org/t/p/w92${path}` : null;

const GAMES = [
  { key: "tf", label: "Triple Feature", accent: t.red, table: "tf_daily_puzzles", results: "tf_daily_results" },
  { key: "rt", label: "Reel Time",      accent: t.cyan, table: "wt_daily_puzzles", results: "wt_daily_results" },
  { key: "cc", label: "Cast Connections", accent: "#a78bfa", table: "cc_daily_puzzles", results: "cc_daily_results" },
];

export default function GamesManager({ session }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [expandedGame, setExpandedGame] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const today = TODAY();

    try {
      const [
        // Runway: last seeded date per game
        { data: tfMax },
        { data: rtMax },
        { data: ccMax },
        // Today's puzzles
        { data: tfToday },
        { data: rtToday },
        { data: ccToday },
        // Total puzzles
        { count: tfCount },
        { count: rtCount },
        { count: ccCount },
        // Total results
        { count: tfPlays },
        { count: rtPlays },
        { count: ccPlays },
        // Recent results (last 20 across all games combined)
        { data: tfRecent },
        { data: rtRecent },
        { data: ccRecent },
      ] = await Promise.all([
        supabase.from("tf_daily_puzzles").select("puzzle_date").order("puzzle_date", { ascending: false }).limit(1),
        supabase.from("wt_daily_puzzles").select("puzzle_date").order("puzzle_date", { ascending: false }).limit(1),
        supabase.from("cc_daily_puzzles").select("puzzle_date").order("puzzle_date", { ascending: false }).limit(1),
        supabase.from("tf_daily_puzzles").select("*").eq("puzzle_date", today).maybeSingle(),
        supabase.from("wt_daily_puzzles").select("*").eq("puzzle_date", today).maybeSingle(),
        supabase.from("cc_daily_puzzles").select("*").eq("puzzle_date", today).maybeSingle(),
        supabase.from("tf_daily_puzzles").select("*", { count: "exact", head: true }),
        supabase.from("wt_daily_puzzles").select("*", { count: "exact", head: true }),
        supabase.from("cc_daily_puzzles").select("*", { count: "exact", head: true }),
        supabase.from("tf_daily_results").select("*", { count: "exact", head: true }),
        supabase.from("wt_daily_results").select("*", { count: "exact", head: true }),
        supabase.from("cc_daily_results").select("*", { count: "exact", head: true }),
        supabase.from("tf_daily_results").select("puzzle_date, user_total, rank, created_at, profiles(username)").order("created_at", { ascending: false }).limit(10),
        supabase.from("wt_daily_results").select("puzzle_date, score, total, perfect, time_seconds, created_at, profiles(username)").order("created_at", { ascending: false }).limit(10),
        supabase.from("cc_daily_results").select("puzzle_date, solved, mistakes, time_seconds, created_at, profiles(username)").order("created_at", { ascending: false }).limit(10),
      ]);

      // Fetch movie details for today's TF puzzle
      let tfMovies = [];
      if (tfToday?.movie_ids?.length) {
        const { data: movies } = await supabase
          .from("tf_movies")
          .select("tmdb_id, title, year, poster_path, revenue")
          .in("tmdb_id", tfToday.movie_ids);
        tfMovies = movies || [];
      }

      // Fetch movie details for today's RT puzzle
      let rtMovies = [];
      if (rtToday?.movie_ids?.length) {
        const { data: movies } = await supabase
          .from("wt_movies")
          .select("tmdb_id, title, year, poster_path")
          .in("tmdb_id", rtToday.movie_ids);
        rtMovies = movies || [];
      }

      const calcRunway = (maxRow) => {
        if (!maxRow?.[0]?.puzzle_date) return { lastDate: null, daysAhead: 0 };
        const last = maxRow[0].puzzle_date;
        const diff = Math.round((new Date(last) - new Date(today)) / 86400000);
        return { lastDate: last, daysAhead: diff };
      };

      setData({
        tf: { runway: calcRunway(tfMax), today: tfToday, movies: tfMovies, totalPuzzles: tfCount || 0, totalPlays: tfPlays || 0, recent: tfRecent || [] },
        rt: { runway: calcRunway(rtMax), today: rtToday, movies: rtMovies, totalPuzzles: rtCount || 0, totalPlays: rtPlays || 0, recent: rtRecent || [] },
        cc: { runway: calcRunway(ccMax), today: ccToday, totalPuzzles: ccCount || 0, totalPlays: ccPlays || 0, recent: ccRecent || [] },
      });
    } catch (err) {
      console.error("[GamesManager] Fetch error:", err);
    }

    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading && !data) {
    return (
      <div style={s.loadingWrap}>
        <div style={s.spinner} />
        <div style={s.loadingText}>Loading games data…</div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Games</h1>
          <div style={s.subtitle}>
            {TODAY()}
            {lastRefresh && <span style={{ marginLeft: 12, opacity: 0.5 }}>refreshed {lastRefresh.toLocaleTimeString()}</span>}
          </div>
        </div>
        <button onClick={fetchAll} disabled={loading} style={s.refreshBtn}>
          {loading ? "…" : "Refresh"}
        </button>
      </div>

      {/* ═══ RUNWAY ═══ */}
      <SectionHeader title="Puzzle Runway" />
      <div style={s.cardRow}>
        {GAMES.map(g => {
          const d = data[g.key];
          const days = d.runway.daysAhead;
          const status = days > 60 ? "good" : days > 14 ? "warn" : "action";
          return (
            <div key={g.key} style={{ ...s.card, borderColor: `${g.accent}25` }}>
              <div style={s.cardHeader}>
                <div style={{ ...s.statusDot, background: statusColor(status), boxShadow: `0 0 8px ${statusColor(status)}60` }} />
                <div style={{ ...s.cardTitle, color: g.accent }}>{g.label}</div>
              </div>
              <div style={s.cardBody}>
                <div style={s.bigNumber}>{days}d</div>
                <div style={s.bigLabel}>
                  seeded through {d.runway.lastDate || "—"}
                </div>
                <div style={{ ...s.bigLabel, marginTop: 6 }}>
                  {d.totalPuzzles} puzzles · {d.totalPlays} plays
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ TODAY'S PUZZLES ═══ */}
      <SectionHeader title="Today's Puzzles" />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {GAMES.map(g => {
          const d = data[g.key];
          const isExpanded = expandedGame === g.key;
          return (
            <div key={g.key} style={s.chartCard}>
              <button
                onClick={() => setExpandedGame(isExpanded ? null : g.key)}
                style={s.expandBtn}
              >
                <span style={{ color: g.accent, fontWeight: 800, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 12 }}>
                  {d.today ? "✓" : "✗"} {g.label}
                </span>
                <span style={{ color: "rgba(240,235,225,0.3)", fontSize: 11 }}>
                  {isExpanded ? "▲" : "▼"}
                </span>
              </button>
              {isExpanded && d.today && (
                <div style={{ padding: "12px 0 4px" }}>
                  {g.key === "tf" && <TFPreview puzzle={d.today} movies={d.movies} />}
                  {g.key === "rt" && <RTPreview puzzle={d.today} movies={d.movies} />}
                  {g.key === "cc" && <CCPreview puzzle={d.today} />}
                </div>
              )}
              {isExpanded && !d.today && (
                <div style={s.emptyState}>No puzzle for today</div>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ RECENT RESULTS ═══ */}
      <SectionHeader title="Recent Results" />
      {GAMES.map(g => {
        const d = data[g.key];
        if (!d.recent.length) return null;
        return (
          <div key={g.key} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.06em", color: g.accent, marginBottom: 8 }}>
              {g.label}
            </div>
            <div style={s.chartCard}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Player</th>
                    <th style={s.th}>Date</th>
                    <th style={{ ...s.th, textAlign: "right" }}>Result</th>
                    <th style={{ ...s.th, textAlign: "right" }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {d.recent.map((r, i) => (
                    <tr key={i}>
                      <td style={s.td}>{r.profiles?.username || "—"}</td>
                      <td style={{ ...s.td, fontFamily: "var(--font-mono)", fontSize: 11 }}>{r.puzzle_date}</td>
                      <td style={{ ...s.td, textAlign: "right", fontFamily: "var(--font-mono)" }}>
                        {g.key === "tf" && `$${(r.user_total || 0).toLocaleString()} (#${r.rank})`}
                        {g.key === "rt" && `${r.score}/${r.total}${r.perfect ? " ★" : ""}`}
                        {g.key === "cc" && `${r.solved ? "Solved" : "Failed"} (${r.mistakes} mistake${r.mistakes !== 1 ? "s" : ""})`}
                      </td>
                      <td style={{ ...s.td, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                        {r.time_seconds ? `${Math.floor(r.time_seconds / 60)}:${String(r.time_seconds % 60).padStart(2, "0")}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ═══════════════════════════════════════════════════
// PUZZLE PREVIEWS
// ═══════════════════════════════════════════════════

function TFPreview({ puzzle, movies }) {
  const movieMap = Object.fromEntries((movies || []).map(m => [m.tmdb_id, m]));
  return (
    <div>
      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.35)", marginBottom: 10 }}>
        Target: ${(puzzle.target || 0).toLocaleString()} · Optimal: ${(puzzle.optimal_total || 0).toLocaleString()} (combo: {(puzzle.optimal_combo || []).join(", ")})
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {(puzzle.movie_ids || []).map((id, i) => {
          const m = movieMap[id];
          return (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "6px 10px", minWidth: 180 }}>
              {m?.poster_path && <img src={POSTER(m.poster_path)} alt="" style={{ width: 32, height: 48, borderRadius: 4, objectFit: "cover" }} />}
              <div>
                <div style={{ fontSize: 12, color: t.cream, fontWeight: 600 }}>{m?.title || `ID: ${id}`}</div>
                <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.35)" }}>
                  {m?.year || ""}{m?.revenue ? ` · $${(m.revenue / 1e6).toFixed(1)}M` : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RTPreview({ puzzle, movies }) {
  const movieMap = Object.fromEntries((movies || []).map(m => [m.tmdb_id, m]));
  return (
    <div>
      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.35)", marginBottom: 10 }}>
        Year: {puzzle.year} · {puzzle.movie_count} movies · Difficulty: {puzzle.difficulty || "—"}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {(puzzle.movie_ids || []).map((id, i) => {
          const m = movieMap[id];
          return (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "6px 10px", minWidth: 140 }}>
              {m?.poster_path && <img src={POSTER(m.poster_path)} alt="" style={{ width: 32, height: 48, borderRadius: 4, objectFit: "cover" }} />}
              <div>
                <div style={{ fontSize: 12, color: t.cream, fontWeight: 600 }}>{m?.title || `ID: ${id}`}</div>
                <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.35)" }}>{m?.year || ""}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CCPreview({ puzzle }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.35)", marginBottom: 10 }}>
        Difficulty: {puzzle.difficulty || "—"}
      </div>
      {puzzle.movies && Array.isArray(puzzle.movies) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {puzzle.movies.map((group, gi) => (
            <div key={gi} style={{
              background: puzzle.colors?.[gi] ? `${puzzle.colors[gi]}15` : "rgba(255,255,255,0.03)",
              border: `1px solid ${puzzle.colors?.[gi] || "rgba(255,255,255,0.06)"}40`,
              borderRadius: 8, padding: "8px 12px", flex: "1 1 200px",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-display)", textTransform: "uppercase", color: puzzle.colors?.[gi] || "#888", marginBottom: 6 }}>
                {group.category || `Group ${gi + 1}`}
              </div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.5)", lineHeight: 1.5 }}>
                {(group.items || []).join(", ")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════
// SUB-COMPONENTS & HELPERS
// ═══════════════════════════════════════════════════

function SectionHeader({ title }) {
  return <div style={s.sectionHeader}>{title}</div>;
}

function statusColor(status) {
  switch (status) {
    case "good": return "#4ade80";
    case "warn": return "#fbbf24";
    case "action": return "#f87171";
    default: return "rgba(240,235,225,0.3)";
  }
}


// ═══════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════

const s = {
  page: { padding: "32px 40px 60px", maxWidth: 1100 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 800, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.04em", color: t.cream, margin: 0 },
  subtitle: { fontSize: 12, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.35)", marginTop: 6 },
  refreshBtn: { padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(196,115,79,0.25)", background: "rgba(196,115,79,0.08)", color: t.terra, fontSize: 12, fontWeight: 700, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer" },
  sectionHeader: { fontSize: 11, fontWeight: 800, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(240,235,225,0.3)", marginTop: 32, marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.04)" },
  cardRow: { display: "flex", gap: 14, flexWrap: "wrap" },
  card: { flex: "1 1 200px", minWidth: 180, maxWidth: 340, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden" },
  cardHeader: { display: "flex", alignItems: "center", gap: 8, padding: "12px 14px 0" },
  cardTitle: { fontSize: 12, fontWeight: 800, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.06em" },
  cardBody: { padding: "10px 14px 14px" },
  bigNumber: { fontSize: 28, fontWeight: 700, fontFamily: "var(--font-mono)", color: t.cream },
  bigLabel: { fontSize: 11, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.4)", marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  chartCard: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 18px" },
  expandBtn: { display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { fontSize: 10, fontWeight: 700, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(240,235,225,0.3)", textAlign: "left", padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  td: { fontSize: 12, color: "rgba(240,235,225,0.6)", padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.03)" },
  emptyState: { textAlign: "center", padding: "24px 0", fontSize: 12, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.25)" },
  loadingWrap: { display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", gap: 12 },
  spinner: { width: 28, height: 28, borderRadius: "50%", border: "2.5px solid rgba(240,235,225,0.1)", borderTopColor: t.terra, animation: "admin-spin 0.8s linear infinite" },
  loadingText: { fontSize: 12, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.3)" },
};
