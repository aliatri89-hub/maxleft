import { useState, useMemo, useRef, useEffect } from "react";
import MiniseriesShelf from "../shared/MiniseriesShelf";
import NowPlayingItemCard from "./NowPlayingItemCard";
import CommunityFilter from "../shared/CommunityFilter";

/**
 * NowPlayingBooksTab — Books & Nachos / Now Playing Book Reviews.
 * Pulls from community_miniseries where tab_key = 'books'.
 */

export default function NowPlayingBooksTab({
  community,
  session,
  progress = {},
  miniseries = [],
  onToggle,
  coverCacheVersion,
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
}) {
  const accent = community?.theme_config?.accent || "#e94560";

  // Prevent search input from auto-focusing on tab mount (keyboard blocks half the screen on mobile)
  const searchRef = useRef(null);
  useEffect(() => {
    if (searchRef.current) searchRef.current.blur();
  }, []);

  // Only books-tab series
  const bookSeries = useMemo(
    () => miniseries.filter((s) => s.tab_key === "books"),
    [miniseries]
  );

  // Stats
  const stats = useMemo(() => {
    const allItems = bookSeries.flatMap((s) => s.items || []);
    const seen = new Set();
    let total = 0, completed = 0;
    allItems.forEach((i) => {
      const key = `${i.title}::${i.year || ""}`;
      if (seen.has(key)) return;
      seen.add(key);
      total++;
      if (progress[i.id]?.status === "completed") completed++;
    });
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  }, [bookSeries, progress]);

  // Search + filter
  const visibleSeries = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    const isSearching = q.length >= 2;

    return bookSeries
      .map((s) => {
        let items = s.items || [];

        if (filter === "seen") items = items.filter((i) => progress[i.id]?.status === "completed");
        else if (filter === "unseen") items = items.filter((i) => progress[i.id]?.status !== "completed");

        if (isSearching) {
          items = items.filter((i) =>
            i.title.toLowerCase().includes(q) ||
            (i.creator || "").toLowerCase().includes(q) ||
            String(i.year || "").includes(q)
          );
        }

        const seen = new Set();
        items = items.filter((i) => {
          const key = `${i.title}::${i.year || ""}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        return items.length === 0 ? null : { ...s, items };
      })
      .filter(Boolean);
  }, [bookSeries, searchQuery, filter, progress]);

  return (
    <div style={{ padding: "0 0 100px" }}>

      {/* ─── Stats bar ────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px 16px 0",
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: "rgba(255,255,255,0.4)",
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}>
          📚 {stats.completed}/{stats.total} read · {stats.pct}%
        </div>
      </div>

      {/* ─── Filter + Search ────────────────────────────── */}
      <CommunityFilter value={filter} onChange={onFilterChange} accent={accent} />

      <div style={{ padding: "12px 16px 0" }}>
        <style>{`
          .cs-search-npp-books::placeholder { color: rgba(255,255,255,0.25); }
          .cs-search-npp-books:focus { border-color: ${accent}66; outline: none; }
        `}</style>
        <div style={{ position: "relative" }}>
          <input
            ref={searchRef}
            className="cs-search-npp-books"
            type="text"
            placeholder="Search books..."
            value={searchQuery || ""}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px 10px 36px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              color: "#e0e0e0",
              fontSize: 14,
              fontFamily: "inherit",
              WebkitAppearance: "none",
            }}
          />
          <div style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            fontSize: 14, color: "rgba(255,255,255,0.25)", pointerEvents: "none",
          }}>🔍</div>
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%",
                width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                color: "#888", fontSize: 12, cursor: "pointer",
              }}
            >✕</button>
          )}
        </div>
      </div>

      {/* ─── Shelves ─────────────────────────────────────── */}
      {visibleSeries.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "40px 0",
          fontFamily: "'Lora', serif", fontSize: 13,
          color: "rgba(255,255,255,0.25)", fontStyle: "italic",
        }}>
          {searchQuery
            ? "No matching books"
            : bookSeries.length === 0
              ? "Books & Nachos coming soon..."
              : "No books here yet"}
        </div>
      ) : (
        <div style={{ paddingTop: 12 }}>
          {visibleSeries.map((s) => (
            <MiniseriesShelf
              key={s.id}
              series={s}
              progress={progress}
              onToggle={onToggle}
              CardComponent={NowPlayingItemCard}
              coverCacheVersion={coverCacheVersion}
              filter={filter}
              accent={accent}
            />
          ))}
        </div>
      )}
    </div>
  );
}
