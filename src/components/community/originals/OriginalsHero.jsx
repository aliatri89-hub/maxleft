import { t } from "../../../theme";
import { useMemo } from "react";
import { ActivityRings, CyclePill } from "../primitives";

/**
 * OriginalsHero — Hero section for MANTL Originals.
 * MANTL play-button logo as "host," no podcast art.
 * Activity rings showing overall Originals progress.
 */
export default function OriginalsHero({ community, miniseries, progress, accent }) {

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
      background: "linear-gradient(180deg, rgba(233,69,96,0.06) 0%, transparent 100%)",
    }}>
      <div style={{ position: "relative", zIndex: 1, padding: "28px 16px 24px" }}>
        {/* MANTL Play Button Logo */}
        <div style={{
          display: "flex", justifyContent: "center", marginBottom: 16,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: `linear-gradient(135deg, ${accent}, ${accent}88)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 20px ${accent}40`,
          }}>
            {/* Play triangle */}
            <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
              <path d="M2 1.5L20 13L2 24.5V1.5Z" fill="#fff" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div style={{
          fontSize: 28,
          fontWeight: 800, color: t.textPrimary,
          fontFamily: t.fontDisplay,
          letterSpacing: "0.03em", textTransform: "uppercase",
          textAlign: "center", marginBottom: 4, lineHeight: 1.1,
        }}>
          MANTL Originals
        </div>

        {stats.total > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
            <ActivityRings
              filmPct={stats.pct}
              bookPct={null}
              gamePct={null}
              displayPct={Math.round(stats.pct)}
              ringColors={[accent]}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <CyclePill
                label="Films"
                value={`${stats.completed}/${stats.total}`}
                color={accent}
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
