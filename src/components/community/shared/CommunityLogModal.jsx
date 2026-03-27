import { t } from "../../../theme";
import AdminItemEditor from "./AdminItemEditor";
import CrossCommunityChips from "./CrossCommunityChips";
import WatchProviders from "./WatchProviders";
import ListenOnBadges from "./ListenOnBadges";
import { useEpisodeMatch } from "../../../hooks/community/useEpisodeMatch";
import { isPatreonUrl } from "../../feed/FeedPrimitives";
import { useState, useEffect, useMemo } from "react";

import { fetchTMDBRaw, fetchTMDBWatchProviders } from "../../../utils/api";
import { toLogTimestamp } from "../../../utils/helpers";

/**
 * CommunityLogModal — shared base for all community log modals.
 *
 * Contains all shared logic and UI:
 *   - Overlay + fade/slide animations, backdrop image with mask + saturation
 *   - Cover URL resolution, TMDB overview, watch providers
 *   - Poster + hero layout (100px), star rating (half-star), date picker
 *   - Log / Already Seen / Watchlist / Update / Unlog button group
 *   - Post-log episode toast ("Listen on MANTL", auto-dismiss 5s)
 *   - CrossCommunityChips, WatchProviders, ListenOnBadges
 *
 * Community-specific behavior is injected via config + render slots:
 *   config             — { communitySlug, pinSlug?, communityName, platforms, isPatreon }
 *   buildLogPayload    — (basePayload) => extendedPayload
 *   renderStatusBadges — (progressData) => JSX | null
 *   renderRatingExtra  — () => JSX | null  (inline next to stars, e.g. brown arrow)
 *   renderCustomSection— ({ saving }) => JSX | null  (below rating, e.g. commentary toggle)
 *   renderHeroExtra    — () => JSX | null  (below episode number, e.g. website link)
 *   renderEditorial    — () => JSX | null  (above TMDB overview, e.g. staff pick blurb)
 */
export default function CommunityLogModal({
  // Standard props (unchanged from individual modals)
  item, coverUrl, isCompleted, progressData,
  onLog, onUnlog, onWatchlist, onClose,
  userId, miniseries, coverCacheVersion,
  communitySubscriptions, communityId, onNavigateCommunity,
  onToast, onShelvesChanged, onViewMantl,

  // Community configuration
  config,

  // Custom log payload builder
  buildLogPayload,

  // Render slots
  renderStatusBadges,
  renderRatingExtra,
  renderCustomSection,
  renderHeroExtra,
  renderEditorial,
}) {
  const [rating, setRating] = useState(progressData?.rating || 0);
  const [saving, setSaving] = useState(false);
  const [episodeToast, setEpisodeToast] = useState(false);
  const [overview, setOverview] = useState(null);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [providers, setProviders] = useState(null);
  const [backdropUrl, setBackdropUrl] = useState(
    item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : null
  );
  const [confirmUnlog, setConfirmUnlog] = useState(false);

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
    const fromCache = coverCacheVersion?.[coverCacheKey];
    if (fromCache) return fromCache;
    if (coverUrl) return coverUrl;
    if (fetchedCoverUrl) return fetchedCoverUrl;
    if (item.poster_path) {
      return `https://image.tmdb.org/t/p/w342${item.poster_path}`;
    }
    return null;
  }, [coverCacheVersion, coverCacheKey, coverUrl, fetchedCoverUrl, item.poster_path]);

  // ── Episode matching ──
  const { matchedEpisode, isThisEpPlaying, playEpisode, isPlaying } = useEpisodeMatch(item, config.communityName);

  // ── Patreon fallback: when no audio, link out to Patreon if community has one ──
  const patreonFallbackUrl = !matchedEpisode
    ? config.platforms?.find(p => p.type === "patreon")?.url || null
    : null;

  // ── Fetch TMDB data on mount ──
  useEffect(() => {
    if (!item.tmdb_id || !["film", "show"].includes(item.media_type)) return;
    let cancelled = false;
    const mediaType = item.media_type === "show" ? "tv" : "movie";

    fetchTMDBRaw(item.tmdb_id, mediaType, "")
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

  // ── Half-star rating ──
  const handleStarClick = (starNum, isLeftHalf) => {
    const newRating = isLeftHalf ? starNum - 0.5 : starNum;
    setRating(rating === newRating ? 0 : newRating);
  };

  // ── Shared post-log behavior ──
  const afterLog = (wasUpdate) => {
    if (!wasUpdate && (matchedEpisode || patreonFallbackUrl)) {
      setSaving(false);
      setEpisodeToast(true);
      setTimeout(() => { setEpisodeToast(false); onClose(); }, 5000);
    } else {
      onClose();
    }
    if (wasUpdate && onShelvesChanged) onShelvesChanged();
  };

  // ── Log with date ──
  const handleLogWithDate = async () => {
    setSaving(true);
    try {
      const base = { rating: rating || null, completed_at: toLogTimestamp(logDate), isUpdate: isCompleted };
      await onLog(item.id, buildLogPayload ? buildLogPayload(base) : base);
      afterLog(isCompleted);
    } catch (e) {
      console.error(`[${config.communitySlug}Log] Save error:`, e);
      setSaving(false);
    }
  };

  // ── Already seen (backlog) ──
  const handleAlreadySeen = async () => {
    setSaving(true);
    try {
      const base = { rating: rating || null, completed_at: null, isUpdate: isCompleted };
      await onLog(item.id, buildLogPayload ? buildLogPayload(base) : base);
      afterLog(isCompleted);
    } catch (e) {
      console.error(`[${config.communitySlug}Log] Backlog error:`, e);
      setSaving(false);
    }
  };

  // ── Unlog ──
  const handleUnlog = async () => {
    if (!confirmUnlog) { setConfirmUnlog(true); return; }
    setSaving(true);
    try {
      await onUnlog(item.id);
      onClose();
    } catch (e) {
      console.error(`[${config.communitySlug}Log] Unlog error:`, e);
      setSaving(false);
    }
  };

  // ── Watchlist ──
  const handleWatchlist = async () => {
    setSaving(true);
    try {
      await onWatchlist(item, resolvedCoverUrl);
      onClose();
    } catch (e) {
      console.error(`[${config.communitySlug}Log] Watchlist error:`, e);
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
        animation: "clmFadeIn 0.2s ease",
      }}
    >
      <style>{`
        @keyframes clmFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes clmSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes clmEqBar {
          0% { height: 3px; }
          100% { height: 10px; }
        }
        @keyframes clmContentFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .clm-star-btn {
          font-size: 36px;
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .clm-star-btn .clm-star-zone {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 50%;
          z-index: 1;
        }
        .clm-star-btn .clm-star-zone.left { left: 0; }
        .clm-star-btn .clm-star-zone.right { right: 0; }
        .clm-date-input {
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
        .clm-date-input:focus {
          border-color: rgba(74,222,128,0.4);
        }
      `}</style>

      <div
        style={{
          width: "100%", maxWidth: 420,
          position: "relative", overflow: "hidden",
          background: "linear-gradient(180deg, #1a1a2e 0%, #12121f 100%)",
          borderRadius: 0,
          display: "flex", flexDirection: "column",
          animation: "clmSlideUp 0.25s ease",
        }}
      >
        {/* Backdrop image — fades out before description */}
        {backdropUrl && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            height: 280, zIndex: 0, overflow: "hidden",
            pointerEvents: "none",
            backgroundImage: `url(${backdropUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
            filter: "saturate(0.6)",
            animation: "clmContentFadeIn 0.4s ease",
            maskImage: "linear-gradient(to left, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.35) 30%, rgba(0,0,0,0.1) 55%, transparent 75%), linear-gradient(to bottom, black 70%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.35) 30%, rgba(0,0,0,0.1) 55%, transparent 75%), linear-gradient(to bottom, black 70%, transparent 100%)",
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }} />
        )}

        {/* Close button + Admin gear */}
        <div style={{
          zIndex: 2,
          background: "linear-gradient(180deg, rgba(26,26,46,0.5) 0%, rgba(26,26,46,0.3) 60%, transparent 100%)",
          padding: "12px 20px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexShrink: 0,
        }}>
          <AdminItemEditor
            item={item}
            userId={userId}
            miniseries={miniseries || []}
            communitySlug={config.communitySlug}
            onToast={onToast}
            onSaved={() => {
              if (onShelvesChanged) onShelvesChanged();
              onClose();
            }}
          />
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none", borderRadius: "50%",
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: t.textSecondary, fontSize: 18, cursor: "pointer",
              transition: "background 0.2s",
            }}
          >✕</button>
        </div>

        {/* ── Scrollable content area ── */}
        <div style={{
          flex: 1, minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          padding: "0 20px",
          position: "relative",
        }}>

        {/* Hero: poster + info */}
        <div style={{ display: "flex", gap: 14, marginBottom: 14, position: "relative", zIndex: 1 }}>
          <div style={{
            width: 100, flexShrink: 0,
            aspectRatio: isGame ? "16/9" : "2/3",
            borderRadius: 8, overflow: "hidden",
            background: "linear-gradient(135deg, #1a1a2e, #16213e)",
            position: "relative",
          }}>
            {resolvedCoverUrl ? (
              <img loading="lazy" src={resolvedCoverUrl} alt={item.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 32,
              }}>{typeEmoji}</div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 20, fontWeight: 700, color: t.textPrimary,
              fontFamily: t.fontDisplay,
              lineHeight: 1.2, marginBottom: 4,
            }}>{item.title}</div>
            <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 2 }}>
              {item.creator}{item.year ? ` · ${item.year}` : ""}
            </div>
            {item.episode_number && (
              <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                {item.episode_number}
              </div>
            )}
            {/* Hero extra slot (e.g. NPP website link) */}
            {renderHeroExtra?.()}

            {/* Status badges when logged */}
            {isCompleted && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 10px",
                  background: "rgba(74,222,128,0.1)",
                  border: "1px solid rgba(74,222,128,0.3)",
                  borderRadius: 20, fontSize: 11, color: t.green, fontWeight: 600,
                }}>
                  ✓ Logged
                </div>
                {renderStatusBadges?.(progressData)}
              </div>
            )}

            {/* Listen on MANTL — inline player */}
            {matchedEpisode && !isPatreonUrl(matchedEpisode.enclosureUrl) && (
              <button
                onClick={(e) => { e.stopPropagation(); playEpisode(matchedEpisode); }}
                style={{
                  width: "100%", marginTop: 8, padding: "8px 10px",
                  background: isThisEpPlaying ? "rgba(245,197,24,0.15)" : "rgba(245,197,24,0.08)",
                  border: `1.5px solid ${isThisEpPlaying ? "rgba(245,197,24,0.5)" : "rgba(245,197,24,0.2)"}`,
                  borderRadius: 10,
                  display: "flex", alignItems: "center", gap: 8,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
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
                          width: 2, borderRadius: 1, background: t.bgPrimary,
                          animation: `clmEqBar 0.5s ease ${j * 0.12}s infinite alternate`,
                        }} />
                      ))}
                    </div>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: t.gold,
                    fontFamily: t.fontDisplay,
                    textTransform: "uppercase", letterSpacing: 0.5,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {isThisEpPlaying && isPlaying ? "Now Playing" : "Listen on MANTL"}
                  </div>
                  <div style={{
                    fontSize: 10, color: t.textSecondary,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    marginTop: 1,
                  }}>{matchedEpisode.title}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(245,197,24,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M3 18v-6a9 9 0 0118 0v6" />
                  <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
                </svg>
              </button>
            )}

            {/* Listen on Patreon — link-out */}
            {matchedEpisode && isPatreonUrl(matchedEpisode.enclosureUrl) && (
              <a
                href={matchedEpisode.enclosureUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%", marginTop: 8, padding: "8px 10px",
                  background: "rgba(249,104,58,0.08)",
                  border: "1.5px solid rgba(249,104,58,0.25)",
                  borderRadius: 10,
                  display: "flex", alignItems: "center", gap: 8,
                  cursor: "pointer", textDecoration: "none",
                  transition: "all 0.2s",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(249,104,58,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path fill="#F96836" d="M5 22V9a7 7 0 017-7h2a5.5 5.5 0 010 11h-4v9H5zm5-12h2a2.5 2.5 0 000-5h-2v5z"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: t.orange,
                    fontFamily: t.fontDisplay,
                    textTransform: "uppercase", letterSpacing: 0.5,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    Listen on Patreon
                  </div>
                  <div style={{
                    fontSize: 10, color: t.textSecondary,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    marginTop: 1,
                  }}>{matchedEpisode.title}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(249,104,58,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M7 17L17 7" />
                  <path d="M7 7h10v10" />
                </svg>
              </a>
            )}

            {/* Listen on Patreon — fallback when no audio in MANTL */}
            {!matchedEpisode && patreonFallbackUrl && (isFilm || isShow) && (
              <a
                href={patreonFallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%", marginTop: 8, padding: "8px 10px",
                  background: "rgba(249,104,58,0.08)",
                  border: "1.5px solid rgba(249,104,58,0.25)",
                  borderRadius: 10,
                  display: "flex", alignItems: "center", gap: 8,
                  cursor: "pointer", textDecoration: "none",
                  transition: "all 0.2s",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(249,104,58,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path fill="#F96836" d="M5 22V9a7 7 0 017-7h2a5.5 5.5 0 010 11h-4v9H5zm5-12h2a2.5 2.5 0 000-5h-2v5z"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: t.orange,
                    fontFamily: t.fontDisplay,
                    textTransform: "uppercase", letterSpacing: 0.5,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    Listen on Patreon
                  </div>
                  <div style={{
                    fontSize: 10, color: t.textSecondary,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    marginTop: 1,
                  }}>Patreon exclusive</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(249,104,58,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M7 17L17 7" />
                  <path d="M7 7h10v10" />
                </svg>
              </a>
            )}

            {/* Listen On badges */}
            {(isFilm || isShow) && (
              <ListenOnBadges
                title={item.title}
                communityName={config.communityName}
                platforms={config.platforms}
                isPatreon={config.isPatreon}
                compact
              />
            )}
          </div>
        </div>

        {/* Cross-community chips */}
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

        {/* Editorial blurb (e.g. Originals staff pick callout) */}
        {renderEditorial?.()}

        {/* TMDB Overview */}
        {overview && (
          <div style={{ marginBottom: 16, position: "relative", zIndex: 1, animation: "clmContentFadeIn 0.3s ease" }}>
            <div
              onClick={() => setOverviewExpanded(!overviewExpanded)}
              style={{
                fontSize: 12.5, color: t.textMuted, lineHeight: 1.5,
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
                style={{ fontSize: 11, color: t.textMuted, marginTop: 4, cursor: "pointer" }}
              >
                more ›
              </div>
            )}
          </div>
        )}

        {/* Streaming Providers */}
        {providers && (providers.stream.length > 0 || providers.rent.length > 0) && (
          <div style={{ animation: "clmContentFadeIn 0.3s ease" }}>
            <WatchProviders providers={providers} />
          </div>
        )}

        </div>{/* end scroll content area */}

        {/* Action buttons — fixed footer, never moves */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 8,
          padding: "12px 20px calc(12px + env(safe-area-inset-bottom, 0px))",
          background: "#12121f",
          flexShrink: 0,
        }}>

          {/* Rating */}
          <div style={{ marginBottom: 4 }}>
            <div style={{
              fontSize: 10, fontWeight: 600, color: t.textSecondary,
              textTransform: "uppercase", letterSpacing: "0.08em",
              marginBottom: 6,
            }}>Your Rating</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const isFull = rating >= n;
                  const isHalf = !isFull && rating >= n - 0.5;
                  return (
                    <div key={n} className="clm-star-btn"
                      style={{ color: isFull ? t.gold : isHalf ? t.gold : t.textFaint }}>
                      <div className="clm-star-zone left" onClick={() => handleStarClick(n, true)} />
                      <div className="clm-star-zone right" onClick={() => handleStarClick(n, false)} />
                      {isFull ? "★" : isHalf ? (
                        <span style={{ position: "relative", display: "inline-block" }}>
                          <span style={{ color: t.textSecondary }}>★</span>
                          <span style={{ position: "absolute", left: 0, top: 0, overflow: "hidden", width: "50%", color: t.gold }}>★</span>
                        </span>
                      ) : "☆"}
                    </div>
                  );
                })}
                {rating > 0 && (
                  <span style={{ fontSize: 14, color: t.gold, marginLeft: 8, fontWeight: 600 }}>
                    {rating} / 5
                  </span>
                )}
              </div>
              {/* Rating extra slot (e.g. NPP brown arrow toggle) */}
              {renderRatingExtra?.()}
            </div>
          </div>

          {/* Custom section slot (e.g. BC commentary toggle) */}
          {renderCustomSection?.({ saving })}

          {/* === NOT YET LOGGED === */}
          {!isCompleted && (
            <>
              {/* Log + date picker row */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleLogWithDate}
                  disabled={saving}
                  style={{
                    flex: 1, padding: "13px 0",
                    background: "linear-gradient(135deg, #4ade80, #22c55e)",
                    border: "none", borderRadius: 12,
                    color: t.bgPrimary, fontSize: 15, fontWeight: 700,
                    fontFamily: t.fontDisplay,
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
                  className="clm-date-input"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                />
              </div>

              {/* Already Seen + Watch List */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleAlreadySeen}
                  disabled={saving}
                  style={{
                    flex: 1, padding: "11px 0",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    color: t.textSecondary, fontSize: 12, fontWeight: 600,
                    cursor: saving ? "wait" : "pointer",
                    transition: "background 0.2s",
                  }}
                >
                  ✓ Already Seen
                </button>
                {(isFilm || isShow) && (
                  <button
                    onClick={handleWatchlist}
                    disabled={saving}
                    style={{
                      flex: 1, padding: "11px 0",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      color: t.textSecondary, fontSize: 12, fontWeight: 600,
                      cursor: saving ? "wait" : "pointer",
                      transition: "background 0.2s",
                    }}
                  >
                    👁 Watchlist
                  </button>
                )}
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
                  color: t.bgPrimary, fontSize: 15, fontWeight: 700,
                  fontFamily: t.fontDisplay,
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
                  color: t.red, fontSize: 13, fontWeight: 600,
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
              color: t.textMuted, fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>

        {/* ── Post-log episode toast (auto-dismiss 5s) ── */}
        {episodeToast && matchedEpisode && !isPatreonUrl(matchedEpisode.enclosureUrl) && (
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            padding: "0 16px 24px",
            background: "linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 70%, transparent 100%)",
            zIndex: 10,
            animation: "clmSlideUp 0.3s ease",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          }}>
            <div style={{
              fontSize: 11, color: t.textSecondary,
              fontFamily: t.fontDisplay,
              textTransform: "uppercase", letterSpacing: 1.5,
            }}>Logged! Now hear what the hosts thought</div>

            <button
              onClick={() => { playEpisode(matchedEpisode); setEpisodeToast(false); onClose(); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 360,
                padding: "12px 16px",
                background: "rgba(245,197,24,0.12)",
                border: "1.5px solid rgba(245,197,24,0.3)",
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
                  fontSize: 14, fontWeight: 700, color: t.gold,
                  fontFamily: t.fontDisplay,
                  textTransform: "uppercase", letterSpacing: 0.5,
                }}>Listen on MANTL</div>
                <div style={{
                  fontSize: 10, color: t.textSecondary,
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
                background: "none", border: "none", color: t.textSecondary,
                fontSize: 12, cursor: "pointer", padding: "6px 16px",
              }}
            >Not now</button>
          </div>
        )}

        {/* ── Post-log Patreon episode toast ── */}
        {episodeToast && matchedEpisode && isPatreonUrl(matchedEpisode.enclosureUrl) && (
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            padding: "0 16px 24px",
            background: "linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 70%, transparent 100%)",
            zIndex: 10,
            animation: "clmSlideUp 0.3s ease",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          }}>
            <div style={{
              fontSize: 11, color: t.textSecondary,
              fontFamily: t.fontDisplay,
              textTransform: "uppercase", letterSpacing: 1.5,
            }}>Logged! Hear what the hosts thought</div>

            <a
              href={matchedEpisode.enclosureUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { setEpisodeToast(false); onClose(); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 360,
                padding: "12px 16px",
                background: "rgba(249,104,58,0.12)",
                border: "1.5px solid rgba(249,104,58,0.3)",
                borderRadius: 14, cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                textDecoration: "none",
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: "50%", background: "rgba(249,104,58,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path fill="#F96836" d="M5 22V9a7 7 0 017-7h2a5.5 5.5 0 010 11h-4v9H5zm5-12h2a2.5 2.5 0 000-5h-2v5z"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{
                  fontSize: 14, fontWeight: 700, color: t.orange,
                  fontFamily: t.fontDisplay,
                  textTransform: "uppercase", letterSpacing: 0.5,
                }}>Listen on Patreon</div>
                <div style={{
                  fontSize: 10, color: t.textSecondary,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1,
                }}>{matchedEpisode.title}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(249,104,58,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M7 17L17 7" />
                <path d="M7 7h10v10" />
              </svg>
            </a>

            <button
              onClick={() => { setEpisodeToast(false); onClose(); }}
              style={{
                background: "none", border: "none", color: t.textSecondary,
                fontSize: 12, cursor: "pointer", padding: "6px 16px",
              }}
            >Not now</button>
          </div>
        )}
        {/* ── Post-log Patreon fallback toast (no audio in MANTL) ── */}
        {episodeToast && !matchedEpisode && patreonFallbackUrl && (
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            padding: "0 16px 24px",
            background: "linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 70%, transparent 100%)",
            zIndex: 10,
            animation: "clmSlideUp 0.3s ease",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          }}>
            <div style={{
              fontSize: 11, color: t.textSecondary,
              fontFamily: t.fontDisplay,
              textTransform: "uppercase", letterSpacing: 1.5,
            }}>Logged! Hear what the hosts thought</div>

            <a
              href={patreonFallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { setEpisodeToast(false); onClose(); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 360,
                padding: "12px 16px",
                background: "rgba(249,104,58,0.12)",
                border: "1.5px solid rgba(249,104,58,0.3)",
                borderRadius: 14, cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                textDecoration: "none",
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: "50%", background: "rgba(249,104,58,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path fill="#F96836" d="M5 22V9a7 7 0 017-7h2a5.5 5.5 0 010 11h-4v9H5zm5-12h2a2.5 2.5 0 000-5h-2v5z"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{
                  fontSize: 14, fontWeight: 700, color: t.orange,
                  fontFamily: t.fontDisplay,
                  textTransform: "uppercase", letterSpacing: 0.5,
                }}>Listen on Patreon</div>
                <div style={{
                  fontSize: 10, color: t.textSecondary,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1,
                }}>Patreon exclusive</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(249,104,58,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M7 17L17 7" />
                <path d="M7 7h10v10" />
              </svg>
            </a>

            <button
              onClick={() => { setEpisodeToast(false); onClose(); }}
              style={{
                background: "none", border: "none", color: t.textSecondary,
                fontSize: 12, cursor: "pointer", padding: "6px 16px",
              }}
            >Not now</button>
          </div>
        )}
      </div>
    </div>
  );
}
