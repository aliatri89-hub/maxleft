import { t } from "../../theme";
import { useState, useEffect, useRef, useMemo } from "react";
import { getPosterUrl, fetchSinglePoster } from "../../utils/communityTmdb";
import { useAudioPlayer } from "../community/shared/AudioPlayerProvider";

export const TMDB_IMG = "https://image.tmdb.org/t/p/w300";
export const TMDB_BACKDROP = "https://image.tmdb.org/t/p/w780";

let _starsIdCounter = 0;

// ── Resolve image URLs — shelf logs use full URLs, community logs use TMDB paths ──
export function resolveImg(path, base) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${base}${path}`;
}

// ── Dominant color cache (localStorage) ──
const COLOR_PREFIX = "mantl:imgcolor:";
function getCachedColor(src) {
  if (!src) return null;
  try { return localStorage.getItem(COLOR_PREFIX + src); } catch { return null; }
}
function setCachedColor(src, color) {
  if (!src || !color) return;
  try { localStorage.setItem(COLOR_PREFIX + src, color); } catch {}
}

// Extract dominant (non-black, non-white) color from an image URL.
// Uses a hidden off-screen image with crossOrigin — never touches the real <img>.
function extractDominantColor(src, onColor) {
  if (!src) return;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 8; canvas.height = 8;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, 8, 8);
      const data = ctx.getImageData(0, 0, 8, 8).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (brightness < 20 || brightness > 235) continue; // skip near-black / near-white
        r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
      }
      if (count > 0) {
        const f = 0.35; // darken for use as placeholder bg
        onColor(`rgb(${Math.round(r / count * f)},${Math.round(g / count * f)},${Math.round(b / count * f)})`);
      }
    } catch { /* tainted canvas or CORS failure — silent */ }
  };
  img.onerror = () => {};
  // Small delay so it doesn't race the real image for bandwidth
  setTimeout(() => { img.src = src + (src.includes("?") ? "&" : "?") + "_c=1"; }, 800);
}

// ── FadeImg — wrapper approach, safe on mobile/Capacitor ──
// Phase 1: wrapper div always shows placeholder color, image always opacity:1
// Phase 2: dominant color extracted client-side after first load, cached in localStorage
export function FadeImg({ src, alt = "", style = {}, placeholderColor = "rgba(30,22,14,0.9)", className, onLoad, onError, loading = "lazy", ...rest }) {
  const [bgColor, setBgColor] = useState(() => getCachedColor(src) || placeholderColor);

  useEffect(() => {
    const cached = getCachedColor(src);
    if (cached) {
      setBgColor(cached);
    } else {
      setBgColor(placeholderColor); // reset for new src while extraction runs
    }
  }, [src, placeholderColor]);

  const handleLoad = (e) => {
    onLoad?.(e);
    // Only extract if we don't already have a color for this src
    if (src && !getCachedColor(src)) {
      extractDominantColor(src, (color) => {
        setCachedColor(src, color);
        setBgColor(color);
      });
    }
  };

  const { objectFit = "cover", objectPosition, flexShrink, borderRadius, boxShadow, ...wrapperStyle } = style;
  return (
    <div
      className={className}
      style={{
        ...wrapperStyle,
        backgroundColor: bgColor,
        overflow: "hidden",
        flexShrink: flexShrink ?? 0,
        ...(borderRadius !== undefined && { borderRadius }),
        ...(boxShadow !== undefined && { boxShadow }),
      }}
    >
      <img
        src={src}
        alt={alt}
        loading={loading}
        onLoad={handleLoad}
        onError={onError}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit,
          ...(objectPosition ? { objectPosition } : {}),
        }}
        {...rest}
      />
    </div>
  );
}

// ── Star rating display ──
export function Stars({ rating, size = 14, sharpie = false }) {
  const uid = useMemo(() => `stars-${++_starsIdCounter}`, []);
  if (!rating || rating <= 0) return null;
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.25;

  if (sharpie) {
    const s = size || 14;
    const starPaths = [
      "M12 1 L14.5 8 L22 9.5 L16.5 14.5 L18 22 L12 18 L6 22 L7.5 14.5 L2 9.5 L9.5 8 Z",
      "M11.5 2 L14 9 L21.5 10 L15.5 14 L17 21 L11.5 17.5 L5.5 20.5 L7.5 13.5 L2.5 9 L10 8.5 Z",
      "M12 2.5 L15 8.5 L22.5 9 L17 13.5 L18.5 20.5 L12 17 L5.5 20.5 L7 13.5 L1.5 9 L9 8.5 Z",
    ];
    const clipId = `${uid}-halfClip`;
    return (
      <div style={{ display: "flex", gap: 0, alignItems: "center", position: "relative" }}>
        {Array.from({ length: full }, (_, i) => (
          <svg key={i} width={s} height={s} viewBox="0 0 24 24" style={{ display: "block" }}>
            <path d={starPaths[i % starPaths.length]}
              fill="none" stroke="#6b5a10" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"
              style={{ transform: `rotate(${[-3, 2, -1][i % 3]}deg)`, transformOrigin: "center" }} />
          </svg>
        ))}
        {half && (
          <svg width={s} height={s} viewBox="0 0 24 24" style={{ display: "block" }}>
            <defs>
              <clipPath id={clipId}><rect x="0" y="0" width="12" height="24" /></clipPath>
            </defs>
            <path d={starPaths[full % starPaths.length]}
              fill="none" stroke="#6b5a10" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"
              clipPath={`url(#${clipId})`} />
          </svg>
        )}
      </div>
    );
  }

  const gold = "var(--accent-gold, #f5c542)";
  const empty = "rgba(255,255,255,0.12)";
  const gradId = `${uid}-halfGrad`;

  const StarSVG = ({ fill = "full" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      {fill === "half" && (
        <defs>
          <linearGradient id={gradId}>
            <stop offset="50%" stopColor={gold} />
            <stop offset="50%" stopColor={empty} />
          </linearGradient>
        </defs>
      )}
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={fill === "full" ? gold : fill === "half" ? `url(#${gradId})` : empty}
      />
    </svg>
  );

  return (
    <div style={{ display: "flex", gap: 1, alignItems: "center" }}>
      {Array.from({ length: full }, (_, i) => (
        <StarSVG key={i} fill="full" />
      ))}
      {half && <StarSVG fill="half" />}
    </div>
  );
}

// ── Poster image with cache check + live TMDB fallback ──
export function Poster({ path, title, tmdbId, mediaType, width = 90, height = 135, radius = 10 }) {
  const [failed, setFailed] = useState(false);
  const [livePoster, setLivePoster] = useState(null);

  const cachedPath = tmdbId ? getPosterUrl(tmdbId) : null;
  const resolvedPath = path || cachedPath || livePoster;

  useEffect(() => {
    if (path || cachedPath || livePoster || !tmdbId) return;
    let cancelled = false;
    fetchSinglePoster(tmdbId, mediaType || "film").then((url) => {
      if (!cancelled && url) setLivePoster(url);
    });
    return () => { cancelled = true; };
  }, [tmdbId, path, cachedPath, livePoster, mediaType]);

  if (!resolvedPath || failed) {
    return (
      <div style={{
        width, height, borderRadius: radius, flexShrink: 0,
        background: "var(--bg-elevated, #1e2540)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, color: "var(--text-muted, #5a6480)", textAlign: "center",
        padding: 6, lineHeight: 1.3,
      }}>
        {title?.slice(0, 20) || "🎬"}
      </div>
    );
  }
  return (
    <FadeImg
      src={resolveImg(resolvedPath, TMDB_IMG)}
      alt={title || ""}
      onError={() => setFailed(true)}
      style={{
        width, height, borderRadius: radius, objectFit: "cover", flexShrink: 0,
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      }}
    />
  );
}

// ── Mini progress bar ──
export function ProgressBar({ current, total, color = "var(--accent-green, #34d399)", height = 5 }) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  return (
    <div style={{
      width: 48, height, borderRadius: height,
      background: t.bgHover, overflow: "hidden",
    }}>
      <div style={{
        height: "100%", borderRadius: height,
        width: `${pct}%`, background: color,
        transition: "width 0.6s ease",
      }} />
    </div>
  );
}

// ── Fade-in wrapper with optional swipe-to-dismiss ──
export function FeedCard({ children, index, style = {}, dismissable = false, onDismiss }) {
  const [swipeX, setSwipeX] = useState(0);
  const [phase, setPhase] = useState("idle");
  const cardRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const lockedAxis = useRef(null);
  const currentSwipeX = useRef(0);
  const heightRef = useRef(0);

  // CSS-only stagger: no React state updates, no timeouts
  const staggerDelay = `${Math.min(index, 6) * 0.04}s`;

  const DISMISS_THRESHOLD = 120;

  useEffect(() => {
    if (!dismissable) return;
    const el = cardRef.current;
    if (!el) return;

    const onStart = (e) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      lockedAxis.current = null;
      heightRef.current = el.offsetHeight;
    };

    const onMove = (e) => {
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = e.touches[0].clientY - touchStartY.current;

      if (!lockedAxis.current && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        lockedAxis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }

      if (lockedAxis.current === "x" && dx > 0) {
        e.preventDefault();
        e.stopPropagation();
        currentSwipeX.current = dx;
        setSwipeX(dx);
        setPhase("swiping");
      } else if (lockedAxis.current === "x" && dx <= 0) {
        lockedAxis.current = null;
      }
    };

    const onEnd = () => {
      if (lockedAxis.current !== "x") {
        lockedAxis.current = null;
        return;
      }
      lockedAxis.current = null;

      if (currentSwipeX.current >= DISMISS_THRESHOLD) {
        setPhase("sliding-out");
        setSwipeX(window.innerWidth);
        setTimeout(() => {
          setPhase("collapsing");
          setTimeout(() => {
            setPhase("gone");
            onDismiss?.();
          }, 280);
        }, 250);
      } else {
        setPhase("idle");
        setSwipeX(0);
        currentSwipeX.current = 0;
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [dismissable, onDismiss]);

  if (phase === "gone") return null;

  const swipePct = Math.min(swipeX / DISMISS_THRESHOLD, 1);
  const isSwiping = phase === "swiping";
  const isSlidingOut = phase === "sliding-out";
  const isCollapsing = phase === "collapsing";

  return (
    <div
      ref={cardRef}
      style={{
        position: "relative",
        overflow: "hidden",
        maxHeight: isCollapsing ? 0 : heightRef.current || "none",
        opacity: isCollapsing ? 0 : 1,
        transition: isCollapsing
          ? "max-height 0.28s ease-in, opacity 0.2s ease"
          : "none",
      }}
    >
      {dismissable && swipeX > 20 && !isSlidingOut && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center",
          paddingLeft: 24,
          color: `rgba(239,68,68,${0.3 + swipePct * 0.5})`,
          fontSize: 12,
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          pointerEvents: "none",
        }}>
          {swipePct >= 1 ? "Release to dismiss" : "Dismiss"}
        </div>
      )}
      <div
        style={{
          ...style,
          opacity: isSwiping ? 1 - swipePct * 0.3 : 1,
          transform: swipeX > 0 ? `translateX(${swipeX}px)` : "translateY(0)",
          transition: isSwiping
            ? "none"
            : isSlidingOut
            ? "transform 0.25s ease-in, opacity 0.2s ease"
            : "none",
          animation: `feedCardIn 0.35s ease ${staggerDelay} both`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Feed play button for community strips ──
export function FeedPlayButton({ episodeUrl, episodeTitle, communityName, communityImage }) {
  const { play: playEpisode, currentEp, isPlaying } = useAudioPlayer();
  const isThisPlaying = currentEp && currentEp.enclosureUrl === episodeUrl && isPlaying;

  const handlePlay = (e) => {
    e.stopPropagation();
    playEpisode({
      guid: `feed-${episodeUrl}`,
      title: episodeTitle || "Episode",
      enclosureUrl: episodeUrl,
      community: communityName || null,
      artwork: communityImage || null,
    });
  };

  return (
    <button
      onClick={handlePlay}
      aria-label={isThisPlaying ? "Pause episode" : "Play episode"}
      style={{
        width: 28, height: 28, borderRadius: "50%",
        background: isThisPlaying
          ? "rgba(245,197,24,0.15)"
          : "rgba(255,255,255,0.06)",
        border: isThisPlaying
          ? "1px solid rgba(245,197,24,0.3)"
          : `1px solid ${t.borderMedium}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0,
        transition: "all 0.2s ease",
        padding: 0,
        marginRight: -2,
      }}
    >
      {isThisPlaying ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--accent-gold, #F5C518)">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)" style={{ marginLeft: 1 }}>
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
}

// ── Helpers ──

/** True when url points to Patreon (not a playable audio stream) */
export const isPatreonUrl = (url) => !!url && url.includes("patreon.com");

export function getSlugAbbrev(slug) {
  const map = {
    blankcheck: "BC",
    nowplaying: "NP",
    bigpicture: "BP",
    filmjunk: "FJ",
    hdtgm: "HD",
    filmspotting: "FS",
    rewatchables: "RW",
    chapo: "CT",
    getplayed: "GP",
  };
  return map[slug] || (slug || "").slice(0, 2).toUpperCase();
}

export function getCommunityAccent(slug) {
  const map = {
    blankcheck: "#9B72CF",
    nowplaying: "#F2C811",
    bigpicture: "#34d399",
    filmjunk: "#60a5fa",
    hdtgm: "#f87171",
    filmspotting: "#fb923c",
    rewatchables: "#60a5fa",
    chapo: "#f87171",
    getplayed: "#34d399",
  };
  return map[slug] || "#34d399";
}

export function getTimeAgo(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const monthNames = ["Jan", "Feb", "March", "April", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
  return `${monthNames[then.getMonth()]} ${then.getDate()}`;
}
