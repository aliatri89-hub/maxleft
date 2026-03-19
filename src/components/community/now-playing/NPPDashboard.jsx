import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../../../supabase";
import CommunityLoadingScreen from "../../CommunityLoadingScreen";

// ── NPP Brand Colors ───────────────────────────────────────────────────
const C = {
  gold: "#F5C518",
  goldGlow: "rgba(245,197,24,0.12)",
  goldBorder: "rgba(245,197,24,0.2)",
  bg: "#1a1a1a",
  bgDeep: "#111111",
  bgCard: "#222222",
  bgCardHover: "#2a2a2a",
  text: "#f0ece4",
  textMuted: "rgba(240,236,228,0.5)",
  textDim: "rgba(240,236,228,0.3)",
  green: "#4ade80",
  red: "#f87171",
  brown: "#b45309",
  yellow: "#facc15",
  border: "rgba(255,255,255,0.07)",
};

const SUPABASE_URL = "https://api.mymantl.app";
const TMDB_IMG = "https://image.tmdb.org/t/p";

const VOTE_TYPES = [
  { key: "up", icon: "▲", label: "Recommended", color: C.green, rating: 3.5, brownArrow: false },
  { key: "down", icon: "▼", label: "Not Rec.", color: C.red, rating: 1.5, brownArrow: false },
  { key: "neutral", icon: "●", label: "Neutral", color: C.yellow, rating: 2.5, brownArrow: false },
  { key: "brown", icon: "◆", label: "Brown Arrow", color: C.brown, rating: 2, brownArrow: true },
];

const ADMIN_IDS = ["19410e64-d610-4fab-9c26-d24fafc94696"];
import { searchTMDBRaw } from "../../../utils/api";
const MANTL_APP_URL = "https://www.mymantl.app/#/community/nowplaying";

// ── NPP Podcast Links ─────────────────────────────────────────────────
const NPP_WEBSITE = "https://www.nowplayingpodcast.com";
const NPP_PATREON = "https://www.patreon.com/nowplayingpodcast";
const NPP_SPOTIFY = "https://open.spotify.com/show/662PBreZwyoDJxxyPpN4WE";
const NPP_APPLE = "https://podcasts.apple.com/us/channel/now-playing-podcast/id6442574185";
const NPP_PODBEAN = "https://www.podbean.com/premium-podcast/nowplayingpodcast";

const BUCKET_LABELS = {
  action_spy: { label: "Action & Spy", icon: "🎯" },
  horror: { label: "Horror", icon: "🩸" },
  stephen_king: { label: "Stephen King", icon: "👑" },
  sci_fi: { label: "Sci-Fi", icon: "🚀" },
  comic_books: { label: "Comic Books", icon: "💥" },
  video_games: { label: "Video Games", icon: "🎮" },
  animation_family: { label: "Animation", icon: "✨" },
  comedy: { label: "Comedy", icon: "🎭" },
  directors: { label: "Directors", icon: "🎬" },
  decades: { label: "Decades / Patreon", icon: "📅" },
};

// ── Launch flag: hide community engagement stats until there's real activity ──
const SHOW_COMMUNITY_STATS = false;
// ── Launch flag: hide voting/rating UI until community features are live ──
const SHOW_VOTING = false;

// ── Badge pitch assets (from landing page) ──
const PITCH_BADGES = [
  { art: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/pumpkin_badge.png", backdrop: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/Backgroundhalloweenhero.jpg", name: "Haddonfield Historian", sub: "Halloween", color: "#ff6a00" },
  { art: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/badge_alien.png", backdrop: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/BackgroundAlienHero.jpg", name: "Weyland-Yutani Employee", sub: "Alien", color: "#4a9eff" },
  { art: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/badge_mad_max.png", backdrop: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/BackgroundMadMaxHero.jpg", name: "Witnessed", sub: "Mad Max", color: "#ff4a4a" },
  { art: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/badge_chucky.png", backdrop: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/BackgroundChucky.jpg", name: "Friend Till the End", sub: "Child's Play", color: "#9b59b6" },
];

async function searchTMDB(query) {
  if (!query || query.length < 2) return [];
  const results = await searchTMDBRaw(query);
  return (results || []).slice(0, 5);
}

function voteKeyFromProgress(row) {
  if (!row || row.status !== "completed") return null;
  if (row.brown_arrow) return "brown";
  const r = parseFloat(row.rating) || 0;
  if (r >= 3) return "up";
  if (r > 0 && r < 2.5) return "down";
  if (r >= 2.5 && r < 3) return "neutral";
  // Completed but no rating — no badge
  return null;
}

function parseExtra(data) {
  if (!data) return {};
  if (typeof data === "string") { try { return JSON.parse(data); } catch { return {}; } }
  return data;
}

// ── Small Components ────────────────────────────────────────────────────

const ArrowBar = ({ green, red, brown, yellow, total }) => {
  if (!total) return null;
  const pct = (v) => `${(v / total) * 100}%`;
  return (
    <div style={{ display: "flex", height: 3, borderRadius: 2, overflow: "hidden", width: "100%", background: "rgba(255,255,255,0.05)" }}>
      <div style={{ width: pct(green), background: C.green, transition: "width 0.5s" }} />
      <div style={{ width: pct(yellow), background: C.yellow, transition: "width 0.5s" }} />
      <div style={{ width: pct(red), background: C.red, transition: "width 0.5s" }} />
      <div style={{ width: pct(brown), background: C.brown, transition: "width 0.5s" }} />
    </div>
  );
};

const HostPips = ({ up = 0, down = 0, brown = 0 }) => (
  <div style={{ display: "flex", gap: 2 }}>
    {Array(up).fill(0).map((_, i) => <div key={`u${i}`} style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />)}
    {Array(down).fill(0).map((_, i) => <div key={`d${i}`} style={{ width: 6, height: 6, borderRadius: "50%", background: C.red }} />)}
    {Array(brown).fill(0).map((_, i) => <div key={`b${i}`} style={{ width: 6, height: 6, borderRadius: "50%", background: C.brown }} />)}
  </div>
);

const FilmStrip = () => (
  <div style={{ display: "flex", gap: 4, justifyContent: "center", padding: "8px 0", overflow: "hidden" }}>
    {Array(50).fill(0).map((_, i) => (
      <div key={i} style={{
        width: 12, height: 8, borderRadius: 1, flexShrink: 0,
        background: i % 2 === 0 ? "rgba(245,197,24,0.12)" : "transparent",
        border: "1px solid rgba(245,197,24,0.06)",
      }} />
    ))}
  </div>
);

// ── Podcast Episode Link — shows direct link + Spotify/Apple search ───
const EpisodeLink = ({ title, episodeUrl, compact }) => {
  const searchQuery = encodeURIComponent(`Now Playing Podcast ${title}`);
  const spotifySearch = `https://open.spotify.com/search/${searchQuery}`;
  const appleSearch = `https://podcasts.apple.com/search?term=${searchQuery}`;

  const badgeStyle = {
    display: "inline-flex", alignItems: "center", gap: compact ? 4 : 5,
    padding: compact ? "4px 8px" : "5px 10px",
    background: "rgba(255,255,255,0.04)",
    border: `1px solid rgba(255,255,255,0.08)`,
    borderRadius: compact ? 4 : 6,
    textDecoration: "none",
    transition: "all 0.15s",
    cursor: "pointer",
    flexShrink: 0,
  };

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {/* Direct episode link (if available from RSS) */}
      {episodeUrl && (
        <a href={episodeUrl} target="_blank" rel="noopener noreferrer"
          style={{
            ...badgeStyle,
            background: `${C.gold}12`,
            border: `1px solid ${C.goldBorder}`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${C.gold}25`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = `${C.gold}12`; }}
        >
          <span style={{ fontSize: compact ? 11 : 13 }}>▶</span>
          <span style={{
            fontSize: compact ? 10 : 11, fontWeight: 700, color: C.gold,
            fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
            letterSpacing: 1, whiteSpace: "nowrap",
          }}>Listen to Episode</span>
        </a>
      )}

      {/* Spotify search */}
      <a href={spotifySearch} target="_blank" rel="noopener noreferrer" style={badgeStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(29,185,84,0.12)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      >
        <svg width={compact ? 12 : 14} height={compact ? 12 : 14} viewBox="0 0 24 24" fill="#1DB954">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
        <span style={{ fontSize: compact ? 9 : 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>Spotify</span>
      </a>

      {/* Apple Podcasts search */}
      <a href={appleSearch} target="_blank" rel="noopener noreferrer" style={badgeStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(168,85,247,0.12)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      >
        <svg width={compact ? 12 : 14} height={compact ? 12 : 14} viewBox="0 0 24 24" fill="#A855F7">
          <path d="M5.34 0A5.328 5.328 0 000 5.34v13.32A5.328 5.328 0 005.34 24h13.32A5.328 5.328 0 0024 18.66V5.34A5.328 5.328 0 0018.66 0H5.34zm6.525 2.568c2.336 0 4.448.902 6.056 2.587 1.224 1.272 1.912 2.619 2.264 4.392.12.6-.12 1.2-.6 1.5-.48.3-1.14.18-1.5-.3-.18-.36-.24-.78-.36-1.14-.36-1.2-.96-2.16-1.92-2.94-1.32-1.08-2.82-1.5-4.5-1.26-2.28.36-3.84 1.62-4.8 3.66-.36.78-.54 1.62-.54 2.52 0 1.56.42 2.94 1.38 4.2.3.36.3.96 0 1.32-.36.36-.96.42-1.32.06-.42-.36-.78-.78-1.08-1.26-.9-1.38-1.32-2.94-1.38-4.62-.06-2.1.54-3.96 1.8-5.58 1.56-2.04 3.66-3.18 6.48-3.12zm.12 4.32c1.44.06 2.7.6 3.72 1.68.78.84 1.2 1.8 1.38 2.94.06.6-.24 1.08-.78 1.26-.54.12-1.08-.12-1.26-.72-.12-.36-.18-.72-.36-1.08-.6-1.2-1.62-1.74-2.94-1.74-1.62.06-2.76.84-3.3 2.4-.18.48-.24 1.02-.18 1.56.06.66.18 1.32.48 1.92.06.12.12.3.12.42.06.54-.18 1.02-.66 1.2-.54.18-1.08 0-1.32-.48-.42-.84-.66-1.74-.78-2.7-.18-1.56.18-2.94 1.02-4.2.96-1.38 2.34-2.22 4.02-2.46.3-.06.54-.06.84-.06zm-.12 4.44c1.26 0 2.22 1.02 2.22 2.22 0 .9-.54 1.62-1.32 2.01l.48 4.38c.06.54-.36 1.02-.9 1.08h-.96c-.54-.06-.96-.54-.9-1.08l.48-4.38c-.78-.42-1.32-1.14-1.32-2.01.02-1.2.98-2.22 2.22-2.22z"/>
        </svg>
        <span style={{ fontSize: compact ? 9 : 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>Apple</span>
      </a>
    </div>
  );
};

// ── Podcast Footer Links ──────────────────────────────────────────────
const PodcastFooterLinks = () => (
  <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
    {[
      { label: "Website", url: NPP_WEBSITE, icon: "🌐" },
      { label: "Spotify", url: NPP_SPOTIFY, icon: null, svg: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#1DB954">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
      )},
      { label: "Apple Podcasts", url: NPP_APPLE, icon: null, svg: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#A855F7">
          <path d="M5.34 0A5.328 5.328 0 000 5.34v13.32A5.328 5.328 0 005.34 24h13.32A5.328 5.328 0 0024 18.66V5.34A5.328 5.328 0 0018.66 0H5.34zm6.525 2.568c2.336 0 4.448.902 6.056 2.587 1.224 1.272 1.912 2.619 2.264 4.392.12.6-.12 1.2-.6 1.5-.48.3-1.14.18-1.5-.3-.18-.36-.24-.78-.36-1.14-.36-1.2-.96-2.16-1.92-2.94-1.32-1.08-2.82-1.5-4.5-1.26-2.28.36-3.84 1.62-4.8 3.66-.36.78-.54 1.62-.54 2.52 0 1.56.42 2.94 1.38 4.2.3.36.3.96 0 1.32-.36.36-.96.42-1.32.06-.42-.36-.78-.78-1.08-1.26-.9-1.38-1.32-2.94-1.38-4.62-.06-2.1.54-3.96 1.8-5.58 1.56-2.04 3.66-3.18 6.48-3.12zm.12 4.32c1.44.06 2.7.6 3.72 1.68.78.84 1.2 1.8 1.38 2.94.06.6-.24 1.08-.78 1.26-.54.12-1.08-.12-1.26-.72-.12-.36-.18-.72-.36-1.08-.6-1.2-1.62-1.74-2.94-1.74-1.62.06-2.76.84-3.3 2.4-.18.48-.24 1.02-.18 1.56.06.66.18 1.32.48 1.92.06.12.12.3.12.42.06.54-.18 1.02-.66 1.2-.54.18-1.08 0-1.32-.48-.42-.84-.66-1.74-.78-2.7-.18-1.56.18-2.94 1.02-4.2.96-1.38 2.34-2.22 4.02-2.46.3-.06.54-.06.84-.06zm-.12 4.44c1.26 0 2.22 1.02 2.22 2.22 0 .9-.54 1.62-1.32 2.01l.48 4.38c.06.54-.36 1.02-.9 1.08h-.96c-.54-.06-.96-.54-.9-1.08l.48-4.38c-.78-.42-1.32-1.14-1.32-2.01.02-1.2.98-2.22 2.22-2.22z"/>
        </svg>
      )},
      { label: "Patreon", url: NPP_PATREON, icon: null, svg: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF424D">
          <path d="M14.82 2.41c3.96 0 7.18 3.24 7.18 7.21 0 3.96-3.22 7.18-7.18 7.18-3.97 0-7.21-3.22-7.21-7.18 0-3.97 3.24-7.21 7.21-7.21M2 21.6h3.5V2.41H2V21.6z"/>
        </svg>
      )},
      { label: "Podbean", url: NPP_PODBEAN, icon: null, svg: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#6CBB3C">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 3.6c4.638 0 8.4 3.762 8.4 8.4 0 4.638-3.762 8.4-8.4 8.4-4.638 0-8.4-3.762-8.4-8.4 0-4.638 3.762-8.4 8.4-8.4zm0 2.4a6 6 0 100 12 6 6 0 000-12zm0 2.4a3.6 3.6 0 110 7.2 3.6 3.6 0 010-7.2z"/>
        </svg>
      )},
    ].map(({ label, url, icon, svg }) => (
      <a key={label} href={url} target="_blank" rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 6,
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${C.border}`,
          textDecoration: "none",
          transition: "all 0.2s",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.goldBorder; e.currentTarget.style.background = `${C.gold}08`; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      >
        {icon && <span style={{ fontSize: 12 }}>{icon}</span>}
        {svg}
        <span style={{
          fontSize: 11, fontWeight: 600, color: C.textMuted,
          fontFamily: "'Source Sans 3', sans-serif", whiteSpace: "nowrap",
        }}>{label}</span>
      </a>
    ))}
  </div>
);

const VoteRow = ({ filmId, userVote, onVote, compact }) => {
  const [justVoted, setJustVoted] = useState(null);
  const handleVote = (key) => {
    const newVote = userVote === key ? null : key;
    setJustVoted(key);
    setTimeout(() => setJustVoted(null), 400);
    onVote(filmId, newVote);
  };

  const VOTE_STYLES = {
    up:      { bg: "rgba(74,222,128,0.2)",  activeBg: "rgba(74,222,128,0.3)",  border: "rgba(74,222,128,0.3)",  activeBorder: "rgba(74,222,128,0.5)",  fill: "rgba(74,222,128,0.8)", activeFill: "rgba(74,222,128,0.95)" },
    down:    { bg: "rgba(239,68,68,0.15)",   activeBg: "rgba(239,68,68,0.25)",   border: "rgba(239,68,68,0.25)",   activeBorder: "rgba(239,68,68,0.5)",   fill: "rgba(239,68,68,0.7)",  activeFill: "rgba(239,68,68,0.95)" },
    neutral: { bg: "rgba(250,204,21,0.12)",  activeBg: "rgba(250,204,21,0.25)",  border: "rgba(250,204,21,0.2)",   activeBorder: "rgba(250,204,21,0.5)",  fill: "rgba(250,204,21,0.7)", activeFill: "rgba(250,204,21,0.95)" },
    brown:   { bg: "rgba(160,82,45,0.2)",    activeBg: "rgba(160,82,45,0.3)",    border: "rgba(205,133,63,0.3)",   activeBorder: "rgba(205,133,63,0.6)",  fill: "rgba(205,133,63,0.7)", activeFill: "rgba(205,133,63,0.95)" },
  };

  const sz = compact ? 30 : 36;
  const iconSz = compact ? 13 : 16;

  return (
    <div style={{ display: "flex", gap: compact ? 5 : 8, justifyContent: "center" }}>
      {VOTE_TYPES.map((v) => {
        const isActive = userVote === v.key;
        const isJust = justVoted === v.key;
        const s = VOTE_STYLES[v.key];
        return (
          <button key={v.key} onClick={(e) => { e.stopPropagation(); handleVote(v.key); }} title={v.label}
            style={{
              width: sz, height: sz, borderRadius: 7,
              background: isActive ? s.activeBg : s.bg,
              border: `1px solid ${isActive ? s.activeBorder : s.border}`,
              cursor: "pointer",
              transition: "all 0.15s ease",
              transform: isJust ? "scale(1.2)" : "scale(1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 0, flexShrink: 0,
              backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
            }}
          >
            {(v.key === "up" || v.key === "brown") && (
              <svg width={iconSz} height={iconSz} viewBox="0 0 24 24" fill="none">
                <path d="M12 4L3 15h6v5h6v-5h6L12 4z" fill={isActive ? s.activeFill : s.fill} />
              </svg>
            )}
            {v.key === "down" && (
              <svg width={iconSz} height={iconSz} viewBox="0 0 24 24" fill="none">
                <path d="M12 20L21 9h-6V4H9v5H3l9 11z" fill={isActive ? s.activeFill : s.fill} />
              </svg>
            )}
            {v.key === "neutral" && (
              <div style={{
                width: compact ? 9 : 11, height: compact ? 9 : 11, borderRadius: "50%",
                background: isActive ? s.activeFill : s.fill,
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
};

const LoginModal = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [emailStep, setEmailStep] = useState("input"); // 'input' | 'otp' | 'signup'
  const [usePassword, setUsePassword] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
    if (err) { setError(err.message); setLoading(false); }
  };

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    if (err) { setError(err.message); } else { setEmailStep("otp"); }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length < 8) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otpCode.trim(),
      type: "email",
    });
    if (err) { setError(err.message); }
    setLoading(false);
  };

  const handlePasswordSignIn = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      if (err.message === "Invalid login credentials") {
        setEmailStep("signup");
        setError("No account found. Create one?");
      } else { setError(err.message); }
    }
    setLoading(false);
  };

  const handlePasswordSignUp = async () => {
    if (!email.trim() || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { emailRedirectTo: window.location.href },
    });
    if (err) { setError(err.message); }
    setLoading(false);
  };

  const resetEmail = () => {
    setShowEmail(false); setEmail(""); setPassword(""); setOtpCode("");
    setEmailStep("input"); setError(null); setUsePassword(false);
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)",
    color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box",
    fontFamily: "'Source Sans 3', sans-serif",
  };

  const renderEmailContent = () => {
    if (emailStep === "otp") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 2 }}>🔑</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 4 }}>
            Enter the 8-digit code sent to <strong style={{ color: "#ccc" }}>{email}</strong>
          </div>
          <input type="text" inputMode="numeric" autoComplete="one-time-code"
            value={otpCode} autoFocus maxLength={8}
            onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 8)); setError(null); }}
            placeholder="00000000"
            onKeyDown={(e) => e.key === "Enter" && otpCode.length === 8 && handleVerifyOtp()}
            style={{ ...inputStyle, textAlign: "center", letterSpacing: "0.25em", fontSize: 20,
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}
          />
          <button onClick={handleVerifyOtp} disabled={loading || otpCode.length < 8} style={{
            width: "100%", padding: "12px 0", borderRadius: 8,
            background: C.gold, border: "none", color: "#000",
            fontSize: 14, fontWeight: 600, cursor: loading ? "wait" : "pointer",
            opacity: loading || otpCode.length < 8 ? 0.5 : 1,
            fontFamily: "'Source Sans 3', sans-serif",
          }}>{loading ? "Verifying..." : "Verify & Sign In"}</button>
          <button onClick={() => { setEmailStep("input"); setOtpCode(""); setError(null); }} style={{
            background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer",
          }}>← Resend or try different email</button>
        </div>
      );
    }

    if (emailStep === "signup") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 12, color: C.textMuted }}>
            Creating account for <strong style={{ color: "#ccc" }}>{email}</strong>
          </div>
          <input type="password" value={password} autoFocus placeholder="Choose a password (min 6 chars)"
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            onKeyDown={(e) => e.key === "Enter" && handlePasswordSignUp()}
            style={inputStyle}
          />
          <button onClick={handlePasswordSignUp} disabled={loading || password.length < 6} style={{
            width: "100%", padding: "12px 0", borderRadius: 8,
            background: C.gold, border: "none", color: "#000",
            fontSize: 14, fontWeight: 600, cursor: loading ? "wait" : "pointer",
            opacity: loading || password.length < 6 ? 0.5 : 1,
            fontFamily: "'Source Sans 3', sans-serif",
          }}>{loading ? "Creating account..." : "Create Account"}</button>
          <button onClick={resetEmail} style={{
            background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer",
          }}>← Start over</button>
        </div>
      );
    }

    if (!showEmail) {
      return (
        <button onClick={() => setShowEmail(true)} style={{
          width: "100%", padding: "12px 0", borderRadius: 8,
          background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
          color: C.textMuted, fontSize: 14, fontWeight: 600,
          fontFamily: "'Source Sans 3', sans-serif", cursor: "pointer",
          transition: "all 0.15s",
        }}>Continue with email</button>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input type="email" value={email} autoFocus placeholder="your@email.com"
          onChange={(e) => { setEmail(e.target.value); setError(null); }}
          onKeyDown={(e) => e.key === "Enter" && !usePassword && handleSendOtp()}
          style={inputStyle}
        />
        {usePassword && (
          <input type="password" value={password} placeholder="Password"
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            onKeyDown={(e) => e.key === "Enter" && handlePasswordSignIn()}
            style={inputStyle}
          />
        )}
        <button onClick={usePassword ? handlePasswordSignIn : handleSendOtp}
          disabled={loading || !email.trim() || (usePassword && !password)} style={{
          width: "100%", padding: "12px 0", borderRadius: 8,
          background: C.gold, border: "none", color: "#000",
          fontSize: 14, fontWeight: 600, cursor: loading ? "wait" : "pointer",
          opacity: loading || !email.trim() || (usePassword && !password) ? 0.5 : 1,
          fontFamily: "'Source Sans 3', sans-serif",
        }}>{loading ? "Sending..." : usePassword ? "Sign In" : "Send sign-in code"}</button>
        <button onClick={() => { setUsePassword(!usePassword); setError(null); }} style={{
          background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer",
        }}>{usePassword ? "← Use email code instead" : "Use password instead"}</button>
        <button onClick={resetEmail} style={{
          background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer",
        }}>← Back</button>
      </div>
    );
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1002,
      animation: "fadeIn 0.15s ease",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.bgCard, borderRadius: 12, padding: 28, maxWidth: 360, width: "90%",
        border: `1px solid ${C.goldBorder}`, animation: "modalIn 0.2s ease",
        textAlign: "center",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{
            margin: 0, fontSize: 18, fontWeight: 700, color: C.gold,
            fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 1.5,
          }}>Sign In</h3>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: C.textDim,
            fontSize: 20, cursor: "pointer", lineHeight: 1,
          }}>×</button>
        </div>

        {emailStep === "input" && (
          <p style={{
            fontSize: 13, color: C.textMuted, lineHeight: 1.6, marginBottom: 20,
            fontFamily: "'Source Sans 3', sans-serif",
          }}>
            Sign in to track your progress across every franchise.
          </p>
        )}

        {emailStep === "input" && (
          <>
            <button onClick={handleGoogle} disabled={loading} style={{
              width: "100%", padding: "12px 0", borderRadius: 8,
              background: "#fff", border: "none", color: "#333", fontSize: 14, fontWeight: 600,
              fontFamily: "'Source Sans 3', sans-serif",
              cursor: loading ? "wait" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              transition: "opacity 0.15s", opacity: loading ? 0.6 : 1,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {loading ? "Redirecting..." : "Continue with Google"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
              <span style={{ fontSize: 10, color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase",
                fontFamily: "'JetBrains Mono', monospace" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            </div>
          </>
        )}

        {renderEmailContent()}

        {error && (
          <div style={{
            marginTop: 12, padding: "8px 12px", borderRadius: 6,
            background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)",
            fontSize: 12, color: C.red, fontFamily: "'Source Sans 3', sans-serif",
          }}>{error}</div>
        )}

        <div style={{
          marginTop: 16, fontSize: 10, color: C.textDim,
          fontFamily: "'JetBrains Mono', monospace",
        }}>powered by MANTL</div>
      </div>
    </div>
  );
};

const Toast = ({ message, link, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
      background: C.bgCard, border: `1px solid ${C.goldBorder}`,
      borderRadius: 8, padding: "10px 20px", zIndex: 1100,
      animation: "slideUp 0.25s ease", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "'Source Sans 3', sans-serif" }}>
        {message}
      </span>
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer" style={{
          fontSize: 11, fontWeight: 700, color: C.gold, textDecoration: "none",
          fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
          letterSpacing: 1, whiteSpace: "nowrap",
          borderLeft: `1px solid ${C.border}`, paddingLeft: 12,
        }}>My Tracker →</a>
      )}
    </div>
  );
};

const Skeleton = () => <CommunityLoadingScreen slug="nowplaying" />;

// ── Film Card ───────────────────────────────────────────────────────────

const FilmCard = ({ film, onClick, index, userVote, onVote, isAuthed, hasEpisode }) => {
  const [hov, setHov] = useState(false);
  const br = film.brown_count || 0;
  const hostData = parseExtra(film.extra_data);
  const hasPoster = !!film.poster_path;

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 6, overflow: "visible", position: "relative",
        background: hov ? C.bgCardHover : C.bgCard,
        border: `1px solid ${userVote ? `${VOTE_TYPES.find(v => v.key === userVote)?.color}44` : hov ? C.goldBorder : C.border}`,
        transition: "all 0.25s ease",
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hov ? "0 8px 24px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
        animation: `cardIn 0.35s ease ${index * 0.025}s both`,
      }}
    >
      <div onClick={() => onClick(film)} style={{
        aspectRatio: "2/3", position: "relative", cursor: "pointer",
        background: hasPoster ? C.bgDeep : `linear-gradient(145deg, ${C.bgDeep}, ${C.bgCard})`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: hasPoster ? "flex-end" : "center",
        padding: 0, textAlign: "center", overflow: "hidden", borderRadius: 6,
      }}>
        {/* Poster image */}
        {hasPoster && (
          <img
            src={`${TMDB_IMG}/w300${film.poster_path}`}
            alt={film.title}
            loading="lazy"
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover",
            }}
          />
        )}

        {/* Gradient overlay on poster for readability */}
        {hasPoster && (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.3) 100%)",
          }} />
        )}

        {/* Host verdicts — upper right */}
        {(hostData.up > 0 || hostData.down > 0 || hostData.brown > 0) && (
          <div style={{
            position: "absolute", top: 7, right: 7,
            background: "rgba(0,0,0,0.65)", borderRadius: 4, padding: "3px 6px",
            backdropFilter: "blur(4px)",
            display: "flex", gap: 2, alignItems: "center",
          }}>
            {Array(hostData.up || 0).fill(0).map((_, i) => (
              <span key={`hu${i}`} style={{ fontSize: 11, color: C.green, fontWeight: 800, lineHeight: 1 }}>▲</span>
            ))}
            {Array(hostData.down || 0).fill(0).map((_, i) => (
              <span key={`hd${i}`} style={{ fontSize: 11, color: C.red, fontWeight: 800, lineHeight: 1 }}>▼</span>
            ))}
            {Array(hostData.brown || 0).fill(0).map((_, i) => (
              <span key={`hb${i}`} style={{ fontSize: 11, color: C.brown, fontWeight: 800, lineHeight: 1 }}>▲</span>
            ))}
          </div>
        )}

        {/* Episode available indicator — bottom right, subtle headphone icon */}
        {hasEpisode && !userVote && (
          <div style={{
            position: "absolute", bottom: hasPoster ? 36 : 36, right: 6, zIndex: 4,
            width: 22, height: 22, borderRadius: 5,
            background: "rgba(0,0,0,0.6)",
            border: `1px solid ${C.goldBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
          }} title="Episode available">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0118 0v6" />
              <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
            </svg>
          </div>
        )}

        {/* User vote badge — community-style arrow stamp, top left */}
        {SHOW_VOTING && userVote && (() => {
          const BADGE = {
            up:      { bg: "rgba(74,222,128,0.25)",  border: "rgba(74,222,128,0.5)",  shadow: "rgba(74,222,128,0.3)",  fill: "rgba(74,222,128,0.9)" },
            brown:   { bg: "rgba(160,82,45,0.3)",    border: "rgba(205,133,63,0.6)",  shadow: "rgba(160,82,45,0.4)",   fill: "rgba(205,133,63,0.9)" },
            down:    { bg: "rgba(239,68,68,0.25)",   border: "rgba(239,68,68,0.5)",   shadow: "rgba(239,68,68,0.3)",   fill: "rgba(239,68,68,0.9)" },
            neutral: { bg: "rgba(250,204,21,0.25)",  border: "rgba(250,204,21,0.5)",  shadow: "rgba(250,204,21,0.3)" },
          };
          const b = BADGE[userVote];
          if (!b) return null;
          return (
            <div style={{
              position: "absolute", top: 6, left: 6, zIndex: 4,
              width: 28, height: 28, borderRadius: 7,
              background: b.bg, border: `1.5px solid ${b.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
              boxShadow: `0 2px 8px ${b.shadow}`,
            }}>
              {(userVote === "up" || userVote === "brown") && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4L3 15h6v5h6v-5h6L12 4z" fill={b.fill} />
                </svg>
              )}
              {userVote === "down" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 20L21 9h-6V4H9v5H3l9 11z" fill={b.fill} />
                </svg>
              )}
              {userVote === "neutral" && (
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: "rgba(250,204,21,0.85)",
                  boxShadow: "0 0 4px rgba(250,204,21,0.4)",
                }} />
              )}
            </div>
          );
        })()}

        {/* Title — positioned at bottom for poster, centered for no-poster */}
        <div style={{
          position: "relative", zIndex: 1,
          padding: hasPoster ? "0 10px 10px" : "14px",
          width: "100%",
        }}>
          <div style={{
            fontSize: hasPoster ? 13 : 15, fontWeight: 700, color: "#fff", lineHeight: 1.25,
            fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5,
            textShadow: hasPoster ? "0 1px 4px rgba(0,0,0,0.8)" : "none",
          }}>{film.title}</div>
          <div style={{
            fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2,
            fontFamily: "'JetBrains Mono', monospace",
            textShadow: hasPoster ? "0 1px 3px rgba(0,0,0,0.8)" : "none",
          }}>{film.year}</div>
        </div>

        {/* Cult badge */}
        {SHOW_COMMUNITY_STATS && br > 50 && !userVote && !hasPoster && (
          <div style={{
            position: "absolute", bottom: 10,
            background: `${C.brown}22`, border: `1px solid ${C.brown}44`,
            borderRadius: 3, padding: "2px 8px",
          }}>
            <span style={{
              fontSize: 8, fontWeight: 700, color: C.brown,
              textTransform: "uppercase", letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace",
            }}>Cult Favorite</span>
          </div>
        )}
      </div>

      {/* Vote buttons — overlapping the bottom of the poster */}
      {SHOW_VOTING && (
      <div style={{
        position: "absolute", bottom: -14, left: 0, right: 0, zIndex: 5,
        display: "flex", justifyContent: "center",
        padding: "0 6px",
      }}>
        <div style={{
          background: "rgba(17,17,17,0.88)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          borderRadius: 8, padding: "5px 8px",
          border: `1px solid ${userVote ? `${VOTE_TYPES.find(v => v.key === userVote)?.color}33` : "rgba(255,255,255,0.08)"}`,
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        }}>
          <VoteRow filmId={film.item_id} userVote={userVote} onVote={onVote} compact />
        </div>
      </div>
      )}

    </div>
  );
};

// ── Film Modal ──────────────────────────────────────────────────────────

const FilmModal = ({ film, onClose, userVote, onVote, isAuthed, isAdmin, onUpdateItem, allGenres, communityId, episodeUrl }) => {
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminToast, setAdminToast] = useState(null);

  // Host verdict editing
  const hostData = parseExtra(film?.extra_data);
  const [hUp, setHUp] = useState(hostData.up || 0);
  const [hDown, setHDown] = useState(hostData.down || 0);
  const [hBrown, setHBrown] = useState(hostData.brown || 0);

  // TMDB title swap
  const [tmdbQuery, setTmdbQuery] = useState("");
  const [tmdbResults, setTmdbResults] = useState([]);
  const [tmdbSearching, setTmdbSearching] = useState(false);

  // Category
  const [newCategory, setNewCategory] = useState(film?.miniseries_title || "");

  // Reset admin state when film changes
  useEffect(() => {
    if (!film) return;
    const hd = parseExtra(film.extra_data);
    setHUp(hd.up || 0);
    setHDown(hd.down || 0);
    setHBrown(hd.brown || 0);
    setNewCategory(film.miniseries_title || "");
    setAdminOpen(false);
    setTmdbQuery("");
    setTmdbResults([]);
  }, [film?.item_id]);

  // TMDB search
  useEffect(() => {
    if (!tmdbQuery || tmdbQuery.length < 2) { setTmdbResults([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setTmdbSearching(true);
      const results = await searchTMDB(tmdbQuery);
      if (!cancelled) { setTmdbResults(results); setTmdbSearching(false); }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [tmdbQuery]);

  if (!film) return null;
  const g = film.green_count || 0, r = film.red_count || 0;
  const br = film.brown_count || 0, y = film.yellow_count || 0;
  const avg = film.avg_rating || 0;
  const total = film.total_logged || 0;

  // ── Admin save handlers ──
  const saveVerdicts = async () => {
    setAdminSaving(true);
    const extraData = {};
    if (hUp > 0) extraData.up = hUp;
    if (hDown > 0) extraData.down = hDown;
    if (hBrown > 0) extraData.brown = hBrown;
    try {
      const { error } = await supabase
        .from("community_items")
        .update({ extra_data: Object.keys(extraData).length > 0 ? extraData : null })
        .eq("id", film.item_id);
      if (error) throw error;
      onUpdateItem(film.item_id, { extra_data: Object.keys(extraData).length > 0 ? extraData : null });
      setAdminToast("Verdicts saved ✓");
      setTimeout(() => setAdminToast(null), 2000);
    } catch (e) { console.error("[Admin] Verdict save error:", e); setAdminToast("Error saving"); }
    setAdminSaving(false);
  };

  const swapTitle = async (tmdbMovie) => {
    setAdminSaving(true);
    const posterPath = tmdbMovie.poster_path || null;
    const title = tmdbMovie.title || tmdbMovie.original_title;
    const year = tmdbMovie.release_date ? parseInt(tmdbMovie.release_date.slice(0, 4)) : null;
    try {
      const { error } = await supabase
        .from("community_items")
        .update({ title, poster_path: posterPath, year, tmdb_id: tmdbMovie.id })
        .eq("id", film.item_id);
      if (error) throw error;
      onUpdateItem(film.item_id, { title, poster_path: posterPath, year, tmdb_id: tmdbMovie.id });
      setTmdbQuery("");
      setTmdbResults([]);
      setAdminToast(`Swapped to "${title}" ✓`);
      setTimeout(() => setAdminToast(null), 2000);
    } catch (e) { console.error("[Admin] Title swap error:", e); setAdminToast("Error swapping"); }
    setAdminSaving(false);
  };

  const saveCategory = async () => {
    if (newCategory === (film.miniseries_title || "")) return;
    setAdminSaving(true);
    try {
      // Look up the target miniseries by title within this community
      const { data: msRows } = await supabase
        .from("community_miniseries")
        .select("id, title")
        .eq("community_id", communityId || film.community_id)
        .eq("title", newCategory)
        .limit(1);
      if (!msRows || msRows.length === 0) throw new Error(`Miniseries "${newCategory}" not found`);
      const { error } = await supabase
        .from("community_items")
        .update({ miniseries_id: msRows[0].id })
        .eq("id", film.item_id);
      if (error) throw error;
      onUpdateItem(film.item_id, { miniseries_title: newCategory });
      setAdminToast("Category updated ✓");
      setTimeout(() => setAdminToast(null), 2000);
    } catch (e) { console.error("[Admin] Category save error:", e); setAdminToast(e.message || "Error saving"); }
    setAdminSaving(false);
  };

  const counterBtn = (val, setVal, color, dir) => (
    <button onClick={() => setVal(Math.max(0, val + dir))} style={{
      width: 28, height: 28, borderRadius: 6, border: `1px solid ${color}44`,
      background: `${color}15`, color, fontSize: 16, fontWeight: 700,
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    }}>{dir > 0 ? "+" : "−"}</button>
  );

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      animation: "fadeIn 0.15s ease",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.bgCard, borderRadius: 12, padding: 28, maxWidth: 420, width: "92%",
        border: `1px solid ${C.goldBorder}`, boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        animation: "modalIn 0.2s ease", maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              margin: 0, fontSize: 22, fontWeight: 700, color: C.text,
              fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
            }}>{film.title}</h2>
            <span style={{ fontSize: 13, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
              {film.year} · {film.miniseries_title || ""}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0, marginLeft: 8 }}>
            {isAdmin && (
              <button onClick={() => setAdminOpen(!adminOpen)} title="Admin" style={{
                background: adminOpen ? `${C.gold}22` : "rgba(255,255,255,0.06)",
                border: `1px solid ${adminOpen ? C.gold : "rgba(255,255,255,0.1)"}`,
                borderRadius: "50%", width: 30, height: 30,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.2s",
                transform: adminOpen ? "rotate(90deg)" : "rotate(0deg)",
              }}>
                <span style={{ fontSize: 14, color: adminOpen ? C.gold : C.textDim }}>⚙</span>
              </button>
            )}
            <button onClick={onClose} style={{
              background: "none", border: "none", color: C.textDim,
              fontSize: 22, cursor: "pointer", padding: "0 4px", lineHeight: 1,
            }}>×</button>
          </div>
        </div>

        {/* ═══ ADMIN PANEL ═══ */}
        {adminOpen && isAdmin && (
          <div style={{
            marginTop: 14, padding: 14, borderRadius: 8,
            background: `${C.gold}08`, border: `1px solid ${C.gold}25`,
            animation: "modalIn 0.15s ease",
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: C.gold, textTransform: "uppercase",
              letterSpacing: 2, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 11 }}>⚙</span> Admin Controls
            </div>

            {/* ── Host Verdicts ── */}
            <div style={{ marginBottom: 14 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase",
                letterSpacing: 1.5, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace",
              }}>Host Verdicts</div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                {/* Up */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {counterBtn(hUp, setHUp, C.green, -1)}
                  <div style={{ textAlign: "center", minWidth: 32 }}>
                    <span style={{ fontSize: 9, color: C.green, display: "block", fontFamily: "'JetBrains Mono', monospace" }}>▲</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: C.green, fontFamily: "'Oswald', sans-serif" }}>{hUp}</span>
                  </div>
                  {counterBtn(hUp, setHUp, C.green, 1)}
                </div>
                {/* Down */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {counterBtn(hDown, setHDown, C.red, -1)}
                  <div style={{ textAlign: "center", minWidth: 32 }}>
                    <span style={{ fontSize: 9, color: C.red, display: "block", fontFamily: "'JetBrains Mono', monospace" }}>▼</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: C.red, fontFamily: "'Oswald', sans-serif" }}>{hDown}</span>
                  </div>
                  {counterBtn(hDown, setHDown, C.red, 1)}
                </div>
                {/* Brown */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {counterBtn(hBrown, setHBrown, C.brown, -1)}
                  <div style={{ textAlign: "center", minWidth: 32 }}>
                    <span style={{ fontSize: 9, color: C.brown, display: "block", fontFamily: "'JetBrains Mono', monospace" }}>◆</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: C.brown, fontFamily: "'Oswald', sans-serif" }}>{hBrown}</span>
                  </div>
                  {counterBtn(hBrown, setHBrown, C.brown, 1)}
                </div>
                <button onClick={saveVerdicts} disabled={adminSaving} style={{
                  marginLeft: "auto", padding: "5px 14px", borderRadius: 6,
                  background: `${C.gold}18`, border: `1px solid ${C.gold}55`,
                  color: C.gold, fontSize: 10, fontWeight: 700, cursor: adminSaving ? "wait" : "pointer",
                  fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 1,
                  opacity: adminSaving ? 0.5 : 1,
                }}>Save</button>
              </div>
            </div>

            {/* ── TMDB Title Swap ── */}
            <div style={{ marginBottom: 14 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase",
                letterSpacing: 1.5, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace",
              }}>Title / Poster (TMDB)</div>
              <input
                type="text"
                placeholder="Search TMDB..."
                value={tmdbQuery}
                onChange={(e) => setTmdbQuery(e.target.value)}
                style={{
                  width: "100%", padding: "7px 10px", borderRadius: 6,
                  background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
                  color: C.text, fontSize: 12, fontFamily: "'Source Sans 3', sans-serif",
                  outline: "none", boxSizing: "border-box",
                }}
              />
              {tmdbSearching && (
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                  Searching...
                </div>
              )}
              {tmdbResults.length > 0 && (
                <div style={{
                  marginTop: 6, maxHeight: 200, overflowY: "auto",
                  borderRadius: 6, border: `1px solid ${C.border}`, background: C.bgDeep,
                }}>
                  {tmdbResults.map((r) => (
                    <div key={r.id} onClick={() => swapTitle(r)} style={{
                      display: "flex", gap: 8, padding: "6px 8px", cursor: "pointer",
                      borderBottom: `1px solid ${C.border}`, alignItems: "center",
                      transition: "background 0.1s",
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(245,197,24,0.08)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      {r.poster_path ? (
                        <img src={`${TMDB_IMG}/w92${r.poster_path}`} alt="" style={{
                          width: 28, height: 42, borderRadius: 3, objectFit: "cover", flexShrink: 0,
                        }} />
                      ) : (
                        <div style={{
                          width: 28, height: 42, borderRadius: 3, background: "rgba(255,255,255,0.05)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, color: C.textDim, flexShrink: 0,
                        }}>?</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 600, color: C.text,
                          fontFamily: "'Source Sans 3', sans-serif",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{r.title || r.original_title}</div>
                        <div style={{ fontSize: 10, color: C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                          {r.release_date?.slice(0, 4) || "?"} · ID {r.id}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Category / Miniseries ── */}
            <div>
              <div style={{
                fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase",
                letterSpacing: 1.5, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace",
              }}>Category</div>
              <div style={{ display: "flex", gap: 6 }}>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{
                    flex: 1, padding: "7px 10px", borderRadius: 6,
                    background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
                    color: C.text, fontSize: 12, fontFamily: "'Source Sans 3', sans-serif",
                    outline: "none", appearance: "none", WebkitAppearance: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="" style={{ background: C.bgCard }}>— None —</option>
                  {(allGenres || []).filter(g => g !== "All").map((g) => (
                    <option key={g} value={g} style={{ background: C.bgCard }}>{g}</option>
                  ))}
                </select>
                <button onClick={saveCategory} disabled={adminSaving || newCategory === (film.miniseries_title || "")} style={{
                  padding: "5px 14px", borderRadius: 6,
                  background: `${C.gold}18`, border: `1px solid ${C.gold}55`,
                  color: C.gold, fontSize: 10, fontWeight: 700, cursor: (adminSaving || newCategory === (film.miniseries_title || "")) ? "default" : "pointer",
                  fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 1,
                  opacity: (adminSaving || newCategory === (film.miniseries_title || "")) ? 0.35 : 1,
                }}>Move</button>
              </div>
            </div>

            {/* Admin toast */}
            {adminToast && (
              <div style={{
                marginTop: 10, padding: "6px 12px", borderRadius: 6,
                background: `${C.gold}15`, border: `1px solid ${C.gold}33`,
                fontSize: 11, fontWeight: 600, color: C.gold,
                fontFamily: "'JetBrains Mono', monospace", textAlign: "center",
              }}>{adminToast}</div>
            )}
          </div>
        )}

        {/* ─── Rating Hero ─── */}
        {SHOW_COMMUNITY_STATS && (
        <div style={{ textAlign: "center", margin: "24px 0 18px" }}>
          <div style={{
            fontSize: 52, fontWeight: 800, color: C.gold,
            fontFamily: "'Oswald', sans-serif", lineHeight: 1,
          }}>{avg > 0 ? Number(avg).toFixed(1) : "—"}</div>
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
            {total > 0 ? `avg from ${total.toLocaleString()} logs` : "No logs yet"}
          </div>
        </div>
        )}

        {/* ─── Host Verdicts — promoted ─── */}
        {(hostData.up > 0 || hostData.down > 0 || hostData.brown > 0) && (
          <div style={{
            margin: "0 0 18px", padding: "16px 18px", borderRadius: 10,
            background: `linear-gradient(135deg, rgba(245,197,24,0.06) 0%, rgba(245,197,24,0.02) 100%)`,
            border: `1px solid ${C.goldBorder}`,
          }}>
            <div style={{
              fontSize: 10, color: C.gold, textTransform: "uppercase",
              letterSpacing: 2.5, marginBottom: 12, fontFamily: "'Oswald', sans-serif",
              fontWeight: 700, textAlign: "center",
            }}>Host Verdicts</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, alignItems: "center" }}>
              {(hostData.up || 0) > 0 && Array(hostData.up).fill(0).map((_, i) => (
                <div key={`hu${i}`} style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: "rgba(74,222,128,0.15)", border: "1.5px solid rgba(74,222,128,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 4L3 15h6v5h6v-5h6L12 4z" fill="rgba(74,222,128,0.9)" />
                  </svg>
                </div>
              ))}
              {(hostData.down || 0) > 0 && Array(hostData.down).fill(0).map((_, i) => (
                <div key={`hd${i}`} style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: "rgba(239,68,68,0.15)", border: "1.5px solid rgba(239,68,68,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 20L21 9h-6V4H9v5H3l9 11z" fill="rgba(239,68,68,0.9)" />
                  </svg>
                </div>
              ))}
              {(hostData.brown || 0) > 0 && Array(hostData.brown).fill(0).map((_, i) => (
                <div key={`hb${i}`} style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: "rgba(160,82,45,0.2)", border: "1.5px solid rgba(205,133,63,0.5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 4L3 15h6v5h6v-5h6L12 4z" fill="rgba(205,133,63,0.9)" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Listen to Episode — podcast links ─── */}
        <div style={{
          margin: "0 0 18px", padding: "14px 16px", borderRadius: 10,
          background: "rgba(255,255,255,0.02)",
          border: `1px solid ${C.border}`,
        }}>
          <div style={{
            fontSize: 10, color: C.textDim, textTransform: "uppercase",
            letterSpacing: 2.5, marginBottom: 10, fontFamily: "'Oswald', sans-serif",
            fontWeight: 700, display: "flex", alignItems: "center", gap: 6,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0118 0v6" />
              <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
            </svg>
            Listen to Episode
          </div>
          <EpisodeLink title={film.title} episodeUrl={episodeUrl} />
        </div>

        {/* ─── Community Verdicts ─── */}
        {SHOW_COMMUNITY_STATS && (<>
        <div style={{
          fontSize: 10, color: C.textDim, textTransform: "uppercase",
          letterSpacing: 2.5, marginBottom: 10, fontFamily: "'Oswald', sans-serif",
          fontWeight: 700,
        }}>Community Verdicts</div>
        <div style={{ marginBottom: 18 }}>
          <ArrowBar green={g} red={r} brown={br} yellow={y} total={total || 1} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Recommended", count: g, color: C.green, icon: "▲" },
            { label: "Not Rec.", count: r, color: C.red, icon: "▼" },
            { label: "Neutral", count: y, color: C.yellow, icon: "●" },
            { label: "Brown Arrow", count: br, color: C.brown, icon: "◆" },
          ].map((s) => (
            <div key={s.label} style={{
              background: `${s.color}0d`, borderRadius: 8, padding: "10px 12px",
              border: `1px solid ${s.color}1a`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ color: s.color, fontSize: 13 }}>{s.icon}</span>
                <span style={{ color: s.color, fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                  {s.count}
                </span>
              </div>
              <div style={{
                fontSize: 9, color: C.textDim, marginTop: 2,
                textTransform: "uppercase", letterSpacing: 1.2, fontFamily: "'JetBrains Mono', monospace",
              }}>{s.label}</div>
            </div>
          ))}
        </div>
        </>)}

        {/* ─── Links: Track on MANTL + Visit NPP ─── */}
        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {isAuthed && (
            <a href={MANTL_APP_URL} target="_blank" rel="noopener noreferrer" style={{
              fontSize: 11, color: C.textDim, textDecoration: "none",
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5,
              transition: "color 0.15s",
            }}
              onMouseEnter={(e) => e.currentTarget.style.color = C.gold}
              onMouseLeave={(e) => e.currentTarget.style.color = C.textDim}
            >See full tracker on MANTL →</a>
          )}
          <a href={NPP_WEBSITE} target="_blank" rel="noopener noreferrer" style={{
            fontSize: 11, color: C.textDim, textDecoration: "none",
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5,
            transition: "color 0.15s",
          }}
            onMouseEnter={(e) => e.currentTarget.style.color = C.gold}
            onMouseLeave={(e) => e.currentTarget.style.color = C.textDim}
          >nowplayingpodcast.com →</a>
        </div>
      </div>
    </div>
  );
};

// ── Episode Card (rich schedule card) ────────────────────────────────────

const EpisodeCard = ({ ep, isUpcoming, index, userVote, onVote, isAuthed, isAdmin, films, onLinkEpisode }) => {
  const [expanded, setExpanded] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [tmdbQuery, setTmdbQuery] = useState("");
  const [tmdbResults, setTmdbResults] = useState([]);
  const [tmdbSearching, setTmdbSearching] = useState(false);
  const [linking, setLinking] = useState(false);

  const film = ep.matchedFilm;
  const hasPoster = !!film?.poster_path;
  const hostData = parseExtra(film?.extra_data);
  const g = film?.green_count || 0, r = film?.red_count || 0, br = film?.brown_count || 0;
  const avg = film?.avg_rating || 0;
  const total = film?.total_logged || 0;

  // TMDB search with debounce
  useEffect(() => {
    if (!tmdbQuery || tmdbQuery.length < 2) { setTmdbResults([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setTmdbSearching(true);
      const results = await searchTMDB(tmdbQuery);
      if (!cancelled) { setTmdbResults(results); setTmdbSearching(false); }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [tmdbQuery]);

  // Pre-fill search when admin opens
  useEffect(() => {
    if (adminOpen && !tmdbQuery) {
      // Strip common suffixes like "(2025)" from episode title for cleaner search
      const clean = (ep.title || "").replace(/\s*\(\d{4}\)\s*$/, "").trim();
      setTmdbQuery(clean);
    }
  }, [adminOpen]);

  const handleLink = async (tmdbMovie) => {
    if (!ep.guid || linking) return;
    setLinking(true);

    const tmdbId = tmdbMovie.id;
    const posterPath = tmdbMovie.poster_path || null;

    // Find matching community_item by tmdb_id
    const match = (films || []).find(f => String(f.tmdb_id) === String(tmdbId));

    if (match) {
      // Update rss_guid on the existing item
      const { error } = await supabase
        .from("community_items")
        .update({ rss_guid: ep.guid })
        .eq("id", match.item_id);

      if (!error && onLinkEpisode) {
        onLinkEpisode(match.item_id, ep.guid, { poster_path: match.poster_path || posterPath });
      }
    } else {
      // No DB item with this tmdb_id — update poster on closest title match, or inform admin
      const titleMatch = (films || []).find(f =>
        (f.title || "").toLowerCase().replace(/\s*\(\d{4}\)/, "").trim() ===
        (tmdbMovie.title || tmdbMovie.original_title || "").toLowerCase().trim()
      );
      if (titleMatch) {
        const { error } = await supabase
          .from("community_items")
          .update({ rss_guid: ep.guid, poster_path: posterPath, tmdb_id: tmdbId })
          .eq("id", titleMatch.item_id);

        if (!error && onLinkEpisode) {
          onLinkEpisode(titleMatch.item_id, ep.guid, { poster_path: posterPath, tmdb_id: tmdbId });
        }
      } else {
        console.warn("[Admin] No DB item found for tmdb_id:", tmdbId, "or title:", tmdbMovie.title);
      }
    }

    setLinking(false);
    setAdminOpen(false);
    setTmdbQuery("");
    setTmdbResults([]);
  };

  return (
    <div style={{
      borderRadius: 8, overflow: "hidden", marginBottom: 10,
      background: isUpcoming ? `${C.gold}06` : C.bgCard,
      border: `1px solid ${isUpcoming ? C.goldBorder : C.border}`,
      animation: `slideUp 0.3s ease ${index * 0.06}s both`,
      transition: "border-color 0.2s",
    }}>
      <div style={{ display: "flex", gap: 0 }}>
        {/* Poster thumbnail (if matched to a DB film) */}
        {hasPoster && (
          <div style={{
            width: 72, minHeight: 100, flexShrink: 0,
            background: C.bgDeep, position: "relative", overflow: "hidden",
          }}>
            <img
              src={`${TMDB_IMG}/w154${film.poster_path}`}
              alt={film.title}
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Rating pip on poster */}
            {SHOW_COMMUNITY_STATS && avg > 0 && (
              <div style={{
                position: "absolute", bottom: 4, right: 4,
                background: "rgba(0,0,0,0.75)", borderRadius: 3, padding: "1px 5px",
                backdropFilter: "blur(4px)",
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                  color: g > r ? C.green : C.red,
                }}>{Number(avg).toFixed(1)}</span>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, color: isUpcoming ? C.text : "rgba(240,236,228,0.75)",
                fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
                letterSpacing: 0.3, lineHeight: 1.3,
              }}>{ep.title}</div>
              <div style={{
                fontSize: 11, color: C.textDim, marginTop: 3,
                fontFamily: "'JetBrains Mono', monospace",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span>{ep.dateDisplay}</span>
                {film && (hostData.up > 0 || hostData.down > 0 || hostData.brown > 0) && (
                  <HostPips up={hostData.up || 0} down={hostData.down || 0} brown={hostData.brown || 0} />
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
              {isUpcoming && (
                <div style={{
                  background: `${C.gold}22`, borderRadius: 3, padding: "2px 8px",
                  fontSize: 9, fontWeight: 700, color: C.gold,
                  fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1,
                }}>SOON</div>
              )}
              {/* Admin link button — only when no matched film */}
              {isAdmin && !film && ep.guid && (
                <button onClick={() => setAdminOpen(!adminOpen)} style={{
                  background: adminOpen ? `${C.gold}22` : "rgba(255,255,255,0.06)",
                  border: `1px solid ${adminOpen ? C.gold : C.border}`,
                  borderRadius: 4, padding: "2px 8px", cursor: "pointer",
                  fontSize: 9, fontWeight: 700,
                  color: adminOpen ? C.gold : C.textDim,
                  fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1,
                  transition: "all 0.15s",
                }}>🔗 LINK</button>
              )}
            </div>
          </div>

          {/* Arrow stats (if matched) */}
          {SHOW_COMMUNITY_STATS && film && total > 0 && (
            <div style={{ marginTop: 8 }}>
              <ArrowBar green={g} red={r} brown={br} yellow={film.yellow_count || 0} total={total} />
              <div style={{
                display: "flex", gap: 10, marginTop: 4,
                fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
              }}>
                <span style={{ color: C.green }}>▲{g}</span>
                <span style={{ color: C.red }}>▼{r}</span>
                {br > 0 && <span style={{ color: C.brown }}>◆{br}</span>}
                <span style={{ color: C.textDim, marginLeft: "auto" }}>{total} logs</span>
              </div>
            </div>
          )}

          {/* Action row: vote buttons + listen link */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginTop: 10, gap: 8,
          }}>
            {/* Vote buttons (only if matched to a DB film) */}
            {SHOW_VOTING && film && (
              <VoteRow filmId={film.item_id} userVote={userVote} onVote={onVote} compact />
            )}

            <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexShrink: 0 }}>
              {/* Expand description */}
              {ep.description && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  style={{
                    background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
                    borderRadius: 4, padding: "4px 8px", cursor: "pointer",
                    fontSize: 10, color: C.textDim, fontFamily: "'JetBrains Mono', monospace",
                    transition: "all 0.15s",
                  }}
                >{expanded ? "Less" : "Info"}</button>
              )}

              {/* Listen link */}
              {ep.link && (
                <a
                  href={ep.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: isUpcoming ? `${C.gold}18` : "rgba(255,255,255,0.06)",
                    border: `1px solid ${isUpcoming ? C.goldBorder : C.border}`,
                    borderRadius: 4, padding: "4px 10px",
                    fontSize: 10, fontWeight: 700, textDecoration: "none",
                    color: isUpcoming ? C.gold : C.textMuted,
                    fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
                    letterSpacing: 1, transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 12 }}>▶</span> Listen
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Admin TMDB Link Panel ── */}
      {adminOpen && isAdmin && (
        <div style={{
          padding: "12px 14px", borderTop: `1px solid ${C.goldBorder}`,
          background: `${C.gold}06`,
        }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: C.gold, textTransform: "uppercase",
            letterSpacing: 2, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace",
          }}>Link to TMDB Film</div>

          {/* TMDB Search */}
          <div style={{ position: "relative", marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Search TMDB..."
              value={tmdbQuery}
              onChange={(e) => setTmdbQuery(e.target.value)}
              style={{
                width: "100%", padding: "7px 10px", borderRadius: 6,
                background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
                color: C.text, fontSize: 12, fontFamily: "'Source Sans 3', sans-serif",
                outline: "none", boxSizing: "border-box",
              }}
            />
            {tmdbSearching && (
              <span style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                fontSize: 10, color: C.textDim,
              }}>...</span>
            )}
          </div>

          {/* GUID info */}
          <div style={{
            fontSize: 9, color: C.textDim, fontFamily: "'JetBrains Mono', monospace",
            marginBottom: 8, wordBreak: "break-all",
          }}>guid: {ep.guid || "none"}</div>

          {/* Results */}
          {tmdbResults.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {tmdbResults.map((r) => {
                const inDb = (films || []).some(f => String(f.tmdb_id) === String(r.id));
                return (
                  <div key={r.id} onClick={() => handleLink(r)} style={{
                    display: "flex", gap: 10, alignItems: "center", padding: "6px 8px",
                    borderRadius: 6, cursor: linking ? "wait" : "pointer",
                    background: inDb ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${inDb ? "rgba(74,222,128,0.25)" : C.border}`,
                    transition: "all 0.15s",
                    opacity: linking ? 0.5 : 1,
                  }}>
                    {r.poster_path ? (
                      <img
                        src={`${TMDB_IMG}/w92${r.poster_path}`}
                        alt={r.title}
                        style={{ width: 36, height: 54, borderRadius: 3, objectFit: "cover", flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{
                        width: 36, height: 54, borderRadius: 3, flexShrink: 0,
                        background: C.bgDeep, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, color: C.textDim,
                      }}>?</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 600, color: C.text,
                        fontFamily: "'Source Sans 3', sans-serif",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{r.title || r.original_title}</div>
                      <div style={{
                        fontSize: 10, color: C.textDim, fontFamily: "'JetBrains Mono', monospace",
                        display: "flex", gap: 8, alignItems: "center",
                      }}>
                        <span>{r.release_date?.slice(0, 4) || "?"}</span>
                        <span>ID {r.id}</span>
                        {inDb && (
                          <span style={{
                            fontSize: 8, fontWeight: 700, color: C.green,
                            textTransform: "uppercase", letterSpacing: 1,
                          }}>In DB</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tmdbQuery.length >= 2 && !tmdbSearching && tmdbResults.length === 0 && (
            <div style={{ fontSize: 11, color: C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
              No results
            </div>
          )}
        </div>
      )}

      {/* Expandable description */}
      {expanded && ep.description && (
        <div style={{
          padding: "0 14px 12px",
          marginLeft: hasPoster ? 72 : 0,
          borderTop: `1px solid ${C.border}`,
        }}>
          <p style={{
            fontSize: 12, color: C.textMuted, lineHeight: 1.6,
            fontFamily: "'Source Sans 3', sans-serif",
            margin: "10px 0 0",
          }}>
            {/* Strip HTML from RSS description */}
            {ep.description.replace(/<[^>]*>/g, "").slice(0, 300)}
            {ep.description.length > 300 ? "…" : ""}
          </p>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════

export default function NPPDashboard({ session: sessionProp }) {
  const COMMUNITY_SLUG = "nowplaying";

  // ── Self-managed auth (works standalone or with passed session) ──
  const [localSession, setLocalSession] = useState(sessionProp || null);
  const session = sessionProp || localSession;

  useEffect(() => {
    if (sessionProp) return; // parent manages session
    supabase.auth.getSession().then(({ data: { session: s } }) => setLocalSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setLocalSession(s));
    return () => subscription.unsubscribe();
  }, [sessionProp]);

  const [showLogin, setShowLogin] = useState(false);
  const [revealedBadges, setRevealedBadges] = useState(new Set());

  const [loading, setLoading] = useState(true);
  const [communityId, setCommunityId] = useState(null);
  const [rssUrl, setRssUrl] = useState("");
  const [films, setFilms] = useState([]);
  const [genres, setGenres] = useState(["All"]);
  const [bucketMap, setBucketMap] = useState({});  // miniseries_id → genre_bucket
  const [memberStats, setMemberStats] = useState({ total_members: 0, active_this_week: 0, total_logs: 0 });
  const [badgeCount, setBadgeCount] = useState(0);

  const [userVotes, setUserVotes] = useState({});

  // Schedule
  const [rssEpisodes, setRssEpisodes] = useState([]);
  const [rssLoading, setRssLoading] = useState(false);
  const [rssError, setRssError] = useState(null);

  const [activeBucket, setActiveBucket] = useState(null);  // null = All
  const [activeFranchise, setActiveFranchise] = useState(null);  // null = all in bucket
  const [sortBy, setSortBy] = useState("az");
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("grid");
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const PAGE_SIZE = 48;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const isAuthed = !!session?.user;
  const userId = session?.user?.id || null;

  // ── Load Data ─────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const { data: page } = await supabase
          .from("community_pages")
          .select("id, slug, name, theme_config")
          .eq("slug", COMMUNITY_SLUG)
          .single();

        if (!page) { setLoading(false); return; }
        setCommunityId(page.id);
        setRssUrl(page.theme_config?.rss_url || "");

        const [itemsRes, statsRes, msRes, badgeRes] = await Promise.all([
          supabase.from("community_item_stats").select("*").eq("community_id", page.id).order("sort_order", { ascending: true }),
          supabase.from("community_member_stats").select("*").eq("slug", COMMUNITY_SLUG).single(),
          supabase.from("community_miniseries").select("id, title, genre_bucket").eq("community_id", page.id),
          supabase.from("badges").select("id").eq("community_id", page.id).eq("is_active", true),
        ]);

        const items = (itemsRes.data || []).filter(i => i.tmdb_id);
        setFilms(items);
        setBadgeCount((badgeRes.data || []).length);

        // Build bucket map: miniseries_id → genre_bucket
        const bMap = {};
        (msRes.data || []).forEach(ms => { bMap[ms.id] = ms.genre_bucket || "other"; });
        setBucketMap(bMap);

        const genreSet = new Set(items.map(i => i.miniseries_title).filter(Boolean));
        setGenres(["All", ...Array.from(genreSet).sort()]);

        if (statsRes.data) setMemberStats(statsRes.data);

        // Load user votes (batched — Supabase .in() has URL length limits)
        if (userId) {
          const itemIds = items.map(i => i.item_id);
          if (itemIds.length > 0) {
            const BATCH = 200;
            const allProgress = [];
            for (let i = 0; i < itemIds.length; i += BATCH) {
              const chunk = itemIds.slice(i, i + BATCH);
              const { data } = await supabase
                .from("community_user_progress")
                .select("item_id, status, rating, brown_arrow")
                .eq("user_id", userId)
                .in("item_id", chunk);
              if (data) allProgress.push(...data);
            }

            const votes = {};
            allProgress.forEach(row => {
              const key = voteKeyFromProgress(row);
              if (key) votes[row.item_id] = key;
            });
            setUserVotes(votes);
          }
        }
      } catch (err) {
        console.error("[NPPDashboard] Load error:", err);
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  // ── Fetch RSS for Schedule ────────────────────────────────────────
  const loadRSS = useCallback(async () => {
    const feedUrl = rssUrl || "https://www.nowplayingpodcast.com/NPP.xml";
    if (!feedUrl) return;

    setRssLoading(true);
    setRssError(null);

    try {
      // Use the Edge Function to avoid CORS
      const res = await fetch(`${SUPABASE_URL}/functions/v1/rss-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Edge function works with anon key too for read-only RSS fetch
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ rss_url: feedUrl, limit: 30 }),
      });

      if (!res.ok) throw new Error("Failed to fetch RSS");

      const { episodes } = await res.json();
      setRssEpisodes(episodes || []);
    } catch (err) {
      console.error("[NPPDashboard] RSS error:", err);
      setRssError("Couldn't load schedule");
    }
    setRssLoading(false);
  }, [rssUrl, session]);

  // Load RSS when schedule tab is opened, or eagerly on mount for episode links
  const rssFetched = useRef(false);
  useEffect(() => {
    if (rssFetched.current || rssLoading) return;
    rssFetched.current = true;
    loadRSS();
  }, [loadRSS]);

  // ── Schedule Data ─────────────────────────────────────────────────
  // Build a guid→film lookup for matching RSS episodes to DB items
  const guidToFilm = useMemo(() => {
    const map = {};
    films.forEach(f => { if (f.rss_guid) map[f.rss_guid] = f; });
    return map;
  }, [films]);

  // Build guid→episodeUrl lookup so FilmModal/FilmCard can link to episodes
  const guidToEpisodeUrl = useMemo(() => {
    const map = {};
    rssEpisodes.forEach(ep => {
      if (ep.guid && (ep.link || ep.url)) {
        map[ep.guid] = ep.link || ep.url;
      }
    });
    return map;
  }, [rssEpisodes]);

  // Helper: get episode URL for a film (by rss_guid)
  const getEpisodeUrl = useCallback((film) => {
    if (!film?.rss_guid) return null;
    return guidToEpisodeUrl[film.rss_guid] || null;
  }, [guidToEpisodeUrl]);

  const { upcoming, recent } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build from RSS episodes (primary source — has links, descriptions, dates)
    const rssItems = rssEpisodes
      .filter(ep => ep.pubDate)
      .map(ep => {
        const d = new Date(ep.pubDate);
        // Match to DB film by rss_guid
        const matchedFilm = ep.guid ? guidToFilm[ep.guid] : null;
        return {
          title: ep.title,
          date: d,
          dateDisplay: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
          link: ep.link || ep.url || null,
          description: ep.description || ep.summary || null,
          guid: ep.guid,
          matchedFilm,
          source: "rss",
          key: `rss-${ep.guid || ep.title}`,
        };
      });

    // Also include DB items with air_date that AREN'T in the RSS (edge case: manually added)
    const rssGuids = new Set(rssEpisodes.map(ep => ep.guid).filter(Boolean));
    const dbOnlyItems = films
      .filter(f => f.air_date && (!f.rss_guid || !rssGuids.has(f.rss_guid)))
      .map(f => ({
        title: f.title,
        date: new Date(f.air_date),
        dateDisplay: new Date(f.air_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
        link: null,
        description: null,
        guid: f.rss_guid,
        matchedFilm: f,
        source: "db",
        key: `db-${f.item_id}`,
      }));

    const allItems = [...rssItems, ...dbOnlyItems];

    const up = allItems
      .filter(i => i.date >= today)
      .sort((a, b) => a.date - b.date)
      .slice(0, 10);

    const rec = allItems
      .filter(i => i.date < today)
      .sort((a, b) => b.date - a.date)
      .slice(0, 15);

    return { upcoming: up, recent: rec };
  }, [films, rssEpisodes, guidToFilm]);

  // ── Vote Handler ──────────────────────────────────────────────────
  const userVotesRef = useRef(userVotes);
  useEffect(() => { userVotesRef.current = userVotes; }, [userVotes]);

  const handleVote = useCallback(async (itemId, voteKey) => {
    if (!isAuthed) {
      setShowLogin(true);
      return;
    }

    // Capture old state for rollback before any optimistic updates
    const oldVote = userVotesRef.current[itemId] || null;

    // Optimistic UI — votes
    setUserVotes((prev) => {
      const updated = { ...prev };
      if (voteKey === null) delete updated[itemId];
      else updated[itemId] = voteKey;
      return updated;
    });

    // Optimistic UI — counts (uses captured oldVote, not stale closure)
    setFilms(prev => prev.map(f => {
      if (f.item_id !== itemId) return f;
      const updated = { ...f };

      if (oldVote === "up") updated.green_count = Math.max(0, (updated.green_count || 0) - 1);
      if (oldVote === "down") updated.red_count = Math.max(0, (updated.red_count || 0) - 1);
      if (oldVote === "neutral") updated.yellow_count = Math.max(0, (updated.yellow_count || 0) - 1);
      if (oldVote === "brown") updated.brown_count = Math.max(0, (updated.brown_count || 0) - 1);
      if (oldVote) updated.total_logged = Math.max(0, (updated.total_logged || 0) - 1);

      if (voteKey === "up") updated.green_count = (updated.green_count || 0) + 1;
      if (voteKey === "down") updated.red_count = (updated.red_count || 0) + 1;
      if (voteKey === "neutral") updated.yellow_count = (updated.yellow_count || 0) + 1;
      if (voteKey === "brown") updated.brown_count = (updated.brown_count || 0) + 1;
      if (voteKey) updated.total_logged = (updated.total_logged || 0) + 1;

      return updated;
    }));

    const film = films.find(f => f.item_id === itemId);

    try {
      if (voteKey === null) {
        const { error } = await supabase.from("community_user_progress")
          .delete().eq("user_id", session.user.id).eq("item_id", itemId);
        if (error) throw error;
        setToast({ msg: "Vote removed", link: null });
      } else {
        const vt = VOTE_TYPES.find(v => v.key === voteKey);
        const { error } = await supabase.from("community_user_progress")
          .upsert({
            user_id: session.user.id,
            item_id: itemId,
            status: "completed",
            rating: vt.rating,
            brown_arrow: vt.brownArrow,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,item_id" });
        if (error) throw error;
        setToast({ msg: `${vt.label} — ${film?.title || ""}`, link: MANTL_APP_URL });
      }
    } catch (err) {
      console.error("[NPPDashboard] Vote error:", err);
      // Rollback optimistic updates
      setUserVotes((prev) => {
        const reverted = { ...prev };
        if (oldVote === null) delete reverted[itemId];
        else reverted[itemId] = oldVote;
        return reverted;
      });
      setFilms(prev => prev.map(f => {
        if (f.item_id !== itemId) return f;
        const reverted = { ...f };

        // Undo what we just added
        if (voteKey === "up") reverted.green_count = Math.max(0, (reverted.green_count || 0) - 1);
        if (voteKey === "down") reverted.red_count = Math.max(0, (reverted.red_count || 0) - 1);
        if (voteKey === "neutral") reverted.yellow_count = Math.max(0, (reverted.yellow_count || 0) - 1);
        if (voteKey === "brown") reverted.brown_count = Math.max(0, (reverted.brown_count || 0) - 1);
        if (voteKey) reverted.total_logged = Math.max(0, (reverted.total_logged || 0) - 1);

        // Re-apply the old vote
        if (oldVote === "up") reverted.green_count = (reverted.green_count || 0) + 1;
        if (oldVote === "down") reverted.red_count = (reverted.red_count || 0) + 1;
        if (oldVote === "neutral") reverted.yellow_count = (reverted.yellow_count || 0) + 1;
        if (oldVote === "brown") reverted.brown_count = (reverted.brown_count || 0) + 1;
        if (oldVote) reverted.total_logged = (reverted.total_logged || 0) + 1;

        return reverted;
      }));
      setToast({ msg: "Vote failed — try again", link: null });
    }
  }, [isAuthed, session, films]);

  const isAdmin = isAuthed && ADMIN_IDS.includes(session?.user?.id);

  // ── Admin: update item in local state after DB write ──────
  const handleUpdateItem = useCallback((itemId, updates) => {
    setFilms(prev => prev.map(f => {
      if (f.item_id !== itemId) return f;
      return { ...f, ...updates };
    }));
    // If the selected film is the one updated, refresh it too
    setSelected(prev => {
      if (!prev || prev.item_id !== itemId) return prev;
      return { ...prev, ...updates };
    });
  }, []);

  // ── Admin: link an RSS episode to a DB film by setting rss_guid ──
  const handleLinkEpisode = useCallback((itemId, rssGuid, updates) => {
    setFilms(prev => prev.map(f => {
      if (f.item_id !== itemId) return f;
      return { ...f, ...updates, rss_guid: rssGuid };
    }));
    setToast({ msg: `Linked episode ✓`, link: null });
  }, []);

  // ── Bucket + Franchise derived data ─────────────────────────────
  const { buckets, franchisesInBucket } = useMemo(() => {
    // Build ordered bucket list with film counts
    const bucketCounts = {};
    films.forEach(f => {
      const b = bucketMap[f.miniseries_id] || "other";
      bucketCounts[b] = (bucketCounts[b] || 0) + 1;
    });
    // Order buckets by BUCKET_LABELS key order, then any extras
    const orderedKeys = Object.keys(BUCKET_LABELS).filter(k => bucketCounts[k]);
    const extraKeys = Object.keys(bucketCounts).filter(k => !BUCKET_LABELS[k]);
    const bkts = [...orderedKeys, ...extraKeys].map(k => ({
      key: k,
      label: (BUCKET_LABELS[k] || {}).label || k,
      icon: (BUCKET_LABELS[k] || {}).icon || "",
      count: bucketCounts[k] || 0,
    }));

    // Build franchise list within active bucket
    const franchises = {};
    films.forEach(f => {
      const b = bucketMap[f.miniseries_id] || "other";
      if (activeBucket && b !== activeBucket) return;
      const fr = f.miniseries_title || "Unknown";
      franchises[fr] = (franchises[fr] || 0) + 1;
    });
    const frList = Object.entries(franchises)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => ({ name, count }));

    return { buckets: bkts, franchisesInBucket: frList };
  }, [films, bucketMap, activeBucket]);

  // ── Filter + Sort ─────────────────────────────────────────────────
  const filtered = useMemo(() => films
    .filter((f) => {
      if (!activeBucket) return true;
      return (bucketMap[f.miniseries_id] || "other") === activeBucket;
    })
    .filter((f) => {
      if (!activeFranchise) return true;
      return f.miniseries_title === activeFranchise;
    })
    .filter((f) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (f.title || "").toLowerCase().includes(q) || String(f.year || "").includes(q);
    })
    .sort((a, b) => {
      if (sortBy === "az") return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "za") return (b.title || "").localeCompare(a.title || "");
      if (sortBy === "avg" || sortBy === "divisive") {
        const hostScore = (f) => {
          const h = parseExtra(f.extra_data);
          return ((h.up || 0) * 3) - ((h.down || 0) * 2) - ((h.brown || 0) * 10);
        };
        return sortBy === "avg" ? hostScore(b) - hostScore(a) : hostScore(a) - hostScore(b);
      }
      if (sortBy === "popular") return (b.total_logged || 0) - (a.total_logged || 0);
      if (sortBy === "recent") return (b.year || 0) - (a.year || 0);
      return 0;
    }), [films, activeBucket, activeFranchise, searchQuery, sortBy, bucketMap]);

  // Reset progressive load when filters/sort change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeBucket, activeFranchise, sortBy, searchQuery]);

  const visibleFilms = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const tabBtn = (key, label) => ({
    padding: "10px 20px", background: "none", border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 700, transition: "all 0.2s",
    fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 1.5,
    color: tab === key ? C.gold : C.textDim,
    borderBottom: tab === key ? `2px solid ${C.gold}` : "2px solid transparent",
  });

  if (loading) return <Skeleton />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&family=Source+Sans+3:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; }
        ::-webkit-scrollbar { height: 3px; width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(245,197,24,0.2); border-radius: 3px; }
        .bucket-strip::-webkit-scrollbar { display: none; }
        @keyframes cardIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
        .pitch-badge { width: 100%; aspect-ratio: 3/4; perspective: 600px; cursor: pointer; }
        .pitch-badge-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s cubic-bezier(0.22,1,0.36,1); transform-style: preserve-3d; }
        .pitch-badge.revealed .pitch-badge-inner { transform: rotateY(180deg); }
        .pitch-badge-front, .pitch-badge-back { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 10px; overflow: hidden; }
        .pitch-badge-front { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
        .pitch-badge-front img { width: 54%; opacity: 0.15; filter: blur(6px); }
        .pitch-badge-front span { font-size: 22px; color: rgba(245,197,24,0.4); font-weight: 700; }
        .pitch-badge-back { transform: rotateY(180deg); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 10px 6px; }
        .pitch-badge-back .backdrop { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0.3; }
        .pitch-badge-back .overlay { position: absolute; inset: 0; background: radial-gradient(circle at center, rgba(15,13,11,0.5) 0%, rgba(15,13,11,0.9) 100%); }
        .pitch-badge-back img { width: 48px; height: 48px; border-radius: 10px; position: relative; z-index: 1; }
        .pitch-badge-back .badge-name { font-family: 'Oswald', sans-serif; text-transform: uppercase; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-align: center; line-height: 1.2; position: relative; z-index: 1; }
        .pitch-badge-back .badge-sub { font-family: 'JetBrains Mono', monospace; font-size: 9px; position: relative; z-index: 1; }
      `}</style>

      {/* ═══ YELLOW MASTHEAD ═══════════════════════════════════════════ */}
      <div style={{
        background: C.gold, padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 56,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            onClick={() => setTab("grid")}
            style={{
            background: C.bgDeep, borderRadius: 4, padding: "4px 14px",
            display: "flex", alignItems: "center", gap: 8,
            cursor: "pointer", transition: "opacity 0.15s",
          }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            <span style={{
              fontSize: 18, fontWeight: 700, color: C.gold,
              fontFamily: "'Oswald', sans-serif", letterSpacing: 2, textTransform: "uppercase",
            }}>Now Playing</span>
            <span style={{
              fontSize: 9, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: 3, textTransform: "uppercase",
            }}>Podcast</span>
          </div>
          <a href={NPP_WEBSITE} target="_blank" rel="noopener noreferrer"
            title="Visit nowplayingpodcast.com"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(0,0,0,0.2)", border: "none",
              textDecoration: "none", transition: "opacity 0.15s", opacity: 0.6,
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "0.6"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.bgDeep} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isAuthed ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <a href={MANTL_APP_URL} target="_blank" rel="noopener noreferrer" style={{
                background: C.bgDeep, borderRadius: 4, padding: "5px 12px",
                fontSize: 11, fontWeight: 700, color: C.gold, cursor: "pointer",
                fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
                letterSpacing: 1, textDecoration: "none",
                display: "flex", alignItems: "center", gap: 5,
              }}>My Tracker →</a>
              <button onClick={async () => { await supabase.auth.signOut(); setUserVotes({}); }}
                title="Log out"
                style={{
                background: "rgba(0,0,0,0.2)", borderRadius: "50%", padding: 0,
                width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                border: "none", cursor: "pointer", opacity: 0.5,
                transition: "opacity 0.15s",
              }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "0.5"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.bgDeep} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => setShowLogin(true)} style={{
                background: "transparent", borderRadius: 4, padding: "5px 12px",
                fontSize: 11, fontWeight: 700, color: C.bgDeep, cursor: "pointer",
                fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
                letterSpacing: 1, border: "none",
              }}>Sign In</button>
              <button onClick={() => setShowLogin(true)} style={{
                background: C.bgDeep, borderRadius: 4, padding: "5px 12px",
                fontSize: 11, fontWeight: 700, color: C.gold, cursor: "pointer",
                fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
                letterSpacing: 1, border: "none",
              }}>Join on MANTL</button>
            </>
          )}
        </div>
      </div>

      <div style={{ background: C.bgDeep, borderBottom: `1px solid ${C.border}` }}><FilmStrip /></div>

      {/* ═══ HERO ══════════════════════════════════════════════════════ */}
      <div style={{
        padding: "48px 24px 36px", position: "relative", overflow: "hidden",
        background: `linear-gradient(180deg, ${C.bgDeep} 0%, ${C.bg} 100%)`,
        minHeight: 280,
      }}>
        {/* Banner image */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${SUPABASE_URL}/storage/v1/object/public/banners/NowPlayingBanner.jpg)`,
          backgroundSize: "cover",
          backgroundPosition: "center 20%",
          opacity: 0.22,
        }} />
        <div style={{
          position: "absolute", top: -80, left: "25%", width: 500, height: 400,
          background: `radial-gradient(ellipse, ${C.goldGlow} 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
          <div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: C.goldGlow, border: `1px solid ${C.goldBorder}`,
            borderRadius: 3, padding: "4px 12px", marginBottom: 20,
            animation: "slideUp 0.4s ease both",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, animation: "pulse 2s ease infinite" }} />
            <span style={{
              fontSize: 10, color: C.gold, fontWeight: 700, letterSpacing: 2,
              textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace",
            }}>Live Community{SHOW_COMMUNITY_STATS ? ` · ${memberStats.active_this_week || 0} active this week` : ""}</span>
          </div>

          <h1 style={{
            fontSize: 42, fontWeight: 700, lineHeight: 1.05, marginBottom: 10,
            fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
            animation: "slideUp 0.4s ease 0.05s both",
          }}>Community<br /><span style={{ color: C.gold }}>Dashboard</span></h1>

          <p style={{
            fontSize: 15, color: C.textMuted, maxWidth: 460, lineHeight: 1.6,
            fontFamily: "'Source Sans 3', sans-serif",
            animation: "slideUp 0.4s ease 0.1s both",
          }}>Arnie, Stuart, Brock, Marjorie, and the crew dive deep into every franchise — from Bond to Marvel to Mad Max — with sharp insight, behind-the-scenes stories, and zero patience for bad movies. <a href={NPP_WEBSITE} target="_blank" rel="noopener noreferrer" style={{ color: C.gold, textDecoration: "none", fontWeight: 600 }}>Since 2007 →</a></p>

          <div style={{ display: "flex", gap: 24, marginTop: 28, animation: "slideUp 0.4s ease 0.15s both" }}>
            {[
              ...(SHOW_COMMUNITY_STATS ? [{ v: memberStats.total_members || 0, l: "Members" }] : []),
              { v: films.length, l: "Films" },
              { v: genres.length - 1, l: "Franchises" },
              { v: badgeCount, l: "Badges" },
              ...(SHOW_COMMUNITY_STATS ? [{ v: memberStats.total_logs || 0, l: "Total Logs" }] : []),
            ].map((s) => (
              <div key={s.l} style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 30, fontWeight: 700, color: C.text, fontFamily: "'Oswald', sans-serif" }}>
                  {s.v.toLocaleString()}
                </span>
                <span style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace" }}>{s.l}</span>
              </div>
            ))}
          </div>

          {SHOW_VOTING && (
          <div style={{ display: "flex", gap: 20, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}`, animation: "slideUp 0.4s ease 0.2s both" }}>
            {VOTE_TYPES.map((a) => (
              <div key={a.key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.textDim }}>
                <span style={{ color: a.color, fontSize: 11 }}>{a.icon}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{a.label}</span>
              </div>
            ))}
          </div>
          )}
          </div>

        </div>
      </div>

      {/* ═══ BADGE PITCH (unauth only) ═════════════════════════════════ */}
      {!isAuthed && (
        <div style={{
          maxWidth: 1100, margin: "0 auto", padding: "28px 24px 32px",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{
            fontSize: 10, color: C.gold, fontWeight: 700, letterSpacing: 2.5,
            textTransform: "uppercase", fontFamily: "'Oswald', sans-serif",
            marginBottom: 6,
          }}>Collect</div>
          <div style={{
            fontSize: 20, fontWeight: 700, color: C.text,
            fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
            marginBottom: 6,
          }}>Earn Badges Across Every Franchise</div>
          <p style={{
            fontSize: 13, color: C.textMuted, fontFamily: "'Source Sans 3', sans-serif",
            lineHeight: 1.5, marginBottom: 18, maxWidth: 420,
          }}>
            Complete a franchise and unlock its badge. {badgeCount > 0 ? `${badgeCount} badges` : "Badges"} to
            earn — tap to reveal.
          </p>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10, marginBottom: 20, maxWidth: 400,
          }}>
            {PITCH_BADGES.map((badge, i) => (
              <div
                key={i}
                className={`pitch-badge${revealedBadges.has(i) ? " revealed" : ""}`}
                onClick={() => setRevealedBadges(prev => { const n = new Set(prev); n.add(i); return n; })}
              >
                <div className="pitch-badge-inner">
                  <div className="pitch-badge-front">
                    <img src={badge.art} alt="" />
                    <span>?</span>
                  </div>
                  <div className="pitch-badge-back" style={{ border: `1px solid ${badge.color}44` }}>
                    <div className="backdrop" style={{ backgroundImage: `url(${badge.backdrop})` }} />
                    <div className="overlay" />
                    <img src={badge.art} alt={badge.name} style={{ border: `2px solid ${badge.color}66` }} />
                    <div className="badge-name" style={{ color: badge.color }}>{badge.name}</div>
                    <div className="badge-sub" style={{ color: `${badge.color}99` }}>{badge.sub}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setShowLogin(true)} style={{
              padding: "10px 24px", borderRadius: 4,
              background: C.gold, border: "none",
              color: C.bgDeep, fontSize: 13, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 1.5,
            }}>Start Tracking</button>
            <span style={{
              fontSize: 11, color: C.textDim, fontFamily: "'Source Sans 3', sans-serif",
            }}>Free to join · Sync with Letterboxd</span>
          </div>
        </div>
      )}

      {/* ═══ TABS ══════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
          {[
            { key: "grid", label: "Films" },
            { key: "upcoming", label: "Coming Soon" },
            { key: "recent", label: "Recent Episodes" },
          ].map((t) => (
            <button key={t.key} style={tabBtn(t.key, t.label)} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── FILMS ──────────────────────────────────────────────── */}
        {tab === "grid" && (
          <div>
            {/* Search bar */}
            <div style={{ position: "relative", marginBottom: 14 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke={searchQuery ? C.gold : C.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder={`Search ${activeBucket ? (BUCKET_LABELS[activeBucket] || {}).label || activeBucket : "all"} films...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", padding: "9px 12px 9px 36px", borderRadius: 6,
                  background: "rgba(255,255,255,0.05)", border: `1px solid ${searchQuery ? C.goldBorder : C.border}`,
                  color: C.text, fontSize: 13, fontFamily: "'Source Sans 3', sans-serif",
                  outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: C.textDim, fontSize: 16,
                  cursor: "pointer", lineHeight: 1, padding: "2px 4px",
                }}>×</button>
              )}
            </div>

            <div className="bucket-strip" style={{
              display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12,
              marginBottom: 2, scrollbarWidth: "none", msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}>
              <button onClick={() => { setActiveBucket(null); setActiveFranchise(null); setSearchQuery(""); }} style={{
                padding: "8px 16px", borderRadius: 6, whiteSpace: "nowrap", flexShrink: 0,
                border: !activeBucket ? `2px solid ${C.gold}` : `1px solid ${C.border}`,
                background: !activeBucket ? `${C.gold}18` : `rgba(255,255,255,0.03)`,
                color: !activeBucket ? C.gold : C.textMuted,
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
                letterSpacing: 1.5, transition: "all 0.2s",
              }}>All&ensp;{films.length}</button>
              {buckets.map((b) => {
                const isActive = activeBucket === b.key;
                return (
                  <button key={b.key} onClick={() => { setActiveBucket(b.key); setActiveFranchise(null); setSearchQuery(""); }} style={{
                    padding: "8px 16px", borderRadius: 6, whiteSpace: "nowrap", flexShrink: 0,
                    border: isActive ? `2px solid ${C.gold}` : `1px solid ${C.border}`,
                    background: isActive ? `${C.gold}18` : `rgba(255,255,255,0.03)`,
                    color: isActive ? C.gold : C.textMuted,
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                    fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
                    letterSpacing: 1, transition: "all 0.2s",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>{b.icon}</span>
                    {b.label}&ensp;<span style={{
                      fontSize: 10, opacity: 0.6, fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 400,
                    }}>{b.count}</span>
                  </button>
                );
              })}
            </div>

            {/* ── Tier 2: Franchise dropdown + Sort row ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
              flexWrap: "wrap",
            }}>
              {activeBucket && franchisesInBucket.length > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    fontSize: 10, color: C.textDim, fontFamily: "'JetBrains Mono', monospace",
                    textTransform: "uppercase", letterSpacing: 1,
                  }}>Franchise</span>
                  <select
                    value={activeFranchise || ""}
                    onChange={(e) => { setActiveFranchise(e.target.value || null); setSearchQuery(""); }}
                    style={{
                      padding: "5px 28px 5px 10px", borderRadius: 4,
                      background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
                      color: activeFranchise ? C.gold : C.textMuted,
                      fontSize: 12, fontFamily: "'Source Sans 3', sans-serif",
                      cursor: "pointer", outline: "none",
                      appearance: "none", WebkitAppearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23F5C518' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 10px center",
                    }}
                  >
                    <option value="" style={{ background: C.bgCard, color: C.textMuted }}>
                      All ({franchisesInBucket.reduce((sum, fr) => sum + fr.count, 0)})
                    </option>
                    {franchisesInBucket.map((fr) => (
                      <option key={fr.name} value={fr.name} style={{ background: C.bgCard, color: C.text }}>
                        {fr.name} ({fr.count})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: activeBucket && franchisesInBucket.length > 1 ? 0 : 0 }}>
                <span style={{ fontSize: 10, color: C.textDim, marginRight: 4, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: 1 }}>Sort</span>
                {[
                  { key: "az", label: sortBy === "za" ? "Z–A" : "A–Z", toggle: true },
                  ...(SHOW_COMMUNITY_STATS ? [
                    { key: "avg", label: "Top Rated" },
                    { key: "divisive", label: "Divisive" },
                    { key: "popular", label: "Popular" },
                  ] : []),
                  { key: "recent", label: "Newest" },
                ].map((s) => {
                  const isActive = s.toggle ? (sortBy === "az" || sortBy === "za") : sortBy === s.key;
                  return (
                  <button key={s.key} onClick={() => {
                    if (s.toggle) { setSortBy(prev => prev === "az" ? "za" : "az"); }
                    else { setSortBy(s.key); }
                  }} style={{
                    padding: "4px 10px", borderRadius: 4, border: "none",
                    background: isActive ? `${C.gold}15` : "transparent",
                    color: isActive ? C.gold : C.textDim,
                    fontSize: 11, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                    transition: "all 0.2s", fontWeight: isActive ? 700 : 400,
                  }}>{s.toggle && sortBy === "za" ? "Z–A" : s.label}</button>
                  );
                })}
              </div>
            </div>

            {/* ── Franchise retrospective link — when browsing a specific franchise ── */}
            {activeFranchise && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
                padding: "10px 14px", borderRadius: 8,
                background: `${C.gold}06`, border: `1px solid ${C.goldBorder}`,
                animation: "slideUp 0.2s ease both",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M3 18v-6a9 9 0 0118 0v6" />
                  <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
                </svg>
                <span style={{
                  flex: 1, fontSize: 12, color: C.textMuted,
                  fontFamily: "'Source Sans 3', sans-serif",
                }}>
                  Listen to the full <strong style={{ color: C.gold }}>{activeFranchise}</strong> retrospective
                </span>
                <a
                  href={`https://open.spotify.com/search/${encodeURIComponent(`Now Playing Podcast ${activeFranchise}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "4px 10px", borderRadius: 4,
                    background: "rgba(29,185,84,0.12)", border: "1px solid rgba(29,185,84,0.25)",
                    textDecoration: "none", fontSize: 10, fontWeight: 700,
                    color: "#1DB954", fontFamily: "'Oswald', sans-serif",
                    textTransform: "uppercase", letterSpacing: 1, flexShrink: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#1DB954">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  Spotify
                </a>
                <a
                  href={`https://podcasts.apple.com/search?term=${encodeURIComponent(`Now Playing Podcast ${activeFranchise}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "4px 10px", borderRadius: 4,
                    background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)",
                    textDecoration: "none", fontSize: 10, fontWeight: 700,
                    color: "#A855F7", fontFamily: "'Oswald', sans-serif",
                    textTransform: "uppercase", letterSpacing: 1, flexShrink: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#A855F7">
                    <path d="M5.34 0A5.328 5.328 0 000 5.34v13.32A5.328 5.328 0 005.34 24h13.32A5.328 5.328 0 0024 18.66V5.34A5.328 5.328 0 0018.66 0H5.34zm6.525 2.568c2.336 0 4.448.902 6.056 2.587 1.224 1.272 1.912 2.619 2.264 4.392.12.6-.12 1.2-.6 1.5-.48.3-1.14.18-1.5-.3-.18-.36-.24-.78-.36-1.14-.36-1.2-.96-2.16-1.92-2.94-1.32-1.08-2.82-1.5-4.5-1.26-2.28.36-3.84 1.62-4.8 3.66-.36.78-.54 1.62-.54 2.52 0 1.56.42 2.94 1.38 4.2.3.36.3.96 0 1.32-.36.36-.96.42-1.32.06-.42-.36-.78-.78-1.08-1.26-.9-1.38-1.32-2.94-1.38-4.62-.06-2.1.54-3.96 1.8-5.58 1.56-2.04 3.66-3.18 6.48-3.12zm.12 4.32c1.44.06 2.7.6 3.72 1.68.78.84 1.2 1.8 1.38 2.94.06.6-.24 1.08-.78 1.26-.54.12-1.08-.12-1.26-.72-.12-.36-.18-.72-.36-1.08-.6-1.2-1.62-1.74-2.94-1.74-1.62.06-2.76.84-3.3 2.4-.18.48-.24 1.02-.18 1.56.06.66.18 1.32.48 1.92.06.12.12.3.12.42.06.54-.18 1.02-.66 1.2-.54.18-1.08 0-1.32-.48-.42-.84-.66-1.74-.78-2.7-.18-1.56.18-2.94 1.02-4.2.96-1.38 2.34-2.22 4.02-2.46.3-.06.54-.06.84-.06zm-.12 4.44c1.26 0 2.22 1.02 2.22 2.22 0 .9-.54 1.62-1.32 2.01l.48 4.38c.06.54-.36 1.02-.9 1.08h-.96c-.54-.06-.96-.54-.9-1.08l.48-4.38c-.78-.42-1.32-1.14-1.32-2.01.02-1.2.98-2.22 2.22-2.22z"/>
                  </svg>
                  Apple
                </a>
              </div>
            )}

            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: C.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
                {searchQuery ? `No films matching "${searchQuery}"` : "No films found"}
              </div>
            )}

            {searchQuery && filtered.length > 0 && (
              <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>
                {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{searchQuery}"
                {activeBucket ? ` in ${(BUCKET_LABELS[activeBucket] || {}).label || activeBucket}` : ""}
              </div>
            )}

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))",
              columnGap: 14, rowGap: 30, paddingBottom: hasMore ? 16 : 48,
            }}>
              {visibleFilms.map((film, i) => (
                <FilmCard key={film.item_id} film={film} index={i < PAGE_SIZE ? i : 0} onClick={setSelected}
                  userVote={userVotes[film.item_id] || null} onVote={handleVote} isAuthed={isAuthed}
                  hasEpisode={!!film.rss_guid} />
              ))}
            </div>
            {hasMore && (
              <div style={{ textAlign: "center", paddingBottom: 48 }}>
                <button onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)} style={{
                  padding: "10px 32px", borderRadius: 6,
                  background: `${C.gold}12`, border: `1px solid ${C.goldBorder}`,
                  color: C.gold, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
                  letterSpacing: 1.5, transition: "all 0.2s",
                }}>
                  Show More · {filtered.length - visibleCount} remaining
                </button>
                <div style={{
                  fontSize: 10, color: C.textDim, marginTop: 8,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  Showing {visibleCount} of {filtered.length}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── COMING SOON ─────────────────────────────────────────── */}
        {tab === "upcoming" && (
          <div style={{ paddingBottom: 48 }}>
            {upcoming.length > 0 ? upcoming.map((ep, i) => (
              <EpisodeCard
                key={ep.key} ep={ep} isUpcoming index={i}
                userVote={ep.matchedFilm ? (userVotes[ep.matchedFilm.item_id] || null) : null}
                onVote={handleVote} isAuthed={isAuthed}
                isAdmin={isAdmin} films={films} onLinkEpisode={handleLinkEpisode}
              />
            )) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: C.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
                No upcoming episodes yet
              </div>
            )}
          </div>
        )}

        {/* ─── RECENT EPISODES ───────────────────────────────────────── */}
        {tab === "recent" && (
          <div style={{ paddingBottom: 48 }}>
            {rssLoading && (
              <div style={{ textAlign: "center", padding: "20px 0", color: C.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                Loading episodes...
              </div>
            )}
            {rssError && !rssLoading && recent.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 0", color: C.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                {rssError}
              </div>
            )}
            {recent.length > 0 ? recent.map((ep, i) => (
              <EpisodeCard
                key={ep.key} ep={ep} isUpcoming={false} index={i}
                userVote={ep.matchedFilm ? (userVotes[ep.matchedFilm.item_id] || null) : null}
                onVote={handleVote} isAuthed={isAuthed}
                isAdmin={isAdmin} films={films} onLinkEpisode={handleLinkEpisode}
              />
            )) : !rssLoading && (
              <div style={{ textAlign: "center", padding: "40px 0", color: C.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
                No recent episodes
              </div>
            )}
          </div>
        )}

      </div>

      {/* ═══ FOOTER ════════════════════════════════════════════════════ */}
      <div style={{
        borderTop: `1px solid ${C.border}`, padding: "36px 24px",
        textAlign: "center", background: `linear-gradient(180deg, transparent, ${C.gold}05)`,
      }}>
        {/* NPP branding + website link */}
        <a href={NPP_WEBSITE} target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          textDecoration: "none", marginBottom: 14,
          transition: "opacity 0.15s",
        }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
        >
          <span style={{
            fontSize: 16, fontWeight: 700, color: C.gold,
            fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
            letterSpacing: 2,
          }}>Now Playing Podcast</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>

        <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 6, fontFamily: "'Source Sans 3', sans-serif" }}>
          Listen to every retrospective. Subscribe wherever you get podcasts.
        </p>

        <PodcastFooterLinks />

        <div style={{
          marginTop: 20, paddingTop: 16,
          borderTop: `1px solid ${C.border}`,
        }}>
          <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14, fontFamily: "'Source Sans 3', sans-serif" }}>
            {isAuthed
              ? "Track your progress across every franchise on MANTL."
              : "Explore every franchise the hosts have covered."
            }
          </p>
          {isAuthed ? (
            <a href={MANTL_APP_URL} target="_blank" rel="noopener noreferrer" style={{
              display: "inline-block", padding: "10px 28px", borderRadius: 4,
              background: C.gold, border: "none", textDecoration: "none",
              color: C.bgDeep, fontSize: 13, fontWeight: 700,
              fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 2,
            }}>Open My Tracker →</a>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{
              display: "inline-block", padding: "10px 28px", borderRadius: 4,
              background: C.gold, border: "none",
              color: C.bgDeep, fontSize: 13, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 2,
            }}>Join on MANTL</button>
          )}
          <div style={{
            marginTop: 14, fontSize: 10, color: C.textDim,
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1,
          }}>
            <a href={NPP_WEBSITE} target="_blank" rel="noopener noreferrer"
              style={{ color: C.textDim, textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => e.currentTarget.style.color = C.gold}
              onMouseLeave={(e) => e.currentTarget.style.color = C.textDim}
            >nowplayingpodcast.com</a>
            {" · "}
            <span>npp.mymantl.app · powered by MANTL</span>
          </div>
        </div>
      </div>

      <FilmModal film={selected} onClose={() => setSelected(null)}
        userVote={selected ? (userVotes[selected.item_id] || null) : null}
        onVote={handleVote} isAuthed={isAuthed}
        isAdmin={isAdmin} onUpdateItem={handleUpdateItem} allGenres={genres}
        communityId={communityId}
        episodeUrl={selected ? getEpisodeUrl(selected) : null} />

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      {toast && <Toast message={toast.msg || toast} link={toast.link || null} onDone={() => setToast(null)} />}
    </div>
  );
}
