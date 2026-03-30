import { t } from "../../../theme";
import { useMemo } from "react";
import { HeroBanner } from "../primitives";

/**
 * HDTGMHero — Hero section for the How Did This Get Made? community.
 *
 * Films only. Simple watched count — no completion ring or fraction.
 * These movies aren't meant to be "completed" like a franchise.
 *
 * Props:
 *   community    — community_pages row
 *   miniseries   — filmography miniseries
 *   progress     — user progress map
 */
export default function HDTGMHero({ community, miniseries, progress }) {
  const heroBanner = community?.banner_url;
  const tabHero = community?.theme_config?.tab_heroes?.filmography;

  const stats = useMemo(() => {
    let total = 0, completed = 0;

    miniseries.forEach((s) => {
      const items = s.items || [];
      total += items.length;
      completed += items.filter((i) => progress[i.id]).length;
    });

    return { total, completed };
  }, [miniseries, progress]);

  return (
    <div style={{
      position: "relative",
      overflow: "hidden",
    }}>
      <HeroBanner
        bannerUrl={tabHero?.banner_url ?? heroBanner}
        contain={tabHero?.banner_contain}
        position={tabHero?.banner_position}
        opacity={tabHero?.banner_opacity}
        gradientStrength={tabHero?.gradient_strength}
      />

      <div style={{ position: "relative", zIndex: 1, padding: "24px 16px 42px" }}>
        {/* Title + tagline */}
        <div style={{
          fontSize: 28,
          fontWeight: 800, color: t.textPrimary,
          fontFamily: t.fontDisplay,
          letterSpacing: "0.03em", textTransform: "uppercase",
          textAlign: "center", marginBottom: 4, lineHeight: 1.1,
        }}>
          {community?.tagline || community?.name || "HDTGM"}
        </div>

        {/* Simple watched count — no completion framing */}
        {stats.completed > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: 28, fontWeight: 800, color: t.red,
                fontFamily: t.fontDisplay,
              }}>{stats.completed}</div>
              <div style={{
                fontSize: 9, color: t.textMuted,
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Films Watched
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
