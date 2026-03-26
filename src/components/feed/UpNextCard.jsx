import { Poster, resolveImg, TMDB_BACKDROP } from "./FeedPrimitives";

// ════════════════════════════════════════════════
// ON DECK CARD — continue a franchise series
// ════════════════════════════════════════════════
function UpNextCard({ data, onNavigateCommunity }) {
  const hasBackdrop = !!data.backdrop_path;
  const pct = data.total_count > 0 ? Math.round((data.watched_count / data.total_count) * 100) : 0;

  // SVG donut math
  const donutSize = 52;
  const strokeWidth = 4;
  const radius = (donutSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      onClick={() => onNavigateCommunity?.(data.community_slug, data.tmdb_id)}
      style={{
        margin: "6px 16px", background: "var(--bg-card, #1a1714)",
        borderRadius: 16, overflow: "hidden",
        border: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
        borderTop: "3px solid #60a5fa",
        cursor: "pointer",
        position: "relative",
      }}
    >
      {/* Backdrop — subtle cinematic feel */}
      {hasBackdrop && (
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${resolveImg(data.backdrop_path, TMDB_BACKDROP)})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          opacity: 0.30,
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(
              90deg,
              var(--bg-card, #1a1714) 35%,
              rgba(19,24,40,0.5) 60%,
              transparent 85%
            )`,
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(
              180deg,
              transparent 40%,
              var(--bg-card, #1a1714) 100%
            )`,
          }} />
        </div>
      )}

      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: -30, left: 60, width: 180, height: 100,
        borderRadius: "50%",
        background: "#60a5fa",
        opacity: 0.05, filter: "blur(40px)",
        pointerEvents: "none",
      }} />

      {/* Poster + info + donut */}
      <div style={{
        display: "flex", gap: 12, padding: "14px 16px",
        position: "relative", zIndex: 1, alignItems: "flex-start",
      }}>
        <Poster path={data.poster_path} tmdbId={data.tmdb_id} title={data.title} mediaType={data.media_type} width={72} height={108} radius={8} />
        <div style={{ flex: 1, paddingTop: 2, display: "flex", flexDirection: "column", minHeight: 104 }}>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700,
            letterSpacing: "0.04em", textTransform: "uppercase",
            color: "#60a5fa", marginBottom: 8,
          }}>
            On deck
          </div>
          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16,
            color: "var(--text-primary, #e8ecf4)", lineHeight: 1.2, marginBottom: 2,
          }}>
            {data.title}
          </div>
          {(data.creator || data.year) && (
            <div style={{
              fontFamily: "var(--font-body)", fontSize: 12,
              color: "var(--text-muted, #8892a8)", marginBottom: 2,
            }}>
              {[data.creator, data.year].filter(Boolean).join(" · ")}
            </div>
          )}
          {data.series_title && (
            <div style={{
              fontFamily: "var(--font-body)", fontSize: 12,
              color: "var(--text-muted, #8892a8)", marginBottom: 2,
            }}>
              {data.series_title}
            </div>
          )}

          {/* Pod pill — bottom of content column */}
          <div style={{ marginTop: "auto", paddingTop: 4 }}>
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
                {data.community_name || data.series_title}
              </span>
            </div>
          </div>
        </div>

        {/* Donut tracker — right column */}
        <div style={{
          flexShrink: 0, display: "flex", flexDirection: "column",
          alignItems: "center", gap: 4, alignSelf: "center",
        }}>
          <div style={{ position: "relative", width: donutSize, height: donutSize }}>
            <svg width={donutSize} height={donutSize} style={{ transform: "rotate(-90deg)" }}>
              <circle
                cx={donutSize / 2} cy={donutSize / 2} r={radius}
                fill="none" stroke="rgba(255,255,255,0.06)"
                strokeWidth={strokeWidth}
              />
              <circle
                cx={donutSize / 2} cy={donutSize / 2} r={radius}
                fill="none" stroke="#60a5fa"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
              />
            </svg>
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-mono)", fontWeight: 700,
              fontSize: 13, color: "#60a5fa",
            }}>
              {pct}%
            </div>
          </div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 9,
            color: "var(--text-faint, #5a6480)",
          }}>
            {data.watched_count}/{data.total_count}
          </div>
        </div>
      </div>
    </div>
  );
}
export default UpNextCard;
