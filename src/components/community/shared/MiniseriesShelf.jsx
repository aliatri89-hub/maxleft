import { useState, useMemo, useEffect } from "react";
import ItemCard from "../primitives/ItemCard";
import { isComingSoon } from "../../../utils/comingSoon";

export default function MiniseriesShelf({ series, progress, onToggle, onToggleCommentary, CardComponent, cardProps = {}, coverCacheVersion, filter, hideTitle = false, hideTracker = false, shelfCap, accent = "#e94560" }) {
  const [expanded, setExpanded] = useState(false);

  // Group items by media type
  const grouped = useMemo(() => {
    const g = { film: [], book: [], game: [], show: [] };
    (series.items || []).forEach((item) => {
      const type = item.media_type || "film";
      if (g[type]) g[type].push(item);
    });
    return g;
  }, [series.items]);

  const availableTypes = useMemo(() =>
    Object.entries(grouped)
      .filter(([, items]) => items.length > 0)
      .map(([type]) => type),
    [grouped]
  );

  // Default to first available type — and react when available types change
  // (e.g. parent applies a media filter that removes films, leaving only books)
  const [activeType, setActiveType] = useState(() => availableTypes[0] || "film");

  useEffect(() => {
    if (!availableTypes.includes(activeType)) {
      setActiveType(availableTypes[0] || "film");
    }
  }, [availableTypes, activeType]);

  const currentItems = grouped[activeType] || [];

  // Apply seen/unseen/upcoming filter
  const filteredItems = filter === "upcoming"
    ? currentItems
        .filter((i) => isComingSoon(i))
        .sort((a, b) => (b.air_date || "").localeCompare(a.air_date || ""))
    : filter && filter !== "all"
    ? currentItems.filter((i) =>
        filter === "seen" ? progress[i.id]?.status === "completed" : progress[i.id]?.status !== "completed"
      )
    : currentItems;

  const completedCount = currentItems.filter((i) => progress[i.id]?.status === "completed").length;
  const totalCount = currentItems.length;

  // Overall series progress (all types)
  const allItems = series.items || [];
  const allCompleted = allItems.filter((i) => progress[i.id]?.status === "completed").length;
  const allPct = allItems.length > 0 ? Math.round((allCompleted / allItems.length) * 100) : 0;

  const TYPE_LABELS = { film: "Films", book: "Books", game: "Games", show: "Shows" };
  const TYPE_ICONS = { film: "🎬", book: "📚", game: "🎮", show: "📺" };

  // Shelf cap: show limited items + expand card when not expanded
  const needsCap = shelfCap && filteredItems.length > shelfCap && !expanded;
  const displayItems = needsCap ? filteredItems.slice(0, shelfCap) : filteredItems;
  const remaining = needsCap ? filteredItems.length - shelfCap : 0;

  // Hide shelf entirely when filter leaves no items
  if (filter && filter !== "all" && filteredItems.length === 0) return null;

  return (
    <div data-shelf-id={series.id} style={{ marginBottom: 28, overflow: "hidden" }}>
      {/* Shelf Header */}
      {!hideTitle && (
      <div style={{ padding: "0 16px", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          {series.director_emoji && <span style={{ fontSize: 20 }}>{series.director_emoji}</span>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 15, fontWeight: 700, color: "#fff",
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.02em",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {series.title}
            </div>
            {((series.director_name && series.director_name !== ".") || series.episode_range) && (
              <div style={{ fontSize: 12, color: "#888", marginTop: 1 }}>
                {[series.director_name !== "." && series.director_name, series.episode_range].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
          {!hideTracker && (
            allPct === 100 ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "rgba(74,222,128,0.12)",
                border: "1px solid rgba(74,222,128,0.35)",
                borderRadius: 20,
                padding: "2px 8px 2px 6px",
              }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5.5" fill="rgba(74,222,128,0.2)" stroke="#4ade80" strokeWidth="1"/>
                  <path d="M3.5 6l1.8 1.8 3.2-3.6" stroke="#4ade80" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: "#4ade80",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  letterSpacing: "0.04em",
                }}>DONE</span>
              </div>
            ) : (
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: "#e94560",
                fontFamily: "'Barlow Condensed', sans-serif",
              }}>
                {allCompleted}/{allItems.length}
              </div>
            )
          )}
        </div>

        {/* Progress bar */}
        {!hideTracker && (
        <div style={{
          height: 3, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 2,
            width: `${allPct}%`,
            background: allPct === 100
              ? "linear-gradient(90deg, #4ade80, #22d3ee)"
              : "linear-gradient(90deg, #e94560, #C4734F)",
            transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          }} />
        </div>
        )}

      </div>
      )}

      {/* Media type tabs (outside hideTitle so patron tab can use them) */}
      {availableTypes.length > 1 && (
        <div style={{ display: "flex", gap: 6, padding: hideTitle ? "0 16px 4px" : "0 16px 0", marginTop: hideTitle ? 0 : 10 }}>
          {availableTypes.map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              style={{
                background: activeType === type ? "rgba(233,69,96,0.2)" : "rgba(255,255,255,0.05)",
                border: activeType === type ? "1px solid #e94560" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20, padding: "4px 12px",
                color: activeType === type ? "#e94560" : "#888",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {TYPE_ICONS[type]} {TYPE_LABELS[type]} ({grouped[type].length})
            </button>
          ))}
        </div>
      )}

      {/* Horizontal scroll items */}
      <div
        className="hide-scrollbar"
        style={{
          display: "flex", gap: 12,
          overflowX: "auto", overflowY: "hidden",
          padding: "0 16px 4px",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {displayItems.map((item) => {
          const Card = CardComponent || ItemCard;
          return (
            <Card
              key={item.id}
              item={item}
              isCompleted={progress[item.id]?.status === "completed"}
              onToggle={() => onToggle(item.id)}
              coverCacheVersion={coverCacheVersion}
              {...(CardComponent ? {
                ...cardProps,
                progress: progress[item.id] || null,
                userRating: progress[item.id]?.rating || null,
                brownArrow: !!progress[item.id]?.brown_arrow,
                listenedWithCommentary: !!progress[item.id]?.listened_with_commentary,
                onToggleCommentary,
              } : {})}
            />
          );
        })}
        {needsCap && (
          <div
            onClick={() => setExpanded(true)}
            style={{
              flexShrink: 0,
              width: 80,
              minHeight: 120,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              cursor: "pointer",
              borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              transition: "background 0.2s",
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: `${accent}20`,
              border: `1.5px solid ${accent}50`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 20, color: accent, lineHeight: 1 }}>+</span>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)",
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>
              +{remaining}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
