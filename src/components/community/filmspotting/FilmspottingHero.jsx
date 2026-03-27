import { t } from "../../../theme";
import { useMemo } from "react";
import { ActivityRings, CyclePill, HeroBanner } from "../primitives";

/**
 * FilmspottingHero — Hero section for the Filmspotting community page.
 *
 * Films-only community — no books, games, or commentary tracking.
 * Single ring + single pill. Modeled on FilmJunkHero.
 *
 * Props:
 *   community   — community_pages row
 *   miniseries  — all series for this community
 *   progress    — user progress map { [itemId]: { rating, ... } }
 */
export default function FilmspottingHero({ community, miniseries, progress }) {
  // ── Hero config from theme_config ─────────────────────────
  const tabHero = community?.theme_config?.tab_heroes?.awards;
  const heroTagline = tabHero?.tagline ?? community?.tagline;
  const heroBanner = tabHero?.banner_url ?? community?.banner_url;

  // ── Film stats ────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalFilms = 0, completedFilms = 0, completedSeries = 0;

    miniseries.forEach((s) => {
      const items = s.items || [];
      totalFilms += items.length;
      const done = items.filter((i) => progress[i.id]).length;
      completedFilms += done;
      if (items.length > 0 && done === items.length) completedSeries++;
    });

    return {
      totalFilms,
      completedFilms,
      completedSeries,
      filmPct: totalFilms > 0 ? (completedFilms / totalFilms) * 100 : 0,
    };
  }, [miniseries, progress]);

  const displayPct = Math.round(stats.filmPct);
  const accent = community?.theme_config?.accent || "#4ade80";

  return (
    <div style={{
      position: "relative",
      borderBottom: `1px solid ${t.borderSubtle}`,
      overflow: "hidden",
    }}>
      <HeroBanner
        bannerUrl={heroBanner}
        contain={tabHero?.banner_contain}
        position={tabHero?.banner_position}
        opacity={tabHero?.banner_opacity}
      />

      <div style={{ position: "relative", zIndex: 1, padding: "24px 16px 20px" }}>
        {/* Title + tagline */}
        <div style={{
          fontSize: heroTagline ? 28 : 22,
          fontWeight: 800, color: t.textPrimary,
          fontFamily: t.fontDisplay,
          letterSpacing: "0.03em", textTransform: "uppercase",
          textAlign: "center", marginBottom: 4, lineHeight: 1.1,
        }}>
          {heroTagline || community?.name || "Filmspotting"}
        </div>

        {/* Ring + pill */}
        {miniseries.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
            <ActivityRings
              filmPct={stats.filmPct}
              bookPct={null}
              gamePct={null}
              displayPct={displayPct}
              ringColors={[accent]}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <CyclePill
                label="Films"
                value={`${stats.completedFilms}/${stats.totalFilms}`}
                color={accent}
                state="default"
                onClick={() => {}}
              />
              {stats.completedSeries > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "4px 14px", fontSize: 11, color: t.textMuted,
                }}>
                  📺 {stats.completedSeries}/{miniseries.length} series
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
