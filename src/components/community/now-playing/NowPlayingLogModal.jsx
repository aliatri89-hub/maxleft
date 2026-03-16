import AdminItemEditor from "../shared/AdminItemEditor";
import PinToMantl from "../shared/PinToMantl";
import CrossCommunityChips from "../shared/CrossCommunityChips";
import WatchProviders from "../shared/WatchProviders";
import ListenOnBadges from "../shared/ListenOnBadges";
import { useEpisodeMatch } from "../../../hooks/community/useEpisodeMatch";
import { useState, useEffect, useMemo } from "react";

import { fetchTMDBRaw, fetchTMDBWatchProviders } from "../../../utils/api";
import { toLogTimestamp } from "../../../utils/helpers";
const PATREON_URL = "https://www.patreon.com/nowplayingpodcast";

/**
 * NowPlayingLogModal — Now Playing Podcast community log modal.
 *
 * Multi-media: films, books, and games. Listen On badges (Spotify, Podbean, Patreon).
 * Brown arrow toggle — "So Bad It's Good" flag, independent of star rating.
 *
 * Props:
 *   item           — community_items row (title, year, creator, tmdb_id, media_type, id)
 *   coverUrl       — resolved poster/cover URL
 *   isCompleted    — whether already checked off
 *   progressData   — { rating, brown_arrow } or null
 *   onLog          — (itemId, { rating, completed_at, brown_arrow }) => void
 *   onUnlog        — (itemId) => void
 *   onWatchlist    — (item, coverUrl) => void
 *   onClose        — () => void
 */
export default function NowPlayingLogModal({
  item, coverUrl, isCompleted, progressData,
  onLog, onUnlog, onWatchlist, onClose,
  userId, miniseries, onViewMantl,
  communitySubscriptions, communityId, onNavigateCommunity,
  onToast, onShelvesChanged, coverCacheVersion,
}) {
  const [rating, setRating] = useState(progressData?.rating || 0);
  const [brownArrow, setBrownArrow] = useState(progressData?.brown_arrow || false);
  const [saving, setSaving] = useState(false);
  const [episodeToast, setEpisodeToast] = useState(false); // shows after logging if episode available
  const [overview, setOverview] = useState(null);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [providers, setProviders] = useState(null); // { stream: [], rent: [], buy: [], country }
  const [backdropUrl, setBackdropUrl] = useState(null);

  // ── Reactive cover URL ────────────────────────────────────
  // Reads directly from React state cache (coverCacheVersion) instead of
  // module-level variable. This is truly reactive — re-evaluates every time
  // the cache state updates, not just when the module variable happens to
  // have been updated before React's render cycle.
  const [fetchedCoverUrl, setFetchedCoverUrl] = useState(null);

  const coverCacheKey = useMemo(() => {
    if (item.media_type === "film") return `tmdb:${item.tmdb_id}`;
    if (item.media_type === "show") return `tmdb_tv:${item.tmdb_id}`;
    if (item.media_type === "book") return `book:${item.isbn || item.title}`;
    if (item.media_type === "game") return `game:${item.title}`;
    return `other:${item.id}`;
  }, [item]);

  const resolvedCoverUrl = useMemo(() => {
    // 1. React state cache (reactive — updates as progressive fetch runs)
    const fromCache = coverCacheVersion?.[coverCacheKey];
    if (fromCache) return fromCache;
    // 2. Prop snapshot from open time
    if (coverUrl) return coverUrl;
    // 3. Eager fetch result
    if (fetchedCoverUrl) return fetchedCoverUrl;
    // 4. Direct poster_path from DB row (no API call needed)
    if (item.poster_path) {
      return `https://image.tmdb.org/t/p/w342${item.poster_path}`;
    }
    return null;
  }, [coverCacheVersion, coverCacheKey, coverUrl, fetchedCoverUrl, item.poster_path]);

  // Eager fetch: consolidated with overview fetch below

  // ── Episode matching ──
  const { matchedEpisode, isThisEpPlaying, playEpisode, isPlaying } = useEpisodeMatch(item, "Now Playing");

  // Fetch TMDB data on mount: overview, watch providers, and cover (if not cached)
  useEffect(() => {
    if (!item.tmdb_id || !["film", "show"].includes(item.media_type)) return;
    let cancelled = false;

    // Single TMDB call — extracts overview AND poster
    fetchTMDBRaw(item.tmdb_id, item.media_type === "show" ? "tv" : "movie", "")
      .then((data) => {
        if (cancelled || !data) return;
        if (data.overview) setOverview(data.overview);
        if (data.backdrop_path) {
          setBackdropUrl(`https://image.tmdb.org/t/p/w780${data.backdrop_path}`);
        }
        if (data.poster_path && !resolvedCoverUrl) {
          setFetchedCoverUrl(`https://image.tmdb.org/t/p/w342${data.poster_path}`);
        }
      })
      .catch(() => {});

    // Watch providers (separate endpoint)
    fetchTMDBWatchProviders(item.tmdb_id)
      .then(data => {
        if (cancelled || !data?.results) return;
        const lang = navigator.language || "en-US";
        const countryCode = lang.includes("-") ? lang.split("-")[1].toUpperCase() : "US";
        const region = data.results[countryCode] || data.results["US"] || null;
        if (region) {
          setProviders({
            stream: region.flatrate || [],
            rent: region.rent || [],
            buy: region.buy || [],
            country: countryCode,
            link: region.link || null,
          });
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [item.tmdb_id]);

  // Half-star rating handler
  const handleStarClick = (starNum, isLeftHalf) => {
    const newRating = isLeftHalf ? starNum - 0.5 : starNum;
    setRating(rating === newRating ? 0 : newRating);
  };

  // Log with date (fresh watch)
  const handleLogWithDate = async () => {
    setSaving(true);
    try {
      await onLog(item.id, {
        rating: rating || null,
        completed_at: toLogTimestamp(logDate),
        brown_arrow: (isFilm || isShow || !item.media_type) ? brownArrow : undefined,
        isUpdate: isCompleted,
      });
      // Show episode toast on fresh logs, close immediately on updates
      if (!isCompleted && matchedEpisode && (isFilm || isShow || isBook)) {
        setEpisodeToast(true);
        setTimeout(() => { setEpisodeToast(false); onClose(); }, 5000);
      } else {
        onClose();
      }
      if (isCompleted && onShelvesChanged) onShelvesChanged();
    } catch (e) {
      console.error("[NowPlayingLog] Save error:", e);
      setSaving(false);
    }
  };

  // Already seen (backlog — no date)
  const handleAlreadySeen = async () => {
    setSaving(true);
    try {
      await onLog(item.id, {
        rating: rating || null,
        completed_at: null,
        brown_arrow: (isFilm || isShow || !item.media_type) ? brownArrow : undefined,
        isUpdate: isCompleted,
      });
      if (!isCompleted && matchedEpisode && (isFilm || isShow || isBook)) {
        setEpisodeToast(true);
        setTimeout(() => { setEpisodeToast(false); onClose(); }, 5000);
      } else {
        onClose();
      }
      if (isCompleted && onShelvesChanged) onShelvesChanged();
    } catch (e) {
      console.error("[NowPlayingLog] Backlog error:", e);
      setSaving(false);
    }
  };

  const [confirmUnlog, setConfirmUnlog] = useState(false);

  const handleUnlog = async () => {
    if (!confirmUnlog) {
      setConfirmUnlog(true);
      return;
    }
    setSaving(true);
    try {
      await onUnlog(item.id);
      onClose();
    } catch (e) {
      console.error("[NowPlayingLog] Unlog error:", e);
      setSaving(false);
    }
  };

  const handleWatchlist = async () => {
    setSaving(true);
    try {
      await onWatchlist(item, resolvedCoverUrl);
      onClose();
    } catch (e) {
      console.error("[NowPlayingLog] Watchlist error:", e);
      setSaving(false);
    }
  };

  const isFilm = item.media_type === "film";
  const isBook = item.media_type === "book";
  const isGame = item.media_type === "game";
  const isShow = item.media_type === "show";
  const typeLabel = isFilm ? "Film" : isShow ? "Show" : isBook ? "Book" : "Game";
  const typeEmoji = isFilm ? "🎬" : isShow ? "📺" : isBook ? "📚" : "🎮";

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 250,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        display: "flex", alignItems: "stretch", justifyContent: "center",
        animation: "nppLogFadeIn 0.2s ease",
      }}
    >
      <style>{`
        @keyframes nppLogFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes nppLogSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .npp-star-btn {
          font-size: 28px;
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .npp-star-btn .npp-star-zone {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 50%;
          z-index: 1;
        }
        .npp-star-btn .npp-star-zone.left { left: 0; }
        .npp-star-btn .npp-star-zone.right { right: 0; }
        .npp-date-input {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: #e0e0e0;
          font-size: 13px;
          padding: 6px 10px;
          font-family: inherit;
          outline: none;
          color-scheme: dark;
          cursor: pointer;
        }
        .npp-date-input:focus {
          border-color: rgba(74,222,128,0.4);
        }
      `}</style>

      <div
        style={{
          width: "100%", maxWidth: 420,
          background: "linear-gradient(180deg, #1a1a2e 0%, #12121f 100%)",
          borderRadius: 0,
          padding: "0 20px calc(20px + env(safe-area-inset-bottom, 0px))",
          animation: "nppLogSlideUp 0.25s ease",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          position: "relative",
        }}
      >
        {/* TMDB Backdrop — atmospheric background behind hero */}
        {backdropUrl && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            height: 280, zIndex: 0, overflow: "hidden",
            pointerEvents: "none",
            backgroundImage: `url(${backdropUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
            filter: "saturate(0.6)",
            maskImage: "linear-gradient(to left, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.35) 30%, rgba(0,0,0,0.1) 55%, transparent 75%), linear-gradient(to bottom, black 70%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.35) 30%, rgba(0,0,0,0.1) 55%, transparent 75%), linear-gradient(to bottom, black 70%, transparent 100%)",
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }} />
        )}
        {/* Close button + Admin gear */}
        <div style={{
          position: "sticky", top: 0, zIndex: 2,
          background: "linear-gradient(180deg, rgba(26,26,46,0.5) 0%, rgba(26,26,46,0.3) 60%, transparent 100%)",
          padding: "12px 0 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <AdminItemEditor item={item} userId={userId} miniseries={miniseries || []} communitySlug="npp" onToast={onToast} onSaved={() => {
            if (onShelvesChanged) onShelvesChanged();
            onClose();
          }} />
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none", borderRadius: "50%",
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#888", fontSize: 18, cursor: "pointer",
              transition: "background 0.2s",
            }}
          >✕</button>
        </div>

        {/* Hero: poster + info */}
        <div style={{ display: "flex", gap: 14, marginBottom: 14, position: "relative", zIndex: 1 }}>
          <div style={{
            width: 90, flexShrink: 0,
            aspectRatio: isGame ? "16/9" : "2/3",
            borderRadius: 8, overflow: "hidden",
            background: "linear-gradient(135deg, #1a1a2e, #16213e)",
            position: "relative",
          }}>
            {resolvedCoverUrl ? (
              <img src={resolvedCoverUrl} alt={item.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 32,
              }}>{typeEmoji}</div>
            )}
            <PinToMantl
              compact
              userId={userId}
              isCompleted={isCompleted}
              itemType={isFilm ? "movie" : isShow ? "show" : isBook ? "book" : "game"}
              itemTitle={item.title}
              tmdbId={item.tmdb_id}
              coverUrl={resolvedCoverUrl}
              communitySlug="nowplaying"
              onViewMantl={onViewMantl}
              onClose={onClose}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 20, fontWeight: 700, color: "#fff",
              fontFamily: "'Barlow Condensed', sans-serif",
              lineHeight: 1.2, marginBottom: 4,
            }}>{item.title}</div>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 2 }}>
              {item.creator}{item.year ? ` · ${item.year}` : ""}
            </div>
            {item.episode_number && (
              <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                {item.episode_number}
              </div>
            )}
            {/* NPP website link */}
            <a href="https://www.nowplayingpodcast.com" target="_blank" rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 10, color: "#666", textDecoration: "none",
                marginTop: 4, transition: "color 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#F5C518"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#666"}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              nowplayingpodcast.com
            </a>
            {isCompleted && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 10px",
                  background: "rgba(74,222,128,0.1)",
                  border: "1px solid rgba(74,222,128,0.3)",
                  borderRadius: 20, fontSize: 11, color: "#4ade80", fontWeight: 600,
                }}>
                  ✓ Logged
                </div>
                {progressData?.brown_arrow && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 10px",
                    background: "rgba(160,82,45,0.15)",
                    border: "1px solid rgba(205,133,63,0.4)",
                    borderRadius: 20, fontSize: 11, color: "#CD853F", fontWeight: 700,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M12 4L3 15h6v5h6v-5h6L12 4z" fill="rgba(205,133,63,0.9)" />
                    </svg>
                    So Bad It's Good
                  </div>
                )}
              </div>
            )}
            {/* Listen on MANTL — inline player or search fallback */}
            {((isFilm || isShow) && item.tmdb_id || isBook) && (
              matchedEpisode ? (
                <div style={{ marginTop: 10 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); playEpisode(matchedEpisode); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, width: "100%",
                      padding: "8px 12px",
                      background: isThisEpPlaying ? "rgba(245,197,24,0.15)" : "rgba(245,197,24,0.08)",
                      border: `1.5px solid ${isThisEpPlaying ? "rgba(245,197,24,0.5)" : "rgba(245,197,24,0.2)"}`,
                      borderRadius: 10, cursor: "pointer",
                      transition: "all 0.2s",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {/* Play/pause icon */}
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: "#F5C518",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: isThisEpPlaying ? "0 0 10px rgba(245,197,24,0.4)" : "none",
                    }}>
                      {isThisEpPlaying && isPlaying ? (
                        <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 10 }}>
                          {[0, 1, 2].map(j => (
                            <div key={j} style={{
                              width: 2, borderRadius: 1, background: "#0a0a0a",
                              animation: `nppLogEqBar 0.5s ease ${j * 0.12}s infinite alternate`,
                            }} />
                          ))}
                        </div>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M8 5v14l11-7z" /></svg>
                      )}
                    </div>

                    {/* Episode info */}
                    <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                      <div style={{
                        fontSize: 11, fontWeight: 700, color: "#F5C518",
                        fontFamily: "'Barlow Condensed', sans-serif",
                        textTransform: "uppercase", letterSpacing: 0.5,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {isThisEpPlaying && isPlaying ? "Now Playing" : "Listen on MANTL"}
                      </div>
                      <div style={{
                        fontSize: 10, color: "rgba(255,255,255,0.4)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        marginTop: 1,
                      }}>
                        {matchedEpisode.title}
                      </div>
                    </div>

                    {/* Headphone icon */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(245,197,24,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M3 18v-6a9 9 0 0118 0v6" />
                      <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
                    </svg>
                  </button>
                  <style>{`@keyframes nppLogEqBar { 0% { height: 3px; } 100% { height: 10px; } }`}</style>
                  <ListenOnBadges
                    title={item.title}
                    communityName="Now Playing Podcast"
                    platforms={[
                      { type: "spotify" },
                      { type: "podbean" },
                      { type: "patreon", url: item.episode_url?.includes("patreon.com") ? item.episode_url : PATREON_URL },
                    ]}
                    isPatreon={!!item.episode_url?.includes("patreon.com")}
                    compact
                  />
                </div>
              ) : (
                <ListenOnBadges
                  title={item.title}
                  communityName="Now Playing Podcast"
                  platforms={[
                    { type: "spotify" },
                    { type: "podbean" },
                    { type: "patreon", url: item.episode_url?.includes("patreon.com") ? item.episode_url : PATREON_URL },
                  ]}
                  isPatreon={!!item.episode_url?.includes("patreon.com")}
                  compact
                />
              )
            )}
          </div>
        </div>

        {/* Cross-community chips — dead space between hero and overview */}
        {item.tmdb_id && communitySubscriptions && (
          <div style={{ position: "relative", zIndex: 1 }}>
            <CrossCommunityChips
              tmdbId={item.tmdb_id}
              currentCommunityId={communityId}
              communitySubscriptions={communitySubscriptions}
              onNavigateCommunity={(slug, tmdbId) => {
                onClose();
                onNavigateCommunity?.(slug, tmdbId);
              }}
            />
          </div>
        )}

        {/* TMDB Overview */}
        {overview && (
          <div style={{ marginBottom: 16, position: "relative", zIndex: 1 }}>
            <div
              onClick={() => setOverviewExpanded(!overviewExpanded)}
              style={{
                fontSize: 12.5, color: "#aaa", lineHeight: 1.5,
                display: "-webkit-box",
                WebkitLineClamp: overviewExpanded ? 999 : 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              {overview}
            </div>
            {overview.length > 150 && !overviewExpanded && (
              <div
                onClick={() => setOverviewExpanded(true)}
                style={{ fontSize: 11, color: "#666", marginTop: 4, cursor: "pointer" }}
              >
                more ›
              </div>
            )}
          </div>
        )}

        {/* Streaming Providers */}
        {providers && (providers.stream.length > 0 || providers.rent.length > 0) && (
          <WatchProviders providers={providers} />
        )}

        {/* Rating + Brown Arrow row */}
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: "#888",
            textTransform: "uppercase", letterSpacing: "0.08em",
            marginBottom: 6,
          }}>Your Rating</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const isFull = rating >= n;
                const isHalf = !isFull && rating >= n - 0.5;
                return (
                  <div key={n} className="npp-star-btn"
                    style={{ color: isFull ? "#facc15" : isHalf ? "#facc15" : "#444" }}>
                    <div className="npp-star-zone left" onClick={() => handleStarClick(n, true)} />
                    <div className="npp-star-zone right" onClick={() => handleStarClick(n, false)} />
                    {isFull ? "★" : isHalf ? (
                      <span style={{ position: "relative", display: "inline-block" }}>
                        <span style={{ color: "#444" }}>★</span>
                        <span style={{ position: "absolute", left: 0, top: 0, overflow: "hidden", width: "50%", color: "#facc15" }}>★</span>
                      </span>
                    ) : "☆"}
                  </div>
                );
              })}
              {rating > 0 && (
                <span style={{ fontSize: 12, color: "#facc15", marginLeft: 8, fontWeight: 600 }}>
                  {rating} / 5
                </span>
              )}
            </div>

            {/* Brown Arrow — badge toggle (films & shows) */}
            {(isFilm || isShow) && (
              <div
                onClick={() => setBrownArrow(!brownArrow)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 12px",
                  background: brownArrow ? "rgba(160,82,45,0.15)" : "rgba(255,255,255,0.03)",
                  border: `1.5px solid ${brownArrow ? "rgba(205,133,63,0.5)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                  transition: "all 0.2s",
                  userSelect: "none",
                  boxShadow: brownArrow ? "0 2px 8px rgba(160,82,45,0.25)" : "none",
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: brownArrow ? "rgba(160,82,45,0.3)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${brownArrow ? "rgba(205,133,63,0.5)" : "rgba(255,255,255,0.1)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 4L3 15h6v5h6v-5h6L12 4z" fill={brownArrow ? "rgba(205,133,63,0.9)" : "rgba(255,255,255,0.2)"} />
                  </svg>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: brownArrow ? "#CD853F" : "#555",
                  letterSpacing: "0.03em",
                  transition: "color 0.2s",
                }}>
                  So Bad It's Good
                </span>
              </div>
            )}
          </div>
        </div>
        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

          {/* === NOT YET LOGGED === */}
          {!isCompleted && (
            <>
              {/* Log Film + date picker row */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleLogWithDate}
                  disabled={saving}
                  style={{
                    flex: 1, padding: "13px 0",
                    background: "linear-gradient(135deg, #4ade80, #22c55e)",
                    border: "none", borderRadius: 12,
                    color: "#0a0a0a", fontSize: 15, fontWeight: 700,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    letterSpacing: "0.02em",
                    cursor: saving ? "wait" : "pointer",
                    opacity: saving ? 0.6 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  {saving ? "Saving..." : `✓ Log ${typeLabel}`}
                </button>
                <input
                  type="date"
                  className="npp-date-input"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                />
              </div>

              {/* Already Seen + Want to Watch */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleAlreadySeen}
                  disabled={saving}
                  style={{
                    flex: 1, padding: "11px 0",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    color: "#ccc", fontSize: 12, fontWeight: 600,
                    cursor: saving ? "wait" : "pointer",
                    transition: "background 0.2s",
                  }}
                >
                  ✓ Already Seen
                </button>
                <button
                  onClick={handleWatchlist}
                  disabled={saving}
                  style={{
                    flex: 1, padding: "11px 0",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    color: "#999", fontSize: 12, fontWeight: 600,
                    cursor: saving ? "wait" : "pointer",
                    transition: "background 0.2s",
                  }}
                >
                  {(isFilm || isShow) ? "👁 Watch List" : isBook ? "📚 Read List" : "🎮 Play List"}
                </button>
              </div>
            </>
          )}

          {/* === ALREADY LOGGED === */}
          {isCompleted && (
            <>
              <button
                onClick={handleLogWithDate}
                disabled={saving}
                style={{
                  width: "100%", padding: "13px 0",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  border: "none", borderRadius: 12,
                  color: "#0a0a0a", fontSize: 15, fontWeight: 700,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  letterSpacing: "0.02em",
                  cursor: saving ? "wait" : "pointer",
                  opacity: saving ? 0.6 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                {saving ? "Saving..." : "Update Log"}
              </button>

              <button
                onClick={handleUnlog}
                disabled={saving}
                style={{
                  width: "100%", padding: "11px 0",
                  background: confirmUnlog ? "rgba(233,69,96,0.2)" : "rgba(233,69,96,0.08)",
                  border: `1px solid ${confirmUnlog ? "rgba(233,69,96,0.5)" : "rgba(233,69,96,0.2)"}`,
                  borderRadius: 12,
                  color: "#e94560", fontSize: 13, fontWeight: 600,
                  cursor: saving ? "wait" : "pointer",
                  transition: "background 0.2s, border-color 0.2s",
                }}
              >
                {confirmUnlog ? "Tap again to confirm" : "Remove from Log"}
              </button>
            </>
          )}

          {/* Cancel */}
          <button
            onClick={onClose}
            style={{
              width: "100%", padding: "10px 0",
              background: "none", border: "none",
              color: "#666", fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>

        {/* ── Episode toast — auto-dismiss after logging ── */}
        {episodeToast && matchedEpisode && (
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            padding: "0 16px 24px",
            background: "linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 70%, transparent 100%)",
            zIndex: 10,
            animation: "nppLogSlideUp 0.3s ease",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          }}>
            <div style={{
              fontSize: 11, color: "rgba(255,255,255,0.4)",
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: "uppercase", letterSpacing: 1.5,
            }}>Shelf'd! Now hear what the hosts thought</div>

            <button
              onClick={() => { playEpisode(matchedEpisode); setEpisodeToast(false); onClose(); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 360,
                padding: "12px 16px",
                background: "rgba(245,197,24,0.12)",
                border: `1.5px solid rgba(245,197,24,0.3)`,
                borderRadius: 14, cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: "50%", background: "#F5C518",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M8 5v14l11-7z" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{
                  fontSize: 14, fontWeight: 700, color: "#F5C518",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  textTransform: "uppercase", letterSpacing: 0.5,
                }}>Listen on MANTL</div>
                <div style={{
                  fontSize: 10, color: "rgba(255,255,255,0.4)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1,
                }}>{matchedEpisode.title}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(245,197,24,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M3 18v-6a9 9 0 0118 0v6" />
                <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
              </svg>
            </button>

            <button
              onClick={() => { setEpisodeToast(false); onClose(); }}
              style={{
                background: "none", border: "none", color: "rgba(255,255,255,0.3)",
                fontSize: 12, cursor: "pointer", padding: "6px 16px",
              }}
            >Not now</button>
          </div>
        )}
      </div>
    </div>
  );
}
