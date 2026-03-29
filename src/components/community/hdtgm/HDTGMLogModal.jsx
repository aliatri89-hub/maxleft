import { t } from "../../../theme";
import AdminItemEditor from "../shared/AdminItemEditor";
import CrossCommunityChips from "../shared/CrossCommunityChips";
import { useState, useEffect } from "react";
import { useEpisodeMatch } from "../../../hooks/community/useEpisodeMatch";

import { fetchTMDBRaw, fetchTMDBWatchProviders } from "../../../utils/api";
import { toLogTimestamp } from "../../../utils/helpers";

/**
 * HDTGMLogModal — How Did This Get Made? community log modal.
 *
 * Films only. No commentary, no Listen On badges.
 * The simplest community modal.
 *
 * Props:
 *   item           — community_items row (title, year, creator, tmdb_id, id)
 *   coverUrl       — resolved poster URL
 *   isCompleted    — whether already checked off
 *   progressData   — { rating } or null
 *   onLog          — (itemId, { rating, completed_at, isUpdate }) => void
 *   onUnlog        — (itemId) => void
 *   onWatchlist    — (item, coverUrl) => void
 *   onClose        — () => void
 */
export default function HDTGMLogModal({
  item, coverUrl, isCompleted, progressData,
  onLog, onUnlog, onWatchlist, onClose,
  userId, miniseries, onViewMantl,
  communitySubscriptions, communityId, onNavigateCommunity,
}) {
  const [rating, setRating] = useState(progressData?.rating || 0);
  const [saving, setSaving] = useState(false);
  const [overview, setOverview] = useState(null);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [providers, setProviders] = useState(null);

  const { matchedEpisode, isThisEpPlaying, playEpisode, isPlaying } = useEpisodeMatch(item, "How Did This Get Made?");
  useEffect(() => {
    if (!item.tmdb_id) return;

fetchTMDBRaw(item.tmdb_id, "movie", "")
  .then((data) => { if (data?.overview) setOverview(data.overview); })
  .catch(() => {});

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

  const handleStarClick = (starNum, isLeftHalf) => {
    const newRating = isLeftHalf ? starNum - 0.5 : starNum;
    setRating(rating === newRating ? 0 : newRating);
  };

  const handleLogWithDate = async () => {
    setSaving(true);
    try {
      await onLog(item.id, {
        rating: rating || null,
        completed_at: toLogTimestamp(logDate),
        isUpdate: isCompleted,
      });
      onClose();
    } catch (e) {
      console.error("[HDTGMLog] Save error:", e);
      setSaving(false);
    }
  };

  const handleAlreadySeen = async () => {
    setSaving(true);
    try {
      await onLog(item.id, {
        rating: rating || null,
        completed_at: null,
        isUpdate: isCompleted,
      });
      onClose();
    } catch (e) {
      console.error("[HDTGMLog] Backlog error:", e);
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
      console.error("[HDTGMLog] Unlog error:", e);
      setSaving(false);
    }
  };

  const handleWatchlist = async () => {
    setSaving(true);
    try {
      await onWatchlist(item, coverUrl);
      onClose();
    } catch (e) {
      console.error("[HDTGMLog] Watchlist error:", e);
      setSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 250,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        display: "flex", alignItems: "stretch", justifyContent: "center",
        animation: "hdtgmLogFadeIn 0.2s ease",
      }}
    >
      <style>{`
        @keyframes hdtgmLogFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes hdtgmLogSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hdtgm-star-btn {
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
        .hdtgm-star-btn .hdtgm-star-zone {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 50%;
          z-index: 1;
        }
        .hdtgm-star-btn .hdtgm-star-zone.left { left: 0; }
        .hdtgm-star-btn .hdtgm-star-zone.right { right: 0; }
        .hdtgm-date-input {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 13px;
          padding: 6px 10px;
          font-family: inherit;
          outline: none;
          color-scheme: dark;
          cursor: pointer;
        }
        .hdtgm-date-input:focus {
          border-color: rgba(74,155,181,0.4);
        }
      `}</style>

      <div
        style={{
          width: "100%", maxWidth: 420,
          background: "linear-gradient(180deg, #1a1a2e 0%, #12121f 100%)",
          borderRadius: 0,
          padding: "0 20px calc(20px + var(--sab))",
          animation: "hdtgmLogSlideUp 0.25s ease",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Close button + Admin gear */}
        <div style={{
          position: "sticky", top: 0, zIndex: 2,
          background: "linear-gradient(180deg, #1a1a2e 0%, rgba(26,26,46,0.95) 80%, transparent 100%)",
          padding: "12px 0 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <AdminItemEditor item={item} userId={userId} miniseries={miniseries || []} onSaved={onClose} />
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{
              background: t.bgHover,
              border: "none", borderRadius: "50%",
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: t.textSecondary, fontSize: 18, cursor: "pointer",
              transition: "background 0.2s",
            }}
          >✕</button>
        </div>

        {/* Hero: poster + info */}
        <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 110, flexShrink: 0,
            aspectRatio: "2/3",
            borderRadius: 8,
            background: "linear-gradient(135deg, #1a1a2e, #16213e)",
            position: "relative",
          }}>
            {coverUrl ? (
              <img loading="lazy" src={coverUrl} alt={item.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8, display: "block" }} />
            ) : (
              <div style={{
                width: "100%", height: "100%", borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 32,
              }}>🎬</div>
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
            {isCompleted && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 10px",
                  background: t.greenDim,
                  border: "1px solid rgba(74,222,128,0.3)",
                  borderRadius: 20, fontSize: 11, color: t.green, fontWeight: 600,
                }}>
                  ✓ Logged
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Listen on MANTL — inline player */}
        {matchedEpisode && (
          <div onClick={(e) => { e.stopPropagation(); playEpisode(matchedEpisode); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 14, background: "rgba(245,197,24,0.08)", border: "1px solid rgba(245,197,24,0.2)", borderRadius: 10, cursor: "pointer" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: t.imdb, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {isThisEpPlaying && isPlaying
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.imdb, textTransform: "uppercase", letterSpacing: "0.04em" }}>{isThisEpPlaying && isPlaying ? "Now Playing" : "Listen on MANTL"}</div>
              <div style={{ fontSize: 10, color: t.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{matchedEpisode.title}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(245,197,24,0.6)" strokeWidth="1.5"><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg>
          </div>
        )}

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
          <WatchProviders providers={providers} />
        )}

        {/* Rating */}
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: t.textSecondary,
            textTransform: "uppercase", letterSpacing: "0.08em",
            marginBottom: 6,
          }}>Your Rating</div>
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {[1, 2, 3, 4, 5].map((n) => {
              const isFull = rating >= n;
              const isHalf = !isFull && rating >= n - 0.5;
              return (
                <div key={n} className="hdtgm-star-btn"
                  style={{ color: isFull ? t.gold : isHalf ? t.gold : t.textFaint }}>
                  <div className="hdtgm-star-zone left" onClick={() => handleStarClick(n, true)} />
                  <div className="hdtgm-star-zone right" onClick={() => handleStarClick(n, false)} />
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
              <span style={{ fontSize: 12, color: t.gold, marginLeft: 8, fontWeight: 600 }}>
                {rating} / 5
              </span>
            )}
          </div>
        </div>
        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

          {/* === NOT YET LOGGED === */}
          {!isCompleted && (
            <>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleLogWithDate}
                  disabled={saving}
                  style={{
                    flex: 1, padding: "13px 0",
                    background: "linear-gradient(135deg, #4ade80, #22c55e)",
                    border: "none", borderRadius: 12,
                    color: "#0a0a0a", fontSize: 15, fontWeight: 700,
                    fontFamily: t.fontDisplay,
                    letterSpacing: "0.02em",
                    cursor: saving ? "wait" : "pointer",
                    opacity: saving ? 0.6 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  {saving ? "Saving..." : "✓ Log Film"}
                </button>
                <input
                  type="date"
                  className="hdtgm-date-input"
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
                    background: t.bgInput,
                    border: `1px solid ${t.borderMedium}`,
                    borderRadius: 12,
                    color: t.textSecondary, fontSize: 12, fontWeight: 600,
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
                    background: t.bgElevated,
                    border: `1px solid ${t.bgHover}`,
                    borderRadius: 12,
                    color: t.textSecondary, fontSize: 12, fontWeight: 600,
                    cursor: saving ? "wait" : "pointer",
                    transition: "background 0.2s",
                  }}
                >
                  Watch List
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
                  border: confirmUnlog ? "1px solid rgba(233,69,96,0.5)" : "1px solid rgba(233,69,96,0.2)",
                  borderRadius: 12,
                  color: t.red, fontSize: 13, fontWeight: 600,
                  cursor: saving ? "wait" : "pointer",
                  transition: "background 0.2s",
                }}
              >
                {confirmUnlog ? "Tap again to confirm" : "Remove from Log"}
              </button>
            </>
          )}

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
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   WatchProviders — streaming/rent/buy logos from TMDB
   ═══════════════════════════════════════════════════════════════ */

function WatchProviders({ providers }) {
  const { stream, rent, buy, country, link } = providers;
  const hasStream = stream.length > 0;
  const hasRent = rent.length > 0;
  const hasBuy = buy.length > 0 && !hasStream && !hasRent;

  const chipStyle = {
    display: "flex", alignItems: "center", gap: 5,
    padding: "3px 8px 3px 3px",
    background: t.bgInput,
    border: `1px solid ${t.bgHover}`,
    borderRadius: 6, textDecoration: "none",
    transition: "background 0.15s",
  };

  const ProviderRow = ({ items, label }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <div style={{
        fontSize: 9, fontWeight: 600, color: t.textMuted,
        textTransform: "uppercase", letterSpacing: "0.06em",
        width: 48, flexShrink: 0,
        fontFamily: t.fontBody,
      }}>{label}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {items.slice(0, 3).map(p => (
          <a key={p.provider_id} href={link || "#"} target="_blank" rel="noopener noreferrer"
            style={chipStyle}
            onClick={e => { if (!link) e.preventDefault(); }}
          >
            <img
              src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
              alt={p.provider_name}
              style={{ width: 20, height: 20, borderRadius: 4 }}
            />
            <span style={{
              fontSize: 10, color: t.textSecondary,
              fontWeight: 500, whiteSpace: "nowrap",
            }}>{p.provider_name}</span>
          </a>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{
      marginBottom: 14, padding: "10px 12px",
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${t.borderSubtle}`,
      borderRadius: 10,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: t.textSecondary,
        textTransform: "uppercase", letterSpacing: "0.08em",
        marginBottom: 8,
      }}>Where to Watch {country && country !== "US" ? `(${country})` : ""}</div>
      {hasStream && <ProviderRow items={stream} label="Stream" />}
      {hasRent && <ProviderRow items={rent} label="Rent" />}
      {hasBuy && <ProviderRow items={buy} label="Buy" />}
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 8, color: t.textSecondary, marginTop: 2, fontStyle: "italic", textDecoration: "none" }}>
          via <span style={{ color: "rgba(255,215,0,0.4)" }}>JustWatch</span>
        </a>
      ) : (
        <div style={{ fontSize: 8, color: t.textMuted, marginTop: 2, fontStyle: "italic" }}>
          Data from JustWatch via TMDB
        </div>
      )}
    </div>
  );
}
