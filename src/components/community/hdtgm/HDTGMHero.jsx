import { useMemo } from "react";
import { ActivityRings, CyclePill, HeroBanner } from "../primitives";

/**
 * HDTGMHero — Hero section for the How Did This Get Made? community.
 *
 * Films only. Single activity ring. No commentary, no books, no games.
 * Single tab so no tab-switching logic needed.
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

    return {
      total,
      completed,
      pct: total > 0 ? (completed / total) * 100 : 0,
    };
  }, [miniseries, progress]);

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
          fontSize: 28,
          fontWeight: 800, color: "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.03em", textTransform: "uppercase",
          textAlign: "center", marginBottom: 4, lineHeight: 1.1,
        }}>
          {community?.tagline || community?.name || "HDTGM"}
        </div>
        <div style={{
          fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center",
          maxWidth: 300, margin: "0 auto 20px",
        }}>
          {community?.description}
        </div>

        {/* Ring + pill */}
        {stats.total > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
            <ActivityRings
              filmPct={stats.pct}
              bookPct={null}
              gamePct={null}
              displayPct={Math.round(stats.pct)}
              ringColors={["#e94560"]}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <CyclePill
                label="Films"
                value={`${stats.completed}/${stats.total}`}
                color="#e94560"
                state="default"
                onClick={() => {}}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
