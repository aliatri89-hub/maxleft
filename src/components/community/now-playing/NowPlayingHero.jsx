import { useMemo, useRef, useState, useEffect } from "react";
import { HeroBanner } from "../primitives";
import { useSlideReveal } from "../../../hooks/useSlideReveal";

/**
 * NowPlayingHero — Hero section for the Now Playing Podcast community page.
 *
 * Tab-aware: adapts stats + banner based on activeTab.
 * - "filmography" (default): Watched / Films
 * - "books": Books Read / Total Books / Pages Read
 * - "arcade": 2 themed arcade cabinets — Hunter (Watched) / Shooter (Beat)
 */

export default function NowPlayingHero({
  community, miniseries, progress, activeTab,
  filter, onFilterChange, searchQuery, onSearchChange,
  upcomingCount = 0,
}) {
  const tabHero = community?.theme_config?.tab_heroes?.[activeTab];
  const heroTagline = tabHero?.tagline ?? community?.tagline;
  const heroDescription = tabHero?.description ?? community?.description;

  const isBooks = activeTab === "books";
  const isArcade = activeTab === "arcade";

  const heroBanner = isBooks
    ? "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/BookAndNachosBanner.jpg"
    : (tabHero?.banner_url ?? community?.banner_url);

  const [searchOpen, setSearchOpen] = useState(false);

  // ── Compute stats based on active tab ──
  const stats = useMemo(() => {
    if (isBooks) {
      let total = 0;
      let completed = 0;
      let pages = 0;
      const seen = new Set();

      miniseries.forEach((s) => {
        if (s.tab_key !== "books") return;
        (s.items || []).forEach((i) => {
          const key = `${i.title}::${i.year || ""}`;
          if (seen.has(key)) return;
          seen.add(key);

          total++;
          const pageCount = i.extra_data?.page_count || 0;

          if (progress[i.id]?.status === "completed" || progress[i.id]?.listened_with_commentary !== undefined) {
            completed++;
            pages += pageCount;
          }
        });
      });

      return { completed, total, pages };
    }

    if (isArcade) {
      let filmWatched = 0;
      let gamesBeat = 0;
      let playingGame = null;
      const seenFilms = new Set();
      const seenGames = new Set();

      miniseries.forEach((s) => {
        (s.items || []).forEach((i) => {
          if (i.media_type === "game") {
            const gk = `game::${i.title}::${i.year || ""}`;
            if (seenGames.has(gk)) return;
            seenGames.add(gk);
            const st = progress[i.id]?.status;
            if (st === "completed") gamesBeat++;
            if (st === "playing" && !playingGame) {
              playingGame = {
                title: i.title,
                bgImage: i.extra_data?.bg_image || null,
                year: i.year,
              };
            }
          } else {
            const fk = `film::${i.title}::${i.year || ""}`;
            if (seenFilms.has(fk)) return;
            seenFilms.add(fk);
            if (progress[i.id]) filmWatched++;
          }
        });
      });

      return { completed: filmWatched, total: seenFilms.size + seenGames.size, pages: 0, gamesBeat, gamesTotal: seenGames.size, filmsTotal: seenFilms.size, playingGame };
    }

    // Default: film stats
    let completed = 0;
    let total = 0;
    miniseries.forEach((s) => {
      const items = (s.items || []).filter((i) => i.media_type === "film" || !i.media_type);
      total += items.length;
      completed += items.filter((i) => progress[i.id]).length;
    });
    return { completed, total, pages: 0 };
  }, [miniseries, progress, isBooks, isArcade]);

  // ── Slide-up reveal for watched count ──
  const watchedRevealed = useSlideReveal(stats.completed);

  // ── Pop animation on count change ──
  const prevCount = useRef(stats.completed);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (stats.completed !== prevCount.current && prevCount.current !== 0) {
      setPop(true);
      const t = setTimeout(() => setPop(false), 400);
      return () => clearTimeout(t);
    }
    prevCount.current = stats.completed;
  }, [stats.completed]);

  useEffect(() => {
    prevCount.current = stats.completed;
  }, [stats.completed]);

  // ── Accent color per tab ──
  const accent = isBooks ? "#d4a574" : isArcade ? "#00ffc8" : "#facc15";

  // ── Format pages nicely ──
  const formatPages = (n) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
    return String(n);
  };

  return (
    <div style={{
      position: "relative",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes statPop {
          0% { transform: scale(1); }
          30% { transform: scale(1.25); }
          60% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        @keyframes screenFlicker {
          0%, 100% { opacity: 1; }
          92% { opacity: 1; }
          93% { opacity: 0.82; }
          94% { opacity: 1; }
          97% { opacity: 0.9; }
          98% { opacity: 1; }
        }
        @keyframes marqueeGlow {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Banner — all tabs use HeroBanner now */}
      <HeroBanner
        bannerUrl={isArcade
          ? "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/BannerNowPlayingArcade.jpg"
          : heroBanner}
        contain={isBooks ? false : (isArcade ? false : tabHero?.banner_contain)}
        position={isBooks ? "center center" : (isArcade ? "center center" : tabHero?.banner_position)}
        opacity={isBooks ? 0.2 : (isArcade ? 0.3 : tabHero?.banner_opacity)}
        gradientStrength={isBooks ? 0.9 : (isArcade ? 0.85 : tabHero?.gradient_strength)}
      />

      <div style={{ position: "relative", zIndex: 1, padding: "24px 16px 20px" }}>
        {/* Title + tagline */}
        <div style={{
          fontSize: 28, fontWeight: 800, color: "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.03em", textTransform: "uppercase",
          textAlign: "center", marginBottom: 4, lineHeight: 1.1,
        }}>
          {isArcade ? "Now Playing Arcade" : isBooks ? "Books & Nachos" : (heroTagline || community?.name || "Now Playing")}
        </div>
        <div style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.5)",
          textAlign: "center",
          maxWidth: 300, margin: "0 auto 14px", whiteSpace: "pre-line",
        }}>
          {isArcade ? "The Boll and the Beautiful" : isBooks ? "Source novels, tie-ins, and novelisations from the Now Playing universe" : heroDescription}
        </div>

        {/* ═══ STATS ═══ */}
        {isArcade ? (
          <div>
            {/* Clean stats */}
            <div style={{
              display: "flex", justifyContent: "center", gap: 24, marginBottom: 14,
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: 30, fontWeight: 800, color: "#00ffc8",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  animation: pop ? "statPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" : "none",
                  filter: pop ? "drop-shadow(0 0 8px rgba(0,255,200,0.5))" : "none",
                  transition: "filter 0.3s",
                }}>
                  {stats.completed}
                </div>
                <div style={{
                  fontSize: 9, color: "rgba(255,255,255,0.35)",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  Watched
                </div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: 30, fontWeight: 800, color: "#a78bfa",
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}>
                  {stats.gamesBeat || 0}
                </div>
                <div style={{
                  fontSize: 9, color: "rgba(255,255,255,0.35)",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  Beat
                </div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: 30, fontWeight: 800, color: "#fff",
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}>
                  {stats.total}
                </div>
                <div style={{
                  fontSize: 9, color: "rgba(255,255,255,0.35)",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  Titles
                </div>
              </div>
            </div>

            {/* ── Filter pills + search toggle ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {["all", "seen", "unseen", ...(upcomingCount > 0 ? ["upcoming"] : [])].map((f) => (
                <button
                  key={f}
                  onClick={() => onFilterChange?.(f)}
                  style={{
                    padding: "5px 10px",
                    fontSize: 10, fontWeight: 600,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    borderRadius: 20,
                    border: filter === f
                      ? "1.5px solid #00ffc8"
                      : "1px solid rgba(255,255,255,0.1)",
                    background: filter === f ? "rgba(0,255,200,0.12)" : "rgba(255,255,255,0.04)",
                    color: filter === f ? "#00ffc8" : "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    flexShrink: 0,
                    WebkitTapHighlightColor: "transparent",
                    transition: "all 0.2s",
                  }}
                >
                  {f}{f === "upcoming" ? ` (${upcomingCount})` : ""}
                </button>
              ))}

              <button
                onClick={() => {
                  setSearchOpen((o) => {
                    if (o && searchQuery) onSearchChange?.("");
                    return !o;
                  });
                }}
                style={{
                  width: 30, height: 30,
                  borderRadius: "50%",
                  border: searchOpen ? "1.5px solid #00ffc8" : "1px solid rgba(255,255,255,0.1)",
                  background: searchOpen ? "rgba(0,255,200,0.12)" : "rgba(255,255,255,0.04)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", marginLeft: "auto", flexShrink: 0,
                  WebkitTapHighlightColor: "transparent",
                  transition: "all 0.2s",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke={searchOpen ? "#00ffc8" : "rgba(255,255,255,0.4)"}
                  strokeWidth="2" strokeLinecap="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </div>

            {/* ── Expandable search input ── */}
            <div style={{
              overflow: "hidden",
              maxHeight: searchOpen ? 50 : 0,
              opacity: searchOpen ? 1 : 0,
              transition: "max-height 0.25s ease, opacity 0.2s ease",
              marginTop: searchOpen ? 8 : 0,
            }}>
              <style>{`
                .cs-search-arcade-hero::placeholder { color: rgba(0,255,200,0.2); }
                .cs-search-arcade-hero:focus { border-color: rgba(0,255,200,0.3); outline: none; }
              `}</style>
              <div style={{ position: "relative" }}>
                <input
                  className="cs-search-arcade-hero"
                  type="text"
                  placeholder="Search games & movies..."
                  value={searchQuery || ""}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "8px 14px 8px 32px",
                    background: "rgba(0,255,200,0.03)",
                    border: "1px solid rgba(0,255,200,0.08)",
                    borderRadius: 10,
                    color: "#d0ffe8",
                    fontSize: 13,
                    fontFamily: "inherit",
                    WebkitAppearance: "none",
                  }}
                />
                <div style={{
                  position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                  fontSize: 13, color: "rgba(0,255,200,0.2)", pointerEvents: "none",
                }}>🔍</div>
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange?.("")}
                    style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                      background: "rgba(0,255,200,0.1)", border: "none", borderRadius: "50%",
                      width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
                      color: "rgba(0,255,200,0.5)", fontSize: 11, cursor: "pointer",
                    }}
                  >✕</button>
                )}
              </div>
            </div>
          </div>
        ) : isBooks ? (
          <div style={{
            display: "flex", justifyContent: "center", gap: 24,
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: 30, fontWeight: 800, color: accent,
                fontFamily: "'Barlow Condensed', sans-serif",
                animation: pop ? "statPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" : "none",
                filter: pop ? `drop-shadow(0 0 8px ${accent}80)` : "none",
                transition: "filter 0.3s",
              }}>
                {stats.completed}
              </div>
              <div style={{
                fontSize: 9, color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Read
              </div>
            </div>

            <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />

            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: 30, fontWeight: 800, color: "#fff",
                fontFamily: "'Barlow Condensed', sans-serif",
              }}>
                {stats.total}
              </div>
              <div style={{
                fontSize: 9, color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Books
              </div>
            </div>

            {stats.pages > 0 && (
              <>
                <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    fontSize: 30, fontWeight: 800, color: "rgba(255,255,255,0.6)",
                    fontFamily: "'Barlow Condensed', sans-serif",
                  }}>
                    {formatPages(stats.pages)}
                  </div>
                  <div style={{
                    fontSize: 9, color: "rgba(255,255,255,0.35)",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    Pages
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{
            display: "flex", justifyContent: "center", gap: 24,
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                overflow: "hidden",
                height: 36,
              }}>
                <div style={{
                  fontSize: 30, fontWeight: 800, color: "#facc15",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  animation: pop ? "statPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" : "none",
                  filter: pop ? "drop-shadow(0 0 8px rgba(250,204,21,0.5))" : "none",
                  transform: watchedRevealed ? "translateY(0)" : "translateY(100%)",
                  opacity: watchedRevealed ? 1 : 0,
                  transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease, filter 0.3s",
                }}>
                  {stats.completed}
                </div>
              </div>
              <div style={{
                fontSize: 9, color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Watched
              </div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: 30, fontWeight: 800, color: "#fff",
                fontFamily: "'Barlow Condensed', sans-serif",
              }}>
                {stats.total}
              </div>
              <div style={{
                fontSize: 9, color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Films
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* end */
