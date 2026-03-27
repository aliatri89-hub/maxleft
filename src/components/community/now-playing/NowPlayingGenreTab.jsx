import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useBackGesture } from "../../../hooks/useBackGesture";
import MiniseriesShelf from "../shared/MiniseriesShelf";
import NowPlayingItemCard from "./NowPlayingItemCard";
import { isComingSoon } from "../../../utils/comingSoon";

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
  comic_books:      { label: "Comic Books",    icon: "🦸", order: 0, tint: "#1e3a5f", poster: "https://media.themoviedb.org/t/p/w440_and_h660_face/8ZFcbZjIdFngvmjAeXbjZeLp6ck.jpg", logoPos: "top" },
  horror:           { label: "Horror",         icon: "🔪", order: 1, tint: "#3b1a1a", poster: "https://media.themoviedb.org/t/p/w440_and_h660_face/d62YzdOrC4LfObyb2q1qGVxUvID.jpg", logoPos: "bottom" },
  stephen_king:     { label: "Stephen King",   icon: "📖", order: 2, tint: "#2d1f3d", poster: "https://media.themoviedb.org/t/p/w440_and_h660_face/likvx867SB7dz6hZHpDFEeSxE1c.jpg", logoPos: "bottom" },
  action_spy:       { label: "Action / Spy",   icon: "💥", order: 3, tint: "#3d2a0f", poster: "https://image.tmdb.org/t/p/original/mMJtkhQcWpRLpbKgtkMYV5fCS6R.jpg", logoPos: "top" },
  sci_fi:           { label: "Sci-Fi",         icon: "🚀", order: 4, tint: "#0f2d3d", poster: "https://media.themoviedb.org/t/p/w440_and_h660_face/utz4z2SKNywqbob1XeZwCr8pWav.jpg", logoPos: "bottom" },
  video_games:      { label: "Video Games",    icon: "🎮", order: 5, tint: "#1a2f1a", poster: "https://media.themoviedb.org/t/p/w440_and_h660_face/qy5FtVeAlwNE0kW6lgzvfR3KRVi.jpg", logoPos: "top" },
  directors:        { label: "Directors",      icon: "🎬", order: 6, tint: "#2d2420", poster: "https://media.themoviedb.org/t/p/w440_and_h660_face/zWyVLIqgxipPfBDPQG9mgXIbyn1.jpg", logoPos: "bottom" },
  comedy:           { label: "Comedy",         icon: "😂", order: 7, tint: "#3d3a0f", poster: "https://media.themoviedb.org/t/p/w440_and_h660_face/xAHd8cm4Wy0LTffkoJjhOqOwatF.jpg", logoPos: "bottom" },
  animation_family: { label: "Animation",      icon: "🎨", order: 8, tint: "#1a2d3d", poster: "https://image.tmdb.org/t/p/original/69LkeJCGrYVRRBZLljXdxy9AP8p.jpg", logoPos: "bottom" },
};

const ALL_KEY = "__all__";
const UPCOMING_KEY = "__upcoming__";
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
  pushNav,
  removeNav,
  genreResetRef,
}) {
  const accent = community?.theme_config?.accent || "#e94560";

  const searchRef = useRef(null);
  const [activeGenre, setActiveGenre] = useState(ALL_KEY);
  const [expandedShelves, setExpandedShelves] = useState(new Set());
  const [searchOpen, setSearchOpen] = useState(false);

  // Back gesture: genre detail → grid
  const resetToGrid = useCallback(() => {
    setActiveGenre(ALL_KEY);
    onSearchChange("");
    setSearchOpen(false);
    onFilterChange("all");
  }, [onSearchChange, onFilterChange]);

  const isInDetail = activeGenre !== ALL_KEY || searchOpen;

  useBackGesture("nppGenreDetail", isInDetail, resetToGrid, pushNav, removeNav);

  // Expose reset function to parent for header back button
  useEffect(() => {
    if (genreResetRef) {
      genreResetRef.current = isInDetail ? resetToGrid : null;
    }
    return () => { if (genreResetRef) genreResetRef.current = null; };
  }, [isInDetail, resetToGrid, genreResetRef]);

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
            .filter((i) => isComingSoon(i))
            .sort((a, b) => (b.air_date || "").localeCompare(a.air_date || ""));
        }

        // Search filter — match item title/creator/year OR parent shelf title
        if (isSearching) {
          const shelfMatch = (s.title || "").toLowerCase().includes(q);
          if (!shelfMatch) {
            items = items.filter(
              (i) =>
                i.title.toLowerCase().includes(q) ||
                (i.creator || "").toLowerCase().includes(q) ||
                String(i.year || "").includes(q)
            );
          }
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

  // Genre stats — track miniseries completion (not individual movies)
  // A miniseries is "completed" when every non-upcoming item is logged.
  const genreStats = useMemo(() => {
    const map = {};
    genreKeys.forEach((key) => {
      const seriesList = genreGroups[key] || [];
      let completedSeries = 0;
      seriesList.forEach((s) => {
        const items = (s.items || []).filter((i) => !isComingSoon(i));
        if (items.length > 0 && items.every((i) => progress[i.id])) {
          completedSeries++;
        }
      });
      map[key] = { total: seriesList.length, completed: completedSeries };
    });
    return map;
  }, [genreKeys, genreGroups, progress]);

  // ── Flat upcoming schedule (all items sorted by air_date) ───
  const upcomingSchedule = useMemo(() => {
    const all = filmSeries.flatMap((s) =>
      (s.items || []).filter((i) => isComingSoon(i)).map((i) => ({ ...i, _shelfTitle: s.title }))
    );
    const seen = new Set();
    const deduped = all.filter((i) => {
      const key = `${i.title}::${i.year || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return deduped.sort((a, b) => (a.air_date || "").localeCompare(b.air_date || ""));
  }, [filmSeries]);

  // ── Render helpers ─────────────────────────────────────────

  // Dynamic shelf (Recently Logged / New Episodes) — no cap, no expand
  // Shows skeleton placeholders while loading to reserve space and prevent pop-in.
  // Skeleton dimensions match ItemCard exactly: 120px wide, 2/3 poster + title row.
  // Fade-in transition avoids jarring swap when data arrives.
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
            // Skeleton cards — exact ItemCard dimensions (120w, 2/3 poster + title)
            Array.from({ length: 6 }).map((_, i) => (
              <div key={`skel-${i}`} style={{ flexShrink: 0, width: 120 }}>
                <div style={{
                  width: 120,
                  aspectRatio: "2/3",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  animation: "skeletonPulse 1.5s ease-in-out infinite",
                  animationDelay: `${i * 0.1}s`,
                }} />
                <div style={{
                  width: 80 + (i % 3) * 12,
                  height: 10,
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.03)",
                  marginTop: 6,
                  animation: "skeletonPulse 1.5s ease-in-out infinite",
                  animationDelay: `${i * 0.1}s`,
                }} />
              </div>
            ))
          ) : (
            items.map((item, i) => (
              <div key={`dyn-${item.id}`} style={{
                flexShrink: 0,
                animation: "shelfFadeIn 0.3s ease-out both",
                animationDelay: `${i * 0.04}s`,
              }}>
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
                <div style={{ fontSize: 12, color: "#bbb", marginTop: 1 }}>
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
              fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.78)",
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>
              +{remaining}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Whether we're in "grid overview" mode (no genre selected, no active search)
  const isGridView = activeGenre === ALL_KEY && !(searchQuery || "").trim() && !searchOpen;

  return (
    <div style={{ padding: "0 0 100px", overflow: "hidden" }}>
      <style>{`
        .cs-search-npp::placeholder { color: rgba(255,255,255,0.78); }
        .cs-search-npp:focus { border-color: ${accent}66; outline: none; }
        @keyframes genreTileFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {isGridView ? (
        /* ═══════════════════════════════════════════════════════
           GRID VIEW — Genre poster tiles
           ═══════════════════════════════════════════════════════ */
        <>
          {/* Search toggle — right-aligned, minimal */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "flex-end",
            padding: "8px 16px 0",
          }}>
            <button
              onClick={() => {
                setSearchOpen(true);
              }}
              style={{
                width: 30, height: 30,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="2" strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </div>

          {/* 3×3 Genre poster grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 3,
            padding: "8px 3px 0",
          }}>
            {genreKeys.map((key, i) => {
              const meta = GENRE_META[key] || { label: key, icon: "📌", tint: "#1a1a2e" };
              const gs = genreStats[key];
              return (
                <GenreGridTile
                  key={key}
                  label={meta.label}
                  icon={meta.icon}
                  tint={meta.tint || "#1a1a2e"}
                  poster={meta.poster}
                  logoPos={meta.logoPos || "bottom"}
                  accent={accent}
                  delay={i * 0.03}
                  onTap={() => setActiveGenre(key)}
                />
              );
            })}
            {/* Upcoming tile — last spot */}
            {upcomingSchedule.length > 0 && (
              <GenreGridTile
                label="Coming Soon"
                icon="📅"
                tint="#1a2a1a"
                logoPos="bottom"
                accent="rgba(250,204,21,0.8)"
                delay={genreKeys.length * 0.03}
                onTap={() => setActiveGenre(UPCOMING_KEY)}
              />
            )}
          </div>
        </>
      ) : (
        /* ═══════════════════════════════════════════════════════
           DETAIL VIEW — Inside a genre (or searching all)
           ═══════════════════════════════════════════════════════ */
        <>
          {/* ─── Genre header + Filter + Search row ────────── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px 4px",
            flexWrap: "nowrap",
          }}>
            {/* Back to grid */}
            <button
              onClick={() => {
                setActiveGenre(ALL_KEY);
                onSearchChange("");
                setSearchOpen(false);
                onFilterChange("all");
              }}
              style={{
                background: "none", border: "none", color: accent,
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                padding: "4px 6px 4px 0",
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: "0.02em",
                flexShrink: 0,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              ←
            </button>

            {/* Genre label or "All" for search mode */}
            {activeGenre !== ALL_KEY && activeGenre !== UPCOMING_KEY && (
              <div style={{
                display: "flex", alignItems: "center", gap: 4,
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 14 }}>{GENRE_META[activeGenre]?.icon || "📌"}</span>
                <span style={{
                  fontSize: 13, fontWeight: 800, color: "#fff",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  letterSpacing: "0.02em", textTransform: "uppercase",
                }}>
                  {GENRE_META[activeGenre]?.label || activeGenre}
                </span>
              </div>
            )}
            {activeGenre === UPCOMING_KEY && (
              <div style={{
                display: "flex", alignItems: "center", gap: 4,
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 14 }}>📅</span>
                <span style={{
                  fontSize: 13, fontWeight: 800, color: "rgba(250,204,21,0.8)",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  letterSpacing: "0.02em", textTransform: "uppercase",
                }}>
                  Coming Soon ({upcomingSchedule.length})
                </span>
              </div>
            )}

            {/* Filter pills — inline (hidden for upcoming view) */}
            {activeGenre !== UPCOMING_KEY && ["all", "seen", "unseen"].map((f) => (
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
                {f}
              </button>
            ))}

            {/* Search toggle — pushed right (hidden for upcoming view) */}
            {activeGenre !== UPCOMING_KEY && (
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
            )}
          </div>

          {/* ─── Expandable search input (hidden for upcoming) ── */}
          {activeGenre !== UPCOMING_KEY && (
          <div style={{
            overflow: "hidden",
            maxHeight: searchOpen ? 50 : 0,
            opacity: searchOpen ? 1 : 0,
            transition: "max-height 0.25s ease, opacity 0.2s ease",
            padding: searchOpen ? "6px 16px 0" : "0 16px",
          }}>
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
                fontSize: 13, color: "rgba(255,255,255,0.78)", pointerEvents: "none",
              }}>🔍</div>
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  style={{
                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                    background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%",
                    width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#bbb", fontSize: 11, cursor: "pointer",
                  }}
                >✕</button>
              )}
            </div>
          </div>
          )}

          {/* ─── Genre progress header (inside a genre, not upcoming) ── */}
          {activeGenre !== ALL_KEY && activeGenre !== UPCOMING_KEY && (() => {
            const gs = genreStats[activeGenre];
            if (!gs) return null;
            const gPct = gs.total > 0 ? Math.round((gs.completed / gs.total) * 100) : 0;
            const gDone = gPct === 100 && gs.total > 0;
            return (
              <div style={{ padding: "6px 16px 2px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: gDone ? "#4ade80" : accent,
                    fontFamily: "'Barlow Condensed', sans-serif",
                  }}>
                    {gs.completed}/{gs.total} series
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "'Barlow Condensed', sans-serif",
                  }}>
                    {gPct}%
                  </span>
                </div>
                <div style={{
                  height: 3, borderRadius: 2,
                  background: "rgba(255,255,255,0.08)",
                  overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    width: `${gPct}%`,
                    background: gDone
                      ? "linear-gradient(90deg, #4ade80, #22d3ee)"
                      : `linear-gradient(90deg, ${accent}, #C4734F)`,
                    transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  }} />
                </div>
              </div>
            );
          })()}

          {/* ─── Content ─────────────────────────────────── */}
          {activeGenre === UPCOMING_KEY ? (
            /* Upcoming schedule — vertical grid with date labels */
            upcomingSchedule.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "40px 0",
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13,
                color: "rgba(255,255,255,0.78)", fontStyle: "italic",
              }}>No upcoming items</div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
                padding: "14px 10px 100px",
              }}>
                {upcomingSchedule.map((item, i) => (
                  <div key={item.id} style={{ overflow: "hidden" }}>
                    <NowPlayingItemCard
                      item={item}
                      isCompleted={!!progress[item.id]?.status}
                      onToggle={() => onToggle?.(item.id)}
                      coverCacheVersion={coverCacheVersion}
                    />
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: "rgba(250,204,21,0.7)",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      letterSpacing: "0.04em", textTransform: "uppercase",
                      marginTop: 4,
                    }}>
                      {new Date(item.air_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                    <div style={{
                      fontSize: 9, color: "#aaa", marginTop: 1,
                      fontFamily: "'Barlow Condensed', sans-serif",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {item._shelfTitle}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : filter === "upcoming" ? (
            /* Flat date-sorted schedule for upcoming */
            upcomingSchedule.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "40px 0",
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13,
                color: "rgba(255,255,255,0.78)", fontStyle: "italic",
              }}>No upcoming items</div>
            ) : (
              <div style={{ padding: "16px 0", overflow: "hidden" }}>
                <div className="hide-scrollbar" style={{
                  display: "flex", overflowX: "auto", gap: 12,
                  paddingLeft: 16, paddingRight: 16,
                }}>
                  {upcomingSchedule.map((item) => {
                    const Card = NowPlayingItemCard;
                    return (
                      <div key={item.id} style={{ flexShrink: 0, width: 120 }}>
                        <Card
                          item={item}
                          isCompleted={!!progress[item.id]?.status}
                          onToggle={() => onToggle?.(item)}
                          coverCacheVersion={coverCacheVersion}
                        />
                        <div style={{
                          fontSize: 10, fontWeight: 700, color: "rgba(250,204,21,0.7)",
                          fontFamily: "'Barlow Condensed', sans-serif",
                          letterSpacing: "0.04em", textTransform: "uppercase",
                          marginTop: 4,
                        }}>
                          {new Date(item.air_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </div>
                        <div style={{
                          fontSize: 9, color: "#aaa", marginTop: 1,
                          fontFamily: "'Barlow Condensed', sans-serif",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {item._shelfTitle}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : visibleSeries.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "40px 0",
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13,
              color: "rgba(255,255,255,0.78)", fontStyle: "italic",
            }}>
              {searchQuery ? "No matching results" : mediaFilter ? "No items match this filter" : "No series in this genre yet"}
            </div>
          ) : (
            <div style={{ paddingTop: 12 }}>
              {visibleSeries.map((s) => renderCatalogueShelf(s))}
            </div>
          )}
        </>
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
          fontSize: 9, color: "rgba(255,255,255,0.72)",
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.05em", textTransform: "uppercase",
          marginTop: 2,
        }}>seen</div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   GenreGridTile — Visual tile for a genre in the 3×3 grid
   ═══════════════════════════════════════════════════════════════ */

function GenreGridTile({ label, icon, tint, poster, logoPos = "bottom", accent, delay = 0, onTap }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const isTop = logoPos === "top";

  return (
    <div
      onClick={onTap}
      style={{
        position: "relative",
        aspectRatio: "2/3",
        cursor: "pointer",
        overflow: "hidden",
        WebkitTapHighlightColor: "transparent",
        background: `linear-gradient(145deg, ${tint}, #0f0d0b)`,
        animation: `genreTileFadeIn 0.25s ease-out ${delay}s both`,
      }}
    >
      {/* Poster image */}
      {poster ? (
        <img
          src={poster}
          alt={label}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            opacity: imgLoaded ? 1 : 0,
            transition: "opacity 0.3s",
          }}
        />
      ) : (
        /* Fallback: emoji */
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 24,
        }}>
          <span style={{
            fontSize: 48,
            opacity: 0.55,
            filter: "saturate(0.8)",
          }}>{icon}</span>
        </div>
      )}

      {/* Shimmer while loading */}
      {poster && !imgLoaded && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(255,255,255,0.03)",
        }} />
      )}

      {/* NPP filmstrip logo */}
      <img
        src="https://api.mymantl.app/storage/v1/object/public/banners/NPPLogo.png"
        alt=""
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          width: "80%",
          objectFit: "contain",
          opacity: 0.85,
          pointerEvents: "none",
          ...(isTop
            ? { top: "8%" }
            : { bottom: "8%" }),
        }}
      />

      {/* Center overlay for text readability */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 100%)",
        pointerEvents: "none",
      }} />

      {/* Centered genre label */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}>
        <div style={{
          fontSize: 20, fontWeight: 900, color: "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
          lineHeight: 1.1,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          textShadow: "0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)",
          textAlign: "center",
          padding: "0 10px",
        }}>
          {label}
        </div>
      </div>
    </div>
  );
}
