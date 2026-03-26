import { Poster, resolveImg, TMDB_BACKDROP } from "./FeedPrimitives";

// ════════════════════════════════════════════════
// RANDOM PICK CARD — "Have You Seen...?" discovery
// ════════════════════════════════════════════════
function RandomPickCard({ data, onNavigateCommunity }) {
  const hasBackdrop = !!data.backdrop_url;
  const accent = "#a78bfa";

  return (
    <div
      onClick={() => onNavigateCommunity?.(data.community_slug, data.tmdb_id)}
      style={{
        margin: "6px 16px", background: "var(--bg-card, #1a1714)",
        borderRadius: 16, overflow: "hidden",
        border: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
        borderTop: `3px solid ${accent}`,
        cursor: "pointer",
        position: "relative",
      }}
    >
      {/* Backdrop wash */}
      {hasBackdrop && (
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${resolveImg(data.backdrop_url, TMDB_BACKDROP)})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          opacity: 0.30,
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(
              90deg,
              var(--bg-card, #1a1714) 30%,
              rgba(19,24,40,0.4) 55%,
              transparent 80%
            )`,
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(
              180deg,
              transparent 50%,
              var(--bg-card, #1a1714) 100%
            )`,
          }} />
        </div>
      )}

      {/* Ambient glow — community colored */}
      <div style={{
        position: "absolute", top: -30, right: 40, width: 180, height: 100,
        borderRadius: "50%",
        background: accent,
        opacity: 0.05, filter: "blur(40px)",
        pointerEvents: "none",
      }} />

      {/* Poster + info */}
      <div style={{
        display: "flex", gap: 12, padding: "14px 16px",
        position: "relative", zIndex: 1,
      }}>
        <Poster path={data.poster_url} tmdbId={data.tmdb_id} title={data.title} mediaType={data.media_type} width={72} height={108} radius={8} />
        <div style={{ flex: 1, paddingTop: 2, display: "flex", flexDirection: "column" }}>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700,
            letterSpacing: "0.04em", textTransform: "uppercase",
            color: accent, marginBottom: 8,
          }}>
            Have you seen...?
          </div>
          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16,
            color: "var(--text-primary, #e8ecf4)", lineHeight: 1.2, marginBottom: 2,
          }}>
            {data.title}
          </div>
          {data.series_title && (
            <div style={{
              fontFamily: "var(--font-body)", fontSize: 12,
              color: "var(--text-muted, #8892a8)", marginBottom: 2,
            }}>
              {data.series_title}
            </div>
          )}

          {/* Bottom row — pod pill left, watched check + dismiss right */}
          <div style={{
            display: "flex", alignItems: "flex-end", justifyContent: "space-between",
            marginTop: "auto", paddingTop: 6,
          }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              background: "rgba(255,255,255,0.04)", borderRadius: 10,
              padding: "3px 8px 3px 3px",
            }}>
              {data.community_image && (
                <img loading="lazy" src={data.community_image} alt=""
                  style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }}
                />
              )}
              <span style={{ fontSize: 10, color: "var(--text-faint, #5a6480)", whiteSpace: "nowrap" }}>
                {data.community_name}
              </span>
            </div>

            {/* Shuffle icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ opacity: 0.5 }}
            >
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
export default RandomPickCard;
