import { t } from "../../../theme";
import { useMemo, useRef, useState, useEffect } from "react";
import { HeroBanner } from "../primitives";
import { useSlideReveal } from "../../../hooks/useSlideReveal";

/**
 * NowPlayingHero — Hero section for the Now Playing Podcast community page.
 *
 * Banner + title + tagline + stats ONLY.
 * Filter pills and search live in NowPlayingScreen (matching BlankCheck pattern).
 */

export default function NowPlayingHero({
  community, miniseries, progress, activeTab,
}) {
  const tabHero = community?.theme_config?.tab_heroes?.[activeTab];
  const heroTagline = tabHero?.tagline ?? community?.tagline;
  const heroBanner = tabHero?.banner_url ?? community?.banner_url;

  // ── Compute stats ──
  const stats = useMemo(() => {
    let completed = 0, total = 0;
    miniseries.forEach((s) => {
      const items = (s.items || []).filter((i) => i.media_type === "film" || !i.media_type);
      total += items.length;
      completed += items.filter((i) => progress[i.id]).length;
    });
    return { completed, total };
  }, [miniseries, progress]);

  const watchedRevealed = useSlideReveal(stats.completed);
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

  useEffect(() => { prevCount.current = stats.completed; }, [stats.completed]);

  const accent = "#facc15";

  return (
    <div style={{
      position: "relative",
      overflow: "hidden",
    }}>
      <HeroBanner
        bannerUrl={heroBanner}
        contain={tabHero?.banner_contain}
        position={tabHero?.banner_position}
        opacity={tabHero?.banner_opacity}
        gradientStrength={tabHero?.gradient_strength}
      />

      <div style={{ position: "relative", zIndex: 1, padding: "24px 16px 36px" }}>
        <div style={{
          fontSize: 28, fontWeight: 800, color: t.textPrimary,
          fontFamily: t.fontDisplay,
          letterSpacing: "0.03em", textTransform: "uppercase",
          textAlign: "center", marginBottom: 4, lineHeight: 1.1,
        }}>
          {heroTagline || community?.name || "Now Playing"}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ overflow: "hidden", height: 36 }}>
              <div style={{
                fontSize: 30, fontWeight: 800, color: t.gold,
                fontFamily: t.fontDisplay,
                transform: watchedRevealed ? "translateY(0)" : "translateY(100%)",
                opacity: watchedRevealed ? 1 : 0,
                transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease",
              }}>
                {stats.completed}
              </div>
            </div>
            <div style={{ fontSize: 9, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Watched</div>
          </div>
          <div style={{ width: 1, background: t.bgHover }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: t.textPrimary, fontFamily: t.fontDisplay }}>{stats.total}</div>
            <div style={{ fontSize: 9, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Films</div>
          </div>
        </div>
      </div>
    </div>
  );
}
