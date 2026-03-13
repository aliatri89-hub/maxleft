import { useState, useMemo } from "react";
import BadgeDetailScreen from "./BadgeDetailScreen";

/**
 * BadgePage — Dedicated badge collection screen.
 *
 * Three-bucket layout:
 *   Earned      — full color, accent ring, green check
 *   In Progress — blurred image (blur decreases with progress), progress ring + fraction
 *   Available   — blurred image (full blur), no progress ring
 *
 * Unearned badge images are blurred so earning is the reveal.
 * Blur scales inversely with progress: 20px at 0% → 6px near completion.
 *
 * Props:
 *   badges         — all active badges for the community
 *   earnedBadgeIds — Set<badgeId>
 *   badgeProgress  — { [badgeId]: { current, total, complete } }
 *   userId         — current user ID
 *   accent         — community accent color
 *   onClose        — () => void — back to community screen
 */
export default function BadgePage({ badges, earnedBadgeIds, badgeProgress, userId, accent, onClose }) {
  const [selectedBadge, setSelectedBadge] = useState(null);

  const earned = useMemo(() => badges.filter(b => earnedBadgeIds.has(b.id)), [badges, earnedBadgeIds]);
  const inProgress = useMemo(() => badges.filter(b => {
    if (earnedBadgeIds.has(b.id)) return false;
    const bp = badgeProgress[b.id];
    return bp && bp.current > 0;
  }), [badges, earnedBadgeIds, badgeProgress]);
  const available = useMemo(() => badges.filter(b => {
    if (earnedBadgeIds.has(b.id)) return false;
    const bp = badgeProgress[b.id];
    return !bp || bp.current === 0;
  }), [badges, earnedBadgeIds, badgeProgress]);

  if (selectedBadge) {
    return (
      <BadgeDetailScreen
        badge={selectedBadge}
        userId={userId}
        earnedAt={earnedBadgeIds.has(selectedBadge.id) ? new Date().toISOString() : null}
        onClose={() => setSelectedBadge(null)}
      />
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#0f0f1a",
      overflowY: "auto", overflowX: "hidden",
      WebkitOverflowScrolling: "touch",
    }}>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Cinzel:wght@400;700&family=Barlow+Condensed:wght@600;700;800&display=swap"
        rel="stylesheet"
      />
      <style>{`
        @keyframes badgePageFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes badgePageItemIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        .badge-page-card {
          transition: transform 0.15s ease;
        }
        .badge-page-card:active {
          transform: scale(0.93) !important;
        }
      `}</style>

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(15,15,26,0.95)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        padding: "12px 16px",
        display: "flex", alignItems: "center",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: accent,
          fontSize: 15, cursor: "pointer", padding: "4px 8px 4px 0",
          fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif",
        }}>
          ← Back
        </button>
        <div style={{
          fontSize: 14, fontWeight: 700, color: "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
          flex: 1, textAlign: "center",
          letterSpacing: "0.03em", textTransform: "uppercase",
        }}>
          Badges
        </div>
        <div style={{ width: 48 }} />
      </div>

      <div style={{
        maxWidth: 480, margin: "0 auto",
        padding: "20px 16px 60px",
        animation: "badgePageFadeIn 0.35s ease-out",
      }}>
        {/* Summary line */}
        <div style={{
          textAlign: "center", marginBottom: 28,
        }}>
          <div style={{
            fontSize: 11, color: "#ffffff30",
            textTransform: "uppercase", letterSpacing: 2.5,
            fontFamily: "'Barlow Condensed', sans-serif",
          }}>
            {earned.length} of {badges.length} earned
          </div>
        </div>

        {/* ── Earned section ─────────────────────────────── */}
        {earned.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{
              fontSize: 10, color: "#ffffff25",
              textTransform: "uppercase", letterSpacing: 2,
              marginBottom: 16, paddingLeft: 4,
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>
              Earned
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}>
              {earned.map((badge, idx) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  isEarned={true}
                  progress={badgeProgress[badge.id]}
                  accent={badge.accent_color || accent}
                  delay={idx * 0.06}
                  onTap={() => setSelectedBadge(badge)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── In Progress section ────────────────────────── */}
        {inProgress.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{
              fontSize: 10, color: "#ffffff25",
              textTransform: "uppercase", letterSpacing: 2,
              marginBottom: 16, paddingLeft: 4,
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>
              In Progress
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}>
              {inProgress.map((badge, idx) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  isEarned={false}
                  progress={badgeProgress[badge.id]}
                  accent={badge.accent_color || accent}
                  delay={(earned.length + idx) * 0.06}
                  onTap={() => setSelectedBadge(badge)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Available section ───────────────────────────── */}
        {available.length > 0 && (
          <div>
            <div style={{
              fontSize: 10, color: "#ffffff25",
              textTransform: "uppercase", letterSpacing: 2,
              marginBottom: 16, paddingLeft: 4,
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>
              Available
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}>
              {available.map((badge, idx) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  isEarned={false}
                  progress={badgeProgress[badge.id]}
                  accent={badge.accent_color || accent}
                  delay={(earned.length + inProgress.length + idx) * 0.06}
                  onTap={() => setSelectedBadge(badge)}
                />
              ))}
            </div>
          </div>
        )}

        {badges.length === 0 && (
          <div style={{
            textAlign: "center", padding: "60px 20px",
            color: "#ffffff20", fontSize: 14,
          }}>
            No badges available yet
          </div>
        )}
      </div>
    </div>
  );
}


/**
 * BadgeCard — Individual badge in the grid.
 * Earned: full color image, accent ring, green check.
 * Unearned: blurred image (scales with progress), progress ring, fraction label.
 */
function BadgeCard({ badge, isEarned, progress, accent, delay, onTap }) {
  const current = progress?.current || 0;
  const total = progress?.total || 1;
  const pct = isEarned ? 1 : (total > 0 ? current / total : 0);

  // Blur scales inversely with progress: 20px at 0%, down to 6px near completion
  const blurAmount = isEarned ? 0 : Math.round(20 - (pct * 14));

  // SVG progress ring params
  const size = 96;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <div
      className="badge-page-card"
      onClick={onTap}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        cursor: "pointer",
        animation: `badgePageItemIn 0.3s ${delay}s ease-out both`,
      }}
    >
      {/* Badge circle with progress ring */}
      <div style={{
        position: "relative",
        width: size, height: size,
      }}>
        {/* SVG progress/earned ring */}
        <svg
          width={size} height={size}
          style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}
        >
          {/* Background track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={isEarned ? `${accent}30` : "#ffffff08"}
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={isEarned ? accent : `${accent}80`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>

        {/* Badge image */}
        <div style={{
          position: "absolute",
          top: strokeWidth + 3,
          left: strokeWidth + 3,
          width: size - (strokeWidth + 3) * 2,
          height: size - (strokeWidth + 3) * 2,
          borderRadius: "50%",
          overflow: "hidden",
          background: "#1a1a2e",
        }}>
          {badge.image_url ? (
            <img
              src={badge.image_url}
              alt={badge.name}
              style={{
                width: "100%", height: "100%", objectFit: "cover",
                filter: isEarned ? "none" : `blur(${blurAmount}px) brightness(0.5)`,
                transform: "scale(1.1)",
                transition: "filter 0.3s",
              }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              background: isEarned
                ? `radial-gradient(circle, ${accent}30, ${accent}10)`
                : "#1a1a2e",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32,
            }}>
              🏆
            </div>
          )}
        </div>

        {/* Earned check */}
        {isEarned && (
          <div style={{
            position: "absolute", bottom: 0, right: 0,
            width: 24, height: 24, borderRadius: "50%",
            background: "#22c55e",
            border: "2px solid #0f0f1a",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, color: "#fff", fontWeight: 700,
          }}>
            ✓
          </div>
        )}

        {/* Unearned fraction overlay */}
        {!isEarned && current > 0 && (
          <div style={{
            position: "absolute", bottom: -2, right: -2,
            background: "#1a1a2e",
            border: `1px solid ${accent}40`,
            borderRadius: 8,
            padding: "2px 6px",
            fontSize: 10, fontWeight: 700,
            color: `${accent}cc`,
            fontFamily: "'Barlow Condensed', sans-serif",
          }}>
            {current}/{total}
          </div>
        )}
      </div>

      {/* Badge name */}
      <div style={{
        marginTop: 10,
        fontSize: 11,
        fontWeight: 600,
        color: isEarned ? "#ffffffcc" : "#ffffff40",
        textAlign: "center",
        lineHeight: 1.25,
        maxWidth: size + 8,
        fontFamily: "'Barlow Condensed', sans-serif",
        letterSpacing: "0.02em",
      }}>
        {badge.name}
      </div>
    </div>
  );
}
