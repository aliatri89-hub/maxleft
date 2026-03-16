import { useState, useCallback, useEffect, useRef } from "react";
import { useFeed } from "../hooks/community/useFeed";
import { useDismissedCards } from "../hooks/community/useDismissedCards";
import { useAudioPlayer } from "../components/community/shared/AudioPlayerProvider";
import { getPosterUrl, fetchSinglePoster } from "../utils/communityTmdb";
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

  // Sharpie mode — Permanent Marker ★ on cream VHS labels
  if (sharpie) {
    const sharpieSize = size || 14;
    return (
      <div style={{ display: "flex", gap: 1, alignItems: "center", position: "relative" }}>
        {Array.from({ length: full }, (_, i) => (
          <span key={i} style={{
            fontFamily: "'Permanent Marker', cursive",
            fontSize: sharpieSize,
            lineHeight: 1,
            color: "#c8a415",
          }}>★</span>
        ))}
        {half && (
          <span style={{
            fontFamily: "'Permanent Marker', cursive",
            fontSize: sharpieSize,
            lineHeight: 1,
            color: "#c8a415",
            opacity: 0.45,
          }}>★</span>
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
// EPISODE CARD — unified (dropped + upcoming)
// Reads data.status: 'dropped' → Listen button, 'upcoming' → Watched badge
// ════════════════════════════════════════════════
const EPISODE_LABELS = [
  "New Episode", "Just Dropped", "Now Streaming",
  "Fresh Off the Pod", "Out Now",
];

function EpisodeCard({ data, onNavigateCommunity }) {
  const { play: playEpisode, currentEp, isPlaying } = useAudioPlayer();
  const hasBackdrop = !!data.backdrop_path;
  const isDropped = data.status === "dropped";
  const isThisPlaying = isDropped && currentEp?.enclosureUrl === data.episode_url && isPlaying;
  const seen = !!data.user_has_watched;

  const handlePlay = (e) => {
    e.stopPropagation();
    if (!data.episode_url) return;
    playEpisode({
      guid: `episode-${data.item_id}`,
      title: data.episode_title || data.title,
      enclosureUrl: data.episode_url,
      community: data.community_name || null,
      artwork: data.community_image || null,
    });
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
        display: "flex", gap: 12, padding: "14px 16px 0",
        position: "relative", zIndex: 1,
      }}>
        <Poster
          path={data.poster_path} tmdbId={data.tmdb_id}
          title={data.title} mediaType={data.media_type || "film"}
          width={64} height={96} radius={8}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 96 }}>
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

          {/* Podcast name */}
          <div style={{
            fontFamily: "var(--font-body)", fontSize: 12,
            color: "var(--text-muted, #8892a8)",
            display: "flex", alignItems: "center", gap: 6,
            marginTop: "auto",
          }}>
            {data.community_image && (
              <img src={data.community_image} alt=""
                style={{ width: 16, height: 16, borderRadius: 4, objectFit: "cover",
                  border: "1px solid rgba(255,255,255,0.08)" }}
              />
            )}
            {podName}
          </div>
        </div>
      </div>

      {/* Bottom bar — Listen (dropped) or Watched badge (upcoming) */}
      <div style={{
        display: "flex", justifyContent: "flex-end", alignItems: "center",
        padding: "6px 16px 12px", position: "relative", zIndex: 1,
      }}>
        {isDropped && data.episode_url ? (
          <button
            onClick={handlePlay}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 16,
              background: isThisPlaying ? `${accent}25` : `${accent}14`,
              border: `1px solid ${isThisPlaying ? `${accent}66` : `${accent}33`}`,
              color: accent, fontSize: 11, fontWeight: 600,
              cursor: "pointer", fontFamily: "var(--font-body)",
              transition: "all 0.2s",
            }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill={accent}>
              {isThisPlaying
                ? <><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></>
                : <path d="M8 5v14l11-7z"/>
              }
            </svg>
            {isThisPlaying ? "Playing…" : "Listen"}
          </button>
        ) : !isDropped ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
              letterSpacing: "0.04em",
              color: seen ? "#34d399" : "rgba(255,255,255,0.15)",
              transition: "color 0.3s ease",
            }}>
              Watched
            </span>
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: seen ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.03)",
              border: seen
                ? "2px solid rgba(52,211,153,0.5)"
                : "2px dashed rgba(255,255,255,0.12)",
              transition: "all 0.3s ease",
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke={seen ? "#34d399" : "rgba(255,255,255,0.15)"}
                strokeWidth={seen ? "3" : "2"}
                strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: "all 0.3s ease" }}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
        ) : null}
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
  { bg: "#e8e4da", color: "#1a6b3c", text: "FUJI", sub: "HQ", weight: 900 },
  { bg: "#d4d0c8", color: "#333", text: "Memorex", sub: "HS", weight: 700 },
  { bg: "#2a2520", color: "#d4af37", text: "TDK", sub: "SA", weight: 900, dark: true },
  { bg: "#f5c518", color: "#c41e1e", text: "Kodak", sub: "T-120", weight: 800 },
  { bg: "#d4d0c8", color: "#1a4a8a", text: "Maxell", sub: "HGX", weight: 700 },
  { bg: "#e8e4da", color: "#8b1a1a", text: "BASF", sub: "E-180", weight: 900 },
  { bg: "#d4d0c8", color: "#222", text: "VHS", sub: "", weight: 800, isVhs: true },
  { bg: "#e8e4da", color: "#222", text: "VHS", sub: "", weight: 800, isVhs: true },
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

function BrandCap({ brand, side = "right" }) {
  return (
    <div style={{
      width: 26, flexShrink: 0,
      background: brand.bg,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 1,
      borderLeft: side === "right" && !brand.dark ? "1px solid rgba(44,40,36,0.08)" : "none",
      borderRight: side === "left" && !brand.dark ? "1px solid rgba(44,40,36,0.08)" : "none",
    }}>
      {brand.isVhs ? (
        <div style={{ transform: "rotate(90deg)" }}>
          <VhsLogoSvg color={brand.color} size={22} />
        </div>
      ) : (
        <>
          <div style={{
            writingMode: "vertical-rl",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: brand.weight,
            fontSize: 9,
            letterSpacing: "0.04em",
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
              fontSize: 5.5,
              letterSpacing: "0.06em",
              color: brand.color,
              opacity: 0.5,
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

function LogCard({ data, onNavigateCommunity, onViewBadgeDetail }) {
  const [flipped, setFlipped] = useState(false);
  const timeAgo = getTimeAgo(data.logged_at || data.completed_at);
  const communities = data.communities || [];
  const { left: brandLeft, right: brandRight } = getVhsBrands(data.title);

  return (
    <div
      style={{
        margin: "4px 16px",
        borderRadius: 5,
        overflow: "hidden",
        position: "relative",
        cursor: "pointer",
        boxShadow: "0 2px 6px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.03)",
        perspective: 800,
      }}
    >
      <div style={{
        position: "relative",
        transformStyle: "preserve-3d",
        transition: "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: flipped ? "rotateX(-180deg)" : "rotateX(0deg)",
      }}>

        {/* ═══ FRONT — The Tape ═══ */}
        <div
          onClick={() => setFlipped(true)}
          style={{
            backfaceVisibility: "hidden",
            background: "#1a1612",
          }}
        >
          <div style={{
            margin: 5,
            borderRadius: 3,
            overflow: "hidden",
            display: "flex",
            minHeight: 80,
          }}>
            {/* Left brand cap */}
            <BrandCap brand={brandLeft} side="left" />

            {/* Label — center */}
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
              {/* Grid lines */}
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 17px, rgba(0,0,0,0.03) 17px, rgba(0,0,0,0.03) 18px)",
              }} />

              {/* Logo or title */}
              {data.logo_url ? (
                <img
                  src={data.logo_url}
                  alt={data.title}
                  style={{
                    maxHeight: 48,
                    minHeight: 28,
                    maxWidth: "85%",
                    width: "auto",
                    objectFit: "contain",
                    objectPosition: "center",
                    position: "relative",
                    filter: "brightness(0)",
                    opacity: 0.8,
                  }}
                />
              ) : (
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

              {/* Stars */}
              <div style={{ marginTop: 3, position: "relative" }}>
                <Stars rating={data.rating} size={14} sharpie />
              </div>

              {/* Sharpie time */}
              <div style={{
                position: "absolute", bottom: 4, right: 8,
                fontFamily: "'Permanent Marker', cursive",
                fontSize: 9, color: "rgba(44,40,36,0.3)",
              }}>
                {timeAgo}
              </div>
            </div>

            {/* Right brand cap */}
            <BrandCap brand={brandRight} side="right" />
          </div>
        </div>

        {/* ═══ BACK — Community Context ═══ */}
        <div
          onClick={() => setFlipped(false)}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateX(180deg)",
            position: "absolute",
            inset: 0,
            background: "#1a1612",
          }}
        >
          <div style={{
            margin: 5,
            borderRadius: 3,
            overflow: "hidden",
            background: "#f0ebe1",
            minHeight: 80,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "8px 10px",
            position: "relative",
          }}>
            {/* Grid lines */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 17px, rgba(0,0,0,0.03) 17px, rgba(0,0,0,0.03) 18px)",
            }} />

            {/* Title reminder */}
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: 10,
              color: "rgba(44,40,36,0.3)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              textAlign: "center",
              marginBottom: 8,
              position: "relative",
            }}>
              {data.title}
            </div>

            {/* Podcast logos — just icons, tappable */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 10, flexWrap: "wrap",
              position: "relative",
            }}>
              {communities.length > 0 ? communities.map((c, i) => {
                const cAccent = getCommunityAccent(c.community_slug);
                const img = c.community_image;
                return (
                  <div
                    key={`${c.community_slug}-${c.series_title || ""}-${i}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateCommunity?.(c.community_slug, data.tmdb_id);
                    }}
                    style={{ cursor: "pointer", position: "relative" }}
                    title={c.community_name}
                  >
                    {img ? (
                      <img src={img} alt={c.community_name} style={{
                        width: 36, height: 36, borderRadius: 8, objectFit: "cover",
                        border: `2px solid ${cAccent}55`,
                        transition: "transform 0.15s",
                      }} />
                    ) : (
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: `${cAccent}15`, border: `2px solid ${cAccent}55`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800,
                        fontSize: 10, color: cAccent,
                      }}>
                        {(c.community_name || "").split(" ").map(w => w[0]).join("")}
                      </div>
                    )}
                  </div>
                );
              }) : (
                <div style={{
                  fontFamily: "'Lora', serif", fontStyle: "italic",
                  fontSize: 10, color: "rgba(44,40,36,0.35)",
                }}>
                  Personal log
                </div>
              )}
            </div>

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
      </div>
    </div>
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
  const avgRating = data.avg_rating ? parseFloat(data.avg_rating).toFixed(1) : null;
  const hasBackdrop = !!data.backdrop_path;

  return (
    <div style={{
      margin: "6px 16px", background: "var(--bg-card, #1a1714)",
      borderRadius: 16, overflow: "hidden",
      border: "1px solid rgba(52,211,153,0.12)",
      position: "relative",
    }}>
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
            background: `linear-gradient(
              90deg,
              var(--bg-card, #1a1714) 35%,
              rgba(19,24,40,0.6) 55%,
              rgba(19,24,40,0.25) 80%
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

      {/* Subtle green ambient glow */}
      <div style={{
        position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)",
        width: 200, height: 80, borderRadius: "50%",
        background: "var(--accent-green, #34d399)",
        opacity: 0.04, filter: "blur(40px)",
        pointerEvents: "none",
      }} />

      {/* Poster + info */}
      <div style={{ display: "flex", gap: 12, padding: "14px 16px 14px", position: "relative", zIndex: 1 }}>
        <Poster path={data.poster_path} tmdbId={data.tmdb_id} title={data.title} mediaType={data.media_type} width={64} height={96} radius={8} />
        <div style={{ flex: 1, paddingTop: 2 }}>
          {/* Label with pulse dot */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginBottom: 4,
          }}>
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
              color: "var(--text-muted, #8892a8)", marginBottom: 8,
            }}>
              {[data.creator, data.year].filter(Boolean).join(" · ")}
            </div>
          )}

          {/* Stats row — pill style */}
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{
              padding: "4px 9px", borderRadius: 8,
              background: "rgba(52,211,153,0.08)",
              border: "1px solid rgba(52,211,153,0.15)",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <span style={{
                fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 14,
                color: "var(--text-primary, #e8ecf4)",
              }}>
                {data.watch_count}
              </span>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.06em",
                color: "var(--text-faint, #5a6480)", textTransform: "uppercase",
              }}>
                watched
              </span>
            </div>
            {avgRating && (
              <div style={{
                padding: "4px 9px", borderRadius: 8,
                background: "rgba(245,197,66,0.08)",
                border: "1px solid rgba(245,197,66,0.15)",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <span style={{
                  fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 14,
                  color: "var(--accent-gold, #f5c542)",
                }}>
                  {avgRating}
                </span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9,
                  color: "var(--text-faint, #5a6480)",
                }}>
                  ★
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

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
  const ACTIVITY_ONLY_TYPES = new Set(["log", "badge_complete"]);
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
        const hasUserActivity = feedItems.some(item => item.type === "log" || item.type === "badge_complete");
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

          {feedItems.map((item, i) => {
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
                case "log":
                  return <LogCard data={item.data} onNavigateCommunity={onNavigateCommunity} onViewBadgeDetail={setViewingBadgeDetail} />;
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
          })}

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
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
