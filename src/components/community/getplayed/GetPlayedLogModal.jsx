import AdminGameEditor from "../shared/AdminGameEditor";
import CrossCommunityChips from "../shared/CrossCommunityChips";
import { useState } from "react";
import { toLogTimestamp } from "../../../utils/helpers";

const FANATICAL_AFFILIATE_TAG = ""; // TODO: Add your Fanatical affiliate ID
const PATREON_URL = "https://www.patreon.com/getplayed";

const PLATFORMS = [
  { key: "pc", label: "PC", icon: "🖥" },
  { key: "ps5", label: "PS5", icon: "🎮" },
  { key: "ps4", label: "PS4", icon: "🎮" },
  { key: "switch", label: "Switch", icon: "🕹" },
  { key: "xbox", label: "Xbox", icon: "🟢" },
  { key: "mobile", label: "Mobile", icon: "📱" },
  { key: "other", label: "Other", icon: "🔲" },
];

const STATUSES = [
  { key: "completed", label: "Completed", icon: "✓", color: "#4ade80" },
  { key: "playing", label: "Playing", icon: "▶", color: "#00d4ff" },
  { key: "backlog", label: "Backlog", icon: "📋", color: "#facc15" },
  { key: "dropped", label: "Dropped", icon: "✕", color: "#e94560" },
];

/**
 * GetPlayedLogModal — Get Played community log modal.
 *
 * Features specific to Get Played:
 *   - Game status: Completed / Playing / Backlog / Dropped
 *   - Platform selector
 *   - "Played Along" toggle for WPYP episodes
 *   - Fanatical affiliate "Get This Game" buy link
 *   - Listen On badges for podcast episode
 *
 * Props:
 *   item           — community_items row
 *   coverUrl       — resolved cover URL (RAWG background_image)
 *   isCompleted    — whether already logged
 *   progressData   — { played_along, rating, platform, status } or null
 *   isWpyp         — whether this is a WPYP game
 *   onLog          — (itemId, { rating, completed_at, played_along, platform, status }) => void
 *   onUnlog        — (itemId) => void
 *   onWatchlist    — (item, coverUrl) => void
 *   onClose        — () => void
 */
export default function GetPlayedLogModal({
  item, coverUrl, isCompleted, progressData, isWpyp, userOwnsGame,
  onLog, onUnlog, onWatchlist, onClose,
  userId, miniseries, onViewMantl,
  communitySubscriptions, communityId, onNavigateCommunity,
}) {
  const [rating, setRating] = useState(progressData?.rating || 0);
  const [playedAlong, setPlayedAlong] = useState(progressData?.played_along || false);
  const [platform, setPlatform] = useState(progressData?.platform || null);
  const [status, setStatus] = useState(progressData?.status || null);
  const [saving, setSaving] = useState(false);
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));

  const accent = "#e91e8c";
  const isHdtgp = item.tags?.includes("hdtgp") || item.extra_data?.era === "hdtgp";
  const episodeDesc = item.extra_data?.episode_title || item.extra_data?.description || null;
  const episodeUrl = item.episode_url || null;

  // Half-star rating handler
  const handleStarClick = (starNum, isLeftHalf) => {
    const newRating = isLeftHalf ? starNum - 0.5 : starNum;
    setRating(rating === newRating ? 0 : newRating);
  };

  const handleLog = async () => {
    setSaving(true);
    try {
      await onLog(item.id, {
        rating: rating || null,
        completed_at: status === "completed" ? toLogTimestamp(logDate) : null,
        played_along: playedAlong,
        platform: platform,
        status: status,
        isUpdate: isCompleted,
      });
      onClose();
    } catch (e) {
      console.error("[GetPlayedLog] Save error:", e);
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
      console.error("[GetPlayedLog] Unlog error:", e);
      setSaving(false);
    }
  };

  const handleWatchlist = async () => {
    setSaving(true);
    try {
      await onWatchlist(item, coverUrl);
      onClose();
    } catch (e) {
      console.error("[GetPlayedLog] Watchlist error:", e);
      setSaving(false);
    }
  };

  // Fanatical search URL
  const fanaticalUrl = item.title
    ? `https://www.fanatical.com/en/search?search=${encodeURIComponent(item.title)}${FANATICAL_AFFILIATE_TAG ? `&aff=${FANATICAL_AFFILIATE_TAG}` : ""}`
    : null;

  // Steam store URL (if we have steam_app_id)
  const steamUrl = item.steam_app_id
    ? `https://store.steampowered.com/app/${item.steam_app_id}/`
    : null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 250,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        display: "flex", alignItems: "stretch", justifyContent: "center",
        animation: "gpLogFadeIn 0.2s ease",
      }}
    >
      <style>{`
        @keyframes gpLogFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes gpLogSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .gp-star-btn {
          font-size: 28px;
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px; height: 36px;
          cursor: pointer; user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .gp-star-btn .gp-star-zone {
          position: absolute; top: 0; bottom: 0; width: 50%; z-index: 1;
        }
        .gp-star-btn .gp-star-zone.left { left: 0; }
        .gp-star-btn .gp-star-zone.right { right: 0; }
        .gp-date-input {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; color: #e0e0e0;
          font-size: 13px; padding: 6px 10px;
          font-family: inherit; outline: none;
          color-scheme: dark; cursor: pointer;
        }
        .gp-wpyp-toggle {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: background 0.2s, border-color 0.2s;
          user-select: none;
        }
        .gp-wpyp-toggle.active {
          background: rgba(0,212,255,0.1);
          border-color: rgba(0,212,255,0.35);
        }
      `}</style>

      <div style={{
        width: "100%", maxWidth: 420,
        background: "linear-gradient(180deg, #1a1a2e 0%, #12121f 100%)",
        borderRadius: 0,
        padding: "0 20px calc(20px + env(safe-area-inset-bottom, 0px))",
        animation: "gpLogSlideUp 0.25s ease",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}>
        {/* Close button + Admin gear */}
        <div style={{
          position: "sticky", top: 0, zIndex: 2,
          background: "linear-gradient(180deg, #1a1a2e 0%, rgba(26,26,46,0.95) 80%, transparent 100%)",
          padding: "12px 0 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <AdminGameEditor item={item} userId={userId} miniseries={miniseries || []} onSaved={onClose} />
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none", borderRadius: "50%",
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#888", fontSize: 18, cursor: "pointer",
            }}
          >✕</button>
        </div>

        {/* Hero: cover + info */}
        <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 130, flexShrink: 0,
            aspectRatio: "16/9",
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
              }}>🎮</div>
            )}
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

            {/* Status badges */}
            {isCompleted && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 10px",
                  background: "rgba(74,222,128,0.1)",
                  border: "1px solid rgba(74,222,128,0.3)",
                  borderRadius: 20, fontSize: 11, color: "#4ade80", fontWeight: 600,
                }}>
                  ✓ {progressData?.status === "playing" ? "Playing" :
                     progressData?.status === "backlog" ? "Backlog" :
                     progressData?.status === "dropped" ? "Dropped" : "Completed"}
                </div>
                {progressData?.played_along && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 10px",
                    background: "rgba(0,212,255,0.1)",
                    border: "1px solid rgba(0,212,255,0.3)",
                    borderRadius: 20, fontSize: 11, color: "#00d4ff", fontWeight: 600,
                  }}>
                    🎯 Played Along
                  </div>
                )}
              </div>
            )}

            {/* Listen On badges — compact */}
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

        {/* ─── Episode description ─── */}
        {episodeDesc && (
          <div style={{
            marginBottom: 14, fontSize: 12.5, color: "#aaa", lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {episodeDesc}
          </div>
        )}

        {/* ─── Listen to episode link ─── */}
        {episodeUrl && (
          <a href={episodeUrl} target="_blank" rel="noopener noreferrer" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", marginBottom: 14,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20, textDecoration: "none",
            transition: "background 0.15s",
          }}>
            <span style={{ fontSize: 13 }}>🎙</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>Listen to Episode</span>
          </a>
        )}

        {/* ─── Get This Game (Fanatical affiliate) — hidden for Game Slop ─── */}
        {!isCompleted && !userOwnsGame && !isHdtgp && fanaticalUrl && (
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
            }}>Get This Game</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <a href={fanaticalUrl} target="_blank" rel="noopener noreferrer" style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 12px",
                background: "rgba(233,30,140,0.1)",
                border: "1px solid rgba(233,30,140,0.25)",
                borderRadius: 20, textDecoration: "none",
                transition: "background 0.15s",
              }}>
                <span style={{ fontSize: 14 }}>🛒</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#e91e8c" }}>Fanatical</span>
              </a>
              {steamUrl && (
                <a href={steamUrl} target="_blank" rel="noopener noreferrer" style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 12px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 20, textDecoration: "none",
                }}>
                  <span style={{ fontSize: 14 }}>🎮</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>Steam</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* ─── Game Status ─── */}
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: "#888",
            textTransform: "uppercase", letterSpacing: "0.08em",
            marginBottom: 8,
          }}>Status</div>
          <div style={{ display: "flex", gap: 6 }}>
            {STATUSES.map((s) => (
              <button
                key={s.key}
                onClick={() => setStatus(s.key)}
                style={{
                  flex: 1, padding: "8px 4px",
                  background: status === s.key ? `${s.color}15` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${status === s.key ? `${s.color}50` : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 8, cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <span style={{
                  fontSize: 9, fontWeight: 600,
                  color: status === s.key ? s.color : "#666",
                }}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Platform ─── */}
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: "#888",
            textTransform: "uppercase", letterSpacing: "0.08em",
            marginBottom: 8,
          }}>Platform</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PLATFORMS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPlatform(platform === p.key ? null : p.key)}
                style={{
                  padding: "6px 10px",
                  background: platform === p.key ? "rgba(233,30,140,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${platform === p.key ? "rgba(233,30,140,0.35)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 16, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: 12 }}>{p.icon}</span>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: platform === p.key ? accent : "#888",
                }}>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Rating ─── */}
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
                <div key={n} className="gp-star-btn"
                  style={{ color: isFull ? "#facc15" : isHalf ? "#facc15" : "#444" }}>
                  <div className="gp-star-zone left" onClick={() => handleStarClick(n, true)} />
                  <div className="gp-star-zone right" onClick={() => handleStarClick(n, false)} />
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
        {/* ─── Played Along toggle (WPYP games only) ─── */}
        {isWpyp && (
          <div style={{ marginBottom: 16 }}>
            <div
              className={`gp-wpyp-toggle${playedAlong ? " active" : ""}`}
              onClick={() => setPlayedAlong(!playedAlong)}
            >
              <div style={{
                width: 40, height: 22, borderRadius: 11,
                background: playedAlong
                  ? "linear-gradient(135deg, #00d4ff, #0099cc)"
                  : "rgba(255,255,255,0.12)",
                position: "relative", transition: "background 0.2s", flexShrink: 0,
              }}>
                <div style={{
                  position: "absolute",
                  top: 2, left: playedAlong ? 20 : 2,
                  width: 18, height: 18, borderRadius: "50%",
                  background: playedAlong ? "#fff" : "rgba(255,255,255,0.5)",
                  transition: "left 0.2s, background 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: playedAlong ? "#00d4ff" : "#999",
                }}>
                  🎯 Played Along
                </div>
                <div style={{
                  fontSize: 10,
                  color: playedAlong ? "rgba(0,212,255,0.5)" : "rgba(255,255,255,0.25)",
                  marginTop: 1,
                }}>
                  Played this for the We Play, You Play episode
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
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleLog}
                  disabled={saving || !status}
                  style={{
                    flex: 1, padding: "13px 0",
                    background: `linear-gradient(135deg, ${accent}, #c4157a)`,
                    border: "none", borderRadius: 12,
                    color: "#fff", fontSize: 15, fontWeight: 700,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    letterSpacing: "0.02em",
                    cursor: saving || !status ? "default" : "pointer",
                    opacity: saving || !status ? 0.4 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  {saving ? "Saving..." : "✓ Log Game"}
                </button>
                {status === "completed" && (
                  <input
                    type="date"
                    className="gp-date-input"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                )}
              </div>

              <button
                onClick={handleWatchlist}
                disabled={saving}
                style={{
                  width: "100%", padding: "11px 0",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  color: "#999", fontSize: 13, fontWeight: 600,
                  cursor: saving ? "wait" : "pointer",
                }}
              >
                🎮 Want to Play
              </button>
            </>
          )}

          {/* === ALREADY LOGGED === */}
          {isCompleted && (
            <>
              <button
                onClick={handleLog}
                disabled={saving}
                style={{
                  width: "100%", padding: "13px 0",
                  background: `linear-gradient(135deg, ${accent}, #c4157a)`,
                  border: "none", borderRadius: 12,
                  color: "#fff", fontSize: 15, fontWeight: 700,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  cursor: saving ? "wait" : "pointer",
                  opacity: saving ? 0.6 : 1,
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
              color: "#666", fontSize: 13, cursor: "pointer",
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
   ListenOnBadges — Spotify + Apple Podcasts deep links
   ═══════════════════════════════════════════════════════════════ */

function ListenOnBadges({ title, compact }) {
  const searchQuery = encodeURIComponent(`Get Played ${title}`);
  const spotifyUrl = `https://open.spotify.com/search/${searchQuery}`;
  const appleUrl = `https://podcasts.apple.com/search?term=${searchQuery}`;

  const badgeStyle = {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "4px 8px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14, textDecoration: "none",
    WebkitTapHighlightColor: "transparent",
  };

  const labelStyle = { fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap" };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" style={badgeStyle}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="#1DB954">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <span style={labelStyle}>Spotify</span>
        </a>
        <a href={appleUrl} target="_blank" rel="noopener noreferrer" style={badgeStyle}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="#A855F7">
            <path d="M5.34 0A5.328 5.328 0 000 5.34v13.32A5.328 5.328 0 005.34 24h13.32A5.328 5.328 0 0024 18.66V5.34A5.328 5.328 0 0018.66 0H5.34zm6.525 2.568c2.336 0 4.448.902 6.056 2.587 1.224 1.272 1.912 2.619 2.264 4.392.12.6-.12 1.2-.6 1.5-.48.3-1.14.18-1.5-.3-.18-.36-.24-.78-.36-1.14-.36-1.2-.96-2.16-1.92-2.94-1.32-1.08-2.82-1.5-4.5-1.26-2.28.36-3.84 1.62-4.8 3.66-.36.78-.54 1.62-.54 2.52 0 1.56.42 2.94 1.38 4.2.3.36.3.96 0 1.32-.36.36-.96.42-1.32.06-.42-.36-.78-.78-1.08-1.26-.9-1.38-1.32-2.94-1.38-4.62-.06-2.1.54-3.96 1.8-5.58 1.56-2.04 3.66-3.18 6.48-3.12zm.12 4.32c1.44.06 2.7.6 3.72 1.68.78.84 1.2 1.8 1.38 2.94.06.6-.24 1.08-.78 1.26-.54.12-1.08-.12-1.26-.72-.12-.36-.18-.72-.36-1.08-.6-1.2-1.62-1.74-2.94-1.74-1.62.06-2.76.84-3.3 2.4-.18.48-.24 1.02-.18 1.56.06.66.18 1.32.48 1.92.06.12.12.3.12.42.06.54-.18 1.02-.66 1.2-.54.18-1.08 0-1.32-.48-.42-.84-.66-1.74-.78-2.7-.18-1.56.18-2.94 1.02-4.2.96-1.38 2.34-2.22 4.02-2.46.3-.06.54-.06.84-.06zm-.12 4.44c1.26 0 2.22 1.02 2.22 2.22 0 .9-.54 1.62-1.32 2.01l.48 4.38c.06.54-.36 1.02-.9 1.08h-.96c-.54-.06-.96-.54-.9-1.08l.48-4.38c-.78-.42-1.32-1.14-1.32-2.01.02-1.2.98-2.22 2.22-2.22z"/>
          </svg>
          <span style={labelStyle}>Apple</span>
        </a>
      </div>
    </div>
  );
}
