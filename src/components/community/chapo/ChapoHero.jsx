import { t } from "../../../theme";
import { useMemo } from "react";
import { ActivityRings, CyclePill, HeroBanner } from "../primitives";

/**
 * ChapoHero — Hero section for the Chapo Trap House community.
 * Films only. Single activity ring.
 */
export default function ChapoHero({ community, miniseries, progress }) {
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
      borderBottom: `1px solid ${t.borderSubtle}`,
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
        <div style={{
          fontSize: 28,
          fontWeight: 800, color: t.textPrimary,
          fontFamily: t.fontDisplay,
          letterSpacing: "0.03em", textTransform: "uppercase",
          textAlign: "center", marginBottom: 4, lineHeight: 1.1,
        }}>
          {community?.tagline || community?.name || "Chapo Trap House"}
        </div>

        {stats.total > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
            <ActivityRings
              filmPct={stats.pct}
              bookPct={null}
              gamePct={null}
              displayPct={Math.round(stats.pct)}
              ringColors={["#D32F2F"]}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <CyclePill
                label="Films"
                value={`${stats.completed}/${stats.total}`}
                color="#D32F2F"
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
