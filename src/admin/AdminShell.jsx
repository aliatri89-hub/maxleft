import { t } from "../theme";
import React from "react";
// src/admin/AdminShell.jsx
//
// Responsive admin shell. Sidebar nav on desktop, hamburger drawer on mobile.
// Gated to ADMIN_USER_ID.

import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { supabase } from "../supabase";

const ADMIN_USER_ID = "19410e64-d610-4fab-9c26-d24fafc94696";
const MOBILE_BREAKPOINT = 768;

// Lazy-load admin pages
const MissionControl     = lazy(() => import("./MissionControl"));
const FeedManager        = lazy(() => import("./FeedManager"));
const CommunityManager   = lazy(() => import("./CommunityManager"));
const AnalyticsDashboard = lazy(() => import("./AnalyticsDashboard"));
const GamesManager       = lazy(() => import("./GamesManager"));
const ConfigFlags        = lazy(() => import("./ConfigFlags"));
const CoverageManager    = lazy(() => import("./CoverageManager"));
const PodcastRequestsManager = lazy(() => import("./PodcastRequestsManager"));

const NAV_ITEMS = [
  { key: "mission-control", label: "Mission Control", icon: "◉" },
  { key: "feed",            label: "Feed & Ingest",   icon: "◈" },
  { key: "communities",     label: "Communities",      icon: "◆" },
  { key: "originals",       label: "Staff Picks",      icon: "▶" },
  { key: "games",           label: "Games",            icon: "◇" },
  { key: "coverage",        label: "Coverage Links",   icon: "⊕" },
  { key: "requests",        label: "Pod Requests",     icon: "◫" },
  { key: "analytics",       label: "Analytics",        icon: "◎" },
  { key: "config",          label: "Config & Flags",   icon: "◐" },
  { key: "dev-tools",       label: "Dev Tools",        icon: "☢" },
];

// ── Reactive window width hook ──────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener("resize", handler, { passive: true });
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

export default function AdminShell() {
  const [session, setSession]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [activeSection, setActiveSection] = useState("mission-control");
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Close drawer when switching to desktop
  useEffect(() => {
    if (!isMobile) setDrawerOpen(false);
  }, [isMobile]);

  const navigate = useCallback((key) => {
    setActiveSection(key);
    setDrawerOpen(false);
  }, []);

  // ── Loading ──
  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loadingSpinner} />
      </div>
    );
  }

  // ── Auth gate ──
  if (!session || session.user.id !== ADMIN_USER_ID) {
    return (
      <div style={styles.gateWrap}>
        <div style={styles.gateLogo}>M▶NTL</div>
        <div style={styles.gateMessage}>Admin access required</div>
        {!session && (
          <button
            onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/admin" } })}
            style={styles.gateButton}
          >
            Sign in with Google
          </button>
        )}
        {session && session.user.id !== ADMIN_USER_ID && (
          <div style={styles.gateDenied}>
            Signed in as {session.user.email} — not an admin.
          </div>
        )}
      </div>
    );
  }

  const activeItem = NAV_ITEMS.find((n) => n.key === activeSection);

  // ── Shared nav items ──
  const NavItems = () => (
    <>
      {NAV_ITEMS.map((item) => (
        <button
          key={item.key}
          onClick={() => !item.disabled && navigate(item.key)}
          disabled={item.disabled}
          style={{
            ...styles.navItem,
            ...(activeSection === item.key ? styles.navItemActive : {}),
            ...(item.disabled ? styles.navItemDisabled : {}),
          }}
        >
          <span style={styles.navIcon}>{item.icon}</span>
          <span style={styles.navLabel}>{item.label}</span>
          {item.disabled && <span style={styles.comingSoon}>soon</span>}
        </button>
      ))}
    </>
  );

  // ── Content panel ──
  const ContentPanel = () => (
    <Suspense fallback={<AdminLoadingFallback />}>
      {activeSection === "mission-control" && <MissionControl session={session} />}
      {activeSection === "feed"            && <FeedManager session={session} />}
      {activeSection === "communities"     && <CommunityManager session={session} />}
      {activeSection === "originals"       && <CommunityManager session={session} lockedSlug="staff-picks" />}
      {activeSection === "games"           && <GamesManager session={session} />}
      {activeSection === "coverage"        && <CoverageManager session={session} />}
      {activeSection === "requests"        && <PodcastRequestsManager session={session} />}
      {activeSection === "analytics"       && <AnalyticsDashboard session={session} />}
      {activeSection === "config"          && <ConfigFlags session={session} />}
      {activeSection === "dev-tools"       && <DevTools session={session} />}
    </Suspense>
  );

  // ════════════════════════════════════════════════
  // MOBILE LAYOUT
  // ════════════════════════════════════════════════
  if (isMobile) {
    return (
      <div style={styles.mobileShell}>
        <style>{`
          @keyframes admin-spin      { to { transform: rotate(360deg); } }
          @keyframes admin-toast-in  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes drawer-slide-in { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        `}</style>

        {/* Mobile top bar */}
        <div style={styles.mobileTopBar}>
          <button style={styles.hamburger} onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <span style={styles.hamburgerLine} />
            <span style={styles.hamburgerLine} />
            <span style={styles.hamburgerLine} />
          </button>
          <div style={styles.mobileTitle}>
            <span style={styles.mobileLogo}>M▶NTL</span>
            <span style={styles.mobileSection}>{activeItem?.icon} {activeItem?.label}</span>
          </div>
          <div style={styles.adminBadge}>ADMIN</div>
        </div>

        {/* Drawer overlay */}
        {drawerOpen && (
          <div style={styles.drawerOverlay} onClick={() => setDrawerOpen(false)}>
            <nav style={styles.drawer} onClick={(e) => e.stopPropagation()}>
              <div style={styles.drawerHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={styles.logo}>M▶NTL</div>
                  <div style={styles.adminBadge}>ADMIN</div>
                </div>
                <button style={styles.drawerClose} onClick={() => setDrawerOpen(false)} aria-label="Close menu">✕</button>
              </div>
              <div style={styles.navList}>
                <NavItems />
              </div>
              <div style={styles.sidebarFooter}>
                <div style={styles.footerEmail}>{session.user.email}</div>
                <button onClick={() => { window.location.href = "/"; }} style={styles.backToApp}>
                  ← Back to app
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Mobile content */}
        <main style={styles.mobileContent}>
          <ContentPanel />
        </main>
      </div>
    );
  }

  // ════════════════════════════════════════════════
  // DESKTOP LAYOUT (unchanged)
  // ════════════════════════════════════════════════
  return (
    <div style={styles.shell}>
      <style>{`
        @keyframes admin-spin     { to { transform: rotate(360deg); } }
        @keyframes admin-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <nav style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>M▶NTL</div>
          <div style={styles.adminBadge}>ADMIN</div>
        </div>
        <div style={styles.navList}>
          <NavItems />
        </div>
        <div style={styles.sidebarFooter}>
          <div style={styles.footerEmail}>{session.user.email}</div>
          <button onClick={() => { window.location.href = "/"; }} style={styles.backToApp}>
            ← Back to app
          </button>
        </div>
      </nav>

      <main style={styles.content}>
        <ContentPanel />
      </main>
    </div>
  );
}

function AdminLoadingFallback() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "rgba(240,235,225,0.3)" }}>
      <div style={styles.loadingSpinner} />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════

const styles = {
  // ── Desktop shell (flex row) ──
  shell: {
    display: "flex",
    flexDirection: "row",
    height: "100vh",
    background: t.bgPrimary,
    color: t.cream,
    fontFamily: "var(--font-body)",
    overflow: "hidden",
  },

  // ── Mobile shell (flex column) ──
  mobileShell: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: t.bgPrimary,
    color: t.cream,
    fontFamily: "var(--font-body)",
    overflow: "hidden",
  },

  // ── Desktop sidebar ──
  sidebar: {
    width: 240,
    flexShrink: 0,
    background: "#0a0908",
    borderRight: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
  },
  sidebarHeader: {
    padding: "24px 20px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  // ── Mobile top bar ──
  mobileTopBar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "0 16px",
    height: 56,
    flexShrink: 0,
    background: "#0a0908",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    zIndex: 10,
  },
  hamburger: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px 2px",
    flexShrink: 0,
  },
  hamburgerLine: {
    display: "block",
    width: 22,
    height: 2,
    borderRadius: 2,
    background: "rgba(240,235,225,0.7)",
  },
  mobileTitle: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 1,
    overflow: "hidden",
  },
  mobileLogo: {
    fontSize: 14,
    fontFamily: t.fontSharpie,
    color: t.cream,
    lineHeight: 1,
  },
  mobileSection: {
    fontSize: 11,
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    color: "rgba(240,235,225,0.45)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  // ── Drawer overlay + panel ──
  drawerOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 200,
    display: "flex",
  },
  drawer: {
    width: 260,
    maxWidth: "80vw",
    background: "#0a0908",
    borderRight: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    flexDirection: "column",
    animation: "drawer-slide-in 0.22s ease",
    height: "100%",
  },
  drawerHeader: {
    padding: "18px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  drawerClose: {
    background: "none",
    border: "none",
    color: "rgba(240,235,225,0.4)",
    fontSize: 16,
    cursor: "pointer",
    padding: "4px 8px",
    lineHeight: 1,
  },

  // ── Mobile content ──
  mobileContent: {
    flex: 1,
    overflow: "auto",
    WebkitOverflowScrolling: "touch",
  },

  // ── Desktop content ──
  content: {
    flex: 1,
    overflow: "auto",
    padding: 0,
  },

  // ── Shared nav ──
  navList: {
    flex: 1,
    padding: "12px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    overflowY: "auto",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 12px",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    color: "rgba(240,235,225,0.55)",
    fontSize: 13,
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    letterSpacing: "0.02em",
    cursor: "pointer",
    transition: "all 0.15s ease",
    textAlign: "left",
    width: "100%",
  },
  navItemActive: {
    background: "rgba(196,115,79,0.1)",
    color: t.cream,
    border: "none",
  },
  navItemDisabled: {
    opacity: 0.35,
    cursor: "default",
  },
  navIcon: {
    fontSize: 14,
    width: 20,
    textAlign: "center",
    flexShrink: 0,
  },
  navLabel: { flex: 1 },
  comingSoon: {
    fontSize: 8,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "rgba(240,235,225,0.25)",
    fontFamily: "var(--font-mono)",
  },
  sidebarFooter: {
    padding: "16px 20px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  footerEmail: {
    fontSize: 10,
    fontFamily: "var(--font-mono)",
    color: "rgba(240,235,225,0.25)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    marginBottom: 10,
  },
  backToApp: {
    fontSize: 11,
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    color: "rgba(240,235,225,0.4)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    textAlign: "left",
  },

  // ── Shared ──
  logo: {
    fontSize: 22,
    fontFamily: t.fontSharpie,
    color: t.cream,
    letterSpacing: "0.02em",
  },
  adminBadge: {
    fontSize: 9,
    fontWeight: 800,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: t.terra,
    background: "rgba(196,115,79,0.12)",
    border: "1px solid rgba(196,115,79,0.25)",
    padding: "2px 8px",
    borderRadius: 4,
  },
  loadingWrap: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: t.bgPrimary,
  },
  loadingSpinner: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "2.5px solid rgba(240,235,225,0.15)",
    borderTopColor: t.terra,
    animation: "admin-spin 0.8s linear infinite",
  },
  gateWrap: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: t.bgPrimary,
    color: t.cream,
    gap: 12,
  },
  gateLogo: {
    fontSize: 32,
    fontFamily: t.fontSharpie,
    marginBottom: 8,
  },
  gateMessage: {
    fontSize: 15,
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    color: "rgba(240,235,225,0.5)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  gateButton: {
    marginTop: 12,
    padding: "10px 24px",
    borderRadius: 8,
    border: "1px solid rgba(196,115,79,0.3)",
    background: "rgba(196,115,79,0.1)",
    color: t.terra,
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "var(--font-display)",
    cursor: "pointer",
    letterSpacing: "0.03em",
  },
  gateDenied: {
    fontSize: 12,
    fontFamily: "var(--font-mono)",
    color: "rgba(240,235,225,0.3)",
  },
};

function DevTools({ session }) {
  const [wiping, setWiping] = React.useState(false);
  const [result, setResult] = React.useState(null);

  const handleWipe = async () => {
    if (!window.confirm("Wipe ALL your data? This cannot be undone.")) return;
    setWiping(true);
    setResult(null);
    try {
      const uid = session?.user?.id;
      if (!uid) throw new Error("No user session");
      const { supabase } = await import("../supabase");
      const tables = [
        ["user_media_logs", "user_id"],
        ["community_user_progress", "user_id"],
        ["user_community_subscriptions", "user_id"],
        ["user_podcast_favorites", "user_id"],
        ["user_badges", "user_id"],
        ["user_notifications", "user_id"],
        ["feed_activity", "user_id"],
        ["wishlist", "user_id"],
        ["cc_daily_results", "user_id"],
        ["tf_daily_results", "user_id"],
        ["wt_daily_results", "user_id"],
      ];
      for (const [table, col] of tables) {
        await supabase.from(table).delete().eq(col, uid);
      }
      await supabase.from("profiles").update({
        username: null,
        letterboxd_username: null,
        letterboxd_etag: null,
        letterboxd_last_modified: null,
        letterboxd_last_synced_at: null,
        setup_complete: false,
      }).eq("id", uid);
      setResult({ ok: true, msg: "Wiped. You're a clean slate — reload the app to re-onboard." });
    } catch (e) {
      setResult({ ok: false, msg: e.message });
    } finally {
      setWiping(false);
    }
  };

  return (
    <div style={{ padding: 32, maxWidth: 480 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        ☢ Dev Tools
      </h2>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(240,235,225,0.4)", marginBottom: 32 }}>
        Danger zone. For testing only.
      </p>
      <div style={{ background: "rgba(220,60,60,0.06)", border: "1px solid rgba(220,60,60,0.25)", borderRadius: 12, padding: 24 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8, color: "#e05555" }}>
          Wipe My Data
        </div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(240,235,225,0.5)", marginBottom: 20, lineHeight: 1.5 }}>
          Deletes all logs, progress, badges, notifications, subscriptions, and profile for <strong>{session?.user?.email}</strong>.
        </p>
        <button
          onClick={handleWipe}
          disabled={wiping}
          style={{
            background: wiping ? "rgba(220,60,60,0.3)" : "rgba(220,60,60,0.15)",
            border: "1px solid rgba(220,60,60,0.4)",
            color: "#e05555",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            padding: "10px 20px",
            borderRadius: 8,
            cursor: wiping ? "not-allowed" : "pointer",
          }}
        >
          {wiping ? "Wiping..." : "☢ Wipe My Data"}
        </button>
        {result && (
          <div style={{ marginTop: 16, fontFamily: "var(--font-body)", fontSize: 13, color: result.ok ? "#5a9e6f" : "#e05555" }}>
            {result.msg}
          </div>
        )}
      </div>
    </div>
  );
}
