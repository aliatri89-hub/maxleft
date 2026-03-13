import { useState } from "react";

/**
 * ShelfRow — Horizontal scrolling shelf with optional cap + "Show more" expansion.
 *
 * Two modes:
 *   1. Dynamic shelves (expandable=false): Shows all items (caller caps at 10), no button.
 *   2. Catalogue shelves (expandable=true): Shows first 10, "Show more" reveals the rest
 *      in the same horizontal scroll.
 *
 * Props:
 *   title         — Shelf label ("Recently Logged", "New Episodes", "Marvel", etc.)
 *   icon          — Optional emoji or icon string
 *   items         — Full array of items to render
 *   renderItem    — (item, index) => JSX — render function for each card
 *   expandable    — Whether to show the cap + "Show more" button (default: true)
 *   cap           — Number of items to show before expansion (default: 10)
 *   accent        — Theme accent color
 *   style         — Additional container styles
 */
const SHELF_CAP = 10;

export default function ShelfRow({
  title,
  icon,
  items = [],
  renderItem,
  expandable = true,
  cap = SHELF_CAP,
  accent = "#e94560",
  style = {},
}) {
  const [expanded, setExpanded] = useState(false);

  if (!items || items.length === 0) return null;

  const needsCap = expandable && items.length > cap;
  const visibleItems = needsCap && !expanded ? items.slice(0, cap) : items;

  return (
    <div style={{ marginBottom: 20, ...style }}>
      {/* Shelf header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        marginBottom: 8,
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#ffffffcc",
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: 0.3,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
          {title}
          {expandable && items.length > cap && (
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#ffffff44",
              marginLeft: 4,
            }}>
              {items.length}
            </span>
          )}
        </div>

        {needsCap && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            style={{
              background: "none",
              border: "none",
              color: accent,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              padding: "2px 0",
              fontFamily: "'Barlow Condensed', sans-serif",
            }}
          >
            Show more →
          </button>
        )}
      </div>

      {/* Horizontal scroll */}
      <div
        className="hide-scrollbar"
        style={{
          display: "flex",
          overflowX: "auto",
          gap: 10,
          paddingLeft: 16,
          paddingRight: 16,
          scrollSnapType: "x proximity",
        }}
      >
        {visibleItems.map((item, idx) => (
          <div key={item.id || idx} style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
            {renderItem(item, idx)}
          </div>
        ))}
      </div>
    </div>
  );
}
