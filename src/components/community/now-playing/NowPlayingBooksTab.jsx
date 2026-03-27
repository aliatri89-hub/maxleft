import { t } from "../../../theme";
import { useState, useMemo, useRef, useEffect } from "react";
import MiniseriesShelf from "../shared/MiniseriesShelf";
import NowPlayingItemCard from "./NowPlayingItemCard";
import CommunityFilter from "../shared/CommunityFilter";
import SearchInput from "../shared/SearchInput";

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
          color: t.textSecondary,
          fontFamily: t.fontDisplay,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}>
          {stats.completed}/{stats.total} read · {stats.pct}%
        </div>
      </div>

      {/* ─── Filter + Search ────────────────────────────── */}
      <CommunityFilter value={filter} onChange={onFilterChange} accent={accent} />

      <SearchInput
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search books..."
        accent={accent}
        inputRef={searchRef}
      />

      {/* ─── Shelves ─────────────────────────────────────── */}
      {visibleSeries.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "40px 0",
          fontFamily: t.fontDisplay, fontSize: 13,
          color: t.textSecondary, fontStyle: "italic",
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
