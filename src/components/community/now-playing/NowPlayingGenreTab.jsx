import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import MiniseriesShelf from "../shared/MiniseriesShelf";
import NowPlayingItemCard from "./NowPlayingItemCard";

/**
 * NowPlayingGenreTab — Genre-bucketed filmography for ~1000 movies.
 * Groups community_miniseries by genre_bucket with pill navigation.
 *
 * Props:
 *   community      – community_pages row
 *   session        – auth session
 *   progress       – { itemId: progressData }
 *   miniseries     – full miniseries array from useCommunityPage
 *   onToggle       – item tap handler
 *   coverCacheVersion – cover cache object
 *   searchQuery    – current search string
 *   onSearchChange – search setter
 */

const GENRE_META = {
  comic_books:      { label: "Comic Books",    icon: "🦸", order: 0 },
  horror:           { label: "Horror",         icon: "🔪", order: 1 },
  stephen_king:     { label: "Stephen King",   icon: "📖", order: 2 },
  action_spy:       { label: "Action / Spy",   icon: "💥", order: 3 },
  sci_fi:           { label: "Sci-Fi",         icon: "🚀", order: 4 },
  video_games:      { label: "Video Games",    icon: "🎮", order: 5 },
  directors:        { label: "Directors",      icon: "🎬", order: 6 },
  comedy:           { label: "Comedy",         icon: "😂", order: 7 },
  animation_family: { label: "Animation",      icon: "🎨", order: 8 },
};

const ALL_KEY = "__all__";
const MEDIA_COLORS = { film: "#e94560", book: "#f59e0b", game: "#3b82f6" };

export default function NowPlayingGenreTab({
  community,
  session,
  progress = {},
  miniseries = [],
  onToggle,
  onToggleCommentary,
  coverCacheVersion,
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  recentItems = [],
  recentEpisodeItems = [],
  progressLoading = false,
  episodesLoading = false,
  upcomingCount = 0,
}) {
  const accent = community?.theme_config?.accent || "#e94560";

  const searchRef = useRef(null);
  const [activeGenre, setActiveGenre] = useState(ALL_KEY);
  const [expandedShelves, setExpandedShelves] = useState(new Set());
  const [searchOpen, setSearchOpen] = useState(false);

  // Focus search input only when user explicitly opens search (not on tab mount)
  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  const SHELF_CAP = 10;

  const toggleShelfExpand = useCallback((shelfId) => {
    setExpandedShelves((prev) => {
      const next = new Set(prev);
      if (next.has(shelfId)) next.delete(shelfId);
      else next.add(shelfId);
      return next;
    });
  }, []);

  // Media filter: null = all, "solo:film" = only films, "hide:film" = no films, etc.
  const [mediaFilter, setMediaFilter] = useState(null);

  const cycleMedia = useCallback((type) => {
    setMediaFilter((prev) => {
      if (!prev) return `solo:${type}`;
      if (prev === `solo:${type}`) return `hide:${type}`;
      if (prev === `hide:${type}`) return null;
      return `solo:${type}`; // different type was active, switch
    });
  }, []);

  const isMediaVisible = useCallback((mediaType) => {
    if (!mediaFilter) return true;
    const [mode, type] = mediaFilter.split(":");
    if (mode === "solo") return (mediaType || "film") === type;
    if (mode === "hide") return (mediaType || "film") !== type;
    return true;
  }, [mediaFilter]);

  const mediaState = useCallback((type) => {
    if (!mediaFilter) return "all";
    if (mediaFilter === `solo:${type}`) return "solo";
    if (mediaFilter === `hide:${type}`) return "hide";
    // Another type is active
    const [mode, activeType] = mediaFilter.split(":");
    if (mode === "solo" && activeType !== type) return "dimmed";
    if (mode === "hide" && activeType !== type) return "all";
    return "all";
  }, [mediaFilter]);

  // Only filmography-tab series
  const filmSeries = useMemo(
    () => miniseries.filter((s) => !s.tab_key || s.tab_key === "filmography"),
    [miniseries]
  );

  // Group by genre_bucket
  const genreGroups = useMemo(() => {
    const groups = {};
    filmSeries.forEach((s) => {
      const bucket = s.genre_bucket || "uncategorized";
      if (!groups[bucket]) groups[bucket] = [];
      groups[bucket].push(s);
    });
    return groups;
  }, [filmSeries]);

  // Sorted genre keys
  const genreKeys = useMemo(() => {
    return Object.keys(genreGroups).sort((a, b) => {
      const oa = GENRE_META[a]?.order ?? 99;
      const ob = GENRE_META[b]?.order ?? 99;
      return oa - ob;
    });
  }, [genreGroups]);

  // Visible series based on active genre + search + media filter + seen/unseen + within-series dedup
  const visibleSeries = useMemo(() => {
    const pool = activeGenre === ALL_KEY ? filmSeries : (genreGroups[activeGenre] || []);
    const q = (searchQuery || "").trim().toLowerCase();
    const isSearching = q.length >= 2;

    return pool
      .map((s) => {
        let items = s.items || [];

        // Media type filter
        items = items.filter((i) => isMediaVisible(i.media_type));

        // Seen/unseen/upcoming filter (apply here so empty series are pruned)
        if (filter === "seen") {
          items = items.filter((i) => progress[i.id]);
        } else if (filter === "unseen") {
          items = items.filter((i) => !progress[i.id]);
        } else if (filter === "upcoming") {
          items = items
            .filter((i) => i.extra_data?.coming_soon)
            .sort((a, b) => (b.air_date || "").localeCompare(a.air_date || ""));
        }

        // Search filter
        if (isSearching) {
          items = items.filter(
            (i) =>
              i.title.toLowerCase().includes(q) ||
              (i.creator || "").toLowerCase().includes(q) ||
              String(i.year || "").includes(q)
          );
        }

        // Dedup within this series only (same title+year in one row)
        const seen = new Set();
        items = items.filter((i) => {
          const key = `${i.title}::${i.year || ""}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (items.length === 0) return null;
        return { ...s, items };
      })
      .filter(Boolean);
  }, [activeGenre, filmSeries, genreGroups, searchQuery, isMediaVisible, filter, progress]);

  // Stats
  // Stats broken down by media type (Blank Check donut style)
  const stats = useMemo(() => {
    const pool = activeGenre === ALL_KEY ? filmSeries : (genreGroups[activeGenre] || []);
    const allItems = pool.flatMap((s) => s.items || []);

    // Dedup per media type
    const byType = { film: { total: 0, completed: 0 }, book: { total: 0, completed: 0 }, game: { total: 0, completed: 0 } };
    const seen = { film: new Set(), book: new Set(), game: new Set() };

    allItems.forEach((i) => {
      const type = i.media_type || "film";
      const key = `${i.title}::${i.year || ""}`;
      if (!seen[type]) return;
      if (seen[type].has(key)) return;
      seen[type].add(key);
      byType[type].total++;
      if (progress[i.id]) byType[type].completed++;
    });

    // Overall percentage — film-only (primary tracking metric)
    const overallPct = byType.film.total > 0 ? Math.round((byType.film.completed / byType.film.total) * 100) : 0;

    return { byType, overallPct };
  }, [activeGenre, filmSeries, genreGroups, progress]);

  // Genre pill stats (for badge counts)
  const genreStats = useMemo(() => {
    const map = {};
    genreKeys.forEach((key) => {
      const seen = new Set();
      const items = (genreGroups[key] || []).flatMap((s) => s.items || []).filter((i) => {
        const k = `${i.title}::${i.year || ""}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      const completed = items.filter((i) => progress[i.id]).length;
      map[key] = { total: items.length, completed };
    });
    return map;
  }, [genreKeys, genreGroups, progress]);

  // ── Render helpers ─────────────────────────────────────────

  // Dynamic shelf (Recently Logged / New Episodes) — no cap, no expand
  // Shows skeleton placeholders while loading to reserve space and prevent pop-in
  const renderDynamicShelf = (title, icon, items, isLoading) => {
    if (!isLoading && (!items || items.length === 0)) return null;

    return (
      <div style={{ marginBottom: 4, paddingTop: 8, overflow: "hidden" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "0 16px", marginBottom: 8,
        }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span style={{
            fontSize: 14, fontWeight: 700, color: "#ffffffcc",
            fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 0.3,
          }}>{title}</span>
        </div>
        <div className="hide-scrollbar" style={{
          display: "flex", overflowX: "auto", gap: 10,
          paddingLeft: 16, paddingRight: 16,
        }}>
          {isLoading ? (
            // Skeleton cards — match ItemCard dimensions, reserve space
            Array.from({ length: 6 }).map((_, i) => (
              <div key={`skel-${i}`} style={{
                flexShrink: 0,
                width: 110,
                height: 165,
                borderRadius: 8,
                background: "rgba(255,255,255,0.04)",
                animation: "skeletonPulse 1.5s ease-in-out infinite",
              }} />
            ))
          ) : (
            items.map((item) => (
              <div key={`dyn-${item.id}`} style={{ flexShrink: 0 }}>
                <NowPlayingItemCard
                  item={item}
                  isCompleted={!!progress[item.id]}
                  userRating={progress[item.id]?.rating || null}
                  brownArrow={progress[item.id]?.brown_arrow || false}
                  onToggle={() => onToggle(item.id)}
                  coverCacheVersion={coverCacheVersion}
                />
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Catalogue shelf — capped at 10 with + card, or full via MiniseriesShelf
  const renderCatalogueShelf = (s) => {
    const needsCap = s.items && s.items.length > SHELF_CAP && !expandedShelves.has(s.id);

    if (!needsCap) {
      return (
        <MiniseriesShelf
          key={s.id}
          series={s}
          progress={progress}
          onToggle={onToggle}
          CardComponent={NowPlayingItemCard}
          coverCacheVersion={coverCacheVersion}
          filter={filter}
        />
      );
    }

    // Capped: render inline with + card at end of scroll
    const cappedItems = s.items.slice(0, SHELF_CAP);
    const remaining = s.items.length - SHELF_CAP;
    const allCompleted = s.items.filter((i) => progress[i.id]).length;
    const allTotal = s.items.length;
    const allPct = allTotal > 0 ? Math.round((allCompleted / allTotal) * 100) : 0;

    return (
      <div key={s.id} style={{ marginBottom: 12, overflow: "hidden" }}>
        {/* Shelf header with progress */}
        <div style={{ padding: "0 16px", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            {s.director_emoji && <span style={{ fontSize: 20 }}>{s.director_emoji}</span>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 15, fontWeight: 700, color: "#fff",
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: "0.02em",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {s.title}
              </div>
              {((s.director_name && s.director_name !== ".") || s.episode_range) && (
                <div style={{ fontSize: 12, color: "#888", marginTop: 1 }}>
                  {[s.director_name !== "." && s.director_name, s.episode_range].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
            <div style={{
              fontSize: 13, fontWeight: 700,
              color: allPct === 100 ? "#4ade80" : "#e94560",
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>
              {allCompleted}/{allTotal}
            </div>
          </div>

          {/* Progress bar */}
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
        </div>
        {/* Horizontal scroll with + card */}
        <div className="hide-scrollbar" style={{
          display: "flex", overflowX: "auto", gap: 10,
          paddingLeft: 16, paddingRight: 16,
        }}>
          {cappedItems.map((item) => (
            <div key={item.id} style={{ flexShrink: 0 }}>
              <NowPlayingItemCard
                item={item}
                isCompleted={!!progress[item.id]}
                userRating={progress[item.id]?.rating || null}
                brownArrow={progress[item.id]?.brown_arrow || false}
                onToggle={() => onToggle(item.id)}
                coverCacheVersion={coverCacheVersion}
              />
            </div>
          ))}
          {/* + expand card */}
          <div
            onClick={() => toggleShelfExpand(s.id)}
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
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "0 0 100px", overflow: "hidden" }}>
      {/* ─── Genre + Filter + Search — single row ────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 16px 4px",
        flexWrap: "nowrap",
      }}>
        {/* Genre dropdown — compact */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <select
            value={activeGenre}
            onChange={(e) => setActiveGenre(e.target.value)}
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              background: activeGenre !== ALL_KEY ? `${accent}20` : "rgba(255,255,255,0.06)",
              border: `1.5px solid ${activeGenre !== ALL_KEY ? accent : "rgba(255,255,255,0.1)"}`,
              borderRadius: 20,
              padding: "5px 26px 5px 10px",
              color: activeGenre !== ALL_KEY ? accent : "rgba(255,255,255,0.6)",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              cursor: "pointer",
              outline: "none",
              transition: "all 0.2s",
              maxWidth: 140,
            }}
          >
            <option value={ALL_KEY} style={{ background: "#1a1a2e", color: "#e0e0e0" }}>All Genres</option>
            {genreKeys.map((key) => {
              const meta = GENRE_META[key] || { label: key, icon: "📌" };
              const gs = genreStats[key];
              return (
                <option key={key} value={key} style={{ background: "#1a1a2e", color: "#e0e0e0" }}>
                  {meta.icon} {meta.label} ({gs?.completed || 0}/{gs?.total || 0})
                </option>
              );
            })}
          </select>
          <div style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            pointerEvents: "none",
            fontSize: 9, color: activeGenre !== ALL_KEY ? accent : "rgba(255,255,255,0.3)",
          }}>▼</div>
        </div>

        {/* Filter pills — inline */}
        {["all", "seen", "unseen", ...(upcomingCount > 0 ? ["upcoming"] : [])].map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            style={{
              padding: "5px 10px",
              fontSize: 10, fontWeight: 600,
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              borderRadius: 20,
              border: filter === f
                ? `1.5px solid ${accent}`
                : "1px solid rgba(255,255,255,0.1)",
              background: filter === f ? `${accent}18` : "rgba(255,255,255,0.04)",
              color: filter === f ? accent : "rgba(255,255,255,0.4)",
              cursor: "pointer",
              flexShrink: 0,
              WebkitTapHighlightColor: "transparent",
              transition: "all 0.2s",
            }}
          >
            {f}{f === "upcoming" ? ` (${upcomingCount})` : ""}
          </button>
        ))}

        {/* Search toggle — pushed right */}
        <button
          onClick={() => {
            setSearchOpen((o) => {
              if (o && searchQuery) onSearchChange("");
              return !o;
            });
          }}
          style={{
            width: 30, height: 30,
            borderRadius: "50%",
            border: searchOpen ? `1.5px solid ${accent}` : "1px solid rgba(255,255,255,0.1)",
            background: searchOpen ? `${accent}18` : "rgba(255,255,255,0.04)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", marginLeft: "auto", flexShrink: 0,
            WebkitTapHighlightColor: "transparent",
            transition: "all 0.2s",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke={searchOpen ? accent : "rgba(255,255,255,0.4)"}
            strokeWidth="2" strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </div>

      {/* ─── Expandable search input ────────────────────── */}
      <div style={{
        overflow: "hidden",
        maxHeight: searchOpen ? 50 : 0,
        opacity: searchOpen ? 1 : 0,
        transition: "max-height 0.25s ease, opacity 0.2s ease",
        padding: searchOpen ? "6px 16px 0" : "0 16px",
      }}>
        <style>{`
          .cs-search-npp::placeholder { color: rgba(255,255,255,0.25); }
          .cs-search-npp:focus { border-color: ${accent}66; outline: none; }
        `}</style>
        <div style={{ position: "relative" }}>
          <input
            ref={searchRef}
            className="cs-search-npp"
            type="text"
            placeholder={activeGenre === ALL_KEY
              ? "Search all films, directors, years..."
              : `Search ${GENRE_META[activeGenre]?.label || "genre"}...`}
            value={searchQuery || ""}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 14px 8px 32px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              color: "#e0e0e0",
              fontSize: 13,
              fontFamily: "inherit",
              WebkitAppearance: "none",
            }}
          />
          <div style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            fontSize: 13, color: "rgba(255,255,255,0.25)", pointerEvents: "none",
          }}>🔍</div>
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%",
                width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
                color: "#888", fontSize: 11, cursor: "pointer",
              }}
            >✕</button>
          )}
        </div>
      </div>

      {/* ─── Dynamic shelves (All Genres + no active search + no filter) ── */}
      {activeGenre === ALL_KEY && !searchQuery && filter === "all" && renderDynamicShelf("Recently Logged", "🕐", recentItems, progressLoading)}
      {activeGenre === ALL_KEY && !searchQuery && filter === "all" && renderDynamicShelf("New Episodes", "🎙️", recentEpisodeItems.map((r) => r.item), episodesLoading)}

      {/* ─── Series shelves ─────────────────────────────── */}
      {visibleSeries.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "40px 0",
          fontFamily: "'Lora', serif", fontSize: 13,
          color: "rgba(255,255,255,0.25)", fontStyle: "italic",
        }}>
          {searchQuery ? "No matching results" : mediaFilter ? "No items match this filter" : "No series in this genre yet"}
        </div>
      ) : (
        <div style={{ paddingTop: 12 }}>
          {/* Genre section headers when showing all */}
          {activeGenre === ALL_KEY ? (
            genreKeys.map((key) => {
              const meta = GENRE_META[key] || { label: key, icon: "📌" };
              const series = genreGroups[key] || [];
              const q = (searchQuery || "").trim().toLowerCase();

              const filtered = series
                .map((s) => {
                  let items = s.items || [];

                  // Media type filter
                  items = items.filter((i) => isMediaVisible(i.media_type));

                  // Seen/unseen/upcoming filter
                  if (filter === "seen") {
                    items = items.filter((i) => progress[i.id]);
                  } else if (filter === "unseen") {
                    items = items.filter((i) => !progress[i.id]);
                  } else if (filter === "upcoming") {
                    items = items
                      .filter((i) => i.extra_data?.coming_soon)
                      .sort((a, b) => (b.air_date || "").localeCompare(a.air_date || ""));
                  }

                  if (q.length >= 2) {
                    items = items.filter(
                      (i) =>
                        i.title.toLowerCase().includes(q) ||
                        (i.creator || "").toLowerCase().includes(q) ||
                        String(i.year || "").includes(q)
                    );
                  }

                  // Dedup within this series only
                  const seen = new Set();
                  items = items.filter((i) => {
                    const dedupKey = `${i.title}::${i.year || ""}`;
                    if (seen.has(dedupKey)) return false;
                    seen.add(dedupKey);
                    return true;
                  });

                  if (items.length === 0) return null;
                  return { ...s, items };
                })
                .filter(Boolean);

              if (filtered.length === 0) return null;

                const gs = genreStats[key];
                const done = gs && gs.completed === gs.total && gs.total > 0;

                return (
                  <div key={key}>
                    {/* Genre header */}
                    <div
                      onClick={() => setActiveGenre(key)}
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
                      }}>
                        {meta.label}
                      </span>
                      {gs && (
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          color: done ? "#4ade80" : accent,
                          fontFamily: "'Barlow Condensed', sans-serif",
                          marginLeft: "auto",
                        }}>
                          {gs.completed}/{gs.total}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: "#555" }}>›</span>
                    </div>

                    {filtered.map((s) => renderCatalogueShelf(s))}

                    <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "8px 16px" }} />
                  </div>
                );
            })
          ) : (
            visibleSeries.map((s) => renderCatalogueShelf(s))
          )}
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   GenrePill — scrollable filter chip
   ═══════════════════════════════════════════════════════════════ */

function GenrePill({ label, icon, isActive, accent, isComplete, count, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
        padding: "6px 4px",
        background: isActive
          ? `${accent}25`
          : isComplete
            ? "rgba(74,222,128,0.08)"
            : "rgba(255,255,255,0.04)",
        border: isActive
          ? `1.5px solid ${accent}`
          : isComplete
            ? "1.5px solid rgba(74,222,128,0.25)"
            : "1.5px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        cursor: "pointer",
        width: "100%",
        minWidth: 0,
        transition: "all 0.2s",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <span style={{ fontSize: 12, flexShrink: 0 }}>{icon}</span>
      <span style={{
        fontSize: 10, fontWeight: 700,
        color: isActive ? accent : isComplete ? "#4ade80" : "rgba(255,255,255,0.5)",
        fontFamily: "'Barlow Condensed', sans-serif",
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        minWidth: 0,
      }}>
        {label}
      </span>
      {count != null && (
        <span style={{
          fontSize: 9, fontWeight: 600,
          color: isActive ? accent : "rgba(255,255,255,0.25)",
          flexShrink: 0,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}


/* ═══════════════════════════════════════════════════════════════
   MediaStatRow — clickable, 3-state media filter row
   States: "all" (normal), "solo" (highlighted), "hide" (struck), "dimmed"
   ═══════════════════════════════════════════════════════════════ */

function MediaStatRow({ color, label, completed, total, state, onClick }) {
  const isHidden = state === "hide";
  const isDimmed = state === "dimmed";
  const isSolo = state === "solo";

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        cursor: "pointer",
        padding: "3px 0",
        opacity: isHidden ? 0.25 : isDimmed ? 0.35 : 1,
        transition: "opacity 0.2s",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div style={{
        width: 10, height: 10, borderRadius: "50%",
        background: isHidden ? "rgba(255,255,255,0.2)" : color,
        flexShrink: 0,
        boxShadow: isSolo ? `0 0 8px ${color}80` : `0 0 4px ${color}40`,
        transition: "all 0.2s",
      }} />
      <span style={{
        fontSize: 13, fontWeight: 600,
        color: isHidden ? "rgba(255,255,255,0.3)" : isSolo ? "#fff" : "rgba(255,255,255,0.5)",
        fontFamily: "'Barlow Condensed', sans-serif",
        letterSpacing: "0.02em",
        textDecoration: isHidden ? "line-through" : "none",
        transition: "all 0.2s",
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 14, fontWeight: 800,
        color: isHidden ? "rgba(255,255,255,0.2)" : "#fff",
        fontFamily: "'Barlow Condensed', sans-serif",
        marginLeft: "auto",
        transition: "color 0.2s",
      }}>
        {completed}/{total}
      </span>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   MultiRing — concentric progress rings (Blank Check style)
   rings: [{ pct, color, state }] — outer to inner
   ═══════════════════════════════════════════════════════════════ */

function MultiRing({ size = 90, strokeWidth = 5, rings = [], centerPct = 0 }) {
  const cx = size / 2;
  const cy = size / 2;
  const gap = strokeWidth + 3; // space between rings

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map((ring, idx) => {
          const r = (size - strokeWidth) / 2 - 2 - (idx * gap);
          if (r <= 0) return null;
          const circumference = 2 * Math.PI * r;
          const pct = Math.min(ring.pct || 0, 100);
          const offset = circumference - (pct / 100) * circumference;
          const isComplete = pct >= 100;
          const isHidden = ring.state === "hide";
          const isDimmed = ring.state === "dimmed";
          const color = isComplete ? "#4ade80" : ring.color;
          const trackOpacity = isHidden ? 0.04 : isDimmed ? 0.06 : 0.12;
          const arcOpacity = isHidden ? 0.15 : isDimmed ? 0.25 : 1;

          return (
            <g key={idx}>
              {/* Track */}
              <circle
                cx={cx} cy={cy} r={r} fill="none"
                stroke={ring.color} strokeWidth={strokeWidth}
                opacity={trackOpacity}
                style={{ transition: "opacity 0.3s" }}
              />
              {/* Progress arc */}
              {pct > 0 && (
                <circle
                  cx={cx} cy={cy} r={r} fill="none"
                  stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={offset}
                  transform={`rotate(-90 ${cx} ${cy})`}
                  opacity={arcOpacity}
                  style={{
                    transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s",
                    filter: isComplete && !isHidden ? "drop-shadow(0 0 4px rgba(74,222,128,0.4))" : "none",
                  }}
                />
              )}
            </g>
          );
        })}
      </svg>
      {/* Center percentage */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          fontSize: 20, fontWeight: 800, color: "#fff",
          fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1,
        }}>{centerPct}%</div>
        <div style={{
          fontSize: 9, color: "rgba(255,255,255,0.35)",
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.05em", textTransform: "uppercase",
          marginTop: 2,
        }}>seen</div>
      </div>
    </div>
  );
}
