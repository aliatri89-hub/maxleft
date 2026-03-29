import { t } from "../../../theme";
import { useState, useEffect } from "react";
import AdminItemEditor from "../shared/AdminItemEditor";
import CrossCommunityChips from "../shared/CrossCommunityChips";
import { useEpisodeMatch } from "../../../hooks/community/useEpisodeMatch";

/**
 * FilmspottingLogModal — Filmspotting community log modal.
 * Films only. No commentary, no brown arrow, no Listen On badges.
 * Same pattern as HDTGMLogModal.
 */
export default function FilmspottingLogModal({
  item, coverUrl, isCompleted, progressData,
  onLog, onUnlog, onWatchlist, onClose,
  userId, miniseries, onViewMantl,
  communitySubscriptions, communityId, onNavigateCommunity,
}) {
  const [confirmUnlog, setConfirmUnlog] = useState(false);
  const [rating, setRating] = useState(progressData?.rating || 0);
  const [completedAt, setCompletedAt] = useState(
    progressData?.completed_at ? new Date(progressData.completed_at).toISOString().split("T")[0] : ""
  );

  const { matchedEpisode, isThisEpPlaying, playEpisode, isPlaying } = useEpisodeMatch(item, "Filmspotting");

  useEffect(() => {
    setRating(progressData?.rating || 0);
    setCompletedAt(
      progressData?.completed_at ? new Date(progressData.completed_at).toISOString().split("T")[0] : ""
    );
  }, [progressData, item?.id]);

  const handleSave = () => {
    onLog(item.id, {
      rating: rating || null,
      completed_at: completedAt || null,
      isUpdate: isCompleted,
    });
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 440, maxHeight: "85vh", overflowY: "auto",
          background: t.bgCard, borderRadius: "16px 16px 0 0",
          padding: "20px 16px max(var(--sab), 16px)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ position: "relative", width: 60, height: 90, flexShrink: 0 }}>
            {coverUrl && (
              <img loading="lazy" src={coverUrl} alt="" style={{
                width: 60, height: 90, borderRadius: 6, objectFit: "cover", display: "block",
              }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 16, fontWeight: 700, color: t.textPrimary,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{item.title}</div>
            <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>
              {item.year}
            </div>
          </div>
          <AdminItemEditor item={item} userId={userId} miniseries={miniseries || []} onSaved={onClose} />
          <button onClick={onClose} style={{
            background: "none", border: "none", color: t.textMuted,
            fontSize: 20, cursor: "pointer", padding: 4, alignSelf: "flex-start",
          }}>✕</button>
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

        {/* Star rating */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Rating
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star === rating ? 0 : star)}
                style={{
                  background: "none", border: "none", fontSize: 28, cursor: "pointer",
                  color: star <= rating ? t.gold : t.textFaint,
                  padding: "0 2px", transition: "color 0.15s",
                }}
              >★</button>
            ))}
            <button
              onClick={() => setRating(rating === 0.5 ? 0 : 0.5)}
              style={{
                background: rating === 0.5 ? "rgba(250,204,21,0.2)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${rating === 0.5 ? "rgba(250,204,21,0.5)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 6, padding: "4px 8px", marginLeft: 8,
                color: rating === 0.5 ? t.gold : t.textFaint,
                fontSize: 11, cursor: "pointer", fontWeight: 600,
              }}
            >½</button>
          </div>
        </div>
        {/* Date */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Date Watched
          </div>
          <input
            type="date"
            value={completedAt}
            onChange={(e) => setCompletedAt(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${t.bgHover}`, borderRadius: 8,
              color: t.textSecondary, padding: "10px 12px", fontSize: 14,
              fontFamily: "inherit", outline: "none",
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleSave} style={{
            flex: 1, padding: "12px 0", borderRadius: 10,
            background: t.green, color: "#0a0a0a",
            fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer",
          }}>
            {isCompleted ? "Update" : "Log It"}
          </button>

          {!isCompleted && item.media_type === "film" && (
            <button onClick={() => { onWatchlist(item, coverUrl); onClose(); }} style={{
              padding: "12px 16px", borderRadius: 10,
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${t.borderMedium}`,
              color: t.textSecondary, fontSize: 14, cursor: "pointer",
            }}>👁</button>
          )}

          {isCompleted && (
            <button onClick={() => { if (!confirmUnlog) { setConfirmUnlog(true); return; } onUnlog(item.id); onClose(); }} style={{
              padding: "12px 16px", borderRadius: 10,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: t.red, fontSize: 14, cursor: "pointer",
            }}>{confirmUnlog ? "Confirm?" : "Remove"}</button>
          )}
        </div>
      </div>
    </div>
  );
}
