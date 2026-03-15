import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../../../supabase";
import CommunityLoadingScreen from "../../CommunityLoadingScreen";

// ── Blank Check Brand Colors ──────────────────────────────────────────
const C = {
  purple: "#8B5CF6",
  purpleGlow: "rgba(139,92,246,0.12)",
  purpleBorder: "rgba(139,92,246,0.25)",
  purpleDeep: "#7C3AED",
  star: "#A78BFA",       // lighter purple for filled stars
  starEmpty: "rgba(139,92,246,0.18)",
  bg: "#1a1a1a",
  bgDeep: "#111111",
  bgCard: "#222222",
  bgCardHover: "#2a2a2a",
  text: "#f0ece4",
  textMuted: "rgba(240,236,228,0.5)",
  textDim: "rgba(240,236,228,0.3)",
  green: "#4ade80",
  red: "#f87171",
  yellow: "#facc15",
  border: "rgba(255,255,255,0.07)",
};

const SUPABASE_URL = "https://gfjobhkofftvmluocxyw.supabase.co";
const TMDB_IMG = "https://image.tmdb.org/t/p";
const ADMIN_IDS = ["19410e64-d610-4fab-9c26-d24fafc94696"];
import { searchTMDBRaw } from "../../../utils/api";
const MANTL_APP_URL = "https://www.mymantl.app/#/community/blankcheck";

// ── Blank Check Podcast Links ────────────────────────────────────────
// TODO: Verify these URLs
const BC_WEBSITE = "https://www.blankcheckpod.com";
const BC_PATREON = "https://www.patreon.com/blankcheck";
const BC_SPOTIFY = "https://open.spotify.com/show/4zmVd1CGeUCxAAMwGAwsFD";
const BC_APPLE = "https://podcasts.apple.com/us/podcast/blank-check-with-griffin-david/id981330533";

// ── Star Rating Constants ────────────────────────────────────────────
const STAR_COUNT = 5;
const STAR_VALUES = [1, 2, 3, 4, 5];

async function searchTMDB(query) {
  if (!query || query.length < 2) return [];
  const results = await searchTMDBRaw(query);
  return (results || []).slice(0, 5);
}

function ratingFromProgress(row) {
  if (!row || row.status !== "completed") return null;
  const r = parseFloat(row.rating) || 0;
  if (r >= 1 && r <= 5) return Math.round(r);
  return null;
}

function parseExtra(data) {
  if (!data) return {};
  if (typeof data === "string") { try { return JSON.parse(data); } catch { return {}; } }
  return data;
}

// ── Small Components ────────────────────────────────────────────────

const StarDisplay = ({ rating, size = 14, gap = 2, showValue = false }) => {
  const filled = Math.floor(rating || 0);
  const partial = (rating || 0) - filled;
  const idRef = useRef(`sd-${Math.random().toString(36).slice(2, 8)}`);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: showValue ? 6 : 0 }}>
      <div style={{ display: "flex", gap }}>
        {STAR_VALUES.map((v) => {
          let fill = 0;
          if (v <= filled) fill = 1;
          else if (v === filled + 1 && partial > 0) fill = partial;

          if (fill === 1) {
            return (
              <svg key={v} width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={C.star} />
              </svg>
            );
          }
          if (fill === 0) {
            return (
              <svg key={v} width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={C.starEmpty} />
              </svg>
            );
          }
          // Partial star — use clipPath for reliable rendering
          const clipId = `${idRef.current}-${v}`;
          return (
            <svg key={v} width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <defs>
                <clipPath id={clipId}>
                  <rect x="0" y="0" width={24 * fill} height="24" />
                </clipPath>
              </defs>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={C.starEmpty} />
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={C.star} clipPath={`url(#${clipId})`} />
            </svg>
          );
        })}
      </div>
      {showValue && rating > 0 && (
        <span style={{
          fontSize: size * 0.85, fontWeight: 700, color: C.star,
          fontFamily: "'JetBrains Mono', monospace",
        }}>{Number(rating).toFixed(1)}</span>
      )}
    </div>
  );
};

const StarRating = ({ value, onChange, size = 28, gap = 4 }) => {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap }}
      onMouseLeave={() => setHover(0)}>
      {STAR_VALUES.map((v) => {
        const isFilled = v <= (hover || value || 0);
        return (
          <svg key={v} width={size} height={size} viewBox="0 0 24 24"
            style={{ cursor: "pointer", transition: "transform 0.12s", transform: hover === v ? "scale(1.2)" : "scale(1)", flexShrink: 0 }}
            onMouseEnter={() => setHover(v)}
            onClick={(e) => { e.stopPropagation(); onChange(value === v ? null : v); }}
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={isFilled ? C.star : C.starEmpty}
              style={{ transition: "fill 0.12s" }}
            />
          </svg>
        );
      })}
    </div>
  );
};

const CompactStarRating = ({ value, onChange, size = 20, gap = 2 }) => {
  const [hover, setHover] = useState(0);
  const [justRated, setJustRated] = useState(null);
  return (
    <div style={{ display: "flex", gap }}
      onMouseLeave={() => setHover(0)}>
      {STAR_VALUES.map((v) => {
        const isFilled = v <= (hover || value || 0);
        const isJust = justRated === v;
        return (
          <svg key={v} width={size} height={size} viewBox="0 0 24 24"
            style={{
              cursor: "pointer", flexShrink: 0,
              transition: "transform 0.12s",
              transform: isJust ? "scale(1.35)" : hover === v ? "scale(1.15)" : "scale(1)",
            }}
            onMouseEnter={() => setHover(v)}
            onClick={(e) => {
              e.stopPropagation();
              setJustRated(v);
              setTimeout(() => setJustRated(null), 350);
              onChange(value === v ? null : v);
            }}
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={isFilled ? C.star : C.starEmpty}
              style={{ transition: "fill 0.1s" }}
            />
          </svg>
        );
      })}
    </div>
  );
};

const RatingBar = ({ avg, total }) => {
  if (!total || !avg) return null;
  const pct = ((avg || 0) / 5) * 100;
  return (
    <div style={{ display: "flex", height: 3, borderRadius: 2, overflow: "hidden", width: "100%", background: "rgba(255,255,255,0.05)" }}>
      <div style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${C.purpleDeep}, ${C.star})`, transition: "width 0.5s" }} />
    </div>
  );
};

const FilmStrip = () => (
  <div style={{ display: "flex", gap: 4, justifyContent: "center", padding: "8px 0", overflow: "hidden" }}>
    {Array(50).fill(0).map((_, i) => (
      <div key={i} style={{
        width: 12, height: 8, borderRadius: 1, flexShrink: 0,
        background: i % 2 === 0 ? C.purpleGlow : "transparent",
        border: `1px solid rgba(139,92,246,0.06)`,
      }} />
    ))}
  </div>
);

// ── Podcast Episode Link — shows direct link + Spotify/Apple search ───
const EpisodeLink = ({ title, episodeUrl, compact }) => {
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
      {episodeUrl && (
        <a href={episodeUrl} target="_blank" rel="noopener noreferrer"
          style={{
            ...badgeStyle,
            background: `${C.purple}12`,
            border: `1px solid ${C.purpleBorder}`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${C.purple}25`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = `${C.purple}12`; }}
        >
          <span style={{ fontSize: compact ? 11 : 13 }}>▶</span>
          <span style={{
            fontSize: compact ? 10 : 11, fontWeight: 700, color: C.purple,
            fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
            letterSpacing: 1, whiteSpace: "nowrap",
          }}>Listen to Episode</span>
        </a>
      )}

      <a href={BC_SPOTIFY} target="_blank" rel="noopener noreferrer" style={badgeStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(29,185,84,0.12)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      >
        <svg width={compact ? 12 : 14} height={compact ? 12 : 14} viewBox="0 0 24 24" fill="#1DB954">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
        <span style={{ fontSize: compact ? 9 : 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>Spotify</span>
      </a>

      <a href={BC_APPLE} target="_blank" rel="noopener noreferrer" style={badgeStyle}
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
      { label: "Website", url: BC_WEBSITE, icon: "🌐" },
      { label: "Spotify", url: BC_SPOTIFY, icon: null, svg: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#1DB954">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
      )},
      { label: "Apple Podcasts", url: BC_APPLE, icon: null, svg: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#A855F7">
          <path d="M5.34 0A5.328 5.328 0 000 5.34v13.32A5.328 5.328 0 005.34 24h13.32A5.328 5.328 0 0024 18.66V5.34A5.328 5.328 0 0018.66 0H5.34zm6.525 2.568c2.336 0 4.448.902 6.056 2.587 1.224 1.272 1.912 2.619 2.264 4.392.12.6-.12 1.2-.6 1.5-.48.3-1.14.18-1.5-.3-.18-.36-.24-.78-.36-1.14-.36-1.2-.96-2.16-1.92-2.94-1.32-1.08-2.82-1.5-4.5-1.26-2.28.36-3.84 1.62-4.8 3.66-.36.78-.54 1.62-.54 2.52 0 1.56.42 2.94 1.38 4.2.3.36.3.96 0 1.32-.36.36-.96.42-1.32.06-.42-.36-.78-.78-1.08-1.26-.9-1.38-1.32-2.94-1.38-4.62-.06-2.1.54-3.96 1.8-5.58 1.56-2.04 3.66-3.18 6.48-3.12zm.12 4.32c1.44.06 2.7.6 3.72 1.68.78.84 1.2 1.8 1.38 2.94.06.6-.24 1.08-.78 1.26-.54.12-1.08-.12-1.26-.72-.12-.36-.18-.72-.36-1.08-.6-1.2-1.62-1.74-2.94-1.74-1.62.06-2.76.84-3.3 2.4-.18.48-.24 1.02-.18 1.56.06.66.18 1.32.48 1.92.06.12.12.3.12.42.06.54-.18 1.02-.66 1.2-.54.18-1.08 0-1.32-.48-.42-.84-.66-1.74-.78-2.7-.18-1.56.18-2.94 1.02-4.2.96-1.38 2.34-2.22 4.02-2.46.3-.06.54-.06.84-.06zm-.12 4.44c1.26 0 2.22 1.02 2.22 2.22 0 .9-.54 1.62-1.32 2.01l.48 4.38c.06.54-.36 1.02-.9 1.08h-.96c-.54-.06-.96-.54-.9-1.08l.48-4.38c-.78-.42-1.32-1.14-1.32-2.01.02-1.2.98-2.22 2.22-2.22z"/>
        </svg>
      )},
      { label: "Patreon", url: BC_PATREON, icon: null, svg: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF424D">
          <path d="M14.82 2.41c3.96 0 7.18 3.24 7.18 7.21 0 3.96-3.22 7.18-7.18 7.18-3.97 0-7.21-3.22-7.21-7.18 0-3.97 3.24-7.21 7.21-7.21M2 21.6h3.5V2.41H2V21.6z"/>
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
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.purpleBorder; e.currentTarget.style.background = `${C.purple}08`; }}
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

const LoginModal = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
    if (err) { setError(err.message); setLoading(false); }
  };

  const handleEmail = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.href },
    });
    if (err) { setError(err.message); } else { setMagicLinkSent(true); }
    setLoading(false);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1002,
      animation: "fadeIn 0.15s ease",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.bgCard, borderRadius: 12, padding: 28, maxWidth: 360, width: "90%",
        border: `1px solid ${C.purpleBorder}`, animation: "modalIn 0.2s ease",
        textAlign: "center",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{
            margin: 0, fontSize: 18, fontWeight: 700, color: C.purple,
            fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 1.5,
          }}>Sign In</h3>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: C.textDim,
            fontSize: 20, cursor: "pointer", lineHeight: 1,
          }}>×</button>
        </div>

        {magicLinkSent ? (
          <>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✉️</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 4 }}>Check your email</p>
            <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, marginBottom: 12 }}>
              Sign-in link sent to <strong style={{ color: "#ccc" }}>{email}</strong>
            </p>
            <button onClick={() => { setMagicLinkSent(false); setEmail(""); setShowEmail(false); }} style={{
              background: "none", border: "none", color: C.purple, fontSize: 12, cursor: "pointer",
            }}>← Use a different method</button>
          </>
        ) : (
          <>
            <p style={{
              fontSize: 13, color: C.textMuted, lineHeight: 1.6, marginBottom: 20,
              fontFamily: "'Source Sans 3', sans-serif",
            }}>
              Sign in to rate films, track your progress, and appear on the leaderboard.
            </p>

            <button
              onClick={handleGoogle}
              disabled={loading}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 8,
                background: "#fff", border: "none",
                color: "#333", fontSize: 14, fontWeight: 600,
                fontFamily: "'Source Sans 3', sans-serif",
                cursor: loading ? "wait" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                transition: "opacity 0.15s",
                opacity: loading ? 0.6 : 1,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {loading ? "Redirecting..." : "Continue with Google"}
            </button>

            <div style={{
              display: "flex", alignItems: "center", gap: 10, margin: "14px 0",
            }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
              <span style={{ fontSize: 10, color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase",
                fontFamily: "'JetBrains Mono', monospace" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            </div>

            {!showEmail ? (
              <button onClick={() => setShowEmail(true)} style={{
                width: "100%", padding: "12px 0", borderRadius: 8,
                background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
                color: C.textMuted, fontSize: 14, fontWeight: 600,
                fontFamily: "'Source Sans 3', sans-serif", cursor: "pointer",
                transition: "all 0.15s",
              }}>Continue with email</button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="your@email.com"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleEmail()}
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)",
                    color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box",
                    fontFamily: "'Source Sans 3', sans-serif",
                  }}
                />
                <button onClick={handleEmail} disabled={loading || !email.trim()} style={{
                  width: "100%", padding: "12px 0", borderRadius: 8,
                  background: C.purple, border: "none", color: "#000",
                  fontSize: 14, fontWeight: 600, cursor: loading ? "wait" : "pointer",
                  opacity: loading || !email.trim() ? 0.5 : 1,
                  fontFamily: "'Source Sans 3', sans-serif",
                }}>{loading ? "Sending..." : "Send sign-in link"}</button>
                <button onClick={() => { setShowEmail(false); setEmail(""); setError(null); }} style={{
                  background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer",
                }}>← Back</button>
              </div>
            )}

            {error && (
              <div style={{
                marginTop: 12, padding: "8px 12px", borderRadius: 6,
                background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)",
                fontSize: 12, color: C.red, fontFamily: "'Source Sans 3', sans-serif",
              }}>{error}</div>
            )}
          </>
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
      background: C.bgCard, border: `1px solid ${C.purpleBorder}`,
      borderRadius: 8, padding: "10px 20px", zIndex: 1100,
      animation: "slideUp 0.25s ease", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "'Source Sans 3', sans-serif" }}>
        {message}
      </span>
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer" style={{
          fontSize: 11, fontWeight: 700, color: C.purple, textDecoration: "none",
          fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
          letterSpacing: 1, whiteSpace: "nowrap",
          borderLeft: `1px solid ${C.border}`, paddingLeft: 12,
        }}>My Tracker →</a>
      )}
    </div>
  );
};

const Skeleton = () => <CommunityLoadingScreen slug="blankcheck" />;

// ── Film Card ───────────────────────────────────────────────────────────

const FilmCard = ({ film, onClick, index, userRating, onRate, isAuthed, hasEpisode }) => {
  const [hov, setHov] = useState(false);
  const avg = film.avg_rating || 0;
  const total = film.total_logged || 0;
  const hasPoster = !!film.poster_path;

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 6, overflow: "visible", position: "relative",
        background: hov ? C.bgCardHover : C.bgCard,
        border: `1px solid ${hov ? C.purpleBorder : C.border}`,
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
        {hasPoster && (
          <img
            src={`${TMDB_IMG}/w300${film.poster_path}`}
            alt={film.title}
            loading="lazy"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}

        {hasPoster && (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.3) 100%)",
          }} />
        )}

        {/* Community avg rating — upper right */}
        {avg > 0 && total > 0 && (
          <div style={{
            position: "absolute", top: 7, right: 7,
            background: "rgba(0,0,0,0.65)", borderRadius: 4, padding: "3px 7px",
            backdropFilter: "blur(4px)",
            display: "flex", gap: 3, alignItems: "center",
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={C.star} />
            </svg>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.star, fontFamily: "'JetBrains Mono', monospace" }}>
              {Number(avg).toFixed(1)}
            </span>
          </div>
        )}

        {/* Episode available indicator */}
        {hasEpisode && !userRating && (
          <div style={{
            position: "absolute", bottom: hasPoster ? 36 : 36, right: 6, zIndex: 4,
            width: 22, height: 22, borderRadius: 5,
            background: "rgba(0,0,0,0.6)",
            border: `1px solid ${C.purpleBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
          }} title="Episode available">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0118 0v6" />
              <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
            </svg>
          </div>
        )}

        {/* Title */}
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

        {/* Community Favorite badge */}
        {avg >= 4.5 && total >= 5 && !userRating && !hasPoster && (
          <div style={{
            position: "absolute", bottom: 10,
            background: `${C.purple}22`, border: `1px solid ${C.purple}44`,
            borderRadius: 3, padding: "2px 8px",
          }}>
            <span style={{
              fontSize: 8, fontWeight: 700, color: C.purple,
              textTransform: "uppercase", letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace",
            }}>Community Favorite</span>
          </div>
        )}
      </div>

    </div>
  );
};

// ── Film Modal ──────────────────────────────────────────────────────────

const FilmModal = ({ film, onClose, userRating, onRate, isAuthed, isAdmin, onUpdateItem, allDirectors, communityId, episodeUrl }) => {
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminToast, setAdminToast] = useState(null);

  // TMDB title swap
  const [tmdbQuery, setTmdbQuery] = useState("");
  const [tmdbResults, setTmdbResults] = useState([]);
  const [tmdbSearching, setTmdbSearching] = useState(false);

  // Category (director miniseries)
  const [newCategory, setNewCategory] = useState(film?.miniseries_title || "");

  useEffect(() => {
    if (!film) return;
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
  const avg = film.avg_rating || 0;
  const total = film.total_logged || 0;

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
      setAdminToast("Director updated ✓");
      setTimeout(() => setAdminToast(null), 2000);
    } catch (e) { console.error("[Admin] Category save error:", e); setAdminToast(e.message || "Error saving"); }
    setAdminSaving(false);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      animation: "fadeIn 0.15s ease",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.bgCard, borderRadius: 12, padding: 28, maxWidth: 420, width: "92%",
        border: `1px solid ${C.purpleBorder}`, boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        animation: "modalIn 0.2s ease", maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* Header */}
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
                background: adminOpen ? `${C.purple}22` : "rgba(255,255,255,0.06)",
                border: `1px solid ${adminOpen ? C.purple : "rgba(255,255,255,0.1)"}`,
                borderRadius: "50%", width: 30, height: 30,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.2s",
                transform: adminOpen ? "rotate(90deg)" : "rotate(0deg)",
              }}>
                <span style={{ fontSize: 14, color: adminOpen ? C.purple : C.textDim }}>⚙</span>
              </button>
            )}
            <button onClick={onClose} style={{
              background: "none", border: "none", color: C.textDim,
              fontSize: 22, cursor: "pointer", padding: "0 4px", lineHeight: 1,
            }}>×</button>
          </div>
        </div>

        {/* Poster */}
        {film.poster_path && (
          <div style={{
            marginTop: 16, borderRadius: 8, overflow: "hidden",
            position: "relative", aspectRatio: "2/3", maxHeight: 280,
            display: "flex", justifyContent: "center",
          }}>
            <img
              src={`${TMDB_IMG}/w342${film.poster_path}`}
              alt={film.title}
              style={{ height: "100%", objectFit: "cover", borderRadius: 8 }}
            />
          </div>
        )}

        {/* ═══ ADMIN PANEL ═══ */}
        {adminOpen && isAdmin && (
          <div style={{
            marginTop: 14, padding: 14, borderRadius: 8,
            background: `${C.purple}08`, border: `1px solid ${C.purple}25`,
            animation: "modalIn 0.15s ease",
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: C.purple, textTransform: "uppercase",
              letterSpacing: 2, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 11 }}>⚙</span> Admin Controls
            </div>

            {/* TMDB Title Swap */}
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
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(139,92,246,0.08)"}
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

            {/* Director / Miniseries */}
            <div>
              <div style={{
                fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase",
                letterSpacing: 1.5, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace",
              }}>Director Series</div>
              <div style={{ display: "flex", gap: 6 }}>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{
                    flex: 1, padding: "7px 10px", borderRadius: 6,
                    background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
                    color: C.text, fontSize: 12, fontFamily: "'Source Sans 3', sans-serif",
                    cursor: "pointer", outline: "none",
                  }}
                >
                  {(allDirectors || []).map((d) => (
                    <option key={d} value={d} style={{ background: C.bgCard, color: C.text }}>{d}</option>
                  ))}
                </select>
                <button onClick={saveCategory} disabled={adminSaving || newCategory === (film.miniseries_title || "")} style={{
                  padding: "5px 14px", borderRadius: 6,
                  background: `${C.purple}18`, border: `1px solid ${C.purple}55`,
                  color: C.purple, fontSize: 10, fontWeight: 700,
                  cursor: adminSaving ? "wait" : "pointer",
                  fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 1,
                  opacity: adminSaving || newCategory === (film.miniseries_title || "") ? 0.4 : 1,
                }}>Move</button>
              </div>
            </div>

            {adminToast && (
              <div style={{
                marginTop: 10, fontSize: 11, fontWeight: 600,
                color: adminToast.includes("Error") ? C.red : C.green,
                fontFamily: "'JetBrains Mono', monospace",
              }}>{adminToast}</div>
            )}
          </div>
        )}

        {/* ─── Your Rating ─── */}
        <div style={{
          margin: "18px 0 14px", padding: "14px 16px", borderRadius: 10,
          background: `${C.purple}08`,
          border: `1px solid ${C.purpleBorder}`,
          textAlign: "center",
        }}>
          <div style={{
            fontSize: 10, color: C.textDim, textTransform: "uppercase",
            letterSpacing: 2.5, marginBottom: 10, fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
          }}>
            {isAuthed ? "Your Rating" : "Rate This Film"}
          </div>
          <StarRating value={userRating} onChange={(r) => onRate(film.item_id, r)} size={32} gap={6} />
          {!isAuthed && (
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 8, fontFamily: "'Source Sans 3', sans-serif" }}>
              Sign in to rate
            </div>
          )}
        </div>

        {/* ─── Listen to Episode ─── */}
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

        {/* ─── Community Rating ─── */}
        <div style={{
          fontSize: 10, color: C.textDim, textTransform: "uppercase",
          letterSpacing: 2.5, marginBottom: 10, fontFamily: "'Oswald', sans-serif",
          fontWeight: 700,
        }}>Community Rating</div>
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <StarDisplay rating={avg} size={18} gap={3} />
            <span style={{
              fontSize: 22, fontWeight: 700, color: C.star,
              fontFamily: "'Oswald', sans-serif",
            }}>{avg > 0 ? Number(avg).toFixed(1) : "—"}</span>
            <span style={{
              fontSize: 11, color: C.textDim, fontFamily: "'JetBrains Mono', monospace",
            }}>{total} {total === 1 ? "rating" : "ratings"}</span>
          </div>
          <RatingBar avg={avg} total={total} />
        </div>

        {/* ─── Links ─── */}
        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {isAuthed && (
            <a href={MANTL_APP_URL} target="_blank" rel="noopener noreferrer" style={{
              fontSize: 11, color: C.textDim, textDecoration: "none",
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5,
              transition: "color 0.15s",
            }}
              onMouseEnter={(e) => e.currentTarget.style.color = C.purple}
              onMouseLeave={(e) => e.currentTarget.style.color = C.textDim}
            >See full tracker on MANTL →</a>
          )}
          <a href={BC_WEBSITE} target="_blank" rel="noopener noreferrer" style={{
            fontSize: 11, color: C.textDim, textDecoration: "none",
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5,
            transition: "color 0.15s",
          }}
            onMouseEnter={(e) => e.currentTarget.style.color = C.purple}
            onMouseLeave={(e) => e.currentTarget.style.color = C.textDim}
          >blankcheckpod.com →</a>
        </div>
      </div>
    </div>
  );
};

// ── Episode Card ────────────────────────────────────────────────────────

const EpisodeCard = ({ ep, isUpcoming, index, userRating, onRate, isAuthed, isAdmin, films, onLinkEpisode }) => {
  const [expanded, setExpanded] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [tmdbQuery, setTmdbQuery] = useState("");
  const [tmdbResults, setTmdbResults] = useState([]);
  const [tmdbSearching, setTmdbSearching] = useState(false);
  const [linking, setLinking] = useState(false);

  const film = ep.matchedFilm;
  const hasPoster = !!film?.poster_path;
  const avg = film?.avg_rating || 0;
  const total = film?.total_logged || 0;

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

  useEffect(() => {
    if (adminOpen && !tmdbQuery) {
      const clean = (ep.title || "").replace(/\s*\(\d{4}\)\s*$/, "").trim();
      setTmdbQuery(clean);
    }
  }, [adminOpen]);

  const handleLink = async (tmdbMovie) => {
    if (!ep.guid || linking) return;
    setLinking(true);

    const tmdbId = tmdbMovie.id;
    const posterPath = tmdbMovie.poster_path || null;
    const match = (films || []).find(f => String(f.tmdb_id) === String(tmdbId));

    if (match) {
      const { error } = await supabase
        .from("community_items")
        .update({ rss_guid: ep.guid })
        .eq("id", match.item_id);
      if (!error && onLinkEpisode) {
        onLinkEpisode(match.item_id, ep.guid, { poster_path: match.poster_path || posterPath });
      }
    } else {
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
      background: isUpcoming ? `${C.purple}06` : C.bgCard,
      border: `1px solid ${isUpcoming ? C.purpleBorder : C.border}`,
      animation: `slideUp 0.3s ease ${index * 0.06}s both`,
      transition: "border-color 0.2s",
    }}>
      <div style={{ display: "flex", gap: 0 }}>
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
            {avg > 0 && (
              <div style={{
                position: "absolute", bottom: 4, right: 4,
                background: "rgba(0,0,0,0.75)", borderRadius: 3, padding: "1px 5px",
                backdropFilter: "blur(4px)",
                display: "flex", alignItems: "center", gap: 2,
              }}>
                <svg width="8" height="8" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={C.star} />
                </svg>
                <span style={{
                  fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                  color: C.star,
                }}>{Number(avg).toFixed(1)}</span>
              </div>
            )}
          </div>
        )}

        <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
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
              }}>
                <span>{ep.dateDisplay}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
              {isUpcoming && (
                <div style={{
                  background: `${C.purple}22`, borderRadius: 3, padding: "2px 8px",
                  fontSize: 9, fontWeight: 700, color: C.purple,
                  fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1,
                }}>SOON</div>
              )}
              {isAdmin && !film && ep.guid && (
                <button onClick={() => setAdminOpen(!adminOpen)} style={{
                  background: adminOpen ? `${C.purple}22` : "rgba(255,255,255,0.06)",
                  border: `1px solid ${adminOpen ? C.purple : C.border}`,
                  borderRadius: 4, padding: "2px 8px", cursor: "pointer",
                  fontSize: 9, fontWeight: 700,
                  color: adminOpen ? C.purple : C.textDim,
                  fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1,
                  transition: "all 0.15s",
                }}>🔗 LINK</button>
              )}
            </div>
          </div>

          {/* Star rating + stats */}
          {film && total > 0 && (
            <div style={{ marginTop: 8 }}>
              <RatingBar avg={avg} total={total} />
              <div style={{
                display: "flex", gap: 8, marginTop: 4, alignItems: "center",
                fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
              }}>
                <StarDisplay rating={avg} size={10} gap={1} />
                <span style={{ color: C.star }}>{Number(avg).toFixed(1)}</span>
                <span style={{ color: C.textDim, marginLeft: "auto" }}>{total} ratings</span>
              </div>
            </div>
          )}

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginTop: 10, gap: 8,
          }}>
            {film && (
              <CompactStarRating value={userRating} onChange={(r) => onRate(film.item_id, r)} size={16} gap={1} />
            )}

            <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexShrink: 0 }}>
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

              {ep.link && (
                <a
                  href={ep.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: isUpcoming ? `${C.purple}18` : "rgba(255,255,255,0.06)",
                    border: `1px solid ${isUpcoming ? C.purpleBorder : C.border}`,
                    borderRadius: 4, padding: "4px 10px",
                    fontSize: 10, fontWeight: 700, textDecoration: "none",
                    color: isUpcoming ? C.purple : C.textMuted,
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

      {/* Admin TMDB Link Panel */}
      {adminOpen && isAdmin && (
        <div style={{
          padding: "12px 14px", borderTop: `1px solid ${C.purpleBorder}`,
          background: `${C.purple}06`,
        }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: C.purple, textTransform: "uppercase",
            letterSpacing: 2, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace",
          }}>Link to TMDB Film</div>

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
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                Searching...
              </div>
            )}
          </div>

          {tmdbResults.length > 0 && (
            <div style={{
              display: "flex", flexDirection: "column", gap: 4,
              maxHeight: 250, overflowY: "auto",
            }}>
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

export default function BlankCheckDashboard({ session: sessionProp }) {
  const COMMUNITY_SLUG = "blankcheck";

  // ── Self-managed auth ──
  const [localSession, setLocalSession] = useState(sessionProp || null);
  const session = sessionProp || localSession;

  useEffect(() => {
    if (sessionProp) return;
    supabase.auth.getSession().then(({ data: { session: s } }) => setLocalSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setLocalSession(s));
    return () => subscription.unsubscribe();
  }, [sessionProp]);

  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [communityId, setCommunityId] = useState(null);
  const [rssUrl, setRssUrl] = useState("");
  const [films, setFilms] = useState([]);
  const [totalFilmsCount, setTotalFilmsCount] = useState(0);
  const [directors, setDirectors] = useState(["All"]);
  const [memberStats, setMemberStats] = useState({ total_members: 0, active_this_week: 0, total_logs: 0 });
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRatings, setUserRatings] = useState({});

  // Schedule
  const [rssEpisodes, setRssEpisodes] = useState([]);
  const [rssLoading, setRssLoading] = useState(false);
  const [rssError, setRssError] = useState(null);

  const [activeDirector, setActiveDirector] = useState(null);
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

        const [itemsRes, statsRes, lbRes, msRes] = await Promise.all([
          supabase.from("community_item_stats").select("*").eq("community_id", page.id).order("sort_order", { ascending: true }),
          supabase.from("community_member_stats").select("*").eq("slug", COMMUNITY_SLUG).single(),
          userId
            ? supabase.from("community_leaderboard").select("*").eq("slug", COMMUNITY_SLUG).order("films_logged", { ascending: false }).limit(15)
            : Promise.resolve({ data: [] }),
          supabase.from("community_miniseries").select("id, title, tab_key").eq("community_id", page.id).order("sort_order", { ascending: true }),
        ]);

        // Build set of filmography miniseries IDs (main feed only — exclude patreon & awards)
        const filmographyIds = new Set();
        (msRes.data || []).forEach(ms => {
          if (ms.tab_key === "filmography") filmographyIds.add(ms.id);
        });

        // Total films across ALL tabs (for hero stats)
        const allItemsWithTmdb = (itemsRes.data || []).filter(i => i.tmdb_id);
        setTotalFilmsCount(allItemsWithTmdb.length);

        const items = allItemsWithTmdb.filter(i => filmographyIds.has(i.miniseries_id));
        setFilms(items);

        // Build director list from filmography miniseries only
        const directorSet = new Set(items.map(i => i.miniseries_title).filter(Boolean));
        (msRes.data || []).forEach(ms => { if (ms.tab_key === "filmography" && ms.title) directorSet.add(ms.title); });
        setDirectors(["All", ...Array.from(directorSet).sort()]);

        if (statsRes.data) setMemberStats(statsRes.data);
        setLeaderboard(lbRes.data || []);

        // Load user ratings (batched)
        if (userId) {
          const itemIds = items.map(i => i.item_id);
          if (itemIds.length > 0) {
            const BATCH = 200;
            const allProgress = [];
            for (let i = 0; i < itemIds.length; i += BATCH) {
              const chunk = itemIds.slice(i, i + BATCH);
              const { data } = await supabase
                .from("community_user_progress")
                .select("item_id, status, rating")
                .eq("user_id", userId)
                .in("item_id", chunk);
              if (data) allProgress.push(...data);
            }

            const ratings = {};
            allProgress.forEach(row => {
              const r = ratingFromProgress(row);
              if (r) ratings[row.item_id] = r;
            });
            setUserRatings(ratings);
          }
        }
      } catch (err) {
        console.error("[BlankCheckDashboard] Load error:", err);
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  // ── Fetch RSS for Schedule ────────────────────────────────────────
  const loadRSS = useCallback(async () => {
    // TODO: Set Blank Check RSS URL in community_pages.theme_config.rss_url
    const feedUrl = rssUrl || "";
    if (!feedUrl) return;

    setRssLoading(true);
    setRssError(null);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/rss-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ rss_url: feedUrl, limit: 30 }),
      });

      if (!res.ok) throw new Error("Failed to fetch RSS");

      const { episodes } = await res.json();
      setRssEpisodes(episodes || []);
    } catch (err) {
      console.error("[BlankCheckDashboard] RSS error:", err);
      setRssError("Couldn't load schedule");
    }
    setRssLoading(false);
  }, [rssUrl, session]);

  const rssFetched = useRef(false);
  useEffect(() => {
    if (rssFetched.current || rssLoading || !rssUrl) return;
    rssFetched.current = true;
    loadRSS();
  }, [loadRSS, rssUrl]);

  // ── Schedule Data ─────────────────────────────────────────────────
  const guidToFilm = useMemo(() => {
    const map = {};
    films.forEach(f => { if (f.rss_guid) map[f.rss_guid] = f; });
    return map;
  }, [films]);

  const guidToEpisodeUrl = useMemo(() => {
    const map = {};
    rssEpisodes.forEach(ep => {
      if (ep.guid && (ep.link || ep.url)) {
        map[ep.guid] = ep.link || ep.url;
      }
    });
    return map;
  }, [rssEpisodes]);

  const getEpisodeUrl = useCallback((film) => {
    if (!film?.rss_guid) return null;
    return guidToEpisodeUrl[film.rss_guid] || null;
  }, [guidToEpisodeUrl]);

  const { upcoming, recent } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rssItems = rssEpisodes
      .filter(ep => ep.pubDate)
      .map(ep => {
        const d = new Date(ep.pubDate);
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

    const up = allItems.filter(i => i.date >= today).sort((a, b) => a.date - b.date).slice(0, 10);
    const rec = allItems.filter(i => i.date < today).sort((a, b) => b.date - a.date).slice(0, 15);

    return { upcoming: up, recent: rec };
  }, [films, rssEpisodes, guidToFilm]);

  // ── Rate Handler ──────────────────────────────────────────────────
  const userRatingsRef = useRef(userRatings);
  useEffect(() => { userRatingsRef.current = userRatings; }, [userRatings]);

  const handleRate = useCallback(async (itemId, starRating) => {
    if (!isAuthed) {
      setShowLogin(true);
      return;
    }

    const oldRating = userRatingsRef.current[itemId] || null;

    // Optimistic UI — ratings
    setUserRatings((prev) => {
      const updated = { ...prev };
      if (starRating === null) delete updated[itemId];
      else updated[itemId] = starRating;
      return updated;
    });

    // Optimistic UI — counts
    setFilms(prev => prev.map(f => {
      if (f.item_id !== itemId) return f;
      const updated = { ...f };

      // Adjust total_logged
      if (oldRating && !starRating) updated.total_logged = Math.max(0, (updated.total_logged || 0) - 1);
      if (!oldRating && starRating) updated.total_logged = (updated.total_logged || 0) + 1;

      // Recalculate avg_rating (approximate)
      if (starRating) {
        const prevTotal = updated.total_logged || 1;
        const prevSum = (updated.avg_rating || 0) * (oldRating ? prevTotal : prevTotal - 1);
        const newSum = prevSum - (oldRating || 0) + starRating;
        updated.avg_rating = newSum / prevTotal;
      }

      return updated;
    }));

    const film = films.find(f => f.item_id === itemId);

    try {
      if (starRating === null) {
        const { error } = await supabase.from("community_user_progress")
          .delete().eq("user_id", session.user.id).eq("item_id", itemId);
        if (error) throw error;
        setToast({ msg: "Rating removed", link: null });
      } else {
        const { error } = await supabase.from("community_user_progress")
          .upsert({
            user_id: session.user.id,
            item_id: itemId,
            status: "completed",
            rating: starRating,
            brown_arrow: false,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,item_id" });
        if (error) throw error;
        setToast({ msg: `${"★".repeat(starRating)}${"☆".repeat(5 - starRating)} — ${film?.title || ""}`, link: MANTL_APP_URL });
      }
    } catch (err) {
      console.error("[BlankCheckDashboard] Rate error:", err);
      // Rollback
      setUserRatings((prev) => {
        const reverted = { ...prev };
        if (oldRating === null) delete reverted[itemId];
        else reverted[itemId] = oldRating;
        return reverted;
      });
      setToast({ msg: "Rating failed — try again", link: null });
    }
  }, [isAuthed, session, films]);

  const isAdmin = isAuthed && ADMIN_IDS.includes(session?.user?.id);

  const handleUpdateItem = useCallback((itemId, updates) => {
    setFilms(prev => prev.map(f => {
      if (f.item_id !== itemId) return f;
      return { ...f, ...updates };
    }));
    setSelected(prev => {
      if (!prev || prev.item_id !== itemId) return prev;
      return { ...prev, ...updates };
    });
  }, []);

  const handleLinkEpisode = useCallback((itemId, rssGuid, updates) => {
    setFilms(prev => prev.map(f => {
      if (f.item_id !== itemId) return f;
      return { ...f, ...updates, rss_guid: rssGuid };
    }));
    setToast({ msg: `Linked episode ✓`, link: null });
  }, []);

  // ── Director counts ───────────────────────────────────────────────
  const directorCounts = useMemo(() => {
    const counts = {};
    films.forEach(f => {
      const d = f.miniseries_title || "Unknown";
      counts[d] = (counts[d] || 0) + 1;
    });
    return counts;
  }, [films]);

  // ── Filter + Sort ─────────────────────────────────────────────────
  const filtered = useMemo(() => films
    .filter((f) => {
      if (!activeDirector || activeDirector === "All") return true;
      return f.miniseries_title === activeDirector;
    })
    .filter((f) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (f.title || "").toLowerCase().includes(q) || String(f.year || "").includes(q)
        || (f.miniseries_title || "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === "az") return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "za") return (b.title || "").localeCompare(a.title || "");
      if (sortBy === "rating") return (b.avg_rating || 0) - (a.avg_rating || 0);
      if (sortBy === "popular") return (b.total_logged || 0) - (a.total_logged || 0);
      if (sortBy === "recent") return (b.year || 0) - (a.year || 0);
      return 0;
    }), [films, activeDirector, searchQuery, sortBy]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeDirector, sortBy, searchQuery]);

  const visibleFilms = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const tabBtn = (key) => ({
    padding: "10px 20px", background: "none", border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 700, transition: "all 0.2s",
    fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 1.5,
    color: tab === key ? C.purple : C.textDim,
    borderBottom: tab === key ? `2px solid ${C.purple}` : "2px solid transparent",
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
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.2); border-radius: 3px; }
        .director-strip::-webkit-scrollbar { display: none; }
        @keyframes cardIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }

        /* ── DEVICE MOCKUP ────────────────────────────── */
        @keyframes deviceEnter { from { opacity: 0; transform: translateY(24px) rotate(0deg); } to { opacity: 1; transform: translateY(0) rotate(-2deg); } }
        @keyframes deviceFloat { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-6px) rotate(-2deg); } }
        .hero-flex { display: flex; align-items: center; gap: 40px; max-width: 1100px; margin: 0 auto; position: relative; }
        .hero-text { flex: 1; min-width: 0; }
        .hero-device { flex-shrink: 0; opacity: 0; animation: deviceEnter 0.8s ease-out 0.6s forwards; }
        .hero-device .device-phone { animation: deviceFloat 5s ease-in-out infinite 1.4s; }
        @media (max-width: 700px) { .hero-flex { flex-direction: column; gap: 24px; } .hero-device { align-self: center; } }
        .device-phone {
          width: 190px; background: linear-gradient(160deg, #1e1c1a 0%, #121010 50%, #1a1816 100%); border-radius: 26px;
          border: 2px solid rgba(139,92,246,0.18);
          box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 0 40px rgba(139,92,246,0.08), 0 0 0 1px rgba(139,92,246,0.06), inset 0 1px 0 rgba(255,255,255,0.06);
          overflow: hidden; position: relative;
        }
        .device-phone::before {
          content: ''; position: absolute; top: 40px; left: -1px; width: 2px; height: 80px;
          background: linear-gradient(180deg, transparent, rgba(139,92,246,0.3), transparent);
          border-radius: 1px; z-index: 5;
        }
        .device-phone::after {
          content: ''; position: absolute; top: 0; left: 20%; right: 20%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          z-index: 5;
        }
        .device-notch { width: 56px; height: 12px; background: #0a0a0a; border-radius: 0 0 10px 10px; margin: 0 auto; }
        .device-screen { padding: 4px 8px 14px; background: linear-gradient(180deg, #111 0%, #1a1a1a 100%); }
        .ds-header { display: flex; align-items: center; gap: 6px; padding: 8px 0 6px; }
        .ds-icon { width: 20px; height: 20px; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 0.5rem; flex-shrink: 0; }
        .ds-name { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.48rem; font-weight: 700; color: #f0ece4; }
        .ds-sub { font-family: 'Source Sans 3', sans-serif; font-size: 0.32rem; color: rgba(240,236,228,0.4); }
        .ds-shelf-label { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.35rem; font-weight: 600; color: rgba(240,236,228,0.4); margin: 7px 0 4px; }
        .ds-shelf-row { display: flex; gap: 4px; overflow: hidden; }
        .ds-poster { width: 34px; height: 51px; border-radius: 3px; background-size: cover; background-position: center; flex-shrink: 0; position: relative; }
        .ds-check { position: absolute; bottom: 2px; right: 2px; width: 10px; height: 10px; border-radius: 3px; background: rgba(74,222,128,0.85); display: flex; align-items: center; justify-content: center; font-size: 5px; color: #111; font-weight: 700; }
        .ds-stars { display: flex; gap: 2px; margin-top: 8px; justify-content: center; }
        .ds-star { font-size: 0.5rem; }
        .ds-rating-row { display: flex; align-items: center; gap: 5px; margin-top: 8px; padding: 5px 6px; background: rgba(255,255,255,0.03); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); }
        .ds-rating-icon { width: 22px; height: 22px; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 0.55rem; flex-shrink: 0; }
        .ds-rating-name { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.35rem; font-weight: 700; }
        .ds-rating-stars { font-size: 0.38rem; letter-spacing: 1px; }
        .ds-stats { display: flex; justify-content: space-around; margin-top: 8px; padding: 6px 0; border-top: 1px solid rgba(255,255,255,0.04); }
        .ds-stat-num { font-family: 'JetBrains Mono', monospace; font-size: 0.5rem; font-weight: 700; color: #f0ece4; line-height: 1; }
        .ds-stat-label { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.25rem; color: rgba(240,236,228,0.3); margin-top: 2px; }
        .ds-accent { width: 36px; height: 2px; border-radius: 1px; margin-top: 4px; }
        .ds-cta { margin-top: 8px; padding: 5px 0; border-radius: 4px; text-align: center; font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.33rem; font-weight: 700; cursor: default; }
      `}</style>

      {/* ═══ PURPLE MASTHEAD ═══════════════════════════════════════════ */}
      <div style={{
        background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`,
        padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 56,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            onClick={() => setTab("grid")}
            style={{
            background: C.bgDeep, borderRadius: 4, padding: "4px 14px",
            display: "flex", flexDirection: "column", alignItems: "center",
            cursor: "pointer", transition: "opacity 0.15s", lineHeight: 1.1,
          }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            <span style={{
              fontSize: 18, fontWeight: 700, color: C.purple,
              fontFamily: "'Oswald', sans-serif", letterSpacing: 2, textTransform: "uppercase",
            }}>Blank Check</span>
            <span style={{
              fontSize: 9, color: "#fff", fontFamily: "'Source Sans 3', sans-serif",
              fontWeight: 600, letterSpacing: 0.5, opacity: 0.7, whiteSpace: "nowrap",
            }}>with Griffin and David</span>
          </div>
          <a href={BC_WEBSITE} target="_blank" rel="noopener noreferrer"
            title="Visit blankcheckpod.com"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(0,0,0,0.2)", border: "none",
              textDecoration: "none", transition: "opacity 0.15s", opacity: 0.6,
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "0.6"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                fontSize: 11, fontWeight: 700, color: C.purple, cursor: "pointer",
                fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
                letterSpacing: 1, textDecoration: "none",
                display: "flex", alignItems: "center", gap: 5,
              }}>My Tracker →</a>
              <button onClick={async () => { await supabase.auth.signOut(); setUserRatings({}); }}
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer",
                fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
                letterSpacing: 1, border: "none", opacity: 0.8,
              }}>Sign In</button>
              <button onClick={() => setShowLogin(true)} style={{
                background: C.bgDeep, borderRadius: 4, padding: "5px 12px",
                fontSize: 11, fontWeight: 700, color: C.purple, cursor: "pointer",
                fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
                letterSpacing: 1, border: "none",
              }}>Join on MANTL</button>
            </>
          )}
        </div>
      </div>

      <div style={{ background: C.bgDeep, borderBottom: `1px solid ${C.border}` }}><FilmStrip /></div>

      {!isAuthed && (
        <div style={{
          background: `${C.purple}0d`, borderBottom: `1px solid ${C.purpleBorder}`,
          padding: "10px 24px", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 12,
        }}>
          <span style={{ fontSize: 12, color: C.purple, fontFamily: "'Source Sans 3', sans-serif" }}>
            Rate films and track your way through every director's filmography
          </span>
          <button onClick={() => setShowLogin(true)} style={{
            fontSize: 11, fontWeight: 700, color: "#fff",
            background: C.purple, borderRadius: 3, padding: "4px 12px",
            border: "none", fontFamily: "'Oswald', sans-serif",
            textTransform: "uppercase", letterSpacing: 1, cursor: "pointer",
          }}>Join Free</button>
        </div>
      )}

      {/* ═══ HERO ══════════════════════════════════════════════════════ */}
      <div style={{
        padding: "48px 24px 36px", position: "relative", overflow: "hidden",
        background: `linear-gradient(180deg, ${C.bgDeep} 0%, ${C.bg} 100%)`,
        minHeight: 280,
      }}>
        {/* Banner image */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${SUPABASE_URL}/storage/v1/object/public/banners/bafkreihqlsko6wyq7pkvw6oesx6pvdmpqmsji5w4xutf3paaq5ar5d3hsy.jpg)`,
          backgroundSize: "cover",
          backgroundPosition: "center 20%",
          opacity: 0.22,
        }} />
        <div style={{
          position: "absolute", top: -80, left: "25%", width: 500, height: 400,
          background: `radial-gradient(ellipse, ${C.purpleGlow} 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
        <div className="hero-flex">
          <div className="hero-text">
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: C.purpleGlow, border: `1px solid ${C.purpleBorder}`,
            borderRadius: 3, padding: "4px 12px", marginBottom: 20,
            animation: "slideUp 0.4s ease both",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.purple, animation: "pulse 2s ease infinite" }} />
            <span style={{
              fontSize: 10, color: C.purple, fontWeight: 700, letterSpacing: 2,
              textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace",
            }}>Live Community · {memberStats.active_this_week || 0} active this week</span>
          </div>

          <h1 style={{
            fontSize: 42, fontWeight: 700, lineHeight: 1.05, marginBottom: 10,
            fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
            animation: "slideUp 0.4s ease 0.05s both",
          }}>Community<br /><span style={{ color: C.purple }}>Dashboard</span></h1>

          <p style={{
            fontSize: 15, color: C.textMuted, maxWidth: 460, lineHeight: 1.6,
            fontFamily: "'Source Sans 3', sans-serif",
            animation: "slideUp 0.4s ease 0.1s both",
          }}>Griffin Newman and David Sims walk through the filmographies of directors who were given a blank check to make whatever crazy, passion project they want. Sometimes… those checks clear. And sometimes, they bounce, baby! <a href={BC_WEBSITE} target="_blank" rel="noopener noreferrer" style={{ color: C.purple, textDecoration: "none", fontWeight: 600 }}>Listen →</a></p>

          <div style={{ display: "flex", gap: 24, marginTop: 28, animation: "slideUp 0.4s ease 0.15s both" }}>
            {[
              { v: memberStats.total_members || 0, l: "Members" },
              { v: totalFilmsCount, l: "Films" },
              { v: memberStats.total_logs || 0, l: "Total Ratings" },
            ].map((s) => (
              <div key={s.l} style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 30, fontWeight: 700, color: C.text, fontFamily: "'Oswald', sans-serif" }}>
                  {s.v.toLocaleString()}
                </span>
                <span style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace" }}>{s.l}</span>
              </div>
            ))}
          </div>
          </div>

          {/* ── Device Mockup ─────────────────────────── */}
          <div className="hero-device">
            <div className="device-phone">
              <div className="device-notch" />
              <div className="device-screen">
                <div className="ds-header">
                  <div className="ds-icon" style={{ background: `${C.purple}18` }}>✅</div>
                  <div>
                    <div className="ds-name">Blank Check</div>
                    <div className="ds-sub">40+ directors · filmographies</div>
                  </div>
                </div>
                <div className="ds-accent" style={{ background: `linear-gradient(90deg, ${C.purple}, transparent)` }} />

                <div className="ds-shelf-label">We Pod A Zoo</div>
                <div className="ds-shelf-row">
                  {[
                    "/4T7OKBdkNBorRKWw7VSeuA225z1.jpg",  /* Singles */
                    "/3rrkyLYbgLj84AYvjhdcJot4JPx.jpg",  /* Almost Famous */
                    "/cAh2pCiNPftsY3aSqJuIOde7uWr.jpg",  /* Vanilla Sky */
                    "/58Y4CjcRX8AtMNtI0AXu9H7iebP.jpg",  /* Aloha */
                  ].map((p, i) => (
                    <div key={i} className="ds-poster" style={{ backgroundImage: `url(${TMDB_IMG}/w92${p})` }}>
                      {i < 3 && <div className="ds-check">✓</div>}
                    </div>
                  ))}
                </div>

                <div className="ds-shelf-label">Mad Pod Fury Cast</div>
                <div className="ds-shelf-row">
                  {[
                    "/5LrI4GiCSrChgkdskVZiwv643Kg.jpg",  /* Mad Max */
                    "/glO6LcTWUZcbxWT2SB4eRDnFSsP.jpg",  /* Babe: Pig in the City */
                    "/za41IHkj6LnkilfTzv5B2qmthKD.jpg",  /* Happy Feet */
                    "/nS7DNl4A7XnDncZX70UJ8ALAihF.jpg",  /* Three Thousand Years of Longing */
                  ].map((p, i) => (
                    <div key={i} className="ds-poster" style={{ backgroundImage: `url(${TMDB_IMG}/w92${p})` }}>
                      {i < 1 && <div className="ds-check">✓</div>}
                    </div>
                  ))}
                </div>

                <div className="ds-rating-row">
                  <div className="ds-rating-icon" style={{ background: `${C.purple}18` }}>🎬</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ds-rating-name" style={{ color: C.star }}>George Miller</div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: "63.6%", borderRadius: 2, background: `linear-gradient(90deg, ${C.purple}, ${C.star})` }} />
                    </div>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.32rem", fontWeight: 600, color: C.star, flexShrink: 0 }}>7/11</div>
                </div>

                <div className="ds-stats">
                  <div style={{ textAlign: "center" }}>
                    <div className="ds-stat-num">82</div>
                    <div className="ds-stat-label">Rated</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div className="ds-stat-num">12</div>
                    <div className="ds-stat-label">Directors</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div className="ds-stat-num" style={{ color: C.purple }}>#8</div>
                    <div className="ds-stat-label">Rank</div>
                  </div>
                </div>

                <div className="ds-cta" style={{ background: `${C.purple}18`, color: C.purple }}>
                  Track on MANTL →
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TABS ══════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
          {[
            { key: "grid", label: "Films" },
            { key: "schedule", label: "Schedule" },
            { key: "leaderboard", label: "Leaderboard" },
          ].map((t) => (
            <button key={t.key} style={tabBtn(t.key)} onClick={() => setTab(t.key)}>
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
                stroke={searchQuery ? C.purple : C.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder={`Search ${activeDirector && activeDirector !== "All" ? activeDirector : "all"} films...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", padding: "9px 12px 9px 36px", borderRadius: 6,
                  background: "rgba(255,255,255,0.05)", border: `1px solid ${searchQuery ? C.purpleBorder : C.border}`,
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

            {/* Director filter + Sort row */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
              flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <select
                  value={activeDirector || ""}
                  onChange={(e) => { setActiveDirector(e.target.value || null); setSearchQuery(""); }}
                  style={{
                    padding: "6px 32px 6px 10px", borderRadius: 5,
                    background: "rgba(255,255,255,0.06)", border: `1px solid ${activeDirector ? C.purpleBorder : C.border}`,
                    color: activeDirector ? C.purple : C.textMuted,
                    fontSize: 12, fontWeight: 600, fontFamily: "'Source Sans 3', sans-serif",
                    cursor: "pointer", outline: "none",
                    appearance: "none", WebkitAppearance: "none",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238B5CF6' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 10px center",
                    transition: "border-color 0.2s",
                  }}
                >
                  <option value="" style={{ background: C.bgCard, color: C.textMuted }}>
                    Nerdy Shit ({films.length})
                  </option>
                  {directors.filter(d => d !== "All").map((d) => (
                    <option key={d} value={d} style={{ background: C.bgCard, color: C.text }}>
                      {d} ({directorCounts[d] || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, color: C.textDim, marginRight: 4, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: 1 }}>Sort</span>
              {[
                { key: "az", label: sortBy === "za" ? "Z–A" : "A–Z", toggle: true },
                { key: "rating", label: "Top Rated" },
                { key: "popular", label: "Popular" },
                { key: "recent", label: "Newest" },
              ].map((s) => {
                const isActive = s.toggle ? (sortBy === "az" || sortBy === "za") : sortBy === s.key;
                return (
                <button key={s.key} onClick={() => {
                  if (s.toggle) { setSortBy(prev => prev === "az" ? "za" : "az"); }
                  else { setSortBy(s.key); }
                }} style={{
                  padding: "4px 10px", borderRadius: 4, border: "none",
                  background: isActive ? `${C.purple}15` : "transparent",
                  color: isActive ? C.purple : C.textDim,
                  fontSize: 11, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                  transition: "all 0.2s", fontWeight: isActive ? 700 : 400,
                }}>{s.toggle && sortBy === "za" ? "Z–A" : s.label}</button>
                );
              })}
              </div>
            </div>

            {/* Franchise retrospective link */}
            {activeDirector && activeDirector !== "All" && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
                padding: "10px 14px", borderRadius: 8,
                background: `${C.purple}06`, border: `1px solid ${C.purpleBorder}`,
                animation: "slideUp 0.2s ease both",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M3 18v-6a9 9 0 0118 0v6" />
                  <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
                </svg>
                <span style={{
                  flex: 1, fontSize: 12, color: C.textMuted,
                  fontFamily: "'Source Sans 3', sans-serif",
                }}>
                  Listen to the full <strong style={{ color: C.purple }}>{activeDirector}</strong> miniseries
                </span>
                <a
                  href={BC_SPOTIFY}
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
                {activeDirector && activeDirector !== "All" ? ` in ${activeDirector}` : ""}
              </div>
            )}

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))",
              columnGap: 14, rowGap: 16, paddingBottom: hasMore ? 16 : 48,
            }}>
              {visibleFilms.map((film, i) => (
                <FilmCard key={film.item_id} film={film} index={i < PAGE_SIZE ? i : 0} onClick={setSelected}
                  userRating={userRatings[film.item_id] || null} onRate={handleRate} isAuthed={isAuthed}
                  hasEpisode={!!film.rss_guid} />
              ))}
            </div>
            {hasMore && (
              <div style={{ textAlign: "center", paddingBottom: 48 }}>
                <button onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)} style={{
                  padding: "10px 32px", borderRadius: 6,
                  background: `${C.purple}12`, border: `1px solid ${C.purpleBorder}`,
                  color: C.purple, fontSize: 12, fontWeight: 700, cursor: "pointer",
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

        {/* ─── SCHEDULE ───────────────────────────────────────────── */}
        {tab === "schedule" && (
          <div style={{ paddingBottom: 48 }}>
            {!rssUrl && (
              <div style={{ textAlign: "center", padding: "40px 0", color: C.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
                RSS feed not configured yet. Set <code>rss_url</code> in community_pages.theme_config.
              </div>
            )}

            {rssLoading && (
              <div style={{ textAlign: "center", padding: "20px 0", color: C.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                Loading schedule...
              </div>
            )}

            {rssError && !rssLoading && upcoming.length === 0 && recent.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 0", color: C.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                {rssError}
              </div>
            )}

            {upcoming.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.purple, animation: "pulse 2s ease infinite" }} />
                  <h3 style={{
                    fontSize: 14, fontWeight: 700, color: C.purple,
                    fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 2,
                  }}>Upcoming Episodes</h3>
                </div>
                {upcoming.map((ep, i) => (
                  <EpisodeCard
                    key={ep.key} ep={ep} isUpcoming index={i}
                    userRating={ep.matchedFilm ? (userRatings[ep.matchedFilm.item_id] || null) : null}
                    onRate={handleRate} isAuthed={isAuthed}
                    isAdmin={isAdmin} films={films} onLinkEpisode={handleLinkEpisode}
                  />
                ))}
              </div>
            )}

            {recent.length > 0 && (
              <div>
                <h3 style={{
                  fontSize: 14, fontWeight: 700, color: C.textDim,
                  fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
                  letterSpacing: 2, marginBottom: 16,
                }}>Recent Episodes</h3>
                {recent.map((ep, i) => (
                  <EpisodeCard
                    key={ep.key} ep={ep} isUpcoming={false} index={i}
                    userRating={ep.matchedFilm ? (userRatings[ep.matchedFilm.item_id] || null) : null}
                    onRate={handleRate} isAuthed={isAuthed}
                    isAdmin={isAdmin} films={films} onLinkEpisode={handleLinkEpisode}
                  />
                ))}
              </div>
            )}

            {rssUrl && !rssLoading && upcoming.length === 0 && recent.length === 0 && !rssError && (
              <div style={{ textAlign: "center", padding: "40px 0", color: C.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
                No scheduled episodes yet
              </div>
            )}
          </div>
        )}

        {/* ─── LEADERBOARD ────────────────────────────────────────── */}
        {tab === "leaderboard" && (
          <div style={{ maxWidth: 580, paddingBottom: 48 }}>
            {!isAuthed ? (
              <div style={{
                textAlign: "center", padding: "60px 24px",
                background: "rgba(255,255,255,0.015)",
                borderRadius: 12,
                border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🏆</div>
                <div style={{
                  fontSize: 18, fontWeight: 700, color: C.text,
                  fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
                  letterSpacing: 1.5, marginBottom: 8,
                }}>Community Leaderboard</div>
                <div style={{
                  fontSize: 13, color: C.textMuted, marginBottom: 24,
                  fontFamily: "'Source Sans 3', sans-serif", lineHeight: 1.5,
                }}>
                  Log in to see who's leading the pack and track your own ranking.
                </div>
                <button onClick={() => setShowLogin(true)} style={{
                  padding: "10px 28px", borderRadius: 4,
                  background: C.purple, border: "none",
                  color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 2,
                }}>Log In to View</button>
              </div>
            ) : (
              <>
                {leaderboard.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 0", color: C.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
                    No ratings yet — be the first!
                  </div>
                )}
                {leaderboard.map((user, i) => {
                  const top3 = i < 3;
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <div key={user.user_id} style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "12px 16px", borderRadius: 6, marginBottom: 6,
                      background: top3 ? `${C.purple}08` : "rgba(255,255,255,0.015)",
                      border: `1px solid ${top3 ? C.purpleBorder : C.border}`,
                      animation: `slideUp 0.3s ease ${i * 0.05}s both`,
                    }}>
                      <div style={{
                        width: 30, textAlign: "center",
                        fontSize: top3 ? 18 : 13, color: top3 ? undefined : C.textDim,
                        fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                      }}>{top3 ? medals[i] : `#${i + 1}`}</div>
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%",
                        background: top3 ? `${C.purple}22` : "rgba(255,255,255,0.05)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 700, color: top3 ? C.purple : C.textDim,
                        fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
                      }}>{user.avatar_emoji || user.username?.[0] || "?"}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 700,
                          color: top3 ? C.text : "rgba(240,236,228,0.65)",
                          fontFamily: "'Source Sans 3', sans-serif",
                        }}>{user.username || "anon"}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{
                          fontSize: 18, fontWeight: 700,
                          color: top3 ? C.purple : C.textMuted,
                          fontFamily: "'Oswald', sans-serif",
                        }}>{user.films_logged}</div>
                        <div style={{
                          fontSize: 9, color: C.textDim, textTransform: "uppercase",
                          letterSpacing: 1.5, fontFamily: "'JetBrains Mono', monospace",
                        }}>films</div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* ═══ FOOTER ════════════════════════════════════════════════════ */}
      <div style={{
        borderTop: `1px solid ${C.border}`, padding: "36px 24px",
        textAlign: "center", background: `linear-gradient(180deg, transparent, ${C.purple}05)`,
      }}>
        <a href={BC_WEBSITE} target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          textDecoration: "none", marginBottom: 14,
          transition: "opacity 0.15s",
        }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
        >
          <span style={{
            fontSize: 16, fontWeight: 700, color: C.purple,
            fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
            letterSpacing: 2,
          }}>Blank Check</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>

        <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 6, fontFamily: "'Source Sans 3', sans-serif" }}>
          Every director. Every film. The filmography deep dive.
        </p>

        <PodcastFooterLinks />

        <div style={{
          marginTop: 20, paddingTop: 16,
          borderTop: `1px solid ${C.border}`,
        }}>
          <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14, fontFamily: "'Source Sans 3', sans-serif" }}>
            {isAuthed
              ? "Earn badges, track your ratings, and see your full progress."
              : "Track your own journey through every director's filmography."
            }
          </p>
          {isAuthed ? (
            <a href={MANTL_APP_URL} target="_blank" rel="noopener noreferrer" style={{
              display: "inline-block", padding: "10px 28px", borderRadius: 4,
              background: C.purple, border: "none", textDecoration: "none",
              color: "#fff", fontSize: 13, fontWeight: 700,
              fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 2,
            }}>Open My Tracker →</a>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{
              display: "inline-block", padding: "10px 28px", borderRadius: 4,
              background: C.purple, border: "none",
              color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 2,
            }}>Join on MANTL</button>
          )}
          <div style={{
            marginTop: 14, fontSize: 10, color: C.textDim,
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1,
          }}>
            <a href={BC_WEBSITE} target="_blank" rel="noopener noreferrer"
              style={{ color: C.textDim, textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => e.currentTarget.style.color = C.purple}
              onMouseLeave={(e) => e.currentTarget.style.color = C.textDim}
            >blankcheckpod.com</a>
            {" · "}
            <span>blankcheck.mymantl.app · powered by MANTL</span>
          </div>
        </div>
      </div>

      <FilmModal film={selected} onClose={() => setSelected(null)}
        userRating={selected ? (userRatings[selected.item_id] || null) : null}
        onRate={handleRate} isAuthed={isAuthed}
        isAdmin={isAdmin} onUpdateItem={handleUpdateItem} allDirectors={directors.filter(d => d !== "All")}
        communityId={communityId}
        episodeUrl={selected ? getEpisodeUrl(selected) : null} />

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      {toast && <Toast message={toast.msg || toast} link={toast.link || null} onDone={() => setToast(null)} />}
    </div>
  );
}
