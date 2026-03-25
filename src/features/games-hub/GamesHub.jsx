// src/features/games-hub/GamesHub.jsx
//
// Full-screen Games hub page. Rendered by App.jsx when showGamesHub === true.
// Props: session, onBack, onLaunchGame, gameStatuses
//   onLaunchGame(gameId) — parent handles opening the right overlay
//   gameStatuses — { tripleFeature: 'available'|'completed', reelTime: ..., creditCheck: ... }
//
import { useState, useEffect } from "react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getTodayFormatted() {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// ── SVG Icons ──

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

function CreditCheckIcon({ color }) {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <rect x="5" y="2" width="18" height="24" rx="2" stroke={color} strokeWidth="1.5" fill="none" />
      <line x1="9" y1="8" x2="19" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="12.5" x2="17" y2="12.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <line x1="9" y1="16.5" x2="15" y2="16.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <line x1="9" y1="20.5" x2="13" y2="20.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
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

function PickAFlickIcon({ color }) {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <rect x="6" y="6" width="14" height="18" rx="2" stroke={color} strokeWidth="1.5" fill="none" opacity="0.3" transform="rotate(-6 13 15)" />
      <rect x="8" y="4" width="14" height="18" rx="2" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.1" transform="rotate(4 15 13)" />
      <path d="M18 10 L22 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M20 9 L23 11" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

function FlameIcon({ color, size = 12 }) {
  return (
    <svg width={size} height={size + 2} viewBox="0 0 12 14" fill="none">
      <path d="M6 1C6 1 2 5 2 8.5C2 11 3.8 13 6 13C8.2 13 10 11 10 8.5C10 5 6 1 6 1Z"
        fill={color} fillOpacity="0.6" stroke={color} strokeWidth="1" />
    </svg>
  );
}

const ICONS = {
  tripleFeature: TripleFeatureIcon,
  creditCheck: CreditCheckIcon,
  reelTime: ReelTimeIcon,
  pickAFlick: PickAFlickIcon,
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
    id: "creditCheck",
    name: "Credit Check",
    tagline: "Guess the billing order",
    color: "#e8927c",
    bgAccent: "rgba(232, 146, 124, 0.06)",
    daily: true,
  },
  {
    id: "reelTime",
    name: "Reel Time",
    tagline: "Order the releases",
    color: "#7cb8e8",
    bgAccent: "rgba(124, 184, 232, 0.06)",
    daily: true,
    isNew: true,
  },
  {
    id: "pickAFlick",
    name: "Pick a Flick",
    tagline: "Swipe to find what to watch",
    color: "#a8d870",
    bgAccent: "rgba(168, 216, 112, 0.06)",
    daily: false,
  },
];

// ── External games ──

const EXTERNAL_GAMES = [
  { id: "framed", name: "Framed", tagline: "Guess the movie from stills", url: "https://framed.wtf" },
  { id: "cinematrix", name: "Cinematrix", tagline: "Fill the film grid", url: "https://cinematrix.app" },
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
      {/* Infinity film strip */}
      <path d="M5 13C5 10 7 8 9.5 8C12 8 13 10 13 13C13 16 14 18 16.5 18C19 18 21 16 21 13C21 10 19 8 16.5 8C14 8 13 10 13 13C13 16 12 18 9.5 18C7 18 5 16 5 13Z"
        stroke="#8a7e6b" strokeWidth="1.8" fill="none" />
      {/* Sprocket holes */}
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
      {/* Marquee border */}
      <rect x="3" y="5" width="20" height="16" rx="2" stroke="#8a7e6b" strokeWidth="1.5" fill="none" />
      {/* Marquee lights - top */}
      <circle cx="7" cy="5" r="1" fill="#8a7e6b" opacity="0.6" />
      <circle cx="11" cy="5" r="1" fill="#8a7e6b" opacity="0.4" />
      <circle cx="15" cy="5" r="1" fill="#8a7e6b" opacity="0.6" />
      <circle cx="19" cy="5" r="1" fill="#8a7e6b" opacity="0.4" />
      {/* Marquee lights - bottom */}
      <circle cx="7" cy="21" r="1" fill="#8a7e6b" opacity="0.4" />
      <circle cx="11" cy="21" r="1" fill="#8a7e6b" opacity="0.6" />
      <circle cx="15" cy="21" r="1" fill="#8a7e6b" opacity="0.4" />
      <circle cx="19" cy="21" r="1" fill="#8a7e6b" opacity="0.6" />
      {/* Marquee lights - sides */}
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

// ── Styles ──

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:wght@400;700;900&family=IBM+Plex+Mono:wght@400;700&display=swap');
@keyframes gh-card-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
`;

// ── Component ──

export default function GamesHub({ session, onBack, onLaunchGame, gameStatuses = {}, isTab = false }) {
  const [loaded, setLoaded] = useState(false);
  const [pressedId, setPressedId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(t);
  }, []);

  function StatusPill({ gameId, color }) {
    const status = gameStatuses[gameId];
    if (status === "completed") {
      return (
        <span style={{
          fontFamily: "'Playfair Display', serif", fontSize: 11, fontWeight: 700, padding: "3px 8px",
          borderRadius: 6, background: "rgba(76,175,80,0.15)", color: "#4caf50",
        }}>
          ✓ Done
        </span>
      );
    }
    if (status === "available") {
      return (
        <span style={{
          fontFamily: "'Playfair Display', serif", fontSize: 11, fontWeight: 700, padding: "3px 8px",
          borderRadius: 6, background: `${color}20`, color,
        }}>
          Play
        </span>
      );
    }
    // For non-daily games
    return (
      <span style={{
        fontFamily: "'Playfair Display', serif", fontSize: 11, fontWeight: 700, padding: "3px 8px",
        borderRadius: 6, background: `${color}15`, color,
      }}>
        Open
      </span>
    );
  }

  return (
    <div style={{
      minHeight: isTab ? "auto" : "100vh", background: "#0f0d0b", color: "#f5f0e8",
      fontFamily: "'IBM Plex Mono', monospace", padding: isTab ? "0 16px 100px" : "0 16px 40px",
      maxWidth: 480, margin: "0 auto", position: "relative",
      paddingTop: isTab ? 0 : "env(safe-area-inset-top, 0px)",
    }}>
      <style>{CSS}</style>

      {/* Back button — hidden when rendered as a tab */}
      {!isTab && (
        <button onClick={onBack} style={{
          position: "absolute", top: 16, left: 16, width: 36, height: 36,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", zIndex: 10, background: "none", border: "none", padding: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4L7 10L13 16" stroke="#8a7e6b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {/* Header */}
      <div style={{
        textAlign: "center", padding: isTab ? "12px 0 20px" : "24px 0 20px",
        opacity: loaded ? 1 : 0, transform: `translateY(${loaded ? 0 : -8}px)`,
        transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}>
        {!isTab && (
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
            letterSpacing: 4, textTransform: "uppercase", color: "#8a7e6b", marginBottom: 4,
          }}>
            M▶NTL
          </div>
        )}
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, letterSpacing: 2, color: "#f5f0e8", lineHeight: 1.1,
        }}>
          Games
        </h1>
        <div style={{ fontSize: 13, color: "#8a7e6b", marginTop: 6 }}>{getTodayFormatted()}</div>
      </div>

      {/* Our Games */}
      <div style={{
        fontSize: 10, textTransform: "uppercase", letterSpacing: 3,
        color: "#6b6256", margin: "20px 0 10px 4px",
        opacity: loaded ? 1 : 0, transition: "opacity 0.4s ease 0.3s",
      }}>
        Our Games
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {GAMES.map((game, i) => {
          const Icon = ICONS[game.id];
          const isDone = gameStatuses[game.id] === "completed";
          return (
            <button
              key={game.id}
              onClick={() => onLaunchGame(game.id)}
              onPointerDown={() => setPressedId(game.id)}
              onPointerUp={() => setPressedId(null)}
              onPointerLeave={() => setPressedId(null)}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                background: game.bgAccent,
                border: `1px solid rgba(245,240,232,0.06)`,
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
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, letterSpacing: 1,
                    color: "#0f0d0b", background: "#a8d870",
                    padding: "2px 4px", borderRadius: 3, transform: "rotate(8deg)",
                  }}>
                    NEW
                  </span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
                <div style={{
                  fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700,
                  color: "#f5f0e8", lineHeight: 1.2,
                }}>
                  {game.name}
                </div>
                <div style={{ fontSize: 11, color: "#8a7e6b", marginTop: 2 }}>{game.tagline}</div>
              </div>

              <StatusPill gameId={game.id} color={game.color} />

              {/* Chevron */}
              <div style={{
                position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
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
        color: "#6b6256", margin: "24px 0 10px 4px",
        opacity: loaded ? 1 : 0, transition: "opacity 0.4s ease 0.4s",
      }}>
        Other Games
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {EXTERNAL_GAMES.map((game, i) => (
          <button
            key={game.id}
            onClick={() => {
              const url = game.url;
              if (window.Capacitor?.isNativePlatform?.()) {
                import("@capacitor/browser").then(({ Browser }) => Browser.open({ url })).catch(() => window.open(url, "_blank"));
              } else {
                window.open(url, "_blank", "noopener");
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
                fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700,
                color: "#f5f0e8", lineHeight: 1.2,
              }}>
                {game.name}
              </div>
              <div style={{ fontSize: 11, color: "#8a7e6b", marginTop: 2 }}>{game.tagline}</div>
            </div>
            <ExternalLinkIcon />
          </button>
        ))}
      </div>
    </div>
  );
}
