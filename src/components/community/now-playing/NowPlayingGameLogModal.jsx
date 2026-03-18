import AdminItemEditor from "../shared/AdminItemEditor";
import CrossCommunityChips from "../shared/CrossCommunityChips";
import { useEpisodeMatch } from "../../../hooks/community/useEpisodeMatch";
import { useState } from "react";
import { toLogTimestamp } from "../../../utils/helpers";

const PATREON_URL = "https://www.patreon.com/nowplayingpodcast";

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
  { key: "completed", label: "Beat", icon: "✓", color: "#4ade80" },
  { key: "playing", label: "Playing", icon: "▶", color: "#F5C518" },
  { key: "backlog", label: "Backlog", icon: "📋", color: "#facc15" },
];

/**
 * NowPlayingGameLogModal — Game-specific log modal for NPP's Arcade.
 *
 * Now Playing covers films, books, shows, AND games. When a user taps
 * a game item in the NPP Arcade, this modal opens instead of the
 * standard NowPlayingLogModal.
 *
 * Game-specific features:
 *   - Status selector: Beat / Playing / Backlog
 *   - Platform selector
 *   - Steam achievement stats (if available from bridge)
 *   - Episode matching + Listen on MANTL (shared with film modal)
 *   - Dual-write to games table via useNowPlayingGameBridge
 *
 * Props:
 *   item             — community_items row (media_type === "game")
 *   coverUrl         — resolved cover URL (RAWG background_image or TMDB)
 *   isCompleted      — whether already logged
 *   progressData     — { status, platform, rating, played_along, _steamAchievements } or null
 *   steamStats       — { earned, total } or null (from bridge.getSteamStats)
 *   userOwnsGame     — boolean — does user own this on Steam / games table
 *   onLog            — (itemId, { rating, completed_at, platform, status }) => void
 *   onUnlog          — (itemId) => void
 *   onWatchlist      — (item, coverUrl) => void  (adds to backlog)
 *   onClose          — () => void
 */
export default function NowPlayingGameLogModal({
  item, coverUrl, isCompleted, progressData, steamStats, userOwnsGame,
  onLog, onUnlog, onWatchlist, onClose,
  userId, miniseries, onViewMantl,
  communitySubscriptions, communityId, onNavigateCommunity,
  onToast, onShelvesChanged,
}) {
  const [rating, setRating] = useState(progressData?.rating || 0);
  const [platform, setPlatform] = useState(progressData?.platform || null);
  const [status, setStatus] = useState(progressData?.status || null);
  const [saving, setSaving] = useState(false);
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [episodeToast, setEpisodeToast] = useState(false);

  // ── Episode matching ──
  const { matchedEpisode, isThisEpPlaying, playEpisode, isPlaying } = useEpisodeMatch(item, "Now Playing");

  // ── Smart status tap: Beat = form, Playing/Backlog = instant save ──
  const handleStatusTap = async (key) => {
    // Toggle off if tapping the same status
    if (status === key) {
      setStatus(null);
      return;
    }

    // Beat → just select it, user fills in rating/date then hits Log Game
    if (key === "completed") {
      setStatus("completed");
      return;
    }

    // Playing / Backlog → instant save and close
    setSaving(true);
    try {
      await onLog(item.id, {
        rating: null,
        completed_at: null,
        platform,
        status: key,
        isUpdate: isCompleted,
      });
      onClose();
    } catch (e) {
      console.error("[NPP GameLog] Quick-status error:", e);
      setSaving(false);
    }
  };

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
        completed_at:
          status === "completed"
            ? toLogTimestamp(logDate)
            : null,
        platform,
        status,
        isUpdate: isCompleted,
      });
      // Show episode toast on fresh logs
      if (!isCompleted && matchedEpisode) {
        setEpisodeToast(true);
        setTimeout(() => {
          setEpisodeToast(false);
          onClose();
        }, 5000);
      } else {
        onClose();
      }
      if (isCompleted && onShelvesChanged) onShelvesChanged();
    } catch (e) {
      console.error("[NPP GameLog] Save error:", e);
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
      console.error("[NPP GameLog] Unlog error:", e);
      setSaving(false);
    }
  };

  const handleBacklog = async () => {
    setSaving(true);
    try {
      await onWatchlist(item, coverUrl);
      onClose();
    } catch (e) {
      console.error("[NPP GameLog] Backlog error:", e);
      setSaving(false);
    }
  };

  // Achievement percentage
  const achPct =
    steamStats && steamStats.total > 0
      ? Math.round((steamStats.earned / steamStats.total) * 100)
      : null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 250,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        animation: "nppGameFadeIn 0.2s ease",
      }}
    >
      <style>{`
        @keyframes nppGameFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes nppGameSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .nppg-star-btn {
          font-size: 28px;
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px; height: 36px;
          cursor: pointer; user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .nppg-star-btn .nppg-star-zone {
          position: absolute; top: 0; bottom: 0; width: 50%; z-index: 1;
        }
        .nppg-star-btn .nppg-star-zone.left { left: 0; }
        .nppg-star-btn .nppg-star-zone.right { right: 0; }
        .nppg-date-input {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; color: #e0e0e0;
          font-size: 13px; padding: 6px 10px;
          font-family: inherit; outline: none;
          color-scheme: dark; cursor: pointer;
        }
        @keyframes nppgEqBar { 0% { height: 3px; } 100% { height: 10px; } }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          maxHeight: "75dvh",
          background: "linear-gradient(180deg, #1a1a2e 0%, #12121f 100%)",
          borderRadius: "16px 16px 0 0",
          padding: "0 20px calc(20px + env(safe-area-inset-bottom, 0px))",
          animation: "nppGameSlideUp 0.25s ease",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
        </div>

        {/* Close + Admin */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            background:
              "linear-gradient(180deg, #1a1a2e 0%, rgba(26,26,46,0.95) 80%, transparent 100%)",
            padding: "12px 0 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <AdminItemEditor
            item={item}
            userId={userId}
            miniseries={miniseries || []}
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
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Hero: game cover + info ── */}
        <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
          <div
            style={{
              width: 130,
              flexShrink: 0,
              aspectRatio: "16/9",
              borderRadius: 8,
              overflow: "hidden",
              background: "linear-gradient(135deg, #1a1a2e, #16213e)",
              position: "relative",
            }}
          >
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={item.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                }}
              >
               
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#fff",
                fontFamily: "'Barlow Condensed', sans-serif",
                lineHeight: 1.2,
                marginBottom: 4,
              }}
            >
              {item.title}
            </div>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 2 }}>
              {item.creator}
              {item.year ? ` · ${item.year}` : ""}
            </div>
            {item.episode_number && (
              <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                {item.episode_number}
              </div>
            )}

            {/* Status badges */}
            {isCompleted && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  marginTop: 8,
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 10px",
                    background: "rgba(74,222,128,0.1)",
                    border: "1px solid rgba(74,222,128,0.3)",
                    borderRadius: 20,
                    fontSize: 11,
                    color: "#4ade80",
                    fontWeight: 600,
                  }}
                >
                  ✓{" "}
                  {progressData?.status === "playing"
                    ? "Playing"
                    : progressData?.status === "backlog"
                    ? "Backlog"
                    : "Beat"}
                </div>
                {progressData?._fromSteam && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 10px",
                      background: "rgba(102,192,244,0.1)",
                      border: "1px solid rgba(102,192,244,0.3)",
                      borderRadius: 20,
                      fontSize: 11,
                      color: "#66C0F4",
                      fontWeight: 600,
                    }}
                  >
                    Steam Sync
                  </div>
                )}
              </div>
            )}

            {/* Listen on MANTL — episode player */}
            {matchedEpisode && (
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playEpisode(matchedEpisode);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "8px 12px",
                    background: isThisEpPlaying
                      ? "rgba(245,197,24,0.15)"
                      : "rgba(245,197,24,0.08)",
                    border: `1.5px solid ${
                      isThisEpPlaying
                        ? "rgba(245,197,24,0.5)"
                        : "rgba(245,197,24,0.2)"
                    }`,
                    borderRadius: 10,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "#F5C518",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: isThisEpPlaying
                        ? "0 0 10px rgba(245,197,24,0.4)"
                        : "none",
                    }}
                  >
                    {isThisEpPlaying && isPlaying ? (
                      <div
                        style={{
                          display: "flex",
                          gap: 2,
                          alignItems: "flex-end",
                          height: 10,
                        }}
                      >
                        {[0, 1, 2].map((j) => (
                          <div
                            key={j}
                            style={{
                              width: 2,
                              borderRadius: 1,
                              background: "#0a0a0a",
                              animation: `nppgEqBar 0.5s ease ${
                                j * 0.12
                              }s infinite alternate`,
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#0a0a0a">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#F5C518",
                        fontFamily: "'Barlow Condensed', sans-serif",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isThisEpPlaying && isPlaying
                        ? "Now Playing"
                        : "Listen on MANTL"}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.4)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginTop: 1,
                      }}
                    >
                      {matchedEpisode.title}
                    </div>
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(245,197,24,0.6)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <path d="M3 18v-6a9 9 0 0118 0v6" />
                    <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
                  </svg>
                </button>
                <ListenOnBadges
                  title={item.title}
                  patreonUrl={
                    item.extra_data?.episode_url?.includes("patreon.com")
                      ? item.extra_data.episode_url
                      : PATREON_URL
                  }
                  isPatreon={!!item.extra_data?.episode_url?.includes("patreon.com")}
                />
              </div>
            )}

            {/* Fallback: Listen On badges only (no matched episode) */}
            {!matchedEpisode && (
              <ListenOnBadges
                title={item.title}
                patreonUrl={PATREON_URL}
                isPatreon={false}
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

        {/* ── Steam Achievement Progress ── */}
        {steamStats && steamStats.total > 0 && (
          <div
            style={{
              marginBottom: 14,
              padding: "10px 12px",
              background: "rgba(102,192,244,0.06)",
              border: "1px solid rgba(102,192,244,0.15)",
              borderRadius: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#66C0F4",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                🏆 Steam Achievements
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color:
                    achPct === 100
                      ? "#4ade80"
                      : achPct >= 50
                      ? "#F5C518"
                      : "#66C0F4",
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                {steamStats.earned}/{steamStats.total} ({achPct}%)
              </div>
            </div>
            <div
              style={{
                width: "100%",
                height: 4,
                borderRadius: 2,
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${achPct}%`,
                  background:
                    achPct === 100
                      ? "linear-gradient(90deg, #4ade80, #22c55e)"
                      : "linear-gradient(90deg, #66C0F4, #3B8BC9)",
                  borderRadius: 2,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
            {achPct === 100 && (
              <div
                style={{
                  fontSize: 10,
                  color: "#4ade80",
                  marginTop: 4,
                  fontWeight: 600,
                }}
              >
                ✓ 100% Complete
              </div>
            )}
          </div>
        )}

        {/* ─── Game Status ─── */}
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#888",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 8,
            }}
          >
            Status
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {STATUSES.map((s) => (
              <button
                key={s.key}
                onClick={() => handleStatusTap(s.key)}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  background:
                    status === s.key
                      ? `${s.color}15`
                      : "rgba(255,255,255,0.04)",
                  border: `1px solid ${
                    status === s.key
                      ? `${s.color}50`
                      : "rgba(255,255,255,0.08)"
                  }`,
                  borderRadius: 8,
                  cursor: saving ? "wait" : "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  transition: "all 0.2s",
                  opacity: saving ? 0.5 : 1,
                }}
              >
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: status === s.key ? s.color : "#666",
                  }}
                >
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Platform (always visible) ─── */}
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#888",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 8,
            }}
          >
            Platform
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PLATFORMS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPlatform(platform === p.key ? null : p.key)}
                style={{
                  padding: "6px 10px",
                  background:
                    platform === p.key
                      ? "rgba(245,197,24,0.12)"
                      : "rgba(255,255,255,0.04)",
                  border: `1px solid ${
                    platform === p.key
                      ? "rgba(245,197,24,0.35)"
                      : "rgba(255,255,255,0.08)"
                  }`,
                  borderRadius: 16,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: 12 }}>{p.icon}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: platform === p.key ? "#F5C518" : "#888",
                  }}
                >
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Rating / Actions — only for Beat or editing ─── */}
        {(status === "completed" || isCompleted) && (
          <>

        {/* ─── Rating ─── */}
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#888",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 6,
            }}
          >
            Your Rating
          </div>
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {[1, 2, 3, 4, 5].map((n) => {
              const isFull = rating >= n;
              const isHalf = !isFull && rating >= n - 0.5;
              return (
                <div
                  key={n}
                  className="nppg-star-btn"
                  style={{
                    color: isFull ? "#facc15" : isHalf ? "#facc15" : "#444",
                  }}
                >
                  <div
                    className="nppg-star-zone left"
                    onClick={() => handleStarClick(n, true)}
                  />
                  <div
                    className="nppg-star-zone right"
                    onClick={() => handleStarClick(n, false)}
                  />
                  {isFull ? (
                    "★"
                  ) : isHalf ? (
                    <span
                      style={{
                        position: "relative",
                        display: "inline-block",
                      }}
                    >
                      <span style={{ color: "#444" }}>★</span>
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          overflow: "hidden",
                          width: "50%",
                          color: "#facc15",
                        }}
                      >
                        ★
                      </span>
                    </span>
                  ) : (
                    "☆"
                  )}
                </div>
              );
            })}
            {rating > 0 && (
              <span
                style={{
                  fontSize: 12,
                  color: "#facc15",
                  marginLeft: 8,
                  fontWeight: 600,
                }}
              >
                {rating} / 5
              </span>
            )}
          </div>
        </div>
        {/* ── Action buttons ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* NOT YET LOGGED — Beat selected */}
          {!isCompleted && (
            <>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleLog}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: "13px 0",
                    background:
                      "linear-gradient(135deg, #F5C518, #d4a80e)",
                    border: "none",
                    borderRadius: 12,
                    color: "#0a0a0a",
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    letterSpacing: "0.02em",
                    cursor: saving ? "default" : "pointer",
                    opacity: saving ? 0.4 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  {saving ? "Saving..." : "🏆 Log as Beat"}
                </button>
                <input
                  type="date"
                  className="nppg-date-input"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                />
              </div>
            </>
          )}

          {/* ALREADY LOGGED */}
          {isCompleted && (
            <>
              <button
                onClick={handleLog}
                disabled={saving}
                style={{
                  width: "100%",
                  padding: "13px 0",
                  background:
                    "linear-gradient(135deg, #F5C518, #d4a80e)",
                  border: "none",
                  borderRadius: 12,
                  color: "#0a0a0a",
                  fontSize: 15,
                  fontWeight: 700,
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
                  width: "100%",
                  padding: "11px 0",
                  background: confirmUnlog
                    ? "rgba(233,69,96,0.2)"
                    : "rgba(233,69,96,0.08)",
                  border: `1px solid ${
                    confirmUnlog
                      ? "rgba(233,69,96,0.5)"
                      : "rgba(233,69,96,0.2)"
                  }`,
                  borderRadius: 12,
                  color: "#e94560",
                  fontSize: 13,
                  fontWeight: 600,
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
              width: "100%",
              padding: "10px 0",
              background: "none",
              border: "none",
              color: "#666",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
          </>
        )}

        {/* ── Episode toast — post-log prompt ── */}
        {episodeToast && matchedEpisode && (
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "0 16px 24px",
              background:
                "linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 70%, transparent 100%)",
              zIndex: 10,
              animation: "nppGameSlideUp 0.3s ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.4)",
                fontFamily: "'Barlow Condensed', sans-serif",
                textTransform: "uppercase",
                letterSpacing: 1.5,
              }}
            >
              Logged! Now hear what the hosts thought
            </div>

            <button
              onClick={() => {
                playEpisode(matchedEpisode);
                setEpisodeToast(false);
                onClose();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                maxWidth: 360,
                padding: "12px 16px",
                background: "rgba(245,197,24,0.12)",
                border: "1.5px solid rgba(245,197,24,0.3)",
                borderRadius: 14,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#F5C518",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#F5C518",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Listen on MANTL
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.4)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: 1,
                  }}
                >
                  {matchedEpisode.title}
                </div>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(245,197,24,0.5)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <path d="M3 18v-6a9 9 0 0118 0v6" />
                <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
              </svg>
            </button>

            <button
              onClick={() => {
                setEpisodeToast(false);
                onClose();
              }}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.3)",
                fontSize: 12,
                cursor: "pointer",
                padding: "6px 16px",
              }}
            >
              Not now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ListenOnBadges — Spotify, Podbean, Patreon (NPP-style)
   ═══════════════════════════════════════════════════════════════ */

function ListenOnBadges({ title, patreonUrl, isPatreon }) {
  const searchQuery = encodeURIComponent(`Now Playing Podcast ${title}`);
  const spotifyUrl = `https://open.spotify.com/search/${searchQuery}`;
  const podbeanUrl = `https://www.podbean.com/premium-podcast/nowplayingpodcast`;

  const badgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 8px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    textDecoration: "none",
    WebkitTapHighlightColor: "transparent",
  };

  const labelStyle = {
    fontSize: 10,
    fontWeight: 600,
    color: "rgba(255,255,255,0.6)",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <a
          href={spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={badgeStyle}
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="#1DB954">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          <span style={labelStyle}>Spotify</span>
        </a>

        <a
          href={podbeanUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={badgeStyle}
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="#6CBB3C">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 3.6c4.638 0 8.4 3.762 8.4 8.4 0 4.638-3.762 8.4-8.4 8.4-4.638 0-8.4-3.762-8.4-8.4 0-4.638 3.762-8.4 8.4-8.4zm0 2.4a6 6 0 100 12 6 6 0 000-12zm0 2.4a3.6 3.6 0 110 7.2 3.6 3.6 0 010-7.2z" />
          </svg>
          <span style={labelStyle}>Podbean</span>
        </a>

        {isPatreon && (
          <a
            href={patreonUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={badgeStyle}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="#FF424D">
              <path d="M14.82 2.41c3.96 0 7.18 3.24 7.18 7.21 0 3.96-3.22 7.18-7.18 7.18-3.97 0-7.21-3.22-7.21-7.18 0-3.97 3.24-7.21 7.21-7.21M2 21.6h3.5V2.41H2V21.6z" />
            </svg>
            <span style={labelStyle}>Patreon</span>
          </a>
        )}
      </div>
    </div>
  );
}
