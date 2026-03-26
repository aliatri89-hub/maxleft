import { getTimeAgo } from "./FeedPrimitives";

// ════════════════════════════════════════════════
// BADGE COMPLETE CARD — celebration moment on the feed
// ════════════════════════════════════════════════
function BadgeCompleteCard({ data, onCelebrate }) {
  const accent = data.accent_color || "#f5c542";
  const timeAgo = getTimeAgo(data.earned_at);

  return (
    <div
      onClick={() => onCelebrate(data)}
      style={{
        margin: "6px 16px",
        background: "var(--bg-card, #1a1714)",
        borderRadius: 16, overflow: "hidden",
        border: `1px solid ${accent}30`,
        borderTop: `3px solid ${accent}`,
        cursor: "pointer",
        position: "relative",
      }}
    >
      {/* Community banner watermark */}
      {data.community_banner && (
        <div style={{
          position: "absolute", inset: 0,
          opacity: 0.06,
          backgroundImage: `url(${data.community_banner})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          pointerEvents: "none",
        }} />
      )}

      {/* Golden ambient glow */}
      <div style={{
        position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)",
        width: 250, height: 120, borderRadius: "50%",
        background: accent,
        opacity: 0.08, filter: "blur(50px)",
        pointerEvents: "none",
      }} />

      {/* Shimmer sweep animation */}
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(105deg, transparent 40%, ${accent}08 45%, ${accent}15 50%, ${accent}08 55%, transparent 60%)`,
        backgroundSize: "200% 100%",
        animation: "badgeShimmer 3s ease-in-out 1",
        pointerEvents: "none",
        zIndex: 1,
      }} />

      <div style={{
        display: "flex", alignItems: "center", gap: 16, padding: 20,
        position: "relative", zIndex: 2,
      }}>
        {/* Badge image — fully revealed, golden ring */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          overflow: "hidden", flexShrink: 0,
          border: `2.5px solid ${accent}80`,
          boxShadow: `0 0 24px ${accent}25, 0 0 60px ${accent}10`,
          position: "relative",
        }}>
          {data.badge_image ? (
            <img loading="lazy" src={data.badge_image} alt={data.badge_name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              background: `radial-gradient(circle, ${accent}30, ${accent}08)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32,
            }}>🏆</div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          {/* Label */}
          <div style={{
            fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700,
            letterSpacing: "0.04em", textTransform: "uppercase",
            color: accent, marginBottom: 8,
          }}>
            Badge Unlocked
          </div>

          {/* Badge name */}
          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18,
            color: "var(--text-primary, #e8ecf4)", lineHeight: 1.2, marginBottom: 3,
          }}>
            {data.badge_name}
          </div>

          {/* Community + time */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: "var(--font-body)", fontSize: 12,
            color: "var(--text-muted, #8892a8)",
          }}>
            <span>{data.community_name}</span>
            <span style={{ color: "var(--text-faint, #5a6480)" }}>·</span>
            <span style={{ color: "var(--text-faint, #5a6480)" }}>{timeAgo}</span>
          </div>

          {/* Tagline if present */}
          {data.tagline && (
            <div style={{
              fontFamily: "var(--font-body)", fontSize: 11,
              color: `${accent}99`, fontStyle: "italic",
              marginTop: 6, lineHeight: 1.3,
            }}>
              {data.tagline.split("\n")[0]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default BadgeCompleteCard;
