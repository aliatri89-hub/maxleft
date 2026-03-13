import ItemCard from "../primitives/ItemCard";

/**
 * BlankCheckItemCard — Blank Check community card.
 *
 * Adds: 🎧 commentary toggle badge (top-left).
 * That's it. No rating arrows, no host verdicts.
 *
 * Props:
 *   item                    — community_items row
 *   isCompleted             — whether item is logged
 *   listenedWithCommentary  — boolean
 *   showCommentaryBadge     — whether to show the 🎧 badge
 *   onToggle                — click handler (opens log modal)
 *   onToggleCommentary      — (itemId, newValue) => void
 *   coverCacheVersion       — triggers cover URL re-resolve
 */
export default function BlankCheckItemCard({
  item,
  isCompleted,
  listenedWithCommentary,
  showCommentaryBadge,
  onToggle,
  onToggleCommentary,
  coverCacheVersion,
}) {
  return (
    <ItemCard
      item={item}
      isCompleted={isCompleted}
      onToggle={onToggle}
      coverCacheVersion={coverCacheVersion}
    >
      {showCommentaryBadge && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleCommentary) onToggleCommentary(item.id, !listenedWithCommentary);
          }}
          style={{
            position: "absolute",
            top: 5, left: 5, zIndex: 3,
            background: listenedWithCommentary
              ? "rgba(250,204,21,0.9)"
              : "rgba(255,255,255,0.15)",
            width: 24, height: 24, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12,
            boxShadow: listenedWithCommentary
              ? "0 2px 6px rgba(250,204,21,0.5)"
              : "none",
            backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
            border: listenedWithCommentary
              ? "none"
              : "1px solid rgba(255,255,255,0.2)",
            transition: "all 0.2s",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          🎧
        </div>
      )}
    </ItemCard>
  );
}
