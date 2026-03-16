import AdminItemEditor from "../shared/AdminItemEditor";
import PinToMantl from "../shared/PinToMantl";
import CrossCommunityChips from "../shared/CrossCommunityChips";
import WatchProviders from "../shared/WatchProviders";
import ListenOnBadges from "../shared/ListenOnBadges";
import { useEpisodeMatch } from "../../../hooks/community/useEpisodeMatch";
import { useState, useEffect, useMemo } from "react";

import { fetchTMDBRaw, fetchTMDBWatchProviders } from "../../../utils/api";
import { toLogTimestamp } from "../../../utils/helpers";
const PATREON_URL = "https://www.patreon.com/blankcheck";

/**
 * BlankCheckLogModal — Blank Check community log modal.
 *
 * Features specific to Blank Check:
 *   - Listen On badges (Spotify, Apple Podcasts, Patreon)
 *   - "Listened with commentary" toggle for Patreon commentary tracks
 *   - Multi-media: films, books, and games
 *   - Episode number display
 *
 * Props:
 *   item              — community_items row (title, year, creator, tmdb_id, media_type, id, episode_number)
 *   coverUrl          — resolved poster/cover URL from communityTmdb cache
 *   isCompleted       — whether already checked off
 *   progressData      — { listened_with_commentary: bool, rating } or null
 *   isPatreon         — whether this item is a Patreon commentary episode
 *   coverCacheVersion — reactive cover cache from screen state
 *   onLog             — (itemId, { rating, completed_at, listened_with_commentary }) => void
 *   onUnlog           — (itemId) => void
 *   onWatchlist       — (item, coverUrl) => void
 *   onClose           — () => void
 */
export default function BlankCheckLogModal({
  item, coverUrl, isCompleted, progressData, isPatreon,
  onLog, onUnlog, onWatchlist, onToggleCommentary, onClose,
  userId, miniseries, coverCacheVersion,
  communitySubscriptions, communityId, onNavigateCommunity,
  onToast,
}) {
  const [rating, setRating] = useState(progressData?.rating || 0);
  const [listenedWithCommentary, setListenedWithCommentary] = useState(
    progressData?.listened_with_commentary || false
  );
  const [saving, setSaving] = useState(false);
  const [episodeToast, setEpisodeToast] = useState(false);
  const [overview, setOverview] = useState(null);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [providers, setProviders] = useState(null); // { stream: [], rent: [], buy: [], country }
  const [backdropUrl, setBackdropUrl] = useState(null);

  // ── Reactive cover URL ────────────────────────────────────
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

  // ── Episode matching ──
  const { matchedEpisode, isThisEpPlaying, playEpisode } = useEpisodeMatch(item, "Blank Check");

  // Fetch TMDB overview + watch providers + cover on mount
  useEffect(() => {
    if (!item.tmdb_id || !["film", "show"].includes(item.media_type)) return;
    const mediaType = item.media_type === "show" ? "tv" : "movie";

    // Overview + eager cover fetch
    fetchTMDBRaw(item.tmdb_id, mediaType, "")
      .then((data) => {
        if (data?.overview) setOverview(data.overview);
        if (data?.poster_path && !resolvedCoverUrl) {
          setFetchedCoverUrl(`https://image.tmdb.org/t/p/w342${data.poster_path}`);
        }
        if (data?.backdrop_path) {
          setBackdropUrl(`https://image.tmdb.org/t/p/w780${data.backdrop_path}`);
        }
      })
      .catch(() => {});

    // Watch providers
    fetchTMDBWatchProviders(item.tmdb_id)
      .then(data => {
        if (!data?.results) return;
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
        listened_with_commentary: listenedWithCommentary,
        isUpdate: isCompleted,
      });
      // Show episode toast if there's audio available and not already playing
      if (matchedEpisode && !isThisEpPlaying && !isCompleted) {
        setSaving(false);
        setEpisodeToast(true);
      } else {
        onClose();
      }
    } catch (e) {
      console.error("[BlankCheckLog] Save error:", e);
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
        listened_with_commentary: listenedWithCommentary,
        isUpdate: isCompleted,
      });
      onClose();
    } catch (e) {
      console.error("[BlankCheckLog] Backlog error:", e);
      setSaving(false);
    }
  };

  const [confirmUnlog, setConfirmUnlog] = useState(false);

  const handleUnlog = async () => {
    if (!confirmUnlog) { setConfirmUnlog(true); return; }
    setSaving(true);
    try {
      await onUnlog(item.id);
      onClose();
    } catch (e) {
      console.error("[BlankCheckLog] Unlog error:", e);
      setSaving(false);
    }
  };

  const handleWatchlist = async () => {
    setSaving(true);
    try {
      await onWatchlist(item, resolvedCoverUrl);
      onClose();
    } catch (e) {
      console.error("[BlankCheckLog] Watchlist error:", e);
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
        animation: "bcLogFadeIn 0.2s ease",
      }}
    >
      <style>{`
        @keyframes bcLogFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bcLogSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .bc-star-btn {
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
        .bc-star-btn .bc-star-zone {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 50%;
          z-index: 1;
        }
        .bc-star-btn .bc-star-zone.left { left: 0; }
        .bc-star-btn .bc-star-zone.right { right: 0; }
        .bc-date-input {
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
        .bc-date-input:focus {
          border-color: rgba(74,222,128,0.4);
        }
        .bc-commentary-toggle {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: background 0.2s, border-color 0.2s;
          user-select: none;
        }
        .bc-commentary-toggle.active {
          background: rgba(250,204,21,0.1);
          border-color: rgba(250,204,21,0.35);
        }
        .bc-commentary-toggle:active {
          background: rgba(255,255,255,0.06);
        }
      `}</style>

      <div
        style={{
          width: "100%", maxWidth: 420,
          background: "linear-gradient(180deg, #1a1a2e 0%, #12121f 100%)",
          borderRadius: 0,
          padding: "0 20px calc(20px + env(safe-area-inset-bottom, 0px))",
          animation: "bcLogSlideUp 0.25s ease",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          position: "relative",
        }}
      >
        {/* Backdrop image — top of modal only, fades out before description */}
        {backdropUrl && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            height: 280,
            backgroundImage: `url(${backdropUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
            zIndex: 0,
            maskImage: "linear-gradient(to left, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.35) 30%, rgba(0,0,0,0.1) 55%, transparent 75%), linear-gradient(to bottom, black 70%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.35) 30%, rgba(0,0,0,0.1) 55%, transparent 75%), linear-gradient(to bottom, black 70%, transparent 100%)",
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }} />
        )}

        {/* Close button + Admin gear */}
        <div style={{
          position: "sticky", top: 0, zIndex: 2,
          background: "transparent",
          padding: "12px 0 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <AdminItemEditor item={item} userId={userId} miniseries={miniseries || []} communitySlug="blankcheck" onSaved={onClose} />
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
            width: 120, flexShrink: 0,
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
              communitySlug="blankcheck"

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
                {progressData?.listened_with_commentary && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 10px",
                    background: "rgba(250,204,21,0.1)",
                    border: "1px solid rgba(250,204,21,0.3)",
                    borderRadius: 20, fontSize: 11, color: "#facc15", fontWeight: 600,
                  }}>
                    🎧 Commentary
                  </div>
                )}
              </div>
            )}
            {/* Listen on MANTL — in hero dead space */}
            {matchedEpisode && (
              <button
                onClick={() => {
                  if (isThisEpPlaying) return;
                  playEpisode(matchedEpisode);
                }}
                style={{
                  width: "100%", marginTop: 8, padding: "8px 10px",
                  background: isThisEpPlaying
                    ? "rgba(245,197,24,0.15)"
                    : "rgba(245,197,24,0.08)",
                  border: `1px solid ${isThisEpPlaying ? "rgba(245,197,24,0.4)" : "rgba(245,197,24,0.2)"}`,
                  borderRadius: 10,
                  display: "flex", alignItems: "center", gap: 8,
                  cursor: isThisEpPlaying ? "default" : "pointer",
                  transition: "background 0.2s, border-color 0.2s",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: isThisEpPlaying
                    ? "linear-gradient(135deg, #F5C518, #eab308)"
                    : "rgba(245,197,24,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {isThisEpPlaying ? (
                    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 10 }}>
                      {[0, 1, 2].map(j => (
                        <div key={j} style={{
                          width: 2.5, borderRadius: 1, background: "#0a0a0a",
                          animation: `audioEqBar 0.5s ease ${j * 0.12}s infinite alternate`,
                        }} />
                      ))}
                    </div>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#F5C518"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: isThisEpPlaying ? "#F5C518" : "#ccc",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    textTransform: "uppercase", letterSpacing: "0.02em",
                  }}>{isThisEpPlaying ? "Now Playing" : "Listen on MANTL"}</div>
                  <div style={{
                    fontSize: 9, color: "rgba(255,255,255,0.35)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1,
                  }}>{matchedEpisode.title}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(245,197,24,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M3 18v-6a9 9 0 0118 0v6" />
                  <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
                </svg>
              </button>
            )}
            {/* Listen On badges — compact, inside hero */}
            {(isFilm || isShow) && (
              <ListenOnBadges
                title={item.title}
                communityName="Blank Check"
                platforms={[
                  { type: "spotify" },
                  { type: "apple" },
                  { type: "patreon", url: PATREON_URL },
                ]}
                isPatreon={isPatreon}
                compact
              />
            )}
          </div>
        </div>

        {/* Cross-community chips */}
        {item.tmdb_id && communitySubscriptions && (
          <CrossCommunityChips
            tmdbId={item.tmdb_id}
            currentCommunityId={communityId}
            communitySubscriptions={communitySubscriptions}
            onNavigateCommunity={(slug, tmdbId) => {
              onClose();
              onNavigateCommunity?.(slug, tmdbId);
            }}
          />
        )}

        {/* TMDB Overview */}
        {overview && (
          <div style={{ marginBottom: 16 }}>
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

        {/* Rating */}
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: "#888",
            textTransform: "uppercase", letterSpacing: "0.08em",
            marginBottom: 6,
          }}>Your Rating</div>
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {[1, 2, 3, 4, 5].map((n) => {
              const isFull = rating >= n;
              const isHalf = !isFull && rating >= n - 0.5;
              return (
                <div key={n} className="bc-star-btn"
                  style={{ color: isFull ? "#facc15" : isHalf ? "#facc15" : "#444" }}>
                  <div className="bc-star-zone left" onClick={() => handleStarClick(n, true)} />
                  <div className="bc-star-zone right" onClick={() => handleStarClick(n, false)} />
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
        </div>
        {/* ─── Listened with Commentary toggle ─── */}
        {isPatreon && (
          <div style={{ marginBottom: 16 }}>
            <div
              className={`bc-commentary-toggle${listenedWithCommentary ? " active" : ""}`}
              onClick={async () => {
                if (saving) return;
                const newValue = !listenedWithCommentary;
                setListenedWithCommentary(newValue);
                try {
                  await onToggleCommentary(item.id, newValue);
                } catch (e) {
                  console.error("[BlankCheckLog] Commentary toggle error:", e);
                  setListenedWithCommentary(!newValue);
                }
              }}
            >
              {/* Toggle switch */}
              <div style={{
                width: 40, height: 22, borderRadius: 11,
                background: listenedWithCommentary
                  ? "linear-gradient(135deg, #facc15, #eab308)"
                  : "rgba(255,255,255,0.12)",
                position: "relative",
                transition: "background 0.2s",
                flexShrink: 0,
              }}>
                <div style={{
                  position: "absolute",
                  top: 2, left: listenedWithCommentary ? 20 : 2,
                  width: 18, height: 18, borderRadius: "50%",
                  background: listenedWithCommentary ? "#fff" : "rgba(255,255,255,0.5)",
                  transition: "left 0.2s, background 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }} />
              </div>

              {/* Label */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: listenedWithCommentary ? "#facc15" : "#999",
                  transition: "color 0.2s",
                }}>
                  🎧 Listened to commentary
                </div>
                <div style={{
                  fontSize: 10,
                  color: listenedWithCommentary ? "rgba(250,204,21,0.5)" : "rgba(255,255,255,0.25)",
                  marginTop: 1, transition: "color 0.2s",
                }}>
                  Listened to the Patreon commentary episode
                </div>
              </div>
            </div>
          </div>
        )}

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
                  className="bc-date-input"
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
                  border: confirmUnlog ? "1px solid rgba(233,69,96,0.5)" : "1px solid rgba(233,69,96,0.2)",
                  borderRadius: 12,
                  color: "#e94560", fontSize: 13, fontWeight: 600,
                  cursor: saving ? "wait" : "pointer",
                  transition: "background 0.2s",
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

        {/* ── Post-log episode toast ── */}
        {episodeToast && matchedEpisode && (
          <div style={{
            position: "sticky", bottom: 0, left: 0, right: 0,
            background: "linear-gradient(180deg, transparent 0%, #12121f 20%)",
            padding: "24px 0 8px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            animation: "bcLogSlideUp 0.3s ease",
          }}>
            <div style={{
              fontSize: 11, color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600,
            }}>✓ Logged · Episode Available</div>

            <button
              onClick={() => {
                playEpisode(matchedEpisode);
                setEpisodeToast(false);
                onClose();
              }}
              style={{
                width: "100%", padding: "12px 16px",
                background: "rgba(245,197,24,0.12)",
                border: "1px solid rgba(245,197,24,0.3)",
                borderRadius: 12,
                display: "flex", alignItems: "center", gap: 10,
                cursor: "pointer",
                transition: "background 0.2s",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg, #F5C518, #eab308)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M8 5v14l11-7z" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: "#F5C518",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  textTransform: "uppercase", letterSpacing: "0.02em",
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
