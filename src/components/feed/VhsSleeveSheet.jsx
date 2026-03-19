import { useEffect, useRef } from "react";
import { Stars, getCommunityAccent, resolveImg, TMDB_BACKDROP } from "./FeedPrimitives";

// ════════════════════════════════════════════════
// VHS SLEEVE SHEET — dark box-back slide-up
// ════════════════════════════════════════════════

// Compact money formatter
function fmtMoney(v) {
  if (!v || v <= 0) return null;
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

// Extract credits flexibly — handles TMDB {cast:[],crew:[]} or flat {director, cast:[]}
function parseCredits(credits, fallbackDirector) {
  if (!credits || (typeof credits === "object" && Object.keys(credits).length === 0)) {
    return { director: fallbackDirector || null, cast: [] };
  }
  // TMDB standard format
  if (credits.crew) {
    const dir = credits.crew.find(c => c.job === "Director");
    const cast = (credits.cast || []).slice(0, 6).map(c => c.name);
    return { director: dir?.name || fallbackDirector || null, cast };
  }
  // Flat format
  if (credits.director || credits.cast) {
    return {
      director: credits.director || fallbackDirector || null,
      cast: Array.isArray(credits.cast) ? credits.cast.slice(0, 6) : [],
    };
  }
  return { director: fallbackDirector || null, cast: [] };
}

// Parse studio names from production_companies
function parseStudios(companies) {
  if (!companies || !Array.isArray(companies) || companies.length === 0) return [];
  return companies
    .slice(0, 3)
    .map(c => (typeof c === "string" ? c : c.name))
    .filter(Boolean);
}

// Runtime formatter
function fmtRuntime(min) {
  if (!min || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Deterministic barcode
function makeBarcode(seed) {
  const pseudoRand = (i) => {
    const x = Math.sin(seed * 9301 + i * 49297 + 233) * 0.5 + 0.5;
    return Math.floor(x * 3) + 1;
  };
  const stripes = [];
  stripes.push({ w: 1, dark: true }, { w: 1, dark: false }, { w: 1, dark: true });
  for (let i = 0; i < 24; i++) stripes.push({ w: pseudoRand(i), dark: i % 2 === 0 });
  stripes.push({ w: 1, dark: true }, { w: 1, dark: false }, { w: 1, dark: true });
  return stripes;
}

export default function VhsSleeveSheet({ data, open, onClose, onNavigateCommunity }) {
  const sheetRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const communities = data?.communities || [];
  const backdropUrl = resolveImg(data?.backdrop_path, TMDB_BACKDROP);
  const budgetStr = fmtMoney(data?.budget);
  const grossStr = fmtMoney(data?.revenue);
  const runtimeStr = fmtRuntime(data?.runtime);
  const { director, cast } = parseCredits(data?.credits, data?.creator);
  const studios = parseStudios(data?.production_companies);
  const seed = data?.tmdb_id
    ? Number(data.tmdb_id)
    : (data?.title || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const stripes = makeBarcode(seed);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  // Swipe-to-dismiss
  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
  };
  const handleTouchMove = (e) => {
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && sheetRef.current) {
      currentY.current = dy;
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  };
  const handleTouchEnd = () => {
    if (currentY.current > 120) {
      onClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = "translateY(0)";
    }
    currentY.current = 0;
  };

  if (!data) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(0,0,0,0.7)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: "fixed",
          left: 0, right: 0, bottom: 0,
          zIndex: 1000,
          maxHeight: "88vh",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          background: "#0f0d0b",
          borderRadius: "16px 16px 0 0",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: open ? "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)" : "transform 0.25s ease-in",
          willChange: "transform",
        }}
      >
        {/* ── Drag handle ── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 2,
          display: "flex", justifyContent: "center",
          padding: "10px 0 6px",
          background: "linear-gradient(#0f0d0b, #0f0d0bEE, transparent)",
        }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: "rgba(255,255,255,0.2)",
          }} />
        </div>

        {/* ── Backdrop still ── */}
        {backdropUrl && (
          <div style={{
            position: "relative", width: "100%", height: 220, overflow: "hidden",
            marginTop: -10,
          }}>
            <img src={backdropUrl} alt="" style={{
              width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "center top",
              display: "block",
            }} />
            {/* Gradient to dark */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: "60%",
              background: "linear-gradient(transparent, #0f0d0b)",
              pointerEvents: "none",
            }} />
            {/* Film grain */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.06,
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='4' height='4' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E\")",
            }} />
          </div>
        )}

        {/* ── Content area ── */}
        <div style={{ padding: backdropUrl ? "0 20px 24px" : "12px 20px 24px" }}>

          {/* Title */}
          <div style={{
            fontFamily: "'Permanent Marker', cursive",
            fontSize: 22, color: "#f0ebe1",
            textAlign: "center",
            lineHeight: 1.15,
            marginBottom: 2,
          }}>
            {data.title}
          </div>

          {/* Year · Runtime · Rating — spec line */}
          <div style={{
            display: "flex", justifyContent: "center", alignItems: "center",
            gap: 8, marginBottom: 10,
          }}>
            {data.year && (
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700, fontSize: 11,
                color: "rgba(240,235,225,0.4)",
                letterSpacing: "0.06em",
              }}>{data.year}</span>
            )}
            {runtimeStr && (
              <>
                <span style={{ color: "rgba(240,235,225,0.15)", fontSize: 10 }}>·</span>
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700, fontSize: 11,
                  color: "rgba(240,235,225,0.4)",
                  letterSpacing: "0.06em",
                }}>{runtimeStr}</span>
              </>
            )}
            {data.rating > 0 && (
              <>
                <span style={{ color: "rgba(240,235,225,0.15)", fontSize: 10 }}>·</span>
                <Stars rating={data.rating} size={13} />
              </>
            )}
          </div>

          {/* Tagline */}
          {data.tagline && (
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, lineHeight: 1.5,
              color: "rgba(240,235,225,0.55)",
              fontStyle: "italic",
              textAlign: "center",
              maxWidth: "90%", margin: "0 auto 14px",
              letterSpacing: "0.01em",
            }}>
              "{data.tagline}"
            </div>
          )}

          {/* Director + Cast */}
          {(director || cast.length > 0) && (
            <div style={{
              borderTop: "1px solid rgba(240,235,225,0.06)",
              borderBottom: "1px solid rgba(240,235,225,0.06)",
              padding: "10px 0", marginBottom: 14,
            }}>
              {director && (
                <div style={{
                  display: "flex", gap: 6, marginBottom: cast.length > 0 ? 6 : 0,
                }}>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 800, fontSize: 8,
                    color: "rgba(240,235,225,0.25)",
                    letterSpacing: "0.14em", textTransform: "uppercase",
                    flexShrink: 0, paddingTop: 1,
                  }}>DIRECTED BY</span>
                  <span style={{
                    fontFamily: "'Permanent Marker', cursive",
                    fontSize: 12, color: "rgba(240,235,225,0.7)",
                  }}>{director}</span>
                </div>
              )}
              {cast.length > 0 && (
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 800, fontSize: 8,
                    color: "rgba(240,235,225,0.25)",
                    letterSpacing: "0.14em", textTransform: "uppercase",
                    flexShrink: 0, paddingTop: 2,
                  }}>STARRING</span>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10, color: "rgba(240,235,225,0.45)",
                    lineHeight: 1.5,
                  }}>
                    {cast.join(" · ")}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Overview / Synopsis */}
          {data.overview && (
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, lineHeight: 1.55,
              color: "rgba(240,235,225,0.4)",
              textAlign: "center",
              marginBottom: 14,
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
              {data.overview}
            </div>
          )}

          {/* Budget / WW Gross */}
          {(budgetStr || grossStr) && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 0, width: "100%", marginBottom: 14,
            }}>
              <div style={{ flex: 1, height: 1, background: "rgba(240,235,225,0.06)" }} />
              <div style={{ display: "flex", gap: 16, padding: "0 12px" }}>
                {budgetStr && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 800, fontSize: 7,
                      color: "rgba(240,235,225,0.2)",
                      letterSpacing: "0.14em", textTransform: "uppercase",
                    }}>Budget</div>
                    <div style={{
                      fontFamily: "'Permanent Marker', cursive",
                      fontSize: 16, color: "rgba(240,235,225,0.6)",
                      lineHeight: 1.1,
                    }}>{budgetStr}</div>
                  </div>
                )}
                {budgetStr && grossStr && (
                  <div style={{ width: 1, alignSelf: "stretch", background: "rgba(240,235,225,0.08)" }} />
                )}
                {grossStr && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 800, fontSize: 7,
                      color: "rgba(240,235,225,0.2)",
                      letterSpacing: "0.14em", textTransform: "uppercase",
                    }}>WW Gross</div>
                    <div style={{
                      fontFamily: "'Permanent Marker', cursive",
                      fontSize: 16, color: "rgba(240,235,225,0.6)",
                      lineHeight: 1.1,
                    }}>{grossStr}</div>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, height: 1, background: "rgba(240,235,225,0.06)" }} />
            </div>
          )}

          {/* Community podcast rows */}
          {communities.length > 0 && (
            <div style={{
              borderTop: "1px solid rgba(240,235,225,0.06)",
              paddingTop: 12, marginBottom: 14,
            }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800, fontSize: 8,
                color: "rgba(240,235,225,0.2)",
                letterSpacing: "0.14em", textTransform: "uppercase",
                marginBottom: 8,
              }}>
                Podcast Coverage
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {communities.map((c, i) => {
                  const cAccent = getCommunityAccent(c.community_slug);
                  return (
                    <div
                      key={`sheet-${c.community_slug}-${c.series_title || ""}-${i}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                        setTimeout(() => onNavigateCommunity?.(c.community_slug, data.tmdb_id), 300);
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        cursor: "pointer", padding: "4px 0",
                      }}
                    >
                      {c.community_image ? (
                        <img src={c.community_image} alt={c.community_name} style={{
                          width: 32, height: 32, borderRadius: 8, objectFit: "cover",
                          border: `1.5px solid ${cAccent}44`, flexShrink: 0,
                        }} />
                      ) : (
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          background: `${cAccent}15`, border: `1.5px solid ${cAccent}44`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800,
                          fontSize: 10, color: cAccent,
                        }}>
                          {(c.community_name || "").split(" ").map(w => w[0]).join("")}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: "'Permanent Marker', cursive",
                          fontSize: 12, color: "#f0ebe1",
                        }}>
                          {c.community_name}
                        </div>
                        {(c.series_title || c.episode_title) && (
                          <div style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 9, color: "rgba(240,235,225,0.35)",
                            textTransform: "uppercase", letterSpacing: "0.04em",
                            marginTop: 1, display: "flex", alignItems: "center", gap: 4,
                          }}>
                            <span>{c.series_title || c.episode_title}</span>
                            {c.series_total > 0 && (
                              <span style={{ color: cAccent, fontWeight: 600 }}>
                                {c.series_watched || 0}/{c.series_total}
                              </span>
                            )}
                          </div>
                        )}
                        {c.series_total > 0 && (
                          <div style={{
                            marginTop: 4, height: 3, borderRadius: 2,
                            background: "rgba(240,235,225,0.06)", overflow: "hidden",
                          }}>
                            <div style={{
                              height: "100%", borderRadius: 2,
                              width: `${Math.min(100, Math.round(((c.series_watched || 0) / c.series_total) * 100))}%`,
                              background: cAccent, opacity: 0.6,
                              transition: "width 0.3s ease",
                            }} />
                          </div>
                        )}
                        {c.badge?.badge_name && (
                          <div style={{
                            fontFamily: "'Permanent Marker', cursive",
                            fontSize: 9, color: c.badge.accent_color || cAccent,
                            opacity: (c.series_watched || 0) >= (c.series_total || 999) ? 1 : 0.5,
                            marginTop: 3,
                          }}>
                            {(c.series_watched || 0) >= (c.series_total || 999) ? "🏆 " : "🔒 "}{c.badge.badge_name}
                          </div>
                        )}
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke={cAccent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ flexShrink: 0, opacity: 0.5 }}>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Studio names */}
          {studios.length > 0 && (
            <div style={{
              display: "flex", justifyContent: "center", gap: 12,
              marginBottom: 14,
            }}>
              {studios.map((name, i) => (
                <div key={i} style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800, fontSize: 9,
                  color: "rgba(240,235,225,0.18)",
                  letterSpacing: "0.1em", textTransform: "uppercase",
                }}>
                  {name}
                </div>
              ))}
            </div>
          )}

          {/* ── Bottom: HOME VIDEO + Barcode (dark variant) ── */}
          <div style={{
            display: "flex", alignItems: "flex-end", justifyContent: "space-between",
            width: "100%", gap: 8,
            borderTop: "1px solid rgba(240,235,225,0.04)",
            paddingTop: 10,
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900, fontSize: 8,
              color: "rgba(240,235,225,0.12)",
              letterSpacing: "0.22em", textTransform: "uppercase",
              border: "1px solid rgba(240,235,225,0.08)",
              borderRadius: 2, padding: "3px 8px", flexShrink: 0,
            }}>
              Home Video
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "stretch", height: 22 }}>
                {stripes.map((s, i) => (
                  <div key={i} style={{
                    width: s.w * 1.5, height: "100%",
                    background: s.dark ? "rgba(240,235,225,0.2)" : "transparent",
                    flexShrink: 0,
                  }} />
                ))}
              </div>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 6, color: "rgba(240,235,225,0.12)",
                letterSpacing: "0.12em",
              }}>
                {String(seed).padStart(12, "0").slice(0, 12)}
              </div>
            </div>
          </div>

          {/* Legal flair — VHS authenticity touch */}
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 6, color: "rgba(240,235,225,0.08)",
            textAlign: "center", marginTop: 10,
            letterSpacing: "0.04em",
          }}>
            THIS CASSETTE IS FOR PRIVATE HOME USE ONLY
          </div>
        </div>
      </div>
    </>
  );
}
