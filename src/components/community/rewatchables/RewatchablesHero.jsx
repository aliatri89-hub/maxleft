import { useMemo } from "react";
import { HeroBanner } from "../primitives";
import { getCoverUrl } from "../../../utils/communityTmdb";

/**
 * RewatchablesHero — The Rewatchables community hero.
 *
 * Layout:
 *   1. Title + tagline
 *   2. "Your Most Rewatchable Movies" — #1 big poster hero, #2 #3 smaller
 *   3. "Your Most Watched Genre" — top genre highlighted, bars for the rest
 *   4. Overall stats
 */

const GENRE_COLORS = {
  "Horror":              "#e94560",
  "Animation":           "#a78bfa",
  "Sci-Fi & Fantasy":    "#06b6d4",
  "Romance":             "#f472b6",
  "Comedy":              "#facc15",
  "Action & Adventure":  "#fb923c",
  "Crime & Thriller":    "#94a3b8",
  "Documentary & Music": "#34d399",
  "Drama":               "#60a5fa",
};

export default function RewatchablesHero({ community, miniseries, progress, allItems }) {
  const heroBanner = community?.banner_url;
  const tabHero = community?.theme_config?.tab_heroes?.filmography;

  // ── Genre stats ──
  const { genreStats, totalCompleted, totalFilms, topGenre } = useMemo(() => {
    const stats = [];
    let allCompleted = 0;
    let allTotal = 0;

    miniseries.forEach((s) => {
      const items = s.items || [];
      const total = items.length;
      const completed = items.filter((i) => progress[i.id]).length;
      allCompleted += completed;
      allTotal += total;

      if (total > 0) {
        stats.push({
          name: s.title,
          total,
          completed,
          pct: (completed / total) * 100,
          color: GENRE_COLORS[s.title] || "#666",
        });
      }
    });

    // Sort by films watched (count), not percentage
    stats.sort((a, b) => {
      if (a.completed === 0 && b.completed === 0) return b.total - a.total;
      if (a.completed === 0) return 1;
      if (b.completed === 0) return -1;
      return b.completed - a.completed;
    });

    const top = stats.find(g => g.completed > 0) || null;

    return { genreStats: stats, totalCompleted: allCompleted, totalFilms: allTotal, topGenre: top };
  }, [miniseries, progress]);

  // ── Most rewatched films — top 3 ──
  const mostRewatched = useMemo(() => {
    if (!allItems || allItems.length === 0) return [];

    return allItems
      .filter(item => {
        const p = progress[item.id];
        return p && (p.rewatch_count || 0) > 0;
      })
      .map(item => ({
        id: item.id,
        title: item.title,
        year: item.year,
        tmdb_id: item.tmdb_id,
        coverUrl: getCoverUrl(item),
        rewatchCount: progress[item.id].rewatch_count,
        totalWatches: (progress[item.id].rewatch_count || 0) + 1,
      }))
      .sort((a, b) => b.rewatchCount - a.rewatchCount)
      .slice(0, 5);
  }, [allItems, progress]);

  const overallPct = totalFilms > 0 ? Math.round((totalCompleted / totalFilms) * 100) : 0;

  return (
    <div style={{
      position: "relative",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      overflow: "hidden",
    }}>
      <HeroBanner
        bannerUrl={tabHero?.banner_url ?? heroBanner}
        contain={tabHero?.banner_contain}
        position={tabHero?.banner_position}
        opacity={tabHero?.banner_opacity}
        gradientStrength={tabHero?.gradient_strength}
      />

      <div style={{ position: "relative", zIndex: 1, padding: "24px 16px 20px" }}>
        {/* Title + tagline */}
        <div style={{
          fontSize: 28, fontWeight: 800, color: "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.03em", textTransform: "uppercase",
          textAlign: "center", marginBottom: 4, lineHeight: 1.1,
        }}>
          {community?.tagline || community?.name || "The Rewatchables"}
        </div>
        <div style={{
          fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center",
          maxWidth: 300, margin: "0 auto 20px",
        }}>
          {community?.description}
        </div>

        {/* ═══ REWATCHED + GENRE — side by side ═══ */}
        {(mostRewatched.length > 0 || genreStats.length > 0) && (
          <div style={{
            display: "flex", gap: 12, maxWidth: 420, margin: "0 auto",
            alignItems: "flex-start",
          }}>

            {/* LEFT — Most Rewatched */}
            {mostRewatched.length > 0 && (
              <div style={{ flex: "0 0 auto", width: 150 }}>
                <div style={{
                  fontSize: 8, color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  marginBottom: 8, fontWeight: 700,
                }}>
                  Most Rewatched
                </div>

                {mostRewatched.map((film, idx) => (
                  <div key={film.id} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: idx === 0 ? "4px 0 5px" : "3px 0",
                    borderBottom: idx === 0 ? "1px solid rgba(250,204,21,0.1)" : "none",
                    marginBottom: idx === 0 ? 2 : 0,
                  }}>
                    <div style={{
                      fontSize: idx === 0 ? 11 : 9,
                      fontWeight: 800,
                      color: idx === 0 ? "rgba(250,204,21,0.7)" : "rgba(250,204,21,0.35)",
                      width: 16, flexShrink: 0,
                    }}>
                      #{idx + 1}
                    </div>
                    <div style={{
                      flex: 1,
                      fontSize: idx === 0 ? 13 : 10,
                      fontWeight: idx === 0 ? 800 : 600,
                      color: idx === 0 ? "#fff" : "rgba(255,255,255,0.5)",
                      fontFamily: idx === 0 ? "'Barlow Condensed', sans-serif" : "inherit",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {film.title}
                    </div>
                    <div style={{
                      fontSize: idx === 0 ? 14 : 11,
                      fontWeight: 900,
                      color: idx === 0 ? "#facc15" : "rgba(250,204,21,0.5)",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      flexShrink: 0,
                    }}>
                      ×{film.totalWatches}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* RIGHT — Genre Bars */}
            {genreStats.length > 0 && (
              <div style={{ flex: 1, minWidth: 0 }}>
                {topGenre && topGenre.completed > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{
                      fontSize: 8, color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase", letterSpacing: "0.1em",
                      fontWeight: 700, marginBottom: 2,
                    }}>
                      Most Watched Genre
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 800, color: topGenre.color,
                        fontFamily: "'Barlow Condensed', sans-serif",
                      }}>
                        {topGenre.name}
                      </div>
                      <div style={{
                        fontSize: 10, color: "rgba(255,255,255,0.35)",
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}>
                        {topGenre.completed}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {(() => {
                    const maxCompleted = Math.max(...genreStats.map(g => g.completed), 1);
                    return genreStats.map((g) => (
                      <div key={g.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{
                          width: 70, flexShrink: 0,
                          fontSize: 9, fontWeight: 600,
                          color: g.completed > 0 ? g.color : "rgba(255,255,255,0.2)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {g.name}
                        </div>
                        <div style={{
                          flex: 1, height: 6,
                          background: "rgba(255,255,255,0.06)",
                          borderRadius: 3, overflow: "hidden",
                        }}>
                          <div style={{
                            width: `${(g.completed / maxCompleted) * 100}%`, height: "100%",
                            background: g.color, borderRadius: 3,
                            transition: "width 0.6s ease",
                            minWidth: g.completed > 0 ? 3 : 0,
                          }} />
                        </div>
                        <div style={{
                          width: 24, flexShrink: 0,
                          fontSize: 9, fontWeight: 600,
                          color: g.completed > 0 ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.15)",
                          textAlign: "right",
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}>
                          {g.completed}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ OVERALL STATS ═══ */}
        {genreStats.length > 0 && (
          <div style={{ maxWidth: 420, margin: "0 auto" }}>
            <div style={{
              display: "flex", justifyContent: "center", gap: 16,
              marginTop: 14,
              padding: "10px 0 0",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: 20, fontWeight: 800, color: "#1DB954",
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}>{totalCompleted}</div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Watched
                </div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: 20, fontWeight: 800, color: "#fff",
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}>{totalFilms}</div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Films
                </div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: 20, fontWeight: 800, color: "#fff",
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}>{overallPct}%</div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Complete
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
