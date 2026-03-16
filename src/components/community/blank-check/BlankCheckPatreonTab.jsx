import { useCallback } from "react";
import MiniseriesShelf from "../shared/MiniseriesShelf";
import SearchInput from "../shared/SearchInput";
import BlankCheckItemCard from "./BlankCheckItemCard";

export default function BlankCheckPatreonTab({ community, progress, onToggle, onToggleCommentary, miniseries = [], coverCacheVersion, searchQuery, onSearchChange, mediaFilter }) {
  const accent = community?.theme_config?.accent || "#e94560";
  const patreonSeries = miniseries.filter((s) => s.tab_key === "patreon");
  const q = (searchQuery || "").trim().toLowerCase();
  const isSearching = q.length >= 2;

  // "Seen" pill cycles solo:film / hide:film — filters by watched status
  const isWatchedVisible = useCallback((itemId) => {
    if (!mediaFilter) return true;
    const [mode, type] = mediaFilter.split(":");
    if (type !== "film") return true; // not a "seen" filter
    const watched = progress[itemId]?.status === "completed";
    if (mode === "solo") return watched;
    if (mode === "hide") return !watched;
    return true;
  }, [mediaFilter, progress]);

  // "Listened" pill cycles solo:listened / hide:listened — filters by commentary
  const isListenedVisible = useCallback((itemId) => {
    if (!mediaFilter) return true;
    const [mode, type] = mediaFilter.split(":");
    if (type !== "listened") return true;
    const listened = !!progress[itemId]?.listened_with_commentary;
    if (mode === "solo") return listened;
    if (mode === "hide") return !listened;
    return true;
  }, [mediaFilter, progress]);

  return (
    <div style={{ padding: "0 0 100px" }}>
      {/* Section header */}
      <div style={{ textAlign: "center", padding: "24px 16px 8px" }}>
        <div style={{
          fontSize: 22, fontWeight: 800, color: "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
          textTransform: "uppercase", letterSpacing: "0.04em",
        }}>
          Patreon Commentaries
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
          Track every commentary series from the Patreon feed
        </div>
      </div>

      {/* Search bar */}
      <SearchInput
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search commentaries..."
        accent={accent}
      />

      {patreonSeries.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "40px 0",
          fontFamily: "'Lora', serif", fontSize: 13,
          color: "rgba(255,255,255,0.25)", fontStyle: "italic",
        }}>
          No commentary series yet
        </div>
      ) : (
        <div style={{ paddingTop: 12 }}>
          {patreonSeries.map((s) => {
            let items = (s.items || []).filter(i => isWatchedVisible(i.id) && isListenedVisible(i.id));

            if (isSearching) {
              const shelfMatches = s.title?.toLowerCase().includes(q);
              if (!shelfMatches) {
                items = items.filter(i =>
                  i.title.toLowerCase().includes(q) ||
                  (i.creator || "").toLowerCase().includes(q) ||
                  String(i.year || "").includes(q)
                );
              }
            }
            if (items.length === 0) return null;

            return (
              <MiniseriesShelf
                key={s.id}
                series={{ ...s, items }}
                progress={progress}
                onToggle={onToggle}
                onToggleCommentary={onToggleCommentary}
                CardComponent={BlankCheckItemCard}
                cardProps={{ showCommentaryBadge: true }}
                coverCacheVersion={coverCacheVersion}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
