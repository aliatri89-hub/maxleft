import { useMemo } from "react";
import { useGlobalBadges } from "../../hooks/useGlobalBadges";

const accent = "#EF9F27";
const SIZE = 72;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function BadgeSlot({ badge, isEarned, current, total, delay = 0, onTap }) {
  const progress = isEarned ? 1 : (total > 0 ? current / total : 0);
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const badgeAccent = badge.accent_color || accent;

  return (
    <div
      onClick={onTap}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        cursor: "pointer", width: 80,
        animation: `badgeShelfIn 0.4s ${delay}s ease-out both`,
        opacity: 0,
      }}
    >
      {/* Badge circle with progress ring */}
      <div style={{ position: "relative", width: SIZE, height: SIZE }}>
        {/* SVG ring */}
        <svg
          width={SIZE} height={SIZE}
          style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}
        >
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            fill="none"
            stroke={isEarned ? `${badgeAccent}30` : "#ffffff08"}
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            fill="none"
            stroke={isEarned ? badgeAccent : `${badgeAccent}80`}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>

        {/* Badge image */}
        <div style={{
          position: "absolute",
          top: STROKE + 3,
          left: STROKE + 3,
          width: SIZE - (STROKE + 3) * 2,
          height: SIZE - (STROKE + 3) * 2,
          borderRadius: "50%",
          overflow: "hidden",
          background: "#1a1714",
        }}>
          {badge.image_url ? (
            <img
              src={badge.image_url}
              alt={badge.name}
              style={{
                width: "100%", height: "100%", objectFit: "cover",
                filter: isEarned ? "none" : `blur(${Math.max(4, 14 - (progress * 14))}px) brightness(0.5)`,
                transform: "scale(1.1)",
                transition: "filter 0.3s",
              }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              background: isEarned
                ? `radial-gradient(circle, ${badgeAccent}30, ${badgeAccent}10)`
                : "#1a1714",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28,
            }}>
              🏆
            </div>
          )}
        </div>

        {/* Earned check */}
        {isEarned && (
          <div style={{
            position: "absolute", bottom: -1, right: -1,
            width: 20, height: 20, borderRadius: "50%",
            background: "#22c55e",
            border: "2px solid #0f0d0b",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, color: "#fff", fontWeight: 700,
          }}>
            ✓
          </div>
        )}

        {/* Progress fraction for closest badge */}
        {!isEarned && current > 0 && (
          <div style={{
            position: "absolute", bottom: -3, right: -3,
            background: "#1a1714",
            border: `1px solid ${badgeAccent}50`,
            borderRadius: 8,
            padding: "1px 6px",
            fontSize: 9, fontWeight: 700,
            color: `${badgeAccent}cc`,
            fontFamily: "var(--font-mono)",
          }}>
            {current}/{total}
          </div>
        )}
      </div>

      {/* Badge name */}
      <div style={{
        marginTop: 8,
        fontSize: 11,
        fontWeight: 600,
        color: isEarned ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)",
        textAlign: "center",
        lineHeight: 1.2,
        maxWidth: 84,
        fontFamily: "var(--font-display)",
        letterSpacing: "0.02em",
      }}>
        {badge.name}
      </div>
    </div>
  );
}

/** Empty placeholder slot */
function EmptySlot({ delay = 0 }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      width: 80,
      animation: `badgeShelfIn 0.4s ${delay}s ease-out both`,
      opacity: 0,
    }}>
      <div style={{
        width: SIZE, height: SIZE, borderRadius: "50%",
        border: "1.5px dashed rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 3v14M3 10h14" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{
        marginTop: 8, fontSize: 10, fontWeight: 500,
        color: "rgba(255,255,255,0.15)",
        fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
      }}>
        ???
      </div>
    </div>
  );
}

export default function BadgeShelf({ session }) {
  const userId = session?.user?.id;
  const { earnedBadges, closestBadge, loading } = useGlobalBadges(userId);

  // Build the 4 display slots: 3 most recent earned + 1 closest
  const slots = useMemo(() => {
    const result = [];

    // 3 most recent earned (already sorted by earned_at desc)
    const recentEarned = earnedBadges.slice(0, 3);
    for (const badge of recentEarned) {
      result.push({ badge, isEarned: true });
    }

    // 1 closest-to-earning (only if it's not already shown)
    if (closestBadge && !recentEarned.some(e => e.id === closestBadge.id)) {
      result.push({
        badge: closestBadge,
        isEarned: false,
        current: closestBadge.current,
        total: closestBadge.total,
      });
    }

    return result;
  }, [earnedBadges, closestBadge]);

  const hasAnyBadges = earnedBadges.length > 0 || closestBadge;

  return (
    <div style={{ padding: "0 16px", marginBottom: 8 }}>
      <style>{`
        @keyframes badgeShelfIn {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* ── Section header ── */}
      <div style={{ textAlign: "center", paddingBottom: 14, paddingTop: 4 }}>
        <div style={{
          fontFamily: "'Permanent Marker', cursive",
          fontSize: 28, color: accent,
          letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1,
        }}>
          mantl
        </div>
        <div style={{
          height: 1, margin: "10px 0 0",
          background: `linear-gradient(90deg, transparent, ${accent}30, transparent)`,
        }} />
      </div>

      {/* ── Glass case + badge slots ── */}
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "0.5px solid rgba(255,255,255,0.06)",
        borderBottom: "none",
        borderRadius: "12px 12px 0 0",
        padding: "20px 12px 22px",
      }}>

        {loading ? (
          /* Skeleton */
          <div style={{ display: "flex", justifyContent: "center", gap: 16, padding: "8px 0" }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div className="skeleton-dark" style={{ width: SIZE, height: SIZE, borderRadius: "50%" }} />
                <div className="skeleton-dark" style={{ width: 50, height: 10, borderRadius: 4 }} />
              </div>
            ))}
          </div>
        ) : !hasAnyBadges ? (
          /* Empty state */
          <div style={{ textAlign: "center", padding: "12px 16px" }}>
            <div style={{
              fontSize: 13, color: "var(--text-muted)",
              fontFamily: "var(--font-body)", fontStyle: "italic",
              lineHeight: 1.5,
            }}>
              Join a community and start tracking to earn badges
            </div>
          </div>
        ) : (
          /* Badge slots */
          <div style={{
            display: "flex", justifyContent: "center",
            gap: 12,
            flexWrap: "nowrap",
          }}>
            {slots.map((slot, i) => (
              <BadgeSlot
                key={slot.badge.id}
                badge={slot.badge}
                isEarned={slot.isEarned}
                current={slot.current || 0}
                total={slot.total || 0}
                delay={i * 0.08}
              />
            ))}
            {/* Fill remaining slots up to 4 with empties */}
            {Array.from({ length: Math.max(0, 4 - slots.length) }).map((_, i) => (
              <EmptySlot key={`empty-${i}`} delay={(slots.length + i) * 0.08} />
            ))}
          </div>
        )}

        {/* See all badges */}
        {earnedBadges.length > 0 && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontFamily: "var(--font-mono)", fontSize: 11,
              fontWeight: 500, letterSpacing: "0.04em",
              color: `${accent}cc`,
              background: `${accent}0a`,
              border: `1px solid ${accent}20`,
              borderRadius: 20, padding: "6px 14px",
              cursor: "pointer", transition: "all 0.2s",
            }}>
              <span>See all badges</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </div>
        )}
      </div>

      {/* ── Wood shelf ── */}
      <div style={{
        height: 12,
        background: "linear-gradient(180deg, #6b4c2a 0%, #5a3f22 40%, #4a331c 100%)",
        borderRadius: "0 0 4px 4px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        position: "relative",
      }}>
        {/* Wood grain highlights */}
        <div style={{
          position: "absolute", top: 3, left: 0, right: 0,
          height: "0.5px", background: "rgba(255,255,255,0.08)",
        }} />
        <div style={{
          position: "absolute", top: 7, left: 0, right: 0,
          height: "0.5px", background: "rgba(255,255,255,0.04)",
        }} />
      </div>
    </div>
  );
}
