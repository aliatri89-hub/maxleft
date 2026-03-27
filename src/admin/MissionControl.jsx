import { t } from "../theme";
// src/admin/MissionControl.jsx
//
// Phase 1 admin dashboard: is everything running?
// Checks: game puzzles, ingest queue, episode pipeline, community health, user stats.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

const TODAY = () => new Date().toISOString().split("T")[0];

export default function MissionControl({ session }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const today = TODAY();

    try {
      const [
        // ── Games: today's puzzles exist? ──
        { data: tfToday },
        { data: wtToday },
        { data: ccToday },

        // ── Ingest queue depth ──
        { count: ingestCount },
        { data: ingestSummary },

        // ── Episodes coming soon (future air_date) ──
        { count: comingSoonCount },

        // ── Community health ──
        { count: totalCommunities },
        { count: totalItems },
        { count: totalBadges },
        { count: activeBadges },

        // ── Users ──
        { count: totalUsers },
      ] = await Promise.all([
        // Games today
        supabase.from("tf_daily_puzzles").select("id").eq("puzzle_date", today).maybeSingle(),
        supabase.from("wt_daily_puzzles").select("id").eq("puzzle_date", today).maybeSingle(),
        supabase.from("cc_daily_puzzles").select("id").eq("puzzle_date", today).maybeSingle(),

        // Ingest
        supabase.from("ingest_review_queue").select("*", { count: "exact", head: true }),
        supabase.from("daily_ingest_summary").select("*").order("run_date", { ascending: false }).limit(1),

        // Episodes with future air_date = coming soon
        supabase.from("community_items").select("*", { count: "exact", head: true }).gt("air_date", today),

        // Communities
        supabase.from("community_pages").select("*", { count: "exact", head: true }),
        supabase.from("community_items").select("*", { count: "exact", head: true }),
        supabase.from("badges").select("*", { count: "exact", head: true }),
        supabase.from("badges").select("*", { count: "exact", head: true }).eq("is_active", true),

        // Users
        supabase.from("profiles").select("*", { count: "exact", head: true }),
      ]);

      // ── Items missing posters ──
      const { count: missingPosters } = await supabase
        .from("community_items")
        .select("*", { count: "exact", head: true })
        .is("poster_path", null)
        .not("tmdb_id", "is", null);

      // ── Orphaned items (no miniseries — should be 0) ──
      const { count: orphanedItems } = await supabase
        .from("community_items")
        .select("*", { count: "exact", head: true })
        .is("miniseries_id", null);

      setData({
        games: {
          tripleFeature: { hasToday: !!tfToday },
          reelTime: { hasToday: !!wtToday },
          castConnections: { hasToday: !!ccToday },
        },
        ingest: {
          queueDepth: ingestCount || 0,
          lastRun: ingestSummary?.[0] || null,
        },
        episodes: {
          comingSoon: comingSoonCount || 0,
        },
        community: {
          totalCommunities: totalCommunities || 0,
          totalItems: totalItems || 0,
          totalBadges: totalBadges || 0,
          activeBadges: activeBadges || 0,
          missingPosters: missingPosters || 0,
          orphanedItems: orphanedItems || 0,
        },
        users: {
          total: totalUsers || 0,
        },
      });
    } catch (err) {
      console.error("[MissionControl] Fetch error:", err);
    }

    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading && !data) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner} />
        <div style={styles.loadingText}>Loading mission control…</div>
      </div>
    );
  }

  const d = data;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Mission Control</h1>
          <div style={styles.subtitle}>
            {TODAY()}
            {lastRefresh && (
              <span style={{ marginLeft: 12, opacity: 0.5 }}>
                refreshed {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <button onClick={fetchAll} disabled={loading} style={styles.refreshBtn}>
          {loading ? "…" : "Refresh"}
        </button>
      </div>

      {/* ═══ GAMES STATUS ═══ */}
      <SectionHeader title="Games" />
      <div style={styles.cardRow}>
        <GameCard
          name="Triple Feature"
          hasToday={d.games.tripleFeature.hasToday}
          accent="#e94560"
        />
        <GameCard
          name="Reel Time"
          hasToday={d.games.reelTime.hasToday}
          accent="#22d3ee"
        />
        <GameCard
          name="Cast Connections"
          hasToday={d.games.castConnections.hasToday}
          accent="#a78bfa"
        />
      </div>

      {/* ═══ FEED & INGEST ═══ */}
      <SectionHeader title="Feed & Ingest" />
      <div style={styles.cardRow}>
        <StatCard
          label="Ingest Queue"
          value={d.ingest.queueDepth}
          status={d.ingest.queueDepth === 0 ? "good" : d.ingest.queueDepth <= 5 ? "warn" : "action"}
          detail={d.ingest.queueDepth === 0 ? "All clear" : `${d.ingest.queueDepth} matches awaiting review`}
        />
        <StatCard
          label="Last Ingest Run"
          value={d.ingest.lastRun?.run_date || "—"}
          status={d.ingest.lastRun ? "good" : "warn"}
          detail={d.ingest.lastRun
            ? `${d.ingest.lastRun.total_new_episodes || 0} eps → ${d.ingest.lastRun.total_matches || 0} matches`
            : "No ingest data found"
          }
        />
        <StatCard
          label="Coming Soon"
          value={d.episodes.comingSoon}
          status="neutral"
          detail={`${d.episodes.comingSoon} episodes flagged`}
        />
      </div>

      {/* ═══ COMMUNITY HEALTH ═══ */}
      <SectionHeader title="Community Health" />
      <div style={styles.cardRow}>
        <StatCard
          label="Communities"
          value={d.community.totalCommunities}
          status="neutral"
        />
        <StatCard
          label="Total Items"
          value={d.community.totalItems.toLocaleString()}
          status="neutral"
        />
        <StatCard
          label="Badges"
          value={`${d.community.activeBadges}/${d.community.totalBadges}`}
          status="neutral"
          detail="active / total"
        />
        <StatCard
          label="Missing Posters"
          value={d.community.missingPosters}
          status={d.community.missingPosters === 0 ? "good" : "warn"}
          detail={d.community.missingPosters === 0 ? "All items have posters" : "Items with tmdb_id but no poster"}
        />
        <StatCard
          label="Orphaned Items"
          value={d.community.orphanedItems}
          status={d.community.orphanedItems === 0 ? "good" : "action"}
          detail={d.community.orphanedItems === 0 ? "All items assigned" : "Items with no miniseries!"}
        />
      </div>

      {/* ═══ USERS ═══ */}
      <SectionHeader title="Users" />
      <div style={styles.cardRow}>
        <StatCard
          label="Total Users"
          value={d.users.total}
          status="neutral"
        />
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════

function SectionHeader({ title }) {
  return (
    <div style={styles.sectionHeader}>
      {title}
    </div>
  );
}

function GameCard({ name, hasToday, accent }) {
  return (
    <div style={{
      ...styles.card,
      borderColor: hasToday ? `${accent}30` : "rgba(248,113,113,0.3)",
    }}>
      <div style={styles.cardHeader}>
        <div style={{
          ...styles.statusDot,
          background: hasToday ? t.green : t.red,
          boxShadow: hasToday ? "0 0 8px rgba(74,222,128,0.4)" : "0 0 8px rgba(248,113,113,0.4)",
        }} />
        <div style={{ ...styles.cardTitle, color: accent }}>{name}</div>
      </div>

      <div style={styles.cardBody}>
        <div style={styles.bigNumber}>{hasToday ? "✓" : "✗"}</div>
        <div style={styles.bigLabel}>
          {hasToday ? "Today's puzzle live" : "No puzzle today!"}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, status = "neutral", detail }) {
  return (
    <div style={{
      ...styles.card,
      borderColor: status === "action" ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.06)",
    }}>
      <div style={styles.cardHeader}>
        {status !== "neutral" && (
          <div style={{
            ...styles.statusDot,
            background: statusColor(status),
            boxShadow: `0 0 8px ${statusColor(status)}60`,
          }} />
        )}
        <div style={styles.statLabel}>{label}</div>
      </div>
      <div style={styles.statValue}>{value}</div>
      {detail && <div style={styles.statDetail}>{detail}</div>}
    </div>
  );
}


// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

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
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: t.cream,
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
    color: t.terra,
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    cursor: "pointer",
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
  card: {
    flex: "1 1 200px",
    minWidth: 180,
    maxWidth: 280,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
    overflow: "hidden",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 14px 0",
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 800,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  cardBody: {
    padding: "10px 14px 14px",
  },
  bigNumber: {
    fontSize: 22,
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    color: t.cream,
  },
  bigLabel: {
    fontSize: 11,
    fontFamily: "var(--font-mono)",
    color: "rgba(240,235,225,0.4)",
    marginTop: 2,
  },

  // ── Stat cards ──
  statLabel: {
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "rgba(240,235,225,0.45)",
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    color: t.cream,
    padding: "6px 14px 4px",
  },
  statDetail: {
    fontSize: 10,
    fontFamily: "var(--font-mono)",
    color: "rgba(240,235,225,0.3)",
    padding: "0 14px 12px",
  },

  // ── Status ──
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },

  // ── Loading ──
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
    borderTopColor: t.terra,
    animation: "admin-spin 0.8s linear infinite",
  },
  loadingText: {
    fontSize: 12,
    fontFamily: "var(--font-mono)",
    color: "rgba(240,235,225,0.3)",
  },
};
