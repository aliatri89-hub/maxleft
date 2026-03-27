import { t } from "../../theme";
import { useState } from "react";
import { Poster, resolveImg, TMDB_BACKDROP, getSlugAbbrev, getCommunityAccent } from "./FeedPrimitives";

// ════════════════════════════════════════════════
// TRENDING CARD — dynamic, energetic, cinematic
// ════════════════════════════════════════════════
function TrendingCard({ data, onNavigateCommunity }) {
  const [flipCount, setFlipCount] = useState(0);
  const flipped = flipCount % 2 === 1;
  const avgRating = data.avg_rating ? parseFloat(data.avg_rating).toFixed(1) : null;
  const hasBackdrop = !!data.backdrop_path;
  const communities = data.communities || [];

  return (
    <div style={{
      margin: "6px 16px",
      borderRadius: 16,
      overflow: "hidden",
      border: "1px solid rgba(52,211,153,0.12)",
      borderTop: "3px solid var(--accent-green, #34d399)",
      position: "relative",
      cursor: "pointer",
    }}>
      {!flipped ? (
        <div
          key={flipCount}
          onClick={() => setFlipCount(c => c + 1)}
          style={{
            background: "var(--bg-card, #1a1714)",
            position: "relative",
            animation: flipCount > 0 ? "tapeFlip 0.3s ease-out" : "none",
          }}
        >
          {/* Backdrop — fades in from right */}
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
                background: `linear-gradient(90deg, var(--bg-card, #1a1714) 35%, rgba(19,24,40,0.6) 55%, rgba(19,24,40,0.25) 80%)`,
              }} />
              <div style={{
                position: "absolute", inset: 0,
                background: `linear-gradient(180deg, transparent 50%, var(--bg-card, #1a1714) 100%)`,
              }} />
            </div>
          )}

          {/* Subtle green ambient glow */}
          <div style={{
            position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)",
            width: 200, height: 80, borderRadius: "50%",
            background: "var(--accent-green, #34d399)",
            opacity: 0.04, filter: "blur(40px)",
            pointerEvents: "none",
          }} />

          {/* Poster + info + watch count */}
          <div style={{ display: "flex", gap: 12, padding: "14px 16px 14px", position: "relative", zIndex: 1, alignItems: "flex-start" }}>
            <Poster path={data.poster_path} tmdbId={data.tmdb_id} title={data.title} mediaType={data.media_type} width={72} height={108} radius={8} />
            <div style={{ flex: 1, paddingTop: 2, display: "flex", flexDirection: "column", minHeight: 104 }}>
              <div style={{
                fontFamily: t.fontSerif, fontSize: 18, fontWeight: 700,
                letterSpacing: "0.04em", textTransform: "uppercase",
                color: "var(--accent-green, #34d399)",
                marginBottom: 8,
              }}>
                Popular this week
              </div>
              <div style={{
                fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16,
                color: "var(--text-primary, #e8ecf4)", lineHeight: 1.2, marginBottom: 3,
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

              {/* Bottom row — pod pills left, watch count right */}
              <div style={{
                display: "flex", alignItems: "flex-end", justifyContent: "space-between",
                marginTop: "auto", paddingTop: 6,
              }}>
                {communities.length > 0 ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    {communities.slice(0, 3).map((c, i) => (
                      <div key={i} style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        background: t.bgElevated, borderRadius: 10,
                        padding: "3px 8px 3px 3px",
                      }}>
                        {c.community_image && (
                          <img src={c.community_image} loading="lazy" alt=""
                            style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }}
                          />
                        )}
                        <span style={{ fontSize: 10, color: "var(--text-faint, #5a6480)", whiteSpace: "nowrap" }}>
                          {getSlugAbbrev(c.community_slug)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : <div />}

                {/* Watch count */}
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  flexShrink: 0, gap: 2,
                }}>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 22,
                    color: "var(--accent-green, #34d399)", lineHeight: 1,
                  }}>
                    {data.watch_count}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 10,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    color: "var(--text-faint, #5a6480)",
                  }}>
                    watched
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Flip hint */}
          {communities.length > 0 && (
            <div style={{
              position: "absolute", bottom: 6, right: 12,
              fontFamily: "var(--font-mono)", fontSize: 6,
              color: "rgba(52,211,153,0.25)", letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              tap to see where
            </div>
          )}
        </div>
      ) : (
        <div
          key={flipCount}
          onClick={() => setFlipCount(c => c + 1)}
          style={{
            background: "var(--bg-card, #1a1714)",
            position: "relative",
            animation: "tapeFlip 0.3s ease-out",
            minHeight: 124,
            padding: "14px 16px",
          }}
        >
          {/* Grid lines */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 17px, rgba(255,255,255,0.015) 17px, rgba(255,255,255,0.015) 18px)",
          }} />

          {/* Title */}
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
            color: "rgba(52,211,153,0.4)", letterSpacing: "0.1em", textTransform: "uppercase",
            textAlign: "center", marginBottom: 10,
            paddingBottom: 6, borderBottom: `1px solid ${t.borderSubtle}`,
            position: "relative",
          }}>
            {data.title}
          </div>

          {/* Community logo grid */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 10,
            justifyContent: "center", alignItems: "center",
          }}>
            {communities.map((c, i) => {
              const cAccent = getCommunityAccent(c.community_slug);
              return (
                <div
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateCommunity?.(c.community_slug, data.tmdb_id);
                  }}
                  style={{ cursor: "pointer", flexShrink: 0 }}
                  title={c.community_name}
                >
                  {c.community_image ? (
                    <img src={c.community_image} loading="lazy" alt={c.community_name} style={{
                      width: 40, height: 40, borderRadius: 10, objectFit: "cover",
                      border: `2px solid ${cAccent}44`,
                    }} />
                  ) : (
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: `${cAccent}15`, border: `2px solid ${cAccent}44`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-display)", fontWeight: 800,
                      fontSize: 10, color: cAccent,
                    }}>
                      {(c.community_name || "").split(" ").map(w => w[0]).join("").slice(0, 3)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Flip back hint */}
          <div style={{
            position: "absolute", bottom: 6, right: 12,
            fontFamily: "var(--font-mono)", fontSize: 6,
            color: t.textFaint, letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            tap to flip back
          </div>
        </div>
      )}
    </div>
  );
}
export default TrendingCard;
