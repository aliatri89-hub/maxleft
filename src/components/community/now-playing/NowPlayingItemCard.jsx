import ItemCard from "../primitives/ItemCard";

/**
 * NowPlayingItemCard — Now Playing Podcast community card.
 *
 * Adds:
 *   - User rating badge (green ↑ / red ↓ / yellow ● / brown ↑)
 *   - Brown arrow overrides all other badges
 *   - Host review arrows (up/down counts from extra_data, bottom overlay)
 *
 * Props:
 *   item              — community_items row (with extra_data for host verdicts)
 *   isCompleted       — whether item is logged
 *   userRating        — numeric rating or null
 *   brownArrow        — boolean — "so bad it's good" override
 *   onToggle          — click handler (opens log modal)
 *   coverCacheVersion — triggers cover URL re-resolve
 */
export default function NowPlayingItemCard({
  item,
  isCompleted,
  userRating,
  brownArrow,
  onToggle,
  coverCacheVersion,
}) {
  // Host review data (extra_data from seeding)
  const extra = item.extra_data;
  const hasReviews = extra && (extra.up > 0 || extra.down > 0 || extra.brown > 0);

  // User badge: brown overrides all, then rating-based arrow
  const userBadge = brownArrow ? "brown"
    : userRating
      ? userRating > 2.5 ? "up"
      : userRating < 2.5 ? "down"
      : "neutral"
    : null;

  const BADGE_STYLES = {
    up:      { bg: "rgba(74,222,128,0.25)",  border: "rgba(74,222,128,0.5)",  shadow: "rgba(74,222,128,0.3)",  fill: "rgba(74,222,128,0.9)" },
    brown:   { bg: "rgba(160,82,45,0.3)",    border: "rgba(205,133,63,0.6)",  shadow: "rgba(160,82,45,0.4)",   fill: "rgba(205,133,63,0.9)" },
    down:    { bg: "rgba(239,68,68,0.25)",   border: "rgba(239,68,68,0.5)",   shadow: "rgba(239,68,68,0.3)",   fill: "rgba(239,68,68,0.9)" },
    neutral: { bg: "rgba(250,204,21,0.25)",  border: "rgba(250,204,21,0.5)",  shadow: "rgba(250,204,21,0.3)" },
  };

  const badge = userBadge ? BADGE_STYLES[userBadge] : null;

  return (
    <ItemCard
      item={item}
      isCompleted={isCompleted}
      onToggle={onToggle}
      coverCacheVersion={coverCacheVersion}
      bottomOverlay={hasReviews ? (
        <div style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 4, padding: "5px 0",
          background: "linear-gradient(0deg, rgba(0,0,0,0.65) 0%, transparent 100%)",
          zIndex: 2,
        }}>
          {Array.from({ length: extra.up || 0 }).map((_, i) => (
            <div key={`up-${i}`} style={{
              width: 22, height: 22, borderRadius: 5,
              background: "rgba(74,222,128,0.2)",
              border: "1px solid rgba(74,222,128,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 4L3 15h6v5h6v-5h6L12 4z" fill="rgba(74,222,128,0.8)" />
              </svg>
            </div>
          ))}
          {Array.from({ length: extra.brown || 0 }).map((_, i) => (
            <div key={`br-${i}`} style={{
              width: 22, height: 22, borderRadius: 5,
              background: "rgba(160,82,45,0.25)",
              border: "1px solid rgba(205,133,63,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 4L3 15h6v5h6v-5h6L12 4z" fill="rgba(205,133,63,0.8)" />
              </svg>
            </div>
          ))}
          {Array.from({ length: extra.down || 0 }).map((_, i) => (
            <div key={`dn-${i}`} style={{
              width: 22, height: 22, borderRadius: 5,
              background: "rgba(239,68,68,0.2)",
              border: "1px solid rgba(239,68,68,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 20L21 9h-6V4H9v5H3l9 11z" fill="rgba(239,68,68,0.8)" />
              </svg>
            </div>
          ))}
        </div>
      ) : null}
    >
      {/* User rating badge — top left. Brown arrow overrides rating-based arrow. */}
      {badge && (
        <div style={{
          position: "absolute",
          top: 5, left: 5, zIndex: 4,
          width: 26, height: 26, borderRadius: 6,
          background: badge.bg,
          border: `1.5px solid ${badge.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
          boxShadow: `0 2px 6px ${badge.shadow}`,
        }}>
          {(userBadge === "up" || userBadge === "brown") && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 4L3 15h6v5h6v-5h6L12 4z" fill={badge.fill} />
            </svg>
          )}
          {userBadge === "down" && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 20L21 9h-6V4H9v5H3l9 11z" fill={badge.fill} />
            </svg>
          )}
          {userBadge === "neutral" && (
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: "rgba(250,204,21,0.85)",
              boxShadow: "0 0 4px rgba(250,204,21,0.4)",
            }} />
          )}
        </div>
      )}
    </ItemCard>
  );
}
