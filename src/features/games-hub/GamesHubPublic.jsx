import { t } from "../../theme";
// src/features/games-hub/GamesHubPublic.jsx
//
// Public (ungated) games page at mymantl.app/play.
// All games playable without auth. Badges shown as teaser/funnel.
// Results stored in localStorage only.
//
import { useState, useEffect, useCallback, lazy, Suspense } from "react";

const TripleFeature = lazy(() => import("../triple-feature/TripleFeature"));
const ReelTime = lazy(() => import("../reel-time/ReelTime"));
const CastConnections = lazy(() => import("../cast-connections/CastConnections"));

// Public hooks — localStorage only, no auth
import { useTripleFeaturePublic } from "../triple-feature/useTripleFeaturePublic";
import { useReelTimePublic } from "../reel-time/useReelTimePublic";
import { useCastConnectionsPublic } from "../cast-connections/useCastConnectionsPublic";

// ── Quick status checks from localStorage ──

function getTfStatus() {
  try {
    const raw = localStorage.getItem("tf_result");
    if (!raw) return "available";
    const saved = JSON.parse(raw);
    const today = new Date().toISOString().split("T")[0];
    return saved.puzzleDate === today ? "completed" : "available";
  } catch { return "available"; }
}

function getRtStatus() {
  try {
    const raw = localStorage.getItem("rt_result");
    if (!raw) return "available";
    const saved = JSON.parse(raw);
    const today = new Date().toISOString().split("T")[0];
    return saved.puzzleDate === today ? "completed" : "available";
  } catch { return "available"; }
}

function getCcStatus() {
  try {
    const raw = localStorage.getItem("cc_result");
    if (!raw) return "available";
    const saved = JSON.parse(raw);
    const today = new Date().toISOString().split("T")[0];
    return saved.puzzleDate === today ? "completed" : "available";
  } catch { return "available"; }
}

// ── Day/date formatting ──

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getTodayFormatted() {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// ── SVG Icons (same as GamesHub) ──

function TripleFeatureIcon({ color }) {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <rect x="2" y="4" width="7" height="10" rx="1.5" stroke={color} strokeWidth="1.5" fill="none" />
      <rect x="10.5" y="2" width="7" height="10" rx="1.5" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.15" />
      <rect x="19" y="4" width="7" height="10" rx="1.5" stroke={color} strokeWidth="1.5" fill="none" />
      <path d="M5.5 18 L14 24 L22.5 18" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CastConnectionsIcon({ color }) {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="3" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.3" fill={color} fillOpacity="0.15" />
      <rect x="11" y="3" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.3" fill="none" />
      <rect x="19" y="3" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.3" fill="none" />
      <rect x="3" y="11" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.3" fill="none" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.3" fill={color} fillOpacity="0.15" />
      <rect x="19" y="11" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.3" fill="none" />
      <rect x="3" y="19" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.3" fill="none" />
      <rect x="11" y="19" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.3" fill="none" />
      <rect x="19" y="19" width="6" height="6" rx="1.5" stroke={color} strokeWidth="1.3" fill={color} fillOpacity="0.15" />
    </svg>
  );
}

function ReelTimeIcon({ color }) {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="15" r="10" stroke={color} strokeWidth="1.5" fill="none" />
      <circle cx="14" cy="15" r="1.5" fill={color} />
      <line x1="14" y1="15" x2="14" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="15" x2="19" y2="17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="3" x2="16" y2="3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="3" x2="14" y2="5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const ICONS = {
  tripleFeature: TripleFeatureIcon,
  castConnections: CastConnectionsIcon,
  reelTime: ReelTimeIcon,
};

// ── External games (same as GamesHub) ──

const EXTERNAL_GAMES = [
  { id: "framed", name: "Framed", tagline: "Guess the movie from stills", url: "https://framed.wtf" },
  { id: "cinematrix", name: "Cinematrix", tagline: "Fill the film grid", url: "https://www.vulture.com/article/daily-movie-grid-trivia-game-cinematrix.html" },
  { id: "boxOffice", name: "Box Office Game", tagline: "Guess the weekend top 5", url: "https://boxofficega.me" },
];

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M6 3H4C3.44772 3 3 3.44772 3 4V12C3 12.5523 3.44772 13 4 13H12C12.5523 13 13 12.5523 13 12V10" stroke="#6b6256" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 3H13V7" stroke="#6b6256" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 3L8 8" stroke="#6b6256" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function FramedIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <rect x="2" y="5" width="22" height="16" rx="2" fill="#8b1a1a" />
      <text x="13" y="18" textAnchor="middle" fontFamily="'Bebas Neue', sans-serif" fontSize="16" fontWeight="bold" fill="#f5f0e8">F</text>
    </svg>
  );
}

function CinematrixIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <path d="M5 13C5 10 7 8 9.5 8C12 8 13 10 13 13C13 16 14 18 16.5 18C19 18 21 16 21 13C21 10 19 8 16.5 8C14 8 13 10 13 13C13 16 12 18 9.5 18C7 18 5 16 5 13Z"
        stroke="#8a7e6b" strokeWidth="1.8" fill="none" />
      <rect x="6" y="10.5" width="2" height="1.5" rx="0.5" fill="#8a7e6b" opacity="0.5" />
      <rect x="6" y="14" width="2" height="1.5" rx="0.5" fill="#8a7e6b" opacity="0.5" />
      <rect x="18" y="10.5" width="2" height="1.5" rx="0.5" fill="#8a7e6b" opacity="0.5" />
      <rect x="18" y="14" width="2" height="1.5" rx="0.5" fill="#8a7e6b" opacity="0.5" />
    </svg>
  );
}

function BoxOfficeIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <rect x="3" y="5" width="20" height="16" rx="2" stroke="#8a7e6b" strokeWidth="1.5" fill="none" />
      <circle cx="7" cy="5" r="1" fill="#8a7e6b" opacity="0.6" />
      <circle cx="11" cy="5" r="1" fill="#8a7e6b" opacity="0.4" />
      <circle cx="15" cy="5" r="1" fill="#8a7e6b" opacity="0.6" />
      <circle cx="19" cy="5" r="1" fill="#8a7e6b" opacity="0.4" />
      <circle cx="7" cy="21" r="1" fill="#8a7e6b" opacity="0.4" />
      <circle cx="11" cy="21" r="1" fill="#8a7e6b" opacity="0.6" />
      <circle cx="15" cy="21" r="1" fill="#8a7e6b" opacity="0.4" />
      <circle cx="19" cy="21" r="1" fill="#8a7e6b" opacity="0.6" />
      <circle cx="3" cy="9" r="1" fill="#8a7e6b" opacity="0.5" />
      <circle cx="3" cy="13" r="1" fill="#8a7e6b" opacity="0.5" />
      <circle cx="3" cy="17" r="1" fill="#8a7e6b" opacity="0.5" />
      <circle cx="23" cy="9" r="1" fill="#8a7e6b" opacity="0.5" />
      <circle cx="23" cy="13" r="1" fill="#8a7e6b" opacity="0.5" />
      <circle cx="23" cy="17" r="1" fill="#8a7e6b" opacity="0.5" />
      <text x="13" y="18" textAnchor="middle" fontFamily="'Bebas Neue', sans-serif" fontSize="14" fontWeight="bold" fill="#8a7e6b">B</text>
    </svg>
  );
}

const EXTERNAL_ICONS = {
  framed: FramedIcon,
  cinematrix: CinematrixIcon,
  boxOffice: BoxOfficeIcon,
};

// ── Game definitions ──

const GAMES = [
  {
    id: "tripleFeature",
    name: "Triple Feature",
    tagline: "Daily box office game",
    color: "#c9a84c",
    bgAccent: "rgba(201, 168, 76, 0.06)",
    daily: true,
  },
  {
    id: "castConnections",
    name: "Cast Connections",
    tagline: "Group actors by movie",
    color: "#e8927c",
    bgAccent: "rgba(232, 146, 124, 0.06)",
    daily: true,
  },
  {
    id: "reelTime",
    name: "Reel Time",
    tagline: "Order the releases",
    color: t.cyan,
    bgAccent: "rgba(124, 184, 232, 0.06)",
    daily: true,
  },
];

// ── Styles ──

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:wght@400;700;900&family=IBM+Plex+Mono:wght@400;700&display=swap');
@keyframes gh-card-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes badge-shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
`;

// ── Public hooks map ──

const PUBLIC_HOOKS = {
  tripleFeature: useTripleFeaturePublic,
  reelTime: useReelTimePublic,
  castConnections: useCastConnectionsPublic,
};

// ── Component ──

export default function GamesHubPublic() {
  const [loaded, setLoaded] = useState(false);
  const [pressedId, setPressedId] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  const [gameStatuses, setGameStatuses] = useState({
    tripleFeature: "available",
    reelTime: "available",
    castConnections: "available",
  });

  useEffect(() => {
    setTimeout(() => setLoaded(true), 50);
    // Check localStorage for completed games
    setGameStatuses({
      tripleFeature: getTfStatus(),
      reelTime: getRtStatus(),
      castConnections: getCcStatus(),
    });
  }, []);

  // Refresh statuses when returning from a game
  const returnToHub = useCallback(() => {
    setActiveGame(null);
    setGameStatuses({
      tripleFeature: getTfStatus(),
      reelTime: getRtStatus(),
      castConnections: getCcStatus(),
    });
  }, []);

  // In-game back button — just pop history, popstate handler does the rest
  const handleBack = useCallback(() => {
    window.history.back();
  }, []);

  // Launch a game — push history so back gesture returns to hub
  function launchGame(gameId) {
    window.history.pushState({ game: gameId }, "", "/play");
    setActiveGame(gameId);
  }

  // Listen for browser back gesture (popstate)
  useEffect(() => {
    function onPopState() {
      if (activeGame) {
        returnToHub();
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [activeGame, returnToHub]);

  // ── Render active game ──

  if (activeGame === "tripleFeature") {
    return (
      <Suspense fallback={<div style={{ background: t.bgPrimary, height: "100vh" }} />}>
        <TripleFeature session={null} onBack={handleBack} onToast={() => {}} useHook={PUBLIC_HOOKS.tripleFeature} />
      </Suspense>
    );
  }
  if (activeGame === "reelTime") {
    return (
      <Suspense fallback={<div style={{ background: t.bgPrimary, height: "100vh" }} />}>
        <ReelTime session={null} onBack={handleBack} onToast={() => {}} useHook={PUBLIC_HOOKS.reelTime} />
      </Suspense>
    );
  }
  if (activeGame === "castConnections") {
    return (
      <Suspense fallback={<div style={{ background: t.bgPrimary, height: "100vh" }} />}>
        <CastConnections session={null} onBack={handleBack} onToast={() => {}} useHook={PUBLIC_HOOKS.castConnections} />
      </Suspense>
    );
  }

  // ── Render Hub ──

  function StatusPill({ gameId, color }) {
    const status = gameStatuses[gameId];
    if (status === "completed") {
      return (
        <span style={{
          fontFamily: t.fontSerif, fontSize: 11, fontWeight: 700, padding: "3px 8px",
          borderRadius: 6, background: "rgba(76,175,80,0.15)", color: "#4caf50",
        }}>
          ✓ Done
        </span>
      );
    }
    return (
      <span style={{
        fontFamily: t.fontSerif, fontSize: 11, fontWeight: 700, padding: "3px 8px",
        borderRadius: 6, background: `${color}20`, color,
      }}>
        Play
      </span>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: t.bgPrimary, color: t.cream,
      fontFamily: t.fontBody, padding: "0 16px 40px",
      maxWidth: 480, margin: "0 auto", position: "relative",
      paddingTop: "var(--sat)",
    }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{
        textAlign: "center", padding: "24px 0 20px",
        opacity: loaded ? 1 : 0, transform: `translateY(${loaded ? 0 : -8}px)`,
        transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}>
        <div style={{
          fontFamily: t.fontHeadline, fontSize: 13,
          letterSpacing: 4, textTransform: "uppercase", color: t.creamMuted, marginBottom: 4,
        }}>
          M▶NTL
        </div>
        <h1 style={{
          fontFamily: t.fontHeadline, fontSize: 40, letterSpacing: 2, color: t.cream, lineHeight: 1.1,
        }}>
          Games
        </h1>
        <div style={{ fontSize: 13, color: t.creamMuted, marginTop: 6 }}>{getTodayFormatted()}</div>
      </div>

      {/* Badges teaser — locked state with CTA */}
      <button
        onClick={() => window.open("https://mymantl.app", "_self")}
        onPointerDown={() => setPressedId("badges")}
        onPointerUp={() => setPressedId(null)}
        onPointerLeave={() => setPressedId(null)}
        style={{
          display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
          background: "rgba(212, 168, 83, 0.04)",
          border: "1px solid rgba(245,240,232,0.06)",
          borderRadius: 14, cursor: "pointer", textAlign: "left", width: "100%",
          position: "relative", overflow: "hidden",
          fontFamily: "inherit", color: "inherit", outline: "none",
          WebkitTapHighlightColor: "transparent",
          transform: pressedId === "badges" ? "scale(0.98)" : "scale(1)",
          transition: "transform 0.15s ease",
          animation: "gh-card-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 100ms backwards",
        }}
      >
        <div style={{ flexShrink: 0, position: "relative" }}>
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none" style={{ opacity: 0.5 }}>
            <path d="M14 3L17 9.5L24 10.5L19 15.5L20 22.5L14 19.5L8 22.5L9 15.5L4 10.5L11 9.5L14 3Z"
              stroke="#d4a853" strokeWidth="1.5" fill="#d4a853" fillOpacity="0.15"
              strokeLinejoin="round" />
          </svg>
          {/* Lock icon overlay */}
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"
            style={{ position: "absolute", bottom: -2, right: -2 }}>
            <rect x="2" y="5" width="8" height="6" rx="1" fill="#6b6256" />
            <path d="M4 5V3.5C4 2.12 5.12 1 6.5 1V1C7.88 1 9 2.12 9 3.5V5" stroke="#6b6256" strokeWidth="1.2" fill="none" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
          <div style={{
            fontFamily: t.fontSerif, fontSize: 18, fontWeight: 700,
            color: t.cream, lineHeight: 1.2, opacity: 0.7,
          }}>
            Badges
          </div>
          <div style={{ fontSize: 13, color: "rgba(245,240,235,0.75)", marginTop: 2, lineHeight: 1.35 }}>
            A scavenger hunt through your favorite podcasts.
          </div>
        </div>
        <span style={{
          fontFamily: t.fontSerif, fontSize: 10, fontWeight: 700, padding: "3px 8px",
          borderRadius: 6, background: "rgba(212, 168, 83, 0.12)", color: "#d4a853",
          letterSpacing: 0.5,
        }}>
          Sign Up
        </span>
      </button>

      {/* Our Games */}
      <div style={{
        fontSize: 10, textTransform: "uppercase", letterSpacing: 3,
        color: t.creamMuted, margin: "20px 0 10px 4px",
        opacity: loaded ? 1 : 0, transition: "opacity 0.4s ease 0.3s",
      }}>
        Daily Games
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {GAMES.map((game, i) => {
          const Icon = ICONS[game.id];
          const isDone = gameStatuses[game.id] === "completed";
          return (
            <button
              key={game.id}
              onClick={() => launchGame(game.id)}
              onPointerDown={() => setPressedId(game.id)}
              onPointerUp={() => setPressedId(null)}
              onPointerLeave={() => setPressedId(null)}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                background: game.bgAccent,
                border: "1px solid rgba(245,240,232,0.06)",
                borderRadius: 14, cursor: "pointer", textAlign: "left", width: "100%",
                position: "relative", overflow: "hidden",
                fontFamily: "inherit", color: "inherit", outline: "none",
                WebkitTapHighlightColor: "transparent",
                opacity: isDone ? 0.55 : 1,
                transform: pressedId === game.id ? "scale(0.98)" : "scale(1)",
                transition: "transform 0.15s ease, opacity 0.2s ease",
                animation: `gh-card-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 100 + 100}ms backwards`,
              }}
            >
              <div style={{ flexShrink: 0, position: "relative" }}>
                {Icon && <Icon color={game.color} />}
                {game.isNew && (
                  <span style={{
                    position: "absolute", top: -6, right: -10,
                    fontFamily: t.fontBody, fontWeight: 700, fontSize: 8, letterSpacing: 1,
                    color: t.bgPrimary, background: "#a8d870",
                    padding: "2px 4px", borderRadius: 3, transform: "rotate(8deg)",
                  }}>
                    NEW
                  </span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
                <div style={{
                  fontFamily: t.fontSerif, fontSize: 18, fontWeight: 700,
                  color: t.cream, lineHeight: 1.2,
                }}>
                  {game.name}
                </div>
                <div style={{ fontSize: 13, color: "rgba(245,240,235,0.75)", marginTop: 2 }}>{game.tagline}</div>
              </div>

              <StatusPill gameId={game.id} color={game.color} />

              <div style={{
                position: "absolute", right: 14, top: "50%",
                width: 7, height: 7, borderRight: "1.5px solid #6b6256", borderBottom: "1.5px solid #6b6256",
                transform: "translateY(-50%) rotate(-45deg)",
              }} />
            </button>
          );
        })}
      </div>

      {/* Other Games */}
      <div style={{
        fontSize: 10, textTransform: "uppercase", letterSpacing: 3,
        color: t.creamMuted, margin: "24px 0 10px 4px",
        opacity: loaded ? 1 : 0, transition: "opacity 0.4s ease 0.4s",
      }}>
        Other Games
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {EXTERNAL_GAMES.map((game, i) => (
          <button
            key={game.id}
            onClick={() => {
              if (window.Capacitor?.isNativePlatform?.()) {
                import("@capacitor/browser").then(({ Browser }) => Browser.open({ url: game.url })).catch(() => window.open(game.url, "_blank"));
              } else {
                window.open(game.url, "_blank", "noopener");
              }
            }}
            onPointerDown={() => setPressedId(game.id)}
            onPointerUp={() => setPressedId(null)}
            onPointerLeave={() => setPressedId(null)}
            style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
              background: "rgba(138,126,107,0.04)",
              border: "1px solid rgba(245,240,232,0.06)",
              borderRadius: 14, cursor: "pointer", textAlign: "left", width: "100%",
              position: "relative", overflow: "hidden",
              fontFamily: "inherit", color: "inherit", outline: "none",
              WebkitTapHighlightColor: "transparent",
              transform: pressedId === game.id ? "scale(0.98)" : "scale(1)",
              transition: "transform 0.15s ease",
              animation: `gh-card-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${(i + GAMES.length) * 100 + 100}ms backwards`,
            }}
          >
            <div style={{ flexShrink: 0 }}>
              {(() => { const Icon = EXTERNAL_ICONS[game.id]; return Icon ? <Icon /> : null; })()}
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
              <div style={{
                fontFamily: t.fontSerif, fontSize: 18, fontWeight: 700,
                color: t.cream, lineHeight: 1.2,
              }}>
                {game.name}
              </div>
              <div style={{ fontSize: 13, color: "rgba(245,240,235,0.75)", marginTop: 2 }}>{game.tagline}</div>
            </div>
            <ExternalLinkIcon />
          </button>
        ))}
      </div>

      {/* CTA banner */}
      <div style={{
        marginTop: 32, padding: "20px 16px", borderRadius: 14,
        background: "linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(232,146,124,0.06) 100%)",
        border: "1px solid rgba(245,240,232,0.08)",
        textAlign: "center",
        animation: "gh-card-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 600ms backwards",
      }}>
        <div style={{
          fontFamily: t.fontSerif, fontSize: 16, fontWeight: 700,
          color: t.cream, marginBottom: 6,
        }}>
          Track your stats. Earn badges. Join the community.
        </div>
        <div style={{ fontSize: 12, color: t.creamMuted, marginBottom: 14, lineHeight: 1.4 }}>
          Sign up for MANTL to save your game history, compete on streaks, and unlock badges across your favorite film franchises.
        </div>
        <button
          onClick={() => window.open("https://mymantl.app", "_self")}
          style={{
            fontFamily: t.fontSerif, fontSize: 14, fontWeight: 700,
            color: t.bgPrimary, background: "#c9a84c", border: "none",
            padding: "10px 28px", borderRadius: 8, cursor: "pointer",
            letterSpacing: 0.5,
          }}
        >
          Sign Up Free
        </button>
      </div>
    </div>
  );
}
