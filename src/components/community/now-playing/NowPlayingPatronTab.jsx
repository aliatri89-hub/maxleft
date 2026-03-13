import { useState, useMemo, useCallback } from "react";
import MiniseriesShelf from "../shared/MiniseriesShelf";
import NowPlayingItemCard from "./NowPlayingItemCard";
import CommunityFilter from "../shared/CommunityFilter";

/**
 * NowPlayingPatronTab — Decade-bucketed patron film reviews.
 * Each community_miniseries has tab_key="patreon" and title="1980s" etc.
 * Films slot into shelves by the decade of the film itself.
 *
 * Props:
 *   community      – community_pages row
 *   session        – auth session
 *   progress       – { itemId: progressData }
 *   miniseries     – full miniseries array from useCommunityPage
 *   onToggle       – item tap handler
 *   coverCacheVersion
 *   searchQuery    – current search string
 *   onSearchChange – search setter
 *   filter         – "all" | "seen" | "unseen"
 *   onFilterChange – filter setter
 */

const DECADE_META = {
  "Pre-1960s": { icon: "🎞",  order: 0 },
  "1960s":     { icon: "📽",  order: 1 },
  "1970s":     { icon: "📺",  order: 2 },
  "1980s":     { icon: "📼",  order: 3 },
  "1990s":     { icon: "💾",  order: 4 },
  "2000s":     { icon: "📀",  order: 5 },
  "2010s":     { icon: "📱",  order: 6 },
  "2020s":     { icon: "🎧",  order: 7 },
};

const ALL_KEY = "__all__";

export default function NowPlayingPatronTab({
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
  mediaFilter,
}) {
  const accent = community?.theme_config?.accent || "#e94560";
  const [activeDecade, setActiveDecade] = useState(ALL_KEY);

  // Media visibility helpers (same pattern as genre tab)
  const isMediaVisible = useCallback((mediaType) => {
    if (!mediaFilter) return true;
    const [mode, type] = mediaFilter.split(":");
    if (type === "listened") return true; // listened filter handled separately
    if (mode === "solo") return (mediaType || "film") === type;
    if (mode === "hide") return (mediaType || "film") !== type;
    return true;
  }, [mediaFilter]);

  const isListenedVisible = useCallback((itemId) => {
    if (!mediaFilter) return true;
    const [mode, type] = mediaFilter.split(":");
    if (type !== "listened") return true;
    const listened = !!progress[itemId]?.listened_with_commentary;
    if (mode === "solo") return listened;
    if (mode === "hide") return !listened;
    return true;
  }, [mediaFilter, progress]);

  // Only patron series
  const patronSeries = useMemo(
    () => miniseries.filter((s) => s.tab_key === "patreon"),
    [miniseries]
  );

  // Group by miniseries title (which is the decade label e.g. "1980s")
  const decadeGroups = useMemo(() => {
    const groups = {};
    patronSeries.forEach((s) => {
      const decade = s.title || "Unknown";
      if (!groups[decade]) groups[decade] = [];
      groups[decade].push(s);
    });
    return groups;
  }, [patronSeries]);

  // Sorted decade keys
  const decadeKeys = useMemo(() => {
    return Object.keys(decadeGroups).sort((a, b) => {
      const oa = DECADE_META[a]?.order ?? 99;
      const ob = DECADE_META[b]?.order ?? 99;
      return ob - oa;
    });
  }, [decadeGroups]);

  // Stats
  const stats = useMemo(() => {
    const pool = activeDecade === ALL_KEY
      ? patronSeries
      : (decadeGroups[activeDecade] || []);
    const allItems = pool.flatMap((s) => s.items || []);
    const seen = new Set();
    let total = 0, completed = 0;
    allItems.forEach((i) => {
      const key = `${i.title}::${i.year || ""}`;
      if (seen.has(key)) return;
      seen.add(key);
      total++;
      if (progress[i.id]) completed++;
    });
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  }, [activeDecade, patronSeries, decadeGroups, progress]);

  // Decade pill stats
  const decadeStats = useMemo(() => {
    const map = {};
    decadeKeys.forEach((key) => {
      const seen = new Set();
      const items = (decadeGroups[key] || []).flatMap((s) => s.items || []).filter((i) => {
        const k = `${i.title}::${i.year || ""}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      map[key] = {
        total: items.length,
        completed: items.filter((i) => progress[i.id]).length,
      };
    });
    return map;
  }, [decadeKeys, decadeGroups, progress]);

  // Filtered series for a given decade pool
  const filterSeries = useCallback((pool) => {
    const q = (searchQuery || "").trim().toLowerCase();
    const isSearching = q.length >= 2;

    return pool
      .map((s) => {
        let items = s.items || [];

        // Media type filter
        items = items.filter((i) => isMediaVisible(i.media_type) && isListenedVisible(i.id));

        if (filter === "seen") items = items.filter((i) => progress[i.id]);
        else if (filter === "unseen") items = items.filter((i) => !progress[i.id]);

        if (isSearching) {
          items = items.filter((i) =>
            i.title.toLowerCase().includes(q) ||
            (i.creator || "").toLowerCase().includes(q) ||
            String(i.year || "").includes(q)
          );
        }

        // Dedup within series
        const seen = new Set();
        items = items.filter((i) => {
          const k = `${i.title}::${i.year || ""}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

        return items.length === 0 ? null : { ...s, items };
      })
      .filter(Boolean);
  }, [searchQuery, filter, progress, isMediaVisible, isListenedVisible]);

  const visibleSeries = useMemo(() => {
    const pool = activeDecade === ALL_KEY
      ? patronSeries
      : (decadeGroups[activeDecade] || []);
    return filterSeries(pool);
  }, [activeDecade, patronSeries, decadeGroups, filterSeries]);

  // Pre-grouped filtered series for all-decades render path
  const visibleByDecade = useMemo(() => {
    if (activeDecade !== ALL_KEY) return null;
    const map = {};
    decadeKeys.forEach((key) => {
      map[key] = filterSeries(decadeGroups[key] || []);
    });
    return map;
  }, [activeDecade, decadeKeys, decadeGroups, filterSeries]);

  return (
    <div style={{ padding: "0 0 100px" }}>

      {/* ─── Decade dropdown ────────────────────────────── */}
      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
          <select
            value={activeDecade}
            onChange={(e) => setActiveDecade(e.target.value)}
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              background: activeDecade !== ALL_KEY ? `${accent}20` : "rgba(255,255,255,0.06)",
              border: `1.5px solid ${activeDecade !== ALL_KEY ? accent : "rgba(255,255,255,0.1)"}`,
              borderRadius: 10,
              padding: "8px 36px 8px 12px",
              color: activeDecade !== ALL_KEY ? accent : "rgba(255,255,255,0.7)",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value={ALL_KEY} style={{ background: "#1a1a2e", color: "#e0e0e0" }}>
              🎬 All Decades
            </option>
            {decadeKeys.map((key) => {
              const meta = DECADE_META[key] || { icon: "📌" };
              const ds = decadeStats[key];
              return (
                <option key={key} value={key} style={{ background: "#1a1a2e", color: "#e0e0e0" }}>
                  {meta.icon} {key} ({ds?.completed || 0}/{ds?.total || 0})
                </option>
              );
            })}
          </select>
          <div style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            pointerEvents: "none", fontSize: 11,
            color: activeDecade !== ALL_KEY ? accent : "rgba(255,255,255,0.4)",
          }}>▼</div>
        </div>
      </div>

      {/* ─── Filter + Search ────────────────────────────── */}
      <CommunityFilter value={filter} onChange={onFilterChange} accent={accent} />

      <div style={{ padding: "12px 16px 0" }}>
        <style>{`
          .cs-search-npp-pat::placeholder { color: rgba(255,255,255,0.25); }
          .cs-search-npp-pat:focus { border-color: ${accent}66; outline: none; }
        `}</style>
        <div style={{ position: "relative" }}>
          <input
            className="cs-search-npp-pat"
            type="text"
            placeholder={activeDecade === ALL_KEY
              ? "Search all patron films..."
              : `Search ${activeDecade} films...`}
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
          {searchQuery ? "No matching films" : "No films in this decade yet"}
        </div>
      ) : (
        <div style={{ paddingTop: 12 }}>
          {activeDecade === ALL_KEY ? (
            decadeKeys.map((key) => {
              const meta = DECADE_META[key] || { icon: "📌" };
              const filtered = visibleByDecade?.[key] || [];
              if (filtered.length === 0) return null;
              const ds = decadeStats[key];
              const done = ds && ds.completed === ds.total && ds.total > 0;

              return (
                <div key={key}>
                  <div
                    onClick={() => setActiveDecade(key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "20px 16px 4px",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{meta.icon}</span>
                    <span style={{
                      fontSize: 16, fontWeight: 800, color: "#fff",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      letterSpacing: "0.02em", textTransform: "uppercase",
                    }}>{key}</span>
                    {ds && (
                      <span style={{
                        fontSize: 12, fontWeight: 700,
                        color: done ? "#4ade80" : accent,
                        fontFamily: "'Barlow Condensed', sans-serif",
                        marginLeft: "auto",
                      }}>
                        {ds.completed}/{ds.total}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: "#555" }}>›</span>
                  </div>

                  {filtered.map((s) => (
                    <MiniseriesShelf
                      key={s.id}
                      series={s}
                      progress={progress}
                      onToggle={onToggle}
                      CardComponent={NowPlayingItemCard}
                      hideTitle
                      coverCacheVersion={coverCacheVersion}
                      filter={filter}
                    />
                  ))}

                  <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "8px 16px" }} />
                </div>
              );
            })
          ) : (
            visibleSeries.map((s) => (
              <MiniseriesShelf
                key={s.id}
                series={s}
                progress={progress}
                onToggle={onToggle}
                CardComponent={NowPlayingItemCard}
                hideTitle
                coverCacheVersion={coverCacheVersion}
                filter={filter}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
