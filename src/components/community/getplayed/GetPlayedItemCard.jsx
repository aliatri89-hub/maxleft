import ItemCard from "../primitives/ItemCard";

/**
 * GetPlayedItemCard — Get Played community card.
 *
 * Status-aware badges:
 *   - Beat/Completed: green checkmark (standard isCompleted behavior)
 *   - Playing: cyan ▶ badge
 *   - Backlog: yellow 📋 badge
 *   - WPYP: controller badge (top-left)
 *
 * Props:
 *   item               — community_items row
 *   isCompleted        — whether item is logged at all
 *   progressData       — { status, played_along } or null
 *   isWpyp             — whether this is a We Play, You Play game
 *   playedAlong        — boolean
 *   onToggle           — click handler (opens log modal)
 *   coverCacheVersion  — triggers cover URL re-resolve
 */
export default function GetPlayedItemCard({
  item,
  isCompleted,
  progressData,
  isWpyp,
  playedAlong,
  onToggle,
  coverCacheVersion,
}) {
  const status = progressData?.status;
  // Only show green check for beat/completed — not playing/backlog
  const showAsCompleted = isCompleted && (status === "completed" || status === "beat" || !status);
  const isPlaying = status === "playing";
  const isBacklog = status === "backlog";

  return (
    <ItemCard
      item={item}
      isCompleted={showAsCompleted}
      onToggle={onToggle}
      coverCacheVersion={coverCacheVersion}
    >
      {/* WPYP badge — controller */}
      {isWpyp && (
        <div style={{
          position: "absolute",
          top: 5, left: 5, zIndex: 3,
          background: playedAlong
            ? "rgba(0,212,255,0.9)"
            : "rgba(255,255,255,0.15)",
          width: 24, height: 24, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11,
          boxShadow: playedAlong ? "0 2px 6px rgba(0,212,255,0.5)" : "none",
          backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
          border: playedAlong ? "none" : "1px solid rgba(255,255,255,0.2)",
          transition: "all 0.2s",
        }}>
         
        </div>
      )}

      {/* Playing badge */}
      {isPlaying && (
        <div style={{
          position: "absolute",
          bottom: 4, left: 4, right: 4, zIndex: 3,
          background: "rgba(0,212,255,0.85)",
          borderRadius: 6, padding: "2px 0",
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 3,
          backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
        }}>
          <span style={{ fontSize: 8 }}>▶</span>
          <span style={{
            fontSize: 8, fontWeight: 800, color: "#fff",
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>Playing</span>
        </div>
      )}

      {/* Backlog badge */}
      {isBacklog && (
        <div style={{
          position: "absolute",
          bottom: 4, left: 4, right: 4, zIndex: 3,
          background: "rgba(250,204,21,0.85)",
          borderRadius: 6, padding: "2px 0",
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 3,
          backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
        }}>
          <span style={{ fontSize: 8 }}>📋</span>
          <span style={{
            fontSize: 8, fontWeight: 800, color: "#1a1a2e",
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>Backlog</span>
        </div>
      )}
    </ItemCard>
  );
}
