import { t } from "../../theme";
// ════════════════════════════════════════════════
// BADGE NUDGE CARD — mysterious locked treasure
// ════════════════════════════════════════════════
function BadgeCard({ data, onNavigateCommunity, onViewBadgeDetail }) {
  const pct = data.total_items > 0 ? Math.round((data.watched_count / data.total_items) * 100) : 0;
  const remaining = data.total_items - data.watched_count;
  const blurAmount = Math.max(0, Math.round(12 * (1 - (pct / 100))));
  const accentColor = data.accent_color || "var(--accent-gold, #f5c542)";

  const badgeId = data.badge_id || data.id;

  return (
    <div onClick={() => {
      if (badgeId && onViewBadgeDetail) {
        onViewBadgeDetail({
          id: badgeId,
          name: data.badge_name || data.name,
          image_url: data.image_url,
          accent_color: data.accent_color,
          tagline: data.tagline || null,
          progress_tagline: data.progress_tagline || null,
          description: data.description || null,
          miniseries_id: data.miniseries_id || null,
          media_type_filter: data.media_type_filter || null,
        });
      } else {
        onNavigateCommunity?.(data.community_slug);
      }
    }} style={{
      margin: "6px 16px", background: "var(--bg-card, #1a1714)",
      borderRadius: 16, overflow: "hidden",
      border: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
      borderTop: `3px solid ${accentColor}`,
      cursor: "pointer",
      position: "relative",
    }}>
      {/* Ambient glow — gets brighter as you get closer */}
      <div style={{
        position: "absolute", top: -40, right: -40,
        width: 160, height: 160, borderRadius: "50%",
        background: accentColor,
        opacity: 0.03 + (pct / 100) * 0.06,
        filter: "blur(50px)",
        pointerEvents: "none",
      }} />

      {/* Top section with community banner watermark */}
      <div style={{ position: "relative", overflow: "hidden" }}>
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

        <div style={{
          display: "flex", gap: 16, padding: 18, alignItems: "center",
          position: "relative", zIndex: 1,
        }}>
          {/* Badge image — blurred, with pulsing ring when close */}
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: `rgba(245,197,66,0.06)`,
            border: `2px solid ${pct >= 75 ? accentColor : "rgba(245,197,66,0.15)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, position: "relative", overflow: "hidden",
            boxShadow: pct >= 75 ? `0 0 20px ${accentColor}33` : "none",
            transition: "border-color 0.4s ease, box-shadow 0.4s ease",
          }}>
            {data.image_url ? (
              <img
                src={data.image_url}
                alt=""
                style={{
                  width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%",
                  filter: `blur(${blurAmount}px)`,
                  transition: "filter 0.6s ease",
                }}
              />
            ) : (
              <span style={{ fontSize: 26, filter: `blur(${blurAmount}px)` }}>🏆</span>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: t.fontSerif, fontSize: 18, fontWeight: 700,
              letterSpacing: "0.04em", textTransform: "uppercase",
              color: pct >= 75 ? accentColor : "var(--text-faint, #5a6480)",
              marginBottom: 8,
              transition: "color 0.4s ease",
            }}>
              {remaining === 0 ? "Complete!" : `${remaining} more to unlock`}
            </div>
            <div style={{
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16,
              color: "var(--text-primary, #e8ecf4)", marginBottom: 1,
            }}>
              {data.badge_name}
            </div>
            {data.progress_tagline && (
              <div style={{
                fontFamily: "var(--font-body)", fontSize: 11,
                color: "var(--text-muted, #8892a8)", fontStyle: "italic",
                marginTop: 4, lineHeight: 1.3,
              }}>
                {data.progress_tagline}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Progress bar — segmented feel */}
      <div style={{ padding: "0 18px 14px" }}>
        <div style={{
          width: "100%", height: 6, borderRadius: 3,
          background: t.bgInput, overflow: "hidden",
          position: "relative",
        }}>
          <div style={{
            height: "100%", borderRadius: 3,
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${accentColor}99, ${accentColor})`,
            transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: pct >= 75 ? `0 0 12px ${accentColor}66` : "none",
          }} />
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between", marginTop: 7,
          fontSize: 10, alignItems: "center",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: t.bgElevated, borderRadius: 10,
            padding: "3px 8px 3px 3px",
          }}>
            {data.community_image && (
              <img loading="lazy" src={data.community_image} alt="" style={{
                width: 16, height: 16, borderRadius: "50%", objectFit: "cover",
              }} />
            )}
            <span style={{ fontSize: 10, color: "var(--text-faint, #5a6480)", whiteSpace: "nowrap" }}>
              {data.community_name}
            </span>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-faint, #5a6480)" }}>
            <span style={{ color: "var(--text-muted, #8892a8)", fontWeight: 600 }}>{data.watched_count}</span>
            {" "}of {data.total_items}
          </span>
        </div>
      </div>
    </div>
  );
}

export default BadgeCard;
