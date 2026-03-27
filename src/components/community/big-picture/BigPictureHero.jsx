import { t } from "../../../theme";
import { useMemo } from "react";
import { ActivityRings, CyclePill, HeroBanner } from "../primitives";
import { useMediaFilter } from "../../../hooks/useMediaFilter";

/**
 * BigPictureHero — Hero section for The Big Picture community page.
 *
 * Films only. Draft-focused — shows draft count instead of series completion.
 * No books, no games, no commentary tracking.
 *
 * Props:
 *   community           — community_pages row
 *   miniseries          — filtered to current tab's series (heroMiniseries from screen)
 *   progress            — user progress map
 *   activeTab           — current tab key
 *   mediaFilter         — null | "solo:film" | "hide:film"
 *   onMediaFilterChange — setter for mediaFilter
 */
export default function BigPictureHero({ community, miniseries, progress, activeTab, mediaFilter, onMediaFilterChange }) {
  const { cycleMedia, mediaState } = useMediaFilter(mediaFilter, onMediaFilterChange);

  // ── Per-tab hero overrides ────────────────────────────────
  const tabHero = community?.theme_config?.tab_heroes?.[activeTab];
  const heroTagline = tabHero?.tagline ?? community?.tagline;
  const heroBanner = tabHero?.banner_url ?? community?.banner_url;

  // ── Stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalFilms = 0, completedFilms = 0;
    let totalDrafts = 0;

    miniseries.forEach((s) => {
      const items = s.items || [];
      const films = items.filter((i) => i.media_type === "film" || !i.media_type);

      totalFilms += films.length;
      completedFilms += films.filter((i) => progress[i.id]).length;

      // Count series with a draft_year as draft events
      if (s.draft_year) totalDrafts++;
    });

    return {
      totalFilms, completedFilms,
      totalDrafts,
      filmPct: totalFilms > 0 ? (completedFilms / totalFilms) * 100 : 0,
    };
  }, [miniseries, progress]);

  const displayPct = Math.round(stats.filmPct);

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
          {heroTagline || community?.name || "The Big Picture"}
        </div>

        {/* Rings + pills */}
        {miniseries.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
            <ActivityRings
              filmPct={stats.filmPct}
              bookPct={null}
              gamePct={null}
              displayPct={displayPct}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <CyclePill
                label="Films"
                value={`${stats.completedFilms}/${stats.totalFilms}`}
                color="#e94560"
                state={mediaState("film")}
                onClick={() => cycleMedia("film")}
              />
              {stats.totalDrafts > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "4px 14px", fontSize: 11, color: t.textMuted,
                }}>
                  🏈 {stats.totalDrafts} drafts
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
