import { useState, useCallback, useEffect, useRef } from "react";
import { useFeed } from "../hooks/community/useFeed";
import { useDismissedCards } from "../hooks/community/useDismissedCards";
import { useAudioPlayer } from "../components/community/shared/AudioPlayerProvider";
import { useEpisodeMatch } from "../hooks/community/useEpisodeMatch";
import { getPosterUrl, fetchSinglePoster, isLogoChecked } from "../utils/communityTmdb";
import BadgeCelebration from "../components/community/shared/BadgeCelebration";
import BadgeDetailScreen from "../components/community/shared/BadgeDetailScreen";

const TMDB_IMG = "https://image.tmdb.org/t/p/w300";
const TMDB_BACKDROP = "https://image.tmdb.org/t/p/w780";

// Resolve image URLs — shelf logs use full URLs, community logs use TMDB paths
const resolveImg = (path, base) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${base}${path}`;
};

// ── Star rating display ──
function Stars({ rating, size = 14, sharpie = false }) {
  if (!rating || rating <= 0) return null;
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.25;

  // Sharpie mode — hand-drawn outline stars like scribbled on a VHS label
  if (sharpie) {
    const s = size || 14;
    // Outline-only stars with thick rough strokes — looks hand-drawn at any size
    const starPaths = [
      "M12 1 L14.5 8 L22 9.5 L16.5 14.5 L18 22 L12 18 L6 22 L7.5 14.5 L2 9.5 L9.5 8 Z",
      "M11.5 2 L14 9 L21.5 10 L15.5 14 L17 21 L11.5 17.5 L5.5 20.5 L7.5 13.5 L2.5 9 L10 8.5 Z",
      "M12 2.5 L15 8.5 L22.5 9 L17 13.5 L18.5 20.5 L12 17 L5.5 20.5 L7 13.5 L1.5 9 L9 8.5 Z",
    ];
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
              <clipPath id="halfClip"><rect x="0" y="0" width="12" height="24" /></clipPath>
            </defs>
            <path d={starPaths[full % starPaths.length]}
              fill="none" stroke="#6b5a10" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"
              clipPath="url(#halfClip)" />
          </svg>
        )}
      </div>
    );
  }

  const gold = "var(--accent-gold, #f5c542)";
  const empty = "rgba(255,255,255,0.12)";

  const StarSVG = ({ fill = "full" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      {fill === "half" && (
        <defs>
          <linearGradient id={`halfGrad-${size}`}>
            <stop offset="50%" stopColor={gold} />
            <stop offset="50%" stopColor={empty} />
          </linearGradient>
        </defs>
      )}
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={fill === "full" ? gold : fill === "half" ? `url(#halfGrad-${size})` : empty}
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
function Poster({ path, title, tmdbId, mediaType, width = 90, height = 135, radius = 10 }) {
  const [failed, setFailed] = useState(false);
  const [livePoster, setLivePoster] = useState(null);

  // Priority: explicit path > cache > live fetch result
  const cachedPath = tmdbId ? getPosterUrl(tmdbId) : null;
  const resolvedPath = path || cachedPath || livePoster;

  // Live fetch when DB path is null and cache is empty
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
    <img
      src={resolveImg(resolvedPath, TMDB_IMG)}
      alt={title || ""}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{
        width, height, borderRadius: radius, objectFit: "cover", flexShrink: 0,
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      }}
    />
  );
}

// ── Mini progress bar ──
function ProgressBar({ current, total, color = "var(--accent-green, #34d399)", height = 5 }) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  return (
    <div style={{
      width: 48, height, borderRadius: height,
      background: "rgba(255,255,255,0.08)", overflow: "hidden",
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
function FeedCard({ children, index, style = {}, dismissable = false, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [phase, setPhase] = useState("idle"); // idle | swiping | sliding-out | collapsing | gone
  const cardRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const lockedAxis = useRef(null);
  const currentSwipeX = useRef(0); // mirror of swipeX for use in native handlers
  const heightRef = useRef(0);

  const DISMISS_THRESHOLD = 120;

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 60 * Math.min(index, 8));
    return () => clearTimeout(timer);
  }, [index]);

  // ── Native touch listeners — captures events before tab swiper sees them ──
  useEffect(() => {
    if (!dismissable) return;
    const el = cardRef.current;
    if (!el) return;

    const onStart = (e) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      lockedAxis.current = null;
      // Measure card height for collapse animation
      heightRef.current = el.offsetHeight;
    };

    const onMove = (e) => {
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = e.touches[0].clientY - touchStartY.current;

      // Lock axis after 10px of movement
      if (!lockedAxis.current && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        lockedAxis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }

      if (lockedAxis.current === "x" && dx > 0) {
        // Rightward swipe — dismiss gesture; stop tab swiper from seeing it
        e.preventDefault();
        e.stopPropagation();
        currentSwipeX.current = dx;
        setSwipeX(dx);
        setPhase("swiping");
      } else if (lockedAxis.current === "x" && dx <= 0) {
        // Leftward swipe — release to tab swiper for normal navigation
        lockedAxis.current = null;
      }
      // If locked to y, do nothing — let vertical scroll / tab swipe happen naturally
    };

    const onEnd = () => {
      if (lockedAxis.current !== "x") {
        lockedAxis.current = null;
        return;
      }
      lockedAxis.current = null;

      if (currentSwipeX.current >= DISMISS_THRESHOLD) {
        // Phase 1: slide fully off screen
        setPhase("sliding-out");
        setSwipeX(window.innerWidth);
        // Phase 2: after slide completes, collapse height
        setTimeout(() => {
          setPhase("collapsing");
          // Phase 3: after collapse, remove from DOM + persist
          setTimeout(() => {
            setPhase("gone");
            onDismiss?.();
          }, 280);
        }, 250);
      } else {
        // Snap back
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
      {/* Dismiss hint — revealed behind the card as it swipes */}
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
          opacity: visible ? (isSwiping ? 1 - swipePct * 0.3 : 1) : 0,
          transform: visible
            ? swipeX > 0 ? `translateX(${swipeX}px)` : "translateY(0)"
            : "translateY(16px)",
          transition: isSwiping
            ? "none"
            : isSlidingOut
            ? "transform 0.25s ease-in, opacity 0.2s ease"
            : "opacity 0.45s ease, transform 0.45s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════
// FEED PLAY BUTTON — subtle play on community strips
// ════════════════════════════════════════════════
function FeedPlayButton({ episodeUrl, episodeTitle, communityName, communityImage }) {
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
          : "1px solid rgba(255,255,255,0.1)",
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


// ════════════════════════════════════════════════
// BADGE COMPLETE CARD — celebration moment on the feed
// ════════════════════════════════════════════════
function BadgeCompleteCard({ data, onCelebrate }) {
  const accent = data.accent_color || "#f5c542";
  const timeAgo = getTimeAgo(data.earned_at);

  return (
    <div
      onClick={() => onCelebrate(data)}
      style={{
        margin: "6px 16px",
        background: "var(--bg-card, #1a1714)",
        borderRadius: 16, overflow: "hidden",
        border: `1px solid ${accent}30`,
        cursor: "pointer",
        position: "relative",
      }}
    >
      {/* Community banner watermark */}
      {data.community_banner && (
        <div style={{
          position: "absolute", inset: 0,
          opacity: 0.06,
          backgroundImage: `url(${data.community_banner})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          pointerEvents: "none",
        }} />
      )}

      {/* Golden ambient glow */}
      <div style={{
        position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)",
        width: 250, height: 120, borderRadius: "50%",
        background: accent,
        opacity: 0.08, filter: "blur(50px)",
        pointerEvents: "none",
      }} />

      {/* Shimmer sweep animation */}
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(105deg, transparent 40%, ${accent}08 45%, ${accent}15 50%, ${accent}08 55%, transparent 60%)`,
        backgroundSize: "200% 100%",
        animation: "badgeShimmer 3s ease-in-out 1",
        pointerEvents: "none",
        zIndex: 1,
      }} />

      <div style={{
        display: "flex", alignItems: "center", gap: 16, padding: 20,
        position: "relative", zIndex: 2,
      }}>
        {/* Badge image — fully revealed, golden ring */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          overflow: "hidden", flexShrink: 0,
          border: `2.5px solid ${accent}80`,
          boxShadow: `0 0 24px ${accent}25, 0 0 60px ${accent}10`,
          position: "relative",
        }}>
          {data.badge_image ? (
            <img src={data.badge_image} alt={data.badge_name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              background: `radial-gradient(circle, ${accent}30, ${accent}08)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32,
            }}>🏆</div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          {/* Label */}
          <span className="vhs-label vhs-label--badge" style={{ marginBottom: 6 }}>
            <span className="vhs-label-dot" />
            Badge Unlocked
          </span>

          {/* Badge name */}
          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18,
            color: "var(--text-primary, #e8ecf4)", lineHeight: 1.2, marginBottom: 3,
          }}>
            {data.badge_name}
          </div>

          {/* Community + time */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: "var(--font-body)", fontSize: 12,
            color: "var(--text-muted, #8892a8)",
          }}>
            <span>{data.community_name}</span>
            <span style={{ color: "var(--text-faint, #5a6480)" }}>·</span>
            <span style={{ color: "var(--text-faint, #5a6480)" }}>{timeAgo}</span>
          </div>

          {/* Tagline if present */}
          {data.tagline && (
            <div style={{
              fontFamily: "var(--font-body)", fontSize: 11,
              color: `${accent}99`, fontStyle: "italic",
              marginTop: 6, lineHeight: 1.3,
            }}>
              {data.tagline.split("\n")[0]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════
// ON DECK CARD — continue a franchise series
// ════════════════════════════════════════════════
function UpNextCard({ data, onNavigateCommunity }) {
  const hasBackdrop = !!data.backdrop_path;
  const pct = data.total_count > 0 ? Math.round((data.watched_count / data.total_count) * 100) : 0;

  // SVG donut math
  const donutSize = 52;
  const strokeWidth = 4;
  const radius = (donutSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      onClick={() => onNavigateCommunity?.(data.community_slug, data.tmdb_id)}
      style={{
        margin: "6px 16px", background: "var(--bg-card, #1a1714)",
        borderRadius: 16, overflow: "hidden",
        border: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
        cursor: "pointer",
        position: "relative",
      }}
    >
      {/* Backdrop — subtle cinematic feel */}
      {hasBackdrop && (
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${resolveImg(data.backdrop_path, TMDB_BACKDROP)})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          opacity: 0.30,
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(
              90deg,
              var(--bg-card, #1a1714) 35%,
              rgba(19,24,40,0.5) 60%,
              transparent 85%
            )`,
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(
              180deg,
              transparent 40%,
              var(--bg-card, #1a1714) 100%
            )`,
          }} />
        </div>
      )}

      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: -30, left: 60, width: 180, height: 100,
        borderRadius: "50%",
        background: "#60a5fa",
        opacity: 0.05, filter: "blur(40px)",
        pointerEvents: "none",
      }} />

      {/* Poster + info + donut */}
      <div style={{
        display: "flex", gap: 12, padding: "14px 16px",
        position: "relative", zIndex: 1, alignItems: "flex-start",
      }}>
        <Poster path={data.poster_path} tmdbId={data.tmdb_id} title={data.title} mediaType={data.media_type} width={64} height={96} radius={8} />
        <div style={{ flex: 1, paddingTop: 2 }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: "#60a5fa", marginBottom: 4,
          }}>
            On deck
          </div>
          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16,
            color: "var(--text-primary, #e8ecf4)", lineHeight: 1.2, marginBottom: 2,
          }}>
            {data.title}
          </div>
          {(data.creator || data.year) && (
            <div style={{
              fontFamily: "var(--font-body)", fontSize: 12,
              color: "var(--text-muted, #8892a8)", marginBottom: 2,
            }}>
              {[data.creator, data.year].filter(Boolean).join(" · ")}
            </div>
          )}
          {/* Community context */}
          <div style={{
            fontFamily: "var(--font-body)", fontSize: 12,
            color: "var(--text-muted, #8892a8)",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {data.community_image && (
              <img src={data.community_image} alt=""
                style={{ width: 16, height: 16, borderRadius: 4, objectFit: "cover",
                  border: "1px solid rgba(255,255,255,0.08)" }}
              />
            )}
            {data.series_title}
          </div>
        </div>

        {/* Donut tracker */}
        <div style={{
          flexShrink: 0, display: "flex", flexDirection: "column",
          alignItems: "center", gap: 4,
        }}>
          <div style={{ position: "relative", width: donutSize, height: donutSize }}>
            <svg width={donutSize} height={donutSize} style={{ transform: "rotate(-90deg)" }}>
              {/* Background ring */}
              <circle
                cx={donutSize / 2} cy={donutSize / 2} r={radius}
                fill="none" stroke="rgba(255,255,255,0.06)"
                strokeWidth={strokeWidth}
              />
              {/* Progress ring */}
              <circle
                cx={donutSize / 2} cy={donutSize / 2} r={radius}
                fill="none" stroke="#60a5fa"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
              />
            </svg>
            {/* Percentage text centered */}
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-mono)", fontWeight: 700,
              fontSize: 13, color: "#60a5fa",
            }}>
              {pct}%
            </div>
          </div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 9,
            color: "var(--text-faint, #5a6480)",
          }}>
            {data.watched_count}/{data.total_count}
          </div>
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════
// RANDOM PICK CARD — "Have You Seen...?" discovery
// ════════════════════════════════════════════════
function RandomPickCard({ data, onNavigateCommunity }) {
  const hasBackdrop = !!data.backdrop_url;
  const accent = getCommunityAccent(data.community_slug);

  return (
    <div
      onClick={() => onNavigateCommunity?.(data.community_slug, data.tmdb_id)}
      style={{
        margin: "6px 16px", background: "var(--bg-card, #1a1714)",
        borderRadius: 16, overflow: "hidden",
        border: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
        cursor: "pointer",
        position: "relative",
      }}
    >
      {/* Backdrop wash */}
      {hasBackdrop && (
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${resolveImg(data.backdrop_url, TMDB_BACKDROP)})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          opacity: 0.30,
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(
              90deg,
              var(--bg-card, #1a1714) 30%,
              rgba(19,24,40,0.4) 55%,
              transparent 80%
            )`,
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(
              180deg,
              transparent 50%,
              var(--bg-card, #1a1714) 100%
            )`,
          }} />
        </div>
      )}

      {/* Ambient glow — community colored */}
      <div style={{
        position: "absolute", top: -30, right: 40, width: 180, height: 100,
        borderRadius: "50%",
        background: accent,
        opacity: 0.05, filter: "blur(40px)",
        pointerEvents: "none",
      }} />

      {/* Poster + info */}
      <div style={{
        display: "flex", gap: 12, padding: "14px 16px 4px",
        position: "relative", zIndex: 1,
      }}>
        <Poster path={data.poster_url} tmdbId={data.tmdb_id} title={data.title} mediaType={data.media_type} width={64} height={96} radius={8} />
        <div style={{ flex: 1, paddingTop: 2 }}>
          <span className="vhs-label" style={{ marginBottom: 6, color: "rgba(52,211,153,0.7)", borderColor: "rgba(52,211,153,0.1)", background: "rgba(52,211,153,0.04)" }}>
            <span className="vhs-label-dot" style={{ background: "#34d399", boxShadow: "0 0 4px rgba(52,211,153,0.4)" }} />
            Have you seen...?
          </span>
          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16,
            color: "var(--text-primary, #e8ecf4)", lineHeight: 1.2, marginBottom: 2,
          }}>
            {data.title}
          </div>
          {/* Series context — moved up from bottom bar */}
          {data.series_title && (
            <div style={{
              fontFamily: "var(--font-body)", fontSize: 12,
              color: "var(--text-muted, #8892a8)", marginBottom: 2,
            }}>
              {data.series_title}
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar — podcast name + shuffle icon */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "6px 16px 12px",
        position: "relative", zIndex: 1,
      }}>
        <div style={{
          fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600,
          color: accent,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          {data.community_image && (
            <img src={data.community_image} alt=""
              style={{ width: 16, height: 16, borderRadius: 4, objectFit: "cover",
                border: `1px solid ${accent}33` }}
            />
          )}
          {data.community_name}
        </div>
        {/* Shuffle icon — signals this is a random pick */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ opacity: 0.5 }}
        >
          <polyline points="16 3 21 3 21 8" />
          <line x1="4" y1="20" x2="21" y2="3" />
          <polyline points="21 16 21 21 16 21" />
          <line x1="15" y1="15" x2="21" y2="21" />
          <line x1="4" y1="4" x2="9" y2="9" />
        </svg>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════
// EPISODE CARD — unified (dropped + published + upcoming)
// Reads data.status: 'dropped'/'published' → New Episode card, 'upcoming' → Coming Soon card
// ════════════════════════════════════════════════
const EPISODE_LABELS = [
  "New Episode", "Just Dropped", "Now Streaming",
  "Fresh Off the Pod", "Out Now",
];

function EpisodeCard({ data, onNavigateCommunity }) {
  const { matchedEpisode, isThisEpPlaying, playEpisode, isPlaying } = useEpisodeMatch(
    { ...data, id: data.item_id },
    data.community_name || ""
  );
  const hasBackdrop = !!data.backdrop_path;
  const isDropped = data.status === "dropped" || data.status === "published";
  const isThisPlaying = isThisEpPlaying;
  const seen = !!data.user_has_watched;

  const handlePlay = (e) => {
    e.stopPropagation();
    if (!matchedEpisode) return;
    playEpisode(matchedEpisode);
  };

  // Stable label for dropped episodes
  const labelIndex = (data.item_id || "")
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % EPISODE_LABELS.length;
  const droppedLabel = EPISODE_LABELS[labelIndex];

  // Day-of-week label for upcoming episodes
  const dayLabel = (() => {
    if (isDropped || !data.air_date) return null;
    const airDate = new Date(data.air_date);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const airStart = new Date(airDate.getFullYear(), airDate.getMonth(), airDate.getDate());
    const diffDays = Math.round((airStart - todayStart) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return airDate.toLocaleDateString("en-US", { weekday: "long" });
  })();

  const podName = (data.community_name || "").split(" with")[0];
  const accent = getCommunityAccent(data.community_slug);

  return (
    <div
      onClick={() => onNavigateCommunity?.(data.community_slug, data.tmdb_id)}
      style={{
        margin: "6px 16px",
        background: "var(--bg-card, #1a1714)",
        borderRadius: 16, overflow: "hidden",
        border: isDropped
          ? `1px solid ${accent}18`
          : `1px dashed ${accent}40`,
        cursor: "pointer", position: "relative",
      }}
    >
      {/* Backdrop wash */}
      {hasBackdrop && (
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${resolveImg(data.backdrop_path, TMDB_BACKDROP)})`,
          backgroundSize: "cover", backgroundPosition: "center top",
          opacity: 0.30,
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(90deg, var(--bg-card, #1a1714) 30%, transparent 80%)",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, transparent 40%, var(--bg-card, #1a1714) 100%)",
          }} />
        </div>
      )}

      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: -20, right: 30, width: 160, height: 80,
        borderRadius: "50%",
        background: accent,
        opacity: isDropped ? 0.06 : 0.07,
        filter: "blur(40px)", pointerEvents: "none",
      }} />

      {/* Poster + info stack */}
      <div style={{
        display: "flex", gap: 12, padding: "14px 16px 14px",
        position: "relative", zIndex: 1,
      }}>
        <Poster
          path={data.poster_path} tmdbId={data.tmdb_id}
          title={data.title} mediaType={data.media_type || "film"}
          width={64} height={96} radius={8}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Top row — label + optional stars */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isDropped ? 4 : 6 }}>
            {isDropped ? (
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: accent,
              }}>
                {droppedLabel}
              </div>
            ) : (
              <div style={{
                fontFamily: "var(--font-display)", fontWeight: 800,
                fontSize: 15, lineHeight: 1,
                color: accent,
                letterSpacing: "-0.02em",
              }}>
                {dayLabel ? `Coming ${dayLabel}` : "Coming Soon"}
              </div>
            )}
            {isDropped && seen && data.user_rating > 0 && (
              <Stars rating={data.user_rating} size={12} />
            )}
          </div>

          {/* Movie title */}
          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19,
            color: "var(--text-primary, #e8ecf4)",
            lineHeight: 1.2, marginBottom: 2,
          }}>
            {data.title}
          </div>

          {/* Series context */}
          {data.miniseries_title ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              fontFamily: "var(--font-body)", fontSize: 12,
              color: "var(--text-muted, #8892a8)", marginBottom: 2,
            }}>
              <span>{data.miniseries_title}</span>
              {data.sort_order && (
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 10,
                  color: "var(--text-faint, #5a6480)",
                }}>
                  #{data.sort_order}
                </span>
              )}
            </div>
          ) : null}

          {/* Podcast name + Listen/Watched stacked on right */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            marginTop: "auto",
          }}>
            {/* Podcast logo + name */}
            {data.community_image && (
              <img src={data.community_image} alt=""
                style={{ width: 16, height: 16, borderRadius: 4, objectFit: "cover",
                  border: "1px solid rgba(255,255,255,0.08)" }}
              />
            )}
            <span style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted, #8892a8)" }}>{podName}</span>

            {/* Right stack: Listen above Watched */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
              {matchedEpisode && (
                <button
                  onClick={handlePlay}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 12,
                    background: isThisPlaying ? `${accent}25` : `${accent}14`,
                    border: `1px solid ${isThisPlaying ? `${accent}66` : `${accent}33`}`,
                    color: accent, fontSize: 10, fontWeight: 600,
                    cursor: "pointer", fontFamily: "var(--font-body)",
                    transition: "all 0.2s", flexShrink: 0,
                  }}
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill={accent}>
                    {isThisPlaying
                      ? <><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></>
                      : <path d="M8 5v14l11-7z"/>
                    }
                  </svg>
                  {isThisPlaying ? "Playing…" : "Listen"}
                </button>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600,
                  letterSpacing: "0.04em",
                  color: seen ? "#34d399" : "rgba(255,255,255,0.15)",
                  transition: "color 0.3s ease",
                }}>
                  Watched
                </span>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: seen ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.03)",
                  border: seen ? "2px solid rgba(52,211,153,0.5)" : "2px dashed rgba(255,255,255,0.12)",
                  transition: "all 0.3s ease", flexShrink: 0,
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                    stroke={seen ? "#34d399" : "rgba(255,255,255,0.15)"}
                    strokeWidth={seen ? "3" : "2"}
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ transition: "all 0.3s ease" }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════
// LOG CARD — cinematic backdrop + community context
// ════════════════════════════════════════════════
// VHS brand marks — rotated through for personality
// VHS brand marks — rotated through for personality
const VHS_BRANDS = [
  { bg: "#f0ebe1", color: "#0d5a2d", text: "FUJI", sub: "HQ", weight: 900 },
  { bg: "#f0ebe1", color: "#1a1a2e", text: "Memorex", sub: "HS", weight: 800 },
  { bg: "#f0ebe1", color: "#b8860b", text: "TDK", sub: "SA", weight: 900 },
  { bg: "#f0ebe1", color: "#c41e1e", text: "Kodak", sub: "T-120", weight: 800 },
  { bg: "#f0ebe1", color: "#14398a", text: "Maxell", sub: "HGX", weight: 800 },
  { bg: "#f0ebe1", color: "#9b1b1b", text: "BASF", sub: "E-180", weight: 900 },
  { bg: "#f0ebe1", color: "#2C2824", text: "VHS", sub: "", weight: 800, isVhs: true },
  { bg: "#f0ebe1", color: "#2C2824", text: "VHS", sub: "", weight: 800, isVhs: true },
];

function getVhsBrands(title) {
  const hash = (title || "").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const left = VHS_BRANDS[hash % VHS_BRANDS.length];
  const right = VHS_BRANDS[(hash * 7 + 3) % VHS_BRANDS.length];
  // Make sure left and right are different
  const rightIdx = left === right ? (hash * 7 + 4) % VHS_BRANDS.length : (hash * 7 + 3) % VHS_BRANDS.length;
  return { left: VHS_BRANDS[hash % VHS_BRANDS.length], right: VHS_BRANDS[rightIdx] };
}

// VHS logo SVG inline — the actual VHS brand mark
function VhsLogoSvg({ color = "#222", size = 18 }) {
  return (
    <svg viewBox="0 0 100 50" width={size} height={size * 0.5} style={{ display: "block" }}>
      <text x="50" y="38" textAnchor="middle" fontFamily="'Barlow Condensed', sans-serif"
        fontWeight="900" fontSize="42" letterSpacing="3" fill={color}>
        VHS
      </text>
    </svg>
  );
}

function BrandStamp({ brand, side = "right" }) {
  const brandFontSize = brand.text && brand.text.length > 4 ? 7 : 9;
  return (
    <div style={{
      position: "absolute",
      top: 0, bottom: 0,
      [side]: 4,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 1,
      zIndex: 1,
    }}>
      {brand.isVhs ? (
        <div style={{ transform: "rotate(90deg)", opacity: 0.6 }}>
          <VhsLogoSvg color={brand.color} size={20} />
        </div>
      ) : (
        <>
          <div style={{
            writingMode: "vertical-rl",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: brand.weight,
            fontSize: brandFontSize,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: brand.color,
            transform: "rotate(180deg)",
            lineHeight: 1,
          }}>
            {brand.text}
          </div>
          {brand.sub && (
            <div style={{
              writingMode: "vertical-rl",
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 600,
              fontSize: 5,
              letterSpacing: "0.06em",
              color: brand.color,
              opacity: 0.6,
              transform: "rotate(180deg)",
            }}>
              {brand.sub}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LogCard({ data, onNavigateCommunity, onViewBadgeDetail, isFirst = false }) {
  const [flipped, setFlipped] = useState(false);
  const hasFlipped = useRef(false);
  const [isLightLogo, setIsLightLogo] = useState(true); // default dark until detected
  const [logoReady, setLogoReady] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const { play: playEpisode, currentEp, isPlaying } = useAudioPlayer();
  const timeAgo = getTimeAgo(data.logged_at || data.completed_at);
  const communities = data.communities || [];
  const { left: brandLeft, right: brandRight } = getVhsBrands(data.title);
  const peekColor = communities[0]
    ? getCommunityAccent(communities[0].community_slug)
    : "#8B5CF6";

  // ── Audio source derivation ──
  const playableSources = communities.filter(c => c.episode_url && c.episode_url.includes(".mp3"));
  const externalSources = communities.filter(c => c.episode_url && !c.episode_url.includes(".mp3"));
  const hasPlayableAudio = playableSources.length > 0;
  const hasExternalOnly = !hasPlayableAudio && externalSources.length > 0;
  const hasAnyCoverage = communities.length > 0;

  const handlePlay = (e, source) => {
    e.stopPropagation();
    if (!source) return;
    playEpisode({
      guid: `feed-${source.episode_url}`,
      title: source.episode_title || data.title || "Episode",
      enclosureUrl: source.episode_url,
      community: source.community_name || null,
      artwork: source.community_image || null,
    });
  };

  // First-visit tooltip — truly once ever
  useEffect(() => {
    if (!isFirst) return;
    try {
      if (localStorage.getItem("mantl_flip_hint_seen")) return;
    } catch {}
    const t = setTimeout(() => {
      setShowHint(true);
      try { localStorage.setItem("mantl_flip_hint_seen", "1"); } catch {}
    }, 800);
    return () => clearTimeout(t);
  }, [isFirst]);

  return (
    <>
    <div
      style={{
        margin: "4px 16px",
        borderRadius: 6,
        position: "relative",
        cursor: "pointer",
        background: "#302c28",
        padding: "1px 1px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='4' height='4' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")",
      }}
    >
      <div style={{
        borderRadius: 4,
        overflow: "hidden",
      }}>
      {!flipped ? (
        <div
          key="front"
          onClick={() => {
            hasFlipped.current = true;
            setFlipped(true);
            setShowHint(false);
          }}
          style={{
            background: "#1a1612",
            borderRadius: 5,
            position: "relative",
            animation: hasFlipped.current ? "tapeFlip 0.3s ease-out" : "none",
          }}
        >
          <div style={{
            borderRadius: 3,
            overflow: "hidden",
            display: "flex",
            minHeight: 80,
          }}>
            {/* Left dark tape end */}
            <div style={{ width: 5, flexShrink: 0, background: "#1a1612" }} />

            {/* Label — cream center with brand stamps */}
            <div style={{
              flex: 1,
              background: "#f0ebe1",
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Brand stamps on label edges */}
              <BrandStamp brand={brandLeft} side="left" />
              <BrandStamp brand={brandRight} side="right" />

              {/* Grid lines */}
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 17px, rgba(0,0,0,0.03) 17px, rgba(0,0,0,0.03) 18px)",
              }} />

              {/* Logo / skeleton / title — 3-state to prevent text flash */}
              {(() => {
                const expectsLogo = data.tmdb_id && data.media_type !== "book" && data.media_type !== "game";
                const logoLoading = expectsLogo && !data.logo_url && !isLogoChecked(data.tmdb_id);

                return (
                  <>
                    {/* Logo img — hidden until loaded, then fades in */}
                    {data.logo_url && (
                      <img
                        src={data.logo_url}
                        alt={data.title}
                        crossOrigin="anonymous"
                        onLoad={(e) => {
                          setLogoReady(true);
                          // Aspect-ratio-aware scaling — compact logos scale more aggressively
                          const nw = e.target.naturalWidth;
                          const nh = e.target.naturalHeight;
                          const aspect = nw / (nh || 1);
                          if (nw > 0 && nw < 300) {
                            const scale = aspect < 2 ? 1.6 : 1.3;
                            e.target.style.transform = `scale(${scale})`;
                          }
                          try {
                            const img = e.target;
                            const c = document.createElement("canvas");
                            const s = 40;
                            c.width = s; c.height = s;
                            const ctx = c.getContext("2d");
                            ctx.drawImage(img, 0, 0, s, s);
                            const px = ctx.getImageData(0, 0, s, s).data;
                            let light = 0, visible = 0;
                            for (let i = 0; i < px.length; i += 4) {
                              if (px[i + 3] < 50) continue;
                              visible++;
                              if ((px[i] + px[i + 1] + px[i + 2]) / 3 > 200) light++;
                            }
                            setIsLightLogo(visible > 0 && light / visible > 0.5);
                          } catch { /* CORS fail — keep dark filter */ }
                        }}
                        style={{
                          maxHeight: 54,
                          minHeight: 36,
                          maxWidth: "90%",
                          width: "auto",
                          objectFit: "contain",
                          objectPosition: "center",
                          position: "relative",
                          filter: isLightLogo ? "brightness(0)" : "none",
                          opacity: logoReady ? (isLightLogo ? 0.8 : 0.85) : 0,
                          transition: "opacity 0.2s ease-in",
                        }}
                      />
                    )}

                    {/* Skeleton — while logo is being fetched or img is loading */}
                    {(logoLoading || (data.logo_url && !logoReady)) && (
                      <div style={{
                        height: 20, width: "55%", borderRadius: 3,
                        background: "rgba(44,40,36,0.06)",
                        position: data.logo_url ? "absolute" : "relative",
                      }} />
                    )}

                    {/* Text fallback — only when no logo is available */}
                    {!data.logo_url && !logoLoading && (
                      <div style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 800, fontSize: 20, lineHeight: 1.05,
                        color: "#2C2824", textTransform: "uppercase",
                        letterSpacing: "0.01em", position: "relative",
                        textAlign: "center",
                      }}>
                        {data.title}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Sharpie year — under title */}
              {data.year && (
                <div style={{
                  fontFamily: "'Permanent Marker', cursive",
                  fontSize: 10, color: "rgba(44,40,36,0.5)",
                  marginTop: 2, position: "relative",
                  textAlign: "center",
                }}>
                  {data.year}
                </div>
              )}

              {/* Sharpie time — bottom left */}
              <div style={{
                position: "absolute", bottom: 4, left: 28,
                fontFamily: "'Permanent Marker', cursive",
                fontSize: 10, color: "#2C2824",
              }}>
                {timeAgo}
              </div>

              {/* Stars — bottom right */}
              {data.rating > 0 && (
                <div style={{ position: "absolute", bottom: 4, right: 28 }}>
                  <Stars rating={data.rating} size={14} sharpie />
                </div>
              )}

              {/* 🎧 Headphones sticker — audio exists but not playable on MANTL */}
              {hasExternalOnly && (
                <div style={{
                  position: "absolute", bottom: 18, right: 26,
                  opacity: 0.3,
                }} title="Audio available externally">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2C2824" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                  </svg>
                </div>
              )}

              {/* 🎧 Headphones sticker — playable audio on MANTL (visual hint on label) */}
              {hasPlayableAudio && (
                <div style={{
                  position: "absolute", bottom: 18, right: 26,
                  opacity: 0.4,
                }} title="Listen on MANTL">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2C2824" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Right dark tape end */}
            <div style={{ width: 5, flexShrink: 0, background: "#1a1612" }} />
          </div>
        </div>
      ) : (
        <div
          key="back"
          onClick={() => setFlipped(false)}
          style={{
            background: "#1a1612",
            borderRadius: 5,
            position: "relative",
            animation: "tapeFlip 0.3s ease-out",
            cursor: "pointer",
          }}
        >
          <div style={{
            borderRadius: 3,
            overflow: "hidden",
            background: "#f0ebe1",
            minHeight: 80,
            padding: "10px 14px 14px",
            position: "relative",
          }}>
            {/* Grid lines */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 17px, rgba(0,0,0,0.03) 17px, rgba(0,0,0,0.03) 18px)",
            }} />

            {/* Title — underlined sharpie */}
            <div style={{
              fontFamily: "'Permanent Marker', cursive",
              fontSize: 11, color: "rgba(44,40,36,0.45)",
              textAlign: "center",
              marginBottom: 10,
              paddingBottom: 6,
              borderBottom: "1px solid rgba(44,40,36,0.1)",
              position: "relative",
            }}>
              {data.title}
            </div>

            {/* Podcast tracking rows */}
            {communities.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
                {communities.map((c, i) => {
                  const cAccent = getCommunityAccent(c.community_slug);
                  const img = c.community_image;
                  return (
                    <div
                      key={`back-${c.community_slug}-${c.series_title || ""}-${i}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateCommunity?.(c.community_slug, data.tmdb_id);
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        cursor: "pointer",
                        padding: "3px 4px",
                        borderRadius: 4,
                        transition: "background 0.15s",
                      }}
                    >
                      {/* Community avatar */}
                      {img ? (
                        <img src={img} alt={c.community_name} style={{
                          width: 26, height: 26, borderRadius: 6, objectFit: "cover",
                          border: `1.5px solid ${cAccent}44`,
                          flexShrink: 0,
                        }} />
                      ) : (
                        <div style={{
                          width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                          background: `${cAccent}15`, border: `1.5px solid ${cAccent}44`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800,
                          fontSize: 8, color: cAccent,
                        }}>
                          {(c.community_name || "").split(" ").map(w => w[0]).join("")}
                        </div>
                      )}

                      {/* Info + progress */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: "'Permanent Marker', cursive",
                          fontSize: 10, color: "#2C2824",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {c.community_name}
                        </div>
                        {(c.series_title || c.episode_title) && (
                          <div style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 7, color: "rgba(44,40,36,0.4)",
                            textTransform: "uppercase", letterSpacing: "0.04em",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            marginTop: 1,
                            display: "flex", alignItems: "center", gap: 4,
                          }}>
                            <span>{c.series_title || c.episode_title}</span>
                            {c.series_total > 0 && (
                              <span style={{ color: "rgba(44,40,36,0.55)", fontWeight: 600 }}>
                                {c.series_watched || 0}/{c.series_total}
                              </span>
                            )}
                          </div>
                        )}
                        {/* Progress bar */}
                        {c.series_total > 0 && (
                          <div style={{
                            marginTop: 3, height: 3, borderRadius: 2,
                            background: "rgba(44,40,36,0.08)",
                            overflow: "hidden",
                          }}>
                            <div style={{
                              height: "100%", borderRadius: 2,
                              width: `${Math.min(100, Math.round(((c.series_watched || 0) / c.series_total) * 100))}%`,
                              background: cAccent,
                              opacity: (c.series_watched || 0) >= c.series_total ? 0.7 : 0.5,
                              transition: "width 0.3s ease",
                            }} />
                          </div>
                        )}
                        {/* Badge name */}
                        {c.badge?.badge_name && (
                          <div style={{
                            fontFamily: "'Permanent Marker', cursive",
                            fontSize: 7, color: c.badge.accent_color || cAccent,
                            opacity: (c.series_watched || 0) >= (c.series_total || 999) ? 1 : 0.5,
                            marginTop: 2,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {(c.series_watched || 0) >= (c.series_total || 999) ? "🏆 " : "🔒 "}{c.badge.badge_name}
                          </div>
                        )}
                      </div>

                      {/* Navigate arrow */}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke={cAccent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ flexShrink: 0, opacity: 0.6 }}>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  );
                })}
              </div>
            ) : (() => {
              // Deterministic barcode — EAN/UPC style, uniform height, varying widths
              const seed = data.tmdb_id
                ? Number(data.tmdb_id)
                : (data.title || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);

              // Generate sequence of bar+space widths (1–3px each), alternating black/white
              // Guard bars at start/end (always narrow-wide-narrow)
              const pseudoRand = (i) => {
                const x = Math.sin(seed * 9301 + i * 49297 + 233) * 0.5 + 0.5;
                return Math.floor(x * 3) + 1; // 1, 2, or 3
              };
              const stripes = [];
              // Left guard
              stripes.push({ w: 1, dark: true });
              stripes.push({ w: 1, dark: false });
              stripes.push({ w: 1, dark: true });
              // Data bars — 30 alternating stripes
              for (let i = 0; i < 30; i++) {
                stripes.push({ w: pseudoRand(i), dark: i % 2 === 0 });
              }
              // Right guard
              stripes.push({ w: 1, dark: true });
              stripes.push({ w: 1, dark: false });
              stripes.push({ w: 1, dark: true });

              return (
                <div style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  gap: 10, padding: "2px 0", width: "100%",
                }}>
                  {/* HOME VIDEO stamp */}
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 900, fontSize: 7,
                    color: "rgba(44,40,36,0.22)",
                    letterSpacing: "0.22em", textTransform: "uppercase",
                    border: "1px solid rgba(44,40,36,0.14)",
                    borderRadius: 2, padding: "2px 7px",
                  }}>
                    Home Video
                  </div>

                  {/* Barcode */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div style={{ display: "flex", alignItems: "stretch", height: 32 }}>
                      {stripes.map((s, i) => (
                        <div key={i} style={{
                          width: s.w * 2,
                          height: "100%",
                          background: s.dark ? "rgba(44,40,36,0.55)" : "transparent",
                          flexShrink: 0,
                        }} />
                      ))}
                    </div>
                    {/* Numeric digits below — purely decorative */}
                    <div style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 6, color: "rgba(44,40,36,0.3)",
                      letterSpacing: "0.15em",
                    }}>
                      {String(seed).padStart(12, "0").slice(0, 12)}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Flip hint */}
            <div style={{
              position: "absolute", bottom: 3, right: 8,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 6, color: "rgba(44,40,36,0.18)",
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              tap to flip
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ═══ VCR DECK — playable audio on MANTL ═══ */}
      {hasPlayableAudio && (() => {
        const activeSrc = playableSources.find(s =>
          currentEp && currentEp.enclosureUrl === s.episode_url
        );
        const isThisPlaying = activeSrc && isPlaying;
        return (
        <div
          onClick={(e) => { e.stopPropagation(); setShowPicker(p => !p); }}
          style={{
            background: "linear-gradient(180deg, #1e1a16 0%, #1a1612 50%, #161310 100%)",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            padding: "8px 16px 7px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            position: "relative",
            borderRadius: showPicker ? "0" : "0 0 4px 4px",
            cursor: "pointer",
          }}>
          {/* Top highlight edge */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 15%, rgba(255,255,255,0.08) 85%, transparent)",
          }} />
          {/* Bottom shadow edge */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.3) 15%, rgba(0,0,0,0.3) 85%, transparent)",
            borderRadius: showPicker ? 0 : "0 0 4px 4px",
          }} />

          {/* Left speaker grille — perforated metal */}
          <div style={{
            flex: 1, height: 20, borderRadius: 3,
            background: "radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1px)",
            backgroundSize: "5px 5px",
            border: "1px solid rgba(255,255,255,0.04)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3)",
          }} />

          {/* ▶ VCR Play button — beveled */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "linear-gradient(180deg, #2a2520 0%, #1a1612 40%, #151210 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderBottomColor: "rgba(0,0,0,0.4)",
                borderTopColor: "rgba(255,255,255,0.12)",
                borderRadius: 4,
                cursor: "pointer",
                padding: "5px 24px",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 4px rgba(0,0,0,0.4)",
                transition: "all 0.1s ease",
                pointerEvents: "none",
              }}
            >
              {isThisPlaying ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            {/* Green LED */}
            <div style={{
              position: "absolute", top: -1, right: -1,
              width: 5, height: 5, borderRadius: "50%",
              background: isThisPlaying ? "#34d399" : "rgba(52,211,153,0.2)",
              border: isThisPlaying ? "none" : "0.5px solid rgba(52,211,153,0.15)",
              boxShadow: isThisPlaying ? "0 0 4px #34d399, 0 0 8px rgba(52,211,153,0.3)" : "none",
              animation: isThisPlaying ? "ledPulse 2s ease infinite" : "none",
              transition: "all 0.3s ease",
              pointerEvents: "none",
            }} />
          </div>

          {/* Right speaker grille — perforated metal */}
          <div style={{
            flex: 1, height: 20, borderRadius: 3,
            background: "radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1px)",
            backgroundSize: "5px 5px",
            border: "1px solid rgba(255,255,255,0.04)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3)",
          }} />
        </div>
        );
      })()}

      {/* ═══ PICKER — animated slide down ═══ */}
      <div style={{
        maxHeight: showPicker && hasPlayableAudio ? 200 : 0,
        overflow: "hidden",
        transition: "max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div style={{
          background: "#1a1612",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "6px 12px",
          borderRadius: "0 0 4px 4px",
          opacity: showPicker ? 1 : 0,
          transform: showPicker ? "translateY(0)" : "translateY(-6px)",
          transition: "opacity 0.2s ease, transform 0.25s ease",
        }}>
          {playableSources.map((src, i) => {
            const isActive = currentEp && currentEp.enclosureUrl === src.episode_url;
            const accent = getCommunityAccent(src.community_slug);
            return (
              <div
                key={i}
                onClick={(e) => { handlePlay(e, src); setShowPicker(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "5px 4px",
                  cursor: "pointer",
                  borderRadius: 4,
                  background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
                }}
              >
                {src.community_image && (
                  <img src={src.community_image} alt={src.community_name} style={{
                    width: 22, height: 22, borderRadius: 5, objectFit: "cover",
                    border: `1.5px solid ${accent}44`,
                  }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700, fontSize: 11,
                    color: "rgba(255,255,255,0.7)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {src.episode_title || src.series_title || src.community_name}
                  </div>
                  <div style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 7, color: "rgba(255,255,255,0.25)",
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    {src.community_name}{src.series_title ? ` · ${src.series_title}` : ""}
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={isActive && isPlaying ? accent : "rgba(255,255,255,0.4)"}>
                  {isActive && isPlaying
                    ? <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>
                    : <path d="M8 5v14l11-7z" />
                  }
                </svg>
              </div>
            );
          })}
        </div>
      </div>

    </div>
    {showHint && (
      <div style={{
        textAlign: "center",
        marginTop: 2,
        padding: "3px 0",
        animation: "fadeIn 0.4s ease",
      }}>
        <span style={{
          fontFamily: "'Permanent Marker', cursive",
          fontSize: 11,
          color: peekColor,
          opacity: 0.7,
          letterSpacing: "0.02em",
        }}>
          ↕ tap a tape to flip it
        </span>
      </div>
    )}
    </>
  );
}

// ════════════════════════════════════════════════
// BADGE NUDGE CARD — mysterious locked treasure
// ════════════════════════════════════════════════
function BadgeCard({ data, onNavigateCommunity, onViewBadgeDetail }) {
  const pct = data.total_items > 0 ? Math.round((data.watched_count / data.total_items) * 100) : 0;
  const remaining = data.total_items - data.watched_count;
  const blurAmount = Math.max(0, Math.round(12 * (1 - (pct / 100))));
  const accentColor = data.accent_color || "var(--accent-gold, #f5c542)";

  const badgeId = data.badge_id || data.id;

  return (
    <div onClick={() => {
      if (badgeId && onViewBadgeDetail) {
        onViewBadgeDetail({
          id: badgeId,
          name: data.badge_name || data.name,
          image_url: data.image_url,
          accent_color: data.accent_color,
          tagline: data.tagline || null,
          progress_tagline: data.progress_tagline || null,
          description: data.description || null,
          miniseries_id: data.miniseries_id || null,
          media_type_filter: data.media_type_filter || null,
        });
      } else {
        onNavigateCommunity?.(data.community_slug);
      }
    }} style={{
      margin: "6px 16px", background: "var(--bg-card, #1a1714)",
      borderRadius: 16, overflow: "hidden",
      border: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
      cursor: "pointer",
      position: "relative",
    }}>
      {/* Ambient glow — gets brighter as you get closer */}
      <div style={{
        position: "absolute", top: -40, right: -40,
        width: 160, height: 160, borderRadius: "50%",
        background: accentColor,
        opacity: 0.03 + (pct / 100) * 0.06,
        filter: "blur(50px)",
        pointerEvents: "none",
      }} />

      {/* Top section with community banner watermark */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        {data.community_banner && (
          <div style={{
            position: "absolute", inset: 0,
            opacity: 0.06,
            backgroundImage: `url(${data.community_banner})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            pointerEvents: "none",
          }} />
        )}

        <div style={{
          display: "flex", gap: 16, padding: 18, alignItems: "center",
          position: "relative", zIndex: 1,
        }}>
          {/* Badge image — blurred, with pulsing ring when close */}
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: `rgba(245,197,66,0.06)`,
            border: `2px solid ${pct >= 75 ? accentColor : "rgba(245,197,66,0.15)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, position: "relative", overflow: "hidden",
            boxShadow: pct >= 75 ? `0 0 20px ${accentColor}33` : "none",
            transition: "border-color 0.4s ease, box-shadow 0.4s ease",
          }}>
            {data.image_url ? (
              <img
                src={data.image_url}
                alt=""
                style={{
                  width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%",
                  filter: `blur(${blurAmount}px)`,
                  transition: "filter 0.6s ease",
                }}
              />
            ) : (
              <span style={{ fontSize: 26, filter: `blur(${blurAmount}px)` }}>🏆</span>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: pct >= 75 ? accentColor : "var(--text-faint, #5a6480)",
              marginBottom: 3,
              transition: "color 0.4s ease",
            }}>
              {remaining === 0 ? "Complete!" : `${remaining} more to unlock`}
            </div>
            <div style={{
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16,
              color: "var(--text-primary, #e8ecf4)", marginBottom: 1,
            }}>
              {data.badge_name}
            </div>
            {data.progress_tagline && (
              <div style={{
                fontFamily: "var(--font-body)", fontSize: 11,
                color: "var(--text-muted, #8892a8)", fontStyle: "italic",
                marginTop: 4, lineHeight: 1.3,
              }}>
                {data.progress_tagline}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Progress bar — segmented feel */}
      <div style={{ padding: "0 18px 14px" }}>
        <div style={{
          width: "100%", height: 6, borderRadius: 3,
          background: "rgba(255,255,255,0.06)", overflow: "hidden",
          position: "relative",
        }}>
          <div style={{
            height: "100%", borderRadius: 3,
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${accentColor}99, ${accentColor})`,
            transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: pct >= 75 ? `0 0 12px ${accentColor}66` : "none",
          }} />
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between", marginTop: 7,
          fontFamily: "var(--font-mono)", fontSize: 10,
          color: "var(--text-faint, #5a6480)",
        }}>
          <span>
            <span style={{ color: "var(--text-muted, #8892a8)", fontWeight: 600 }}>{data.watched_count}</span>
            {" "}of {data.total_items}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {data.community_image && (
              <img src={data.community_image} alt="" style={{
                width: 14, height: 14, borderRadius: 4, objectFit: "cover",
              }} />
            )}
            {data.community_name}
          </span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// TRENDING CARD — dynamic, energetic, cinematic
// ════════════════════════════════════════════════
function TrendingCard({ data, onNavigateCommunity }) {
  const [flipCount, setFlipCount] = useState(0);
  const flipped = flipCount % 2 === 1;
  const avgRating = data.avg_rating ? parseFloat(data.avg_rating).toFixed(1) : null;
  const hasBackdrop = !!data.backdrop_path;
  const communities = data.communities || [];

  return (
    <div style={{
      margin: "6px 16px",
      borderRadius: 16,
      overflow: "hidden",
      border: "1px solid rgba(52,211,153,0.12)",
      position: "relative",
      cursor: "pointer",
    }}>
      {!flipped ? (
        <div
          key={flipCount}
          onClick={() => setFlipCount(c => c + 1)}
          style={{
            background: "var(--bg-card, #1a1714)",
            position: "relative",
            animation: flipCount > 0 ? "tapeFlip 0.3s ease-out" : "none",
          }}
        >
          {/* Backdrop — fades in from right */}
          {hasBackdrop && (
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${resolveImg(data.backdrop_path, TMDB_BACKDROP)})`,
              backgroundSize: "cover",
              backgroundPosition: "center top",
              opacity: 0.30,
            }}>
              <div style={{
                position: "absolute", inset: 0,
                background: `linear-gradient(90deg, var(--bg-card, #1a1714) 35%, rgba(19,24,40,0.6) 55%, rgba(19,24,40,0.25) 80%)`,
              }} />
              <div style={{
                position: "absolute", inset: 0,
                background: `linear-gradient(180deg, transparent 50%, var(--bg-card, #1a1714) 100%)`,
              }} />
            </div>
          )}

          {/* Subtle green ambient glow */}
          <div style={{
            position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)",
            width: 200, height: 80, borderRadius: "50%",
            background: "var(--accent-green, #34d399)",
            opacity: 0.04, filter: "blur(40px)",
            pointerEvents: "none",
          }} />

          {/* Poster + info + watch count */}
          <div style={{ display: "flex", gap: 12, padding: "14px 16px 14px", position: "relative", zIndex: 1, alignItems: "center" }}>
            <Poster path={data.poster_path} tmdbId={data.tmdb_id} title={data.title} mediaType={data.media_type} width={64} height={96} radius={8} />
            <div style={{ flex: 1, paddingTop: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "var(--accent-green, #34d399)",
                  boxShadow: "0 0 8px rgba(52,211,153,0.5)",
                  animation: "pulse-dot 2s ease infinite",
                }} />
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "var(--accent-green, #34d399)",
                }}>
                  Popular this week
                </span>
              </div>
              <div style={{
                fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16,
                color: "var(--text-primary, #e8ecf4)", lineHeight: 1.2, marginBottom: 3,
              }}>
                {data.title}
              </div>
              {(data.creator || data.year) && (
                <div style={{
                  fontFamily: "var(--font-body)", fontSize: 12,
                  color: "var(--text-muted, #8892a8)",
                }}>
                  {[data.creator, data.year].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>

            {/* Watch count — far right, vertically centered */}
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              flexShrink: 0, gap: 2,
            }}>
              <span style={{
                fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 22,
                color: "var(--accent-green, #34d399)", lineHeight: 1,
              }}>
                {data.watch_count}
              </span>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 8,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: "var(--text-faint, #5a6480)",
              }}>
                watched
              </span>
            </div>
          </div>

          {/* Flip hint */}
          {communities.length > 0 && (
            <div style={{
              position: "absolute", bottom: 6, right: 12,
              fontFamily: "var(--font-mono)", fontSize: 6,
              color: "rgba(52,211,153,0.25)", letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              tap to see where
            </div>
          )}
        </div>
      ) : (
        <div
          key={flipCount}
          onClick={() => setFlipCount(c => c + 1)}
          style={{
            background: "var(--bg-card, #1a1714)",
            position: "relative",
            animation: "tapeFlip 0.3s ease-out",
            minHeight: 124,
            padding: "14px 16px",
          }}
        >
          {/* Grid lines */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 17px, rgba(255,255,255,0.015) 17px, rgba(255,255,255,0.015) 18px)",
          }} />

          {/* Title */}
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
            color: "rgba(52,211,153,0.4)", letterSpacing: "0.1em", textTransform: "uppercase",
            textAlign: "center", marginBottom: 10,
            paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.06)",
            position: "relative",
          }}>
            {data.title}
          </div>

          {/* Community logo grid */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 10,
            justifyContent: "center", alignItems: "center",
          }}>
            {communities.map((c, i) => {
              const cAccent = getCommunityAccent(c.community_slug);
              return (
                <div
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateCommunity?.(c.community_slug, data.tmdb_id);
                  }}
                  style={{ cursor: "pointer", flexShrink: 0 }}
                  title={c.community_name}
                >
                  {c.community_image ? (
                    <img src={c.community_image} alt={c.community_name} style={{
                      width: 40, height: 40, borderRadius: 10, objectFit: "cover",
                      border: `2px solid ${cAccent}44`,
                    }} />
                  ) : (
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: `${cAccent}15`, border: `2px solid ${cAccent}44`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-display)", fontWeight: 800,
                      fontSize: 10, color: cAccent,
                    }}>
                      {(c.community_name || "").split(" ").map(w => w[0]).join("").slice(0, 3)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Flip back hint */}
          <div style={{
            position: "absolute", bottom: 6, right: 12,
            fontFamily: "var(--font-mono)", fontSize: 6,
            color: "rgba(255,255,255,0.12)", letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            tap to flip back
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
// EMPTY STATE
// ════════════════════════════════════════════════
function EmptyFeed({ onNavigateCommunity }) {
  const starters = [
    {
      emoji: "🎙️",
      label: "Explore a community",
      desc: "Dive into Now Playing, Blank Check, Film Junk, and more — track what each podcast covers.",
      action: () => onNavigateCommunity?.("nowplaying"),
      actionLabel: "Browse communities",
      accent: "#60a5fa",
    },
    {
      emoji: "📽️",
      label: "Log your first film",
      desc: "Watched something recently? Shelf it, rate it, start building your collection.",
      accent: "var(--accent-terra, #c97c5d)",
    },
    {
      emoji: "📦",
      label: "Import from Letterboxd",
      desc: "Already tracking on Letterboxd? Import your history and hit the ground running.",
      accent: "#34d399",
    },
  ];

  return (
    <div style={{ padding: "40px 16px 20px" }}>
      {/* Welcome header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>📡</div>
        <div style={{
          fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19,
          color: "var(--text-primary, #e8ecf4)", marginBottom: 6, lineHeight: 1.3,
        }}>
          Your feed starts here
        </div>
        <div style={{
          fontFamily: "var(--font-body)", fontSize: 13,
          color: "var(--text-muted, #8892a8)", lineHeight: 1.5,
          maxWidth: 280, margin: "0 auto",
        }}>
          Log films, track series, earn badges — everything shows up in your feed.
        </div>
      </div>

      {/* Starter action cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {starters.map((s, i) => (
          <div
            key={i}
            onClick={s.action || undefined}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "16px 18px",
              background: "var(--bg-card, #1a1714)",
              borderRadius: 14,
              border: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
              cursor: s.action ? "pointer" : "default",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Subtle accent glow */}
            <div style={{
              position: "absolute", top: -20, left: -20,
              width: 80, height: 80, borderRadius: "50%",
              background: s.accent, opacity: 0.06, filter: "blur(30px)",
              pointerEvents: "none",
            }} />

            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `${s.accent}15`,
              border: `1px solid ${s.accent}25`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, flexShrink: 0,
            }}>
              {s.emoji}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14,
                color: "var(--text-primary, #e8ecf4)", marginBottom: 2,
              }}>
                {s.label}
              </div>
              <div style={{
                fontFamily: "var(--font-body)", fontSize: 12,
                color: "var(--text-muted, #8892a8)", lineHeight: 1.4,
              }}>
                {s.desc}
              </div>
            </div>

            {s.action && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="var(--text-faint, #5a6480)" strokeWidth="2" strokeLinecap="round"
                style={{ flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// FEED SCREEN (main export)
// ════════════════════════════════════════════════
export default function FeedScreen({ session, profile, onToast, isActive, onNavigateCommunity, letterboxdSyncSignal, autoLogCompleteSignal, communitySubscriptions }) {
  const userId = session?.user?.id;
  const [feedMode, setFeedMode] = useState("discover"); // "all" | "activity" | "discover"
  const { feedItems: rawFeedItems, loading, refresh, loadMore, hasMore } = useFeed(userId, communitySubscriptions, feedMode);
  const { isDismissed, dismiss, loaded: dismissLoaded } = useDismissedCards(userId);
  const wasActive = useRef(isActive);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const [celebrationBadge, setCelebrationBadge] = useState(null);
  const [viewingBadgeDetail, setViewingBadgeDetail] = useState(null);

  // Random picks are stabilized by the module-level _randomPicksCache in useFeed,
  // so they don't re-roll on tab switches — no additional latching needed.
  const ACTIVITY_ONLY_TYPES = new Set(["log"]);
  const feedItems = rawFeedItems
    .filter((item) => feedMode !== "activity" || ACTIVITY_ONLY_TYPES.has(item.type));

  // ── Pull-to-refresh ──
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const scrollContainerRef = useRef(null);

  const PULL_THRESHOLD = 70;

  const handleTouchStart = useCallback((e) => {
    // Only engage if scrolled to top — check both the container and window
    const el = scrollContainerRef.current;
    const atTop = (el ? el.scrollTop <= 0 : true) && window.scrollY <= 0;
    if (atTop && !refreshing) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling.current) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) {
      // Dampen the pull (feels more natural)
      setPullDistance(Math.min(dy * 0.5, 120));
    } else {
      isPulling.current = false;
      setPullDistance(0);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD); // Hold at threshold during refresh
      await refreshRef.current();
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance]);

  // Refresh feed when tab becomes active (catches community logs, syncs, etc.)
  useEffect(() => {
    if (isActive && !wasActive.current) {
      refreshRef.current();
    }
    wasActive.current = isActive;
  }, [isActive]);

  // Refresh feed after autoLogAndCheckBadges completes (community_user_progress rows are written)
  useEffect(() => {
    if (autoLogCompleteSignal) {
      refreshRef.current();
    }
  }, [autoLogCompleteSignal]);

  // Refresh feed after Letterboxd sync completes — new movie appears at top
  useEffect(() => {
    if (letterboxdSyncSignal) {
      refreshRef.current();
    }
  }, [letterboxdSyncSignal]);

  if (loading && feedItems.length === 0) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg-primary, #0f0d0b)",
        paddingBottom: 100,
      }}>
        {/* Skeleton loader */}
        <div style={{ padding: "0 16px" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              margin: "6px 0",
              height: i === 1 ? 120 : 180,
              borderRadius: 16,
              background: "var(--bg-card, #1a1714)",
              opacity: 0.6 - i * 0.15,
              animation: "skeleton-pulse 1.5s ease infinite",
              animationDelay: `${i * 0.2}s`,
            }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        minHeight: "100vh", background: "var(--bg-primary, #0f0d0b)",
        paddingBottom: 100,
        overflowY: "auto", WebkitOverflowScrolling: "touch",
      }}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: pullDistance,
          overflow: "hidden",
          transition: refreshing ? "none" : "height 0.15s ease-out",
        }}>
          <div style={{
            width: 28, height: 28,
            borderRadius: "50%",
            border: pullDistance >= PULL_THRESHOLD
              ? "2.5px solid var(--accent-green, #34d399)"
              : "2.5px solid var(--text-faint, #5a6480)",
            borderTopColor: "transparent",
            animation: refreshing ? "ptr-spin 0.8s linear infinite" : "none",
            transform: refreshing ? "none" : `rotate(${pullDistance * 3}deg)`,
            transition: "border-color 0.2s ease",
          }} />
        </div>
      )}

      {(() => {
        const hasUserActivity = feedItems.some(item => item.type === "log");
        const showWelcome = feedMode !== "discover" && (feedItems.length === 0 || !hasUserActivity);

        if (feedItems.length === 0 && feedMode === "activity") {
          return <EmptyFeed onNavigateCommunity={onNavigateCommunity} />;
        }

        return (
        <div style={{ paddingTop: 4, position: "relative" }}>
          {/* Feed mode toggle */}
          <div style={{
            display: "flex", justifyContent: "center",
            padding: "6px 16px 4px",
          }}>
            <div className="vhs-toggle">
              {[
                { key: "discover", label: "▶ Discover" },
                { key: "activity", label: "● Activity" },
              ].map(tab => (
                <button
                  key={tab.key}
                  className={`vhs-toggle-btn${feedMode === tab.key ? " active" : ""}`}
                  onClick={() => setFeedMode(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Welcome cards for users with no real activity yet */}
          {showWelcome && (
            <EmptyFeed onNavigateCommunity={onNavigateCommunity} />
          )}

          {/* Empty discover state */}
          {feedMode === "discover" && feedItems.length === 0 && (
            <div style={{
              padding: "40px 24px", textAlign: "center",
              color: "var(--text-muted, #8892a8)", fontSize: 13,
              fontFamily: "var(--font-body)",
            }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
              Subscribe to more communities to unlock episode drops, recommendations, and badge nudges.
            </div>
          )}

          {(() => { let firstLogSeen = false; return feedItems.map((item, i) => {
            // ── Derive dismiss identity for filterable card types ──
            const dismissKey = item.type === "badge"
              ? { type: "badge", key: item.data.badge_id || item.data.id }
              : item.type === "up_next"
              ? { type: "up_next", key: item.data.miniseries_id }
              : item.type === "random_pick"
              ? { type: "random_pick", key: item.data.item_id }
              : item.type === "episode" && item.data.status === "upcoming"
              ? { type: "episode", key: item.data.item_id }
              : null;

            // Skip dismissed cards
            if (dismissKey && isDismissed(dismissKey.type, dismissKey.key)) return null;

            const stableKey = item.type === "log"
              ? `log-${item.data.tmdb_id || item.data.title}-${(item.data.logged_at || "").slice(0, 10)}`
              : item.type === "badge"
              ? `badge-${item.data.badge_id || item.data.id || item.data.name}`
              : item.type === "badge_complete"
              ? `complete-${item.data.badge_id || item.data.id}`
              : item.type === "trending"
              ? `trending-${item.data.tmdb_id || item.data.title}`
              : item.type === "up_next"
              ? `upnext-${item.data.miniseries_id}`
              : item.type === "random_pick"
              ? `random-${item.data.item_id}`
              : item.type === "episode"
              ? `episode-${item.data.status}-${item.data.tmdb_id}`
              : `feed-${i}`;

            const card = (() => {
              switch (item.type) {
                case "log": {
                  const isFirst = !firstLogSeen;
                  firstLogSeen = true;
                  return <LogCard data={item.data} onNavigateCommunity={onNavigateCommunity} onViewBadgeDetail={setViewingBadgeDetail} isFirst={isFirst} />;
                }
                case "badge":
                  return <BadgeCard data={item.data} onNavigateCommunity={onNavigateCommunity} onViewBadgeDetail={setViewingBadgeDetail} />;
                case "badge_complete":
                  return <BadgeCompleteCard data={item.data} onCelebrate={(b) => setCelebrationBadge(b)} />;
                case "trending":
                  return <TrendingCard data={item.data} onNavigateCommunity={onNavigateCommunity} />;
                case "up_next":
                  return <UpNextCard data={item.data} onNavigateCommunity={onNavigateCommunity} />;
                case "random_pick":
                  return <RandomPickCard data={item.data} onNavigateCommunity={onNavigateCommunity} />;
                case "episode":
                  return <EpisodeCard data={item.data} onNavigateCommunity={onNavigateCommunity} />;
                default:
                  return null;
              }
            })();
            return (
              <FeedCard
                key={stableKey}
                index={i}
                dismissable={!!dismissKey}
                onDismiss={dismissKey ? () => {
                  dismiss(dismissKey.type, dismissKey.key);
                } : undefined}
              >
                {card}
              </FeedCard>
            );
          }); })()}

          {/* Load More */}
          {hasMore && (
            <div style={{ display: "flex", justifyContent: "center", padding: "20px 16px 8px" }}>
              <button
                onClick={loadMore}
                style={{
                  padding: "10px 28px", borderRadius: 10,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "var(--text-muted, #8892a8)",
                  fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >
                Load more
              </button>
            </div>
          )}
        </div>
      );
      })()}

      {/* Animations */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(52,211,153,0.4); }
          50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(52,211,153,0); }
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.2; }
        }
        @keyframes badgeShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes ptr-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Badge celebration overlay */}
      {celebrationBadge && (
        <BadgeCelebration
          badge={{
            name: celebrationBadge.badge_name || celebrationBadge.name,
            image_url: celebrationBadge.badge_image || celebrationBadge.image_url,
            accent_color: celebrationBadge.accent_color,
            audio_url: celebrationBadge.audio_url || null,
            tagline: celebrationBadge.tagline || null,
          }}
          onClose={() => setCelebrationBadge(null)}
          onViewBadge={() => {
            const badgeForDetail = {
              id: celebrationBadge.badge_id || celebrationBadge.id,
              name: celebrationBadge.badge_name || celebrationBadge.name,
              image_url: celebrationBadge.badge_image || celebrationBadge.image_url,
              accent_color: celebrationBadge.accent_color,
              tagline: celebrationBadge.tagline || null,
              progress_tagline: celebrationBadge.progress_tagline || null,
              description: celebrationBadge.description || null,
              miniseries_id: celebrationBadge.miniseries_id,
              media_type_filter: celebrationBadge.media_type_filter || null,
              earned_at: celebrationBadge.earned_at || null,
            };
            setCelebrationBadge(null);
            setViewingBadgeDetail(badgeForDetail);
          }}
        />
      )}

      {/* Badge detail screen (opened from celebration) */}
      {viewingBadgeDetail && (
        <BadgeDetailScreen
          badge={viewingBadgeDetail}
          userId={userId}
          earnedAt={viewingBadgeDetail.earned_at || new Date().toISOString()}
          onClose={() => setViewingBadgeDetail(null)}
        />
      )}
    </div>
  );
}

// ── Helpers ──

function getSlugAbbrev(slug) {
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

// Community brand colors — used for episode & upcoming card accents
function getCommunityAccent(slug) {
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

function getTimeAgo(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  // 1+ days: sharpie-style written date like you'd label a tape
  const monthNames = ["Jan", "Feb", "March", "April", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
  return `${monthNames[then.getMonth()]} ${then.getDate()}`;
}
