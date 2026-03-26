import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useGlobalBadges } from "../../hooks/useGlobalBadges";
import BadgeDetailScreen from "../community/shared/BadgeDetailScreen";

const accent = "#EF9F27";
const SIZE = 72;
const STROKE = 2.5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Earned badge on a gold pedestal */
function BadgeSlot({ badge, delay = 0, onTap }) {
  const badgeAccent = badge.accent_color || accent;
  return (
    <div
      onClick={onTap}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        width: 78, cursor: "pointer",
        animation: `badgeShelfIn 0.4s ${delay}s ease-out both`,
        opacity: 0,
      }}
    >
      {/* ── Badge circle ── */}
      <div style={{ position: "relative", width: SIZE, height: SIZE, zIndex: 1 }}>
        <svg width={SIZE} height={SIZE} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={`${badgeAccent}30`} strokeWidth={STROKE} />
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={badgeAccent} strokeWidth={STROKE}
            strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={0} />
        </svg>
        <div style={{
          position: "absolute", top: STROKE + 3, left: STROKE + 3,
          width: SIZE - (STROKE + 3) * 2, height: SIZE - (STROKE + 3) * 2,
          borderRadius: "50%", overflow: "hidden", background: "#1a1714",
        }}>
          {badge.image_url ? (
            <img src={badge.image_url} loading="lazy" alt={badge.name} style={{
              width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.1)",
            }} />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              background: `radial-gradient(circle, ${badgeAccent}30, ${badgeAccent}10)`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
            }}>🏆</div>
          )}
        </div>
        <div style={{
          position: "absolute", bottom: -1, right: -1,
          width: 18, height: 18, borderRadius: "50%",
          background: "#22c55e", border: "2px solid #0f0d0b",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, color: "#fff", fontWeight: 700,
        }}>✓</div>
      </div>

      {/* ── Pedestal + plaque ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: -4 }}>
        <div style={{ width: 30, height: 5, background: "linear-gradient(180deg, #c9a84c, #a07c28)", borderRadius: "0 0 1px 1px" }} />
        <div style={{ width: 18, height: 10, background: "linear-gradient(180deg, #b8942e, #7a5c12)", clipPath: "polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)" }} />
        <div style={{ width: 36, height: 5, background: "linear-gradient(180deg, #c9a84c, #8b6914)", borderRadius: badge.plaque_name ? "1px 1px 0 0" : "1px 1px 2px 2px" }} />
        {badge.plaque_name && (
          <div style={{
            padding: "2.5px 10px",
            background: "linear-gradient(180deg, #d4d4d4, #9a9a9a)",
            borderRadius: "0 0 2px 2px",
            fontSize: 8, fontWeight: 700,
            color: "#1a1a1a",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            textAlign: "center",
            lineHeight: 1.3,
            maxWidth: 78,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {badge.plaque_name}
          </div>
        )}
      </div>
    </div>
  );
}

/** Next-up badge with progress ring on a silver pedestal */
function NextUpSlot({ badge, delay = 0, onTap }) {
  const badgeAccent = badge.accent_color || accent;
  const progress = badge.total > 0 ? badge.current / badge.total : 0;
  const offset = CIRCUMFERENCE * (1 - progress);
  // Blur scales inversely with progress: 20px at 0%, down to 6px near completion
  const blurAmount = Math.round(20 - (progress * 14));

  return (
    <div
      onClick={onTap}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        width: 78, cursor: "pointer",
        animation: `badgeShelfIn 0.4s ${delay}s ease-out both`,
        opacity: 0,
      }}
    >
      {/* ── Badge circle with progress ring ── */}
      <div style={{ position: "relative", width: SIZE, height: SIZE, zIndex: 1 }}>
        <svg width={SIZE} height={SIZE} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={`${badgeAccent}15`} strokeWidth={STROKE} />
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={badgeAccent} strokeWidth={STROKE}
            strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease-out" }} />
        </svg>
        <div style={{
          position: "absolute", top: STROKE + 3, left: STROKE + 3,
          width: SIZE - (STROKE + 3) * 2, height: SIZE - (STROKE + 3) * 2,
          borderRadius: "50%", overflow: "hidden", background: "#1a1714",
        }}>
          {badge.image_url ? (
            <img src={badge.image_url} loading="lazy" alt={badge.name} style={{
              width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.1)",
              filter: `blur(${blurAmount}px) brightness(0.5)`,
              transition: "filter 0.3s",
            }} />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              background: `radial-gradient(circle, ${badgeAccent}20, ${badgeAccent}08)`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
            }}>🏆</div>
          )}
        </div>
        {/* Progress counter */}
        <div style={{
          position: "absolute", bottom: -1, right: -1,
          minWidth: 18, height: 18, borderRadius: 9,
          padding: "0 4px",
          background: badgeAccent, border: "2px solid #0f0d0b",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 8, color: "#000", fontWeight: 800,
          fontFamily: "var(--font-mono)",
        }}>{badge.current}/{badge.total}</div>
      </div>

      {/* ── Silver pedestal + "next up" plaque ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: -4 }}>
        <div style={{ width: 30, height: 5, background: "linear-gradient(180deg, #888, #666)", borderRadius: "0 0 1px 1px" }} />
        <div style={{ width: 18, height: 10, background: "linear-gradient(180deg, #777, #4a4a4a)", clipPath: "polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)" }} />
        <div style={{ width: 36, height: 5, background: "linear-gradient(180deg, #888, #555)", borderRadius: "1px 1px 0 0" }} />
        <div style={{
          padding: "2.5px 10px",
          background: "linear-gradient(180deg, #444, #2a2a2a)",
          borderRadius: "0 0 2px 2px",
          fontSize: 8, fontWeight: 700,
          color: "rgba(255,255,255,0.5)",
          fontFamily: "var(--font-display)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          textAlign: "center",
          lineHeight: 1.3,
        }}>
          next up
        </div>
      </div>
    </div>
  );
}

function EmptySlot({ delay = 0 }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      width: 78,
      animation: `badgeShelfIn 0.4s ${delay}s ease-out both`, opacity: 0,
    }}>
      <div style={{
        width: SIZE, height: SIZE, borderRadius: "50%",
        border: "1.5px dashed rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
      }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: -4 }}>
        <div style={{ width: 30, height: 5, background: "linear-gradient(180deg, #555, #3a3a3a)", borderRadius: "0 0 1px 1px" }} />
        <div style={{ width: 18, height: 10, background: "linear-gradient(180deg, #444, #2a2a2a)", clipPath: "polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)" }} />
        <div style={{ width: 36, height: 5, background: "linear-gradient(180deg, #555, #333)", borderRadius: "1px 1px 2px 2px" }} />
      </div>
    </div>
  );
}

export default function BadgeShelf({ session }) {
  const userId = session?.user?.id;
  const { earnedBadges, closestBadge, loading } = useGlobalBadges(userId);
  const [selectedBadge, setSelectedBadge] = useState(null);

  const recentThree = useMemo(() => earnedBadges.slice(0, 3), [earnedBadges]);
  const hasAnyBadges = earnedBadges.length > 0 || closestBadge;

  return (
    <div style={{ padding: 0, marginBottom: 0 }}>
      {/* Badge detail overlay — portaled to escape tab-pane transform */}
      {selectedBadge && createPortal(
        <BadgeDetailScreen
          badge={selectedBadge.badge}
          userId={userId}
          earnedAt={selectedBadge.earnedAt}
          onClose={() => setSelectedBadge(null)}
        />,
        document.body
      )}
      <style>{`
        @keyframes badgeShelfIn {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* ── Glass case ── */}
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "0.5px solid rgba(255,255,255,0.06)",
        borderBottom: "none",
        borderRadius: 0,
        padding: "8px 8px 2px",
      }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", gap: 10, padding: "8px 0" }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div className="skeleton-dark" style={{ width: SIZE, height: SIZE, borderRadius: "50%" }} />
                <div className="skeleton-dark" style={{ width: 28, height: 20, borderRadius: 2 }} />
              </div>
            ))}
          </div>
        ) : !hasAnyBadges ? (
          <div style={{ textAlign: "center", padding: "12px 16px" }}>
            <div style={{
              fontSize: 13, color: "var(--text-muted)",
              fontFamily: "var(--font-body)", fontStyle: "italic", lineHeight: 1.5,
            }}>
              Join a community and start tracking to earn badges
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "nowrap" }}>
            {[0, 1, 2].map(i => {
              const badge = recentThree[i];
              return badge ? (
                <BadgeSlot key={badge.id} badge={badge} delay={i * 0.08}
                  onTap={() => setSelectedBadge({ badge, earnedAt: badge.earned_at })} />
              ) : (
                <EmptySlot key={`empty-${i}`} delay={i * 0.08} />
              );
            })}
            {closestBadge ? (
              <NextUpSlot badge={closestBadge} delay={0.24}
                onTap={() => setSelectedBadge({ badge: closestBadge, earnedAt: null })} />
            ) : (
              <EmptySlot key="empty-3" delay={0.24} />
            )}
          </div>
        )}

        {!loading && hasAnyBadges && recentThree.length < 3 && !closestBadge && (
          <div style={{
            textAlign: "center", marginTop: 6,
            fontSize: 11, color: "var(--text-faint)",
            fontFamily: "var(--font-mono)", letterSpacing: "0.02em",
            fontStyle: "italic",
          }}>
            Explore communities to earn more
          </div>
        )}
      </div>

      {/* ── Mantlepiece shelf ── */}
      <div style={{ position: "relative" }}>
        <div style={{
          height: 6,
          background: "linear-gradient(180deg, #7a5a32 0%, #6b4c2a 100%)",
          position: "relative", zIndex: 2,
        }}>
          <div style={{ position: "absolute", top: 1, left: 8, right: 8, height: "0.5px", background: "rgba(255,255,255,0.10)" }} />
        </div>
        <div style={{
          height: 22,
          background: "linear-gradient(180deg, #6b4c2a 0%, #5a3f22 30%, #4e3620 70%, #3d2a16 100%)",
          position: "relative",
        }}>
          <div style={{ position: "absolute", top: 4, left: 12, right: 12, height: "0.5px", background: "rgba(255,255,255,0.06)" }} />
          <div style={{ position: "absolute", top: 9, left: 20, right: 20, height: "0.5px", background: "rgba(255,255,255,0.04)" }} />
          <div style={{ position: "absolute", top: 14, left: 8, right: 8, height: "0.5px", background: "rgba(255,255,255,0.03)" }} />
        </div>
        <div style={{
          height: 5,
          background: "linear-gradient(180deg, #3d2a16 0%, #2e1f10 100%)",
        }}>
          <div style={{ position: "absolute", bottom: 0, left: 16, right: 16, height: "0.5px", background: "rgba(255,255,255,0.04)" }} />
        </div>
        <div style={{
          position: "absolute", bottom: -10, left: 0,
          width: 14, height: 16,
          background: "linear-gradient(180deg, #5a3f22, #3d2a16)",
          clipPath: "polygon(0% 0%, 100% 0%, 100% 40%, 60% 100%, 0% 100%)",
        }} />
        <div style={{
          position: "absolute", bottom: -10, right: 0,
          width: 14, height: 16,
          background: "linear-gradient(180deg, #5a3f22, #3d2a16)",
          clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 40% 100%, 0% 40%)",
        }} />
        <div style={{
          position: "absolute", bottom: -14, left: 20, right: 20,
          height: 8, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, transparent 70%)",
        }} />
      </div>

      <div style={{ height: 10 }} />
    </div>
  );
}
