import { useState, useEffect } from "react";
import { supabase } from "../../../supabase";
import AdminItemEditor from "../shared/AdminItemEditor";
import PinToMantl from "../shared/PinToMantl";
import CrossCommunityChips from "../shared/CrossCommunityChips";

import { fetchTMDBRaw, fetchTMDBWatchProviders } from "../../../utils/api";

/**
 * RewatchablesLogModal — The Rewatchables community log modal.
 *
 * Films only. Rewatch tracking with date logging.
 * Community-specific — does not sync to main shelf.
 */
export default function RewatchablesLogModal({
  item, coverUrl, isCompleted, progressData,
  onLog, onUnlog, onWatchlist, onRewatch, onRemoveRewatch, onClose,
  userId, miniseries, onToast, onShelvesChanged,
  communitySubscriptions, communityId, onNavigateCommunity,
}) {
  const [rating, setRating] = useState(progressData?.rating || 0);
  const [saving, setSaving] = useState(false);
  const [overview, setOverview] = useState(null);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rewatchDate, setRewatchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [providers, setProviders] = useState(null);

  const rewatchCount = progressData?.rewatch_count || 0;
  const rewatchDates = progressData?.rewatch_dates || [];

  // Fetch TMDB overview + watch providers
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
        completed_at: new Date(logDate + "T12:00:00Z").toISOString(),
        isUpdate: isCompleted,
      });
      onClose();
    } catch (e) {
      console.error("[RewatchablesLog] Save error:", e);
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
      console.error("[RewatchablesLog] Backlog error:", e);
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
      console.error("[RewatchablesLog] Unlog error:", e);
      setSaving(false);
    }
  };

  const handleWatchlist = async () => {
    setSaving(true);
    try {
      await onWatchlist(item, coverUrl);
      onClose();
    } catch (e) {
      console.error("[RewatchablesLog] Watchlist error:", e);
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
        animation: "rwLogFadeIn 0.2s ease",
      }}
    >
      <style>{`
        @keyframes rwLogFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes rwLogSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .rw-star-btn {
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
        .rw-star-btn .rw-star-zone {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 50%;
          z-index: 1;
        }
        .rw-star-btn .rw-star-zone.left { left: 0; }
        .rw-star-btn .rw-star-zone.right { right: 0; }
        .rw-date-input {
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
        .rw-date-input:focus {
          border-color: rgba(74,155,181,0.4);
        }
      `}</style>

      <div
        style={{
          width: "100%", maxWidth: 420,
          background: "linear-gradient(180deg, #1a1a2e 0%, #12121f 100%)",
          borderRadius: 0,
          padding: "0 20px calc(20px + env(safe-area-inset-bottom, 0px))",
          animation: "rwLogSlideUp 0.25s ease",
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
          <AdminItemEditor
            item={item}
            userId={userId}
            miniseries={miniseries || []}
            onSaved={() => { setTimeout(() => window.location.reload(), 600); }}
            onToast={onToast}
          />
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
        <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 110, flexShrink: 0,
            aspectRatio: "2/3",
            borderRadius: 8,
            background: "linear-gradient(135deg, #1a1a2e, #16213e)",
            position: "relative",
          }}>
            {coverUrl ? (
              <img src={coverUrl} alt={item.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8, display: "block" }} />
            ) : (
              <div style={{
                width: "100%", height: "100%", borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 32,
              }}>🎬</div>
            )}
            <PinToMantl
              compact
              userId={userId}
              isCompleted={isCompleted}
              itemType={"movie"}
              itemTitle={item.title}
              tmdbId={item.tmdb_id}
              coverUrl={coverUrl}
              communitySlug="rewatchables"
              onViewMantl={() => onClose()}
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
                {rewatchCount > 0 && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 10px",
                    background: "rgba(250,204,21,0.1)",
                    border: "1px solid rgba(250,204,21,0.3)",
                    borderRadius: 20, fontSize: 11, color: "#facc15", fontWeight: 600,
                  }}>
                    ×{rewatchCount + 1} watched
                  </div>
                )}
              </div>
            )}
            {/* Listen On badges — compact, inside hero */}
            <ListenOnBadges title={item.title} compact />
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
                <div key={n} className="rw-star-btn"
                  style={{ color: isFull ? "#facc15" : isHalf ? "#facc15" : "#444" }}>
                  <div className="rw-star-zone left" onClick={() => handleStarClick(n, true)} />
                  <div className="rw-star-zone right" onClick={() => handleStarClick(n, false)} />
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
                    fontFamily: "'Barlow Condensed', sans-serif",
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
                  className="rw-date-input"
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
                  👁 Watch List
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


              {/* Rewatch with date */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={async () => {
                    setSaving(true);
                    try {
                      // 1. Update community_user_progress (existing behavior)
                      await onRewatch(item.id, rewatchDate);

                      // 2. Update movies table (source of truth for all communities)
                      if (item.tmdb_id) {
                        const { data: movie } = await supabase.from("movies")
                          .select("watch_count, watch_dates")
                          .eq("user_id", userId)
                          .eq("tmdb_id", item.tmdb_id)
                          .maybeSingle();

                        if (movie) {
                          const dateStr = rewatchDate; // already YYYY-MM-DD
                          const currentDates = movie.watch_dates || [];
                          const newDates = [...currentDates, dateStr].sort();
                          await supabase.from("movies")
                            .update({
                              watch_count: (movie.watch_count || 1) + 1,
                              watch_dates: newDates,
                            })
                            .eq("user_id", userId)
                            .eq("tmdb_id", item.tmdb_id);
                        }
                      }

                      onClose();
                    } catch (e) { setSaving(false); }
                  }}
                  disabled={saving}
                  style={{
                    flex: 1, padding: "11px 0",
                    background: "rgba(250,204,21,0.1)",
                    border: "1px solid rgba(250,204,21,0.3)",
                    borderRadius: 12,
                    color: "#facc15", fontSize: 13, fontWeight: 700,
                    cursor: saving ? "wait" : "pointer",
                    transition: "background 0.2s",
                  }}
                >
                  Rewatched!
                </button>
                <input
                  type="date"
                  className="rw-date-input"
                  value={rewatchDate}
                  onChange={(e) => setRewatchDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                />
              </div>

              {/* Rewatch history */}
              {rewatchDates.length > 0 && (
                <div style={{
                  padding: "8px 10px",
                  background: "rgba(250,204,21,0.04)",
                  border: "1px solid rgba(250,204,21,0.1)",
                  borderRadius: 10,
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: 600, color: "rgba(250,204,21,0.6)",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    marginBottom: 6,
                  }}>
                    Rewatch History ({rewatchDates.length})
                  </div>
                  {rewatchDates.map((date, idx) => (
                    <div key={idx} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "3px 0",
                      borderBottom: idx < rewatchDates.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                        #{idx + 2} — {new Date(date + "T12:00:00").toLocaleDateString(undefined, {
                          month: "short", day: "numeric", year: "numeric"
                        })}
                      </span>
                      {idx === rewatchDates.length - 1 && (
                        <button
                          onClick={async () => {
                            setSaving(true);
                            try {
                              // 1. Remove from community_user_progress (existing behavior)
                              await onRemoveRewatch(item.id);

                              // 2. Update movies table (source of truth)
                              if (item.tmdb_id) {
                                const { data: movie } = await supabase.from("movies")
                                  .select("watch_count, watch_dates")
                                  .eq("user_id", userId)
                                  .eq("tmdb_id", item.tmdb_id)
                                  .maybeSingle();

                                if (movie && (movie.watch_count || 1) > 1) {
                                  const currentDates = movie.watch_dates || [];
                                  // Remove the last date (matches the rewatch being removed)
                                  const newDates = currentDates.slice(0, -1);
                                  await supabase.from("movies")
                                    .update({
                                      watch_count: Math.max(1, (movie.watch_count || 1) - 1),
                                      watch_dates: newDates,
                                    })
                                    .eq("user_id", userId)
                                    .eq("tmdb_id", item.tmdb_id);
                                }
                              }

                              onClose();
                            } catch (e) { setSaving(false); }
                          }}
                          disabled={saving}
                          style={{
                            background: "none", border: "none",
                            color: "#e94560", fontSize: 10, fontWeight: 600,
                            cursor: "pointer", padding: "2px 6px",
                          }}
                        >
                          remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

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
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6, textDecoration: "none",
    transition: "background 0.15s",
  };

  const ProviderRow = ({ items, label }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <div style={{
        fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.3)",
        textTransform: "uppercase", letterSpacing: "0.06em",
        width: 48, flexShrink: 0,
        fontFamily: "'IBM Plex Mono', monospace",
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
              fontSize: 10, color: "rgba(255,255,255,0.6)",
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
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 10,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: "#888",
        textTransform: "uppercase", letterSpacing: "0.08em",
        marginBottom: 8,
      }}>Where to Watch {country && country !== "US" ? `(${country})` : ""}</div>
      {hasStream && <ProviderRow items={stream} label="Stream" />}
      {hasRent && <ProviderRow items={rent} label="Rent" />}
      {hasBuy && <ProviderRow items={buy} label="Buy" />}
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", marginTop: 2, fontStyle: "italic", textDecoration: "none" }}>
          via <span style={{ color: "rgba(255,215,0,0.4)" }}>JustWatch</span>
        </a>
      ) : (
        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: 2, fontStyle: "italic" }}>
          Data from JustWatch via TMDB
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   ListenOnBadges — Spotify + Apple Podcasts deep links
   ═══════════════════════════════════════════════════════════════ */

function ListenOnBadges({ title, compact }) {
  const searchQuery = encodeURIComponent(`The Rewatchables ${title}`);
  const spotifyUrl = `https://open.spotify.com/search/${searchQuery}`;
  const appleUrl = `https://podcasts.apple.com/search?term=${searchQuery}`;

  const badgeStyle = compact ? {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "4px 8px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    textDecoration: "none",
    transition: "background 0.15s",
    WebkitTapHighlightColor: "transparent",
  } : {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 12px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    textDecoration: "none",
    transition: "background 0.15s",
    WebkitTapHighlightColor: "transparent",
  };

  const labelStyle = {
    fontSize: compact ? 10 : 11,
    fontWeight: 600,
    color: "rgba(255,255,255,0.6)",
    whiteSpace: "nowrap",
  };

  const iconSize = compact ? 12 : 16;

  return (
    <div style={{ marginTop: compact ? 8 : 0, marginBottom: compact ? 0 : 14 }}>
      {!compact && (
        <div style={{
          fontSize: 10, fontWeight: 600, color: "#888",
          textTransform: "uppercase", letterSpacing: "0.08em",
          marginBottom: 8,
        }}>Listen On</div>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {/* Spotify */}
        <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" style={badgeStyle}>
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="#1DB954">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <span style={labelStyle}>Spotify</span>
        </a>

        {/* Apple Podcasts */}
        <a href={appleUrl} target="_blank" rel="noopener noreferrer" style={badgeStyle}>
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="#A855F7">
            <path d="M5.34 0A5.328 5.328 0 000 5.34v13.32A5.328 5.328 0 005.34 24h13.32A5.328 5.328 0 0024 18.66V5.34A5.328 5.328 0 0018.66 0H5.34zm6.525 2.568c2.336 0 4.448.902 6.056 2.587 1.224 1.272 1.912 2.619 2.264 4.392.12.6-.12 1.2-.6 1.5-.48.3-1.14.18-1.5-.3-.18-.36-.24-.78-.36-1.14-.36-1.2-.96-2.16-1.92-2.94-1.32-1.08-2.82-1.5-4.5-1.26-2.28.36-3.84 1.62-4.8 3.66-.36.78-.54 1.62-.54 2.52 0 1.56.42 2.94 1.38 4.2.3.36.3.96 0 1.32-.36.36-.96.42-1.32.06-.42-.36-.78-.78-1.08-1.26-.9-1.38-1.32-2.94-1.38-4.62-.06-2.1.54-3.96 1.8-5.58 1.56-2.04 3.66-3.18 6.48-3.12zm.12 4.32c1.44.06 2.7.6 3.72 1.68.78.84 1.2 1.8 1.38 2.94.06.6-.24 1.08-.78 1.26-.54.12-1.08-.12-1.26-.72-.12-.36-.18-.72-.36-1.08-.6-1.2-1.62-1.74-2.94-1.74-1.62.06-2.76.84-3.3 2.4-.18.48-.24 1.02-.18 1.56.06.66.18 1.32.48 1.92.06.12.12.3.12.42.06.54-.18 1.02-.66 1.2-.54.18-1.08 0-1.32-.48-.42-.84-.66-1.74-.78-2.7-.18-1.56.18-2.94 1.02-4.2.96-1.38 2.34-2.22 4.02-2.46.3-.06.54-.06.84-.06zm-.12 4.44c1.26 0 2.22 1.02 2.22 2.22 0 .9-.54 1.62-1.32 2.01l.48 4.38c.06.54-.36 1.02-.9 1.08h-.96c-.54-.06-.96-.54-.9-1.08l.48-4.38c-.78-.42-1.32-1.14-1.32-2.01.02-1.2.98-2.22 2.22-2.22z"/>
          </svg>
          <span style={labelStyle}>Apple</span>
        </a>
      </div>
    </div>
  );
}
