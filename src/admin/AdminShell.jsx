// src/admin/AdminShell.jsx
//
// Desktop-only admin shell. Sidebar nav + content area.
// Gated to ADMIN_USER_ID. Shows "use desktop" on mobile.

import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "../supabase";

const ADMIN_USER_ID = "19410e64-d610-4fab-9c26-d24fafc94696";

// Lazy-load admin pages
const MissionControl = lazy(() => import("./MissionControl"));
const FeedManager = lazy(() => import("./FeedManager"));
const CommunityManager = lazy(() => import("./CommunityManager"));
const AnalyticsDashboard = lazy(() => import("./AnalyticsDashboard"));
const GamesManager = lazy(() => import("./GamesManager"));
const ConfigFlags = lazy(() => import("./ConfigFlags"));

const NAV_ITEMS = [
  { key: "mission-control", label: "Mission Control", icon: "◉" },
  { key: "feed",            label: "Feed & Ingest",   icon: "◈" },
  { key: "communities",     label: "Communities",      icon: "◆" },
  { key: "games",           label: "Games",            icon: "◇" },
  { key: "analytics",       label: "Analytics",        icon: "◎" },
  { key: "config",          label: "Config & Flags",   icon: "◐" },
];

export default function AdminShell() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("mission-control");

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

  // ── Loading state ──
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

  // ── Mobile gate ──
  const isMobile = typeof window !== "undefined" && window.innerWidth < 900;
  if (isMobile) {
    return (
      <div style={styles.gateWrap}>
        <div style={styles.gateLogo}>M▶NTL</div>
        <div style={styles.gateMessage}>Admin panel is desktop-only</div>
        <div style={{ ...styles.gateDenied, marginTop: 8 }}>
          Open this page on a wider screen.
        </div>
      </div>
    );
  }

  // ── Main layout ──
  return (
    <div style={styles.shell}>
      <style>{`
        @keyframes admin-spin { to { transform: rotate(360deg); } }
        @keyframes admin-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {/* Sidebar */}
      <nav style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>M▶NTL</div>
          <div style={styles.adminBadge}>ADMIN</div>
        </div>

        <div style={styles.navList}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => !item.disabled && setActiveSection(item.key)}
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
        </div>

        <div style={styles.sidebarFooter}>
          <div style={styles.footerEmail}>{session.user.email}</div>
          <button
            onClick={() => { window.location.href = "/"; }}
            style={styles.backToApp}
          >
            ← Back to app
          </button>
        </div>
      </nav>

      {/* Content area */}
      <main style={styles.content}>
        <Suspense fallback={<AdminLoadingFallback />}>
          {activeSection === "mission-control" && (
            <MissionControl session={session} />
          )}
          {activeSection === "feed" && (
            <FeedManager session={session} />
          )}
          {activeSection === "communities" && (
            <CommunityManager session={session} />
          )}
          {activeSection === "games" && (
            <GamesManager session={session} />
          )}
          {activeSection === "analytics" && (
            <AnalyticsDashboard session={session} />
          )}
          {activeSection === "config" && (
            <ConfigFlags session={session} />
          )}
        </Suspense>
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

function PlaceholderSection({ title }) {
  return (
    <div style={{ padding: 48, color: "rgba(240,235,225,0.3)", textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>🚧</div>
      <div style={{ fontSize: 18, fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {title}
      </div>
      <div style={{ fontSize: 13, fontFamily: "var(--font-mono)", marginTop: 8, opacity: 0.6 }}>
        Coming in a future phase
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════

const styles = {
  shell: {
    display: "flex",
    height: "100vh",
    background: "#0f0d0b",
    color: "#f0ebe1",
    fontFamily: "var(--font-body)",
    overflow: "hidden",
  },

  // ── Sidebar ──
  sidebar: {
    width: 240,
    flexShrink: 0,
    background: "#0a0908",
    borderRight: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
    padding: "0",
  },
  sidebarHeader: {
    padding: "24px 20px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    fontSize: 22,
    fontFamily: "'Permanent Marker', cursive",
    color: "#f0ebe1",
    letterSpacing: "0.02em",
  },
  adminBadge: {
    fontSize: 9,
    fontWeight: 800,
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#C4734F",
    background: "rgba(196,115,79,0.12)",
    border: "1px solid rgba(196,115,79,0.25)",
    padding: "2px 8px",
    borderRadius: 4,
  },
  navList: {
    flex: 1,
    padding: "12px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
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
    color: "#f0ebe1",
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
  navLabel: {
    flex: 1,
  },
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

  // ── Content ──
  content: {
    flex: 1,
    overflow: "auto",
    padding: 0,
  },

  // ── Loading / Gate ──
  loadingWrap: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "#0f0d0b",
  },
  loadingSpinner: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "2.5px solid rgba(240,235,225,0.15)",
    borderTopColor: "#C4734F",
    animation: "admin-spin 0.8s linear infinite",
  },
  gateWrap: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "#0f0d0b",
    color: "#f0ebe1",
    gap: 12,
  },
  gateLogo: {
    fontSize: 32,
    fontFamily: "'Permanent Marker', cursive",
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
    color: "#C4734F",
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
