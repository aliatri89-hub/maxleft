import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Stars, getCommunityAccent, resolveImg, TMDB_BACKDROP } from "./FeedPrimitives";

// ════════════════════════════════════════════════
// VHS SLEEVE SHEET — dark box-back slide-up
// ════════════════════════════════════════════════

// ── Genre → Font mapping ──
// Each genre gets a Google Font that matches its video store energy
const GENRE_FONTS = {
  Horror:           { family: "Creepster",          weight: 400, transform: "none",       spacing: "0.04em" },
  Comedy:           { family: "Boogaloo",           weight: 400, transform: "none",       spacing: "0.02em" },
  Action:           { family: "Anton",              weight: 400, transform: "uppercase",  spacing: "0.08em" },
  Drama:            { family: "Playfair Display",   weight: 700, transform: "none",       spacing: "0.03em" },
  Romance:          { family: "Dancing Script",     weight: 700, transform: "none",       spacing: "0.01em" },
  "Science Fiction": { family: "Orbitron",          weight: 700, transform: "uppercase",  spacing: "0.1em"  },
  Thriller:         { family: "Teko",               weight: 600, transform: "uppercase",  spacing: "0.12em" },
  Adventure:        { family: "Righteous",          weight: 400, transform: "none",       spacing: "0.03em" },
  Fantasy:          { family: "Cinzel Decorative",  weight: 700, transform: "none",       spacing: "0.06em" },
  Animation:        { family: "Bubblegum Sans",     weight: 400, transform: "none",       spacing: "0.02em" },
  Documentary:      { family: "Special Elite",      weight: 400, transform: "none",       spacing: "0.04em" },
  Crime:            { family: "Russo One",          weight: 400, transform: "uppercase",  spacing: "0.08em" },
  Mystery:          { family: "Shadows Into Light", weight: 400, transform: "none",       spacing: "0.03em" },
  War:              { family: "Black Ops One",      weight: 400, transform: "uppercase",  spacing: "0.06em" },
  Western:          { family: "Rye",                weight: 400, transform: "none",       spacing: "0.04em" },
  Music:            { family: "Lobster",            weight: 400, transform: "none",       spacing: "0.01em" },
  History:          { family: "Cinzel",             weight: 700, transform: "none",       spacing: "0.08em" },
  Family:           { family: "Fredoka",            weight: 600, transform: "none",       spacing: "0.02em" },
};

const DEFAULT_FONT = { family: "Barlow Condensed", weight: 600, transform: "uppercase", spacing: "0.14em" };

// Extract primary genre from comma-separated string
function getPrimaryGenre(genreStr) {
  if (!genreStr) return null;
  return genreStr.split(",")[0].trim();
}

// Get font config for a genre string
function getGenreFont(genreStr) {
  const primary = getPrimaryGenre(genreStr);
  if (!primary) return DEFAULT_FONT;
  return GENRE_FONTS[primary] || DEFAULT_FONT;
}

// Load a Google Font on demand (idempotent)
const _loadedFonts = new Set();
function loadGoogleFont(family) {
  if (!family || family === "Barlow Condensed" || _loadedFonts.has(family)) return;
  _loadedFonts.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
}

// Compact money formatter
function fmtMoney(v) {
  if (!v || v <= 0) return null;
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
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
  const director = data?.director || data?.creator || null;
  const cast = data?.cast_names || [];
  const studios = data?.studio_names || [];
  const genreFont = getGenreFont(data?.genre);
  const seed = data?.tmdb_id
    ? Number(data.tmdb_id)
    : (data?.title || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const stripes = makeBarcode(seed);

  // Load genre font on demand when sheet opens
  useEffect(() => {
    if (open && genreFont.family !== "Barlow Condensed") {
      loadGoogleFont(genreFont.family);
    }
  }, [open, genreFont.family]);

  // Lock body scroll when open — preserves scroll position on iOS/Capacitor
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        window.scrollTo(0, scrollY);
      };
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

  return createPortal(
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
          maxHeight: "92%",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          background: `
            repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(240,235,225,0.03) 2px, rgba(240,235,225,0.03) 3px),
            url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E"),
            #0f0d0b
          `.trim(),
          backgroundSize: "auto, 128px 128px, auto",
          borderRadius: "14px 14px 0 0",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: open ? "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)" : "transform 0.25s ease-in",
          willChange: "transform",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          /* VHS box frame */
          maxWidth: 420,
          marginLeft: "auto",
          marginRight: "auto",
          border: "3px solid rgba(240,235,225,0.28)",
          borderBottom: "none",
          boxShadow: "0 -4px 30px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(240,235,225,0.1)",
          minHeight: "86vh",
          display: "flex",
          flexDirection: "column",
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

        {/* ── Tagline — genre-driven typography ── */}
        {data.tagline && (
          <div style={{
            fontFamily: `'${genreFont.family}', sans-serif`,
            fontWeight: genreFont.weight,
            fontSize: 15,
            color: "rgba(240,235,225,0.75)",
            textAlign: "center",
            textTransform: genreFont.transform,
            letterSpacing: genreFont.spacing,
            lineHeight: 1.35,
            padding: "2px 24px 8px",
            maxWidth: "90%",
            margin: "0 auto",
          }}>
            {data.tagline}
          </div>
        )}

        {/* ── Backdrop still — retro framed with logo overlay ── */}
        {backdropUrl && (
          <div style={{
            padding: "0 16px",
            marginBottom: 4,
          }}>
            <div style={{
              position: "relative", width: "100%", height: 200, overflow: "hidden",
              borderRadius: 3,
              border: "2px solid rgba(240,235,225,0.15)",
              boxShadow: "inset 0 0 12px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)",
            }}>
              <img src={backdropUrl} alt="" style={{
                width: "100%", height: "100%",
                objectFit: "cover", objectPosition: "center top",
                display: "block",
              }} />
              {/* Gradient to dark at bottom edge */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
                background: "linear-gradient(transparent, rgba(15,13,11,0.85))",
                pointerEvents: "none",
              }} />
              {/* Film grain */}
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.08,
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='4' height='4' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E\")",
              }} />
              {/* Corner wear */}
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                borderRadius: 3,
                boxShadow: "inset 0 0 0 1px rgba(240,235,225,0.05)",
              }} />
              {/* ── Movie logo — overlaying bottom of frame ── */}
              {data.logo_url ? (
                <div style={{
                  position: "absolute", bottom: 10, left: 0, right: 0,
                  display: "flex", justifyContent: "center",
                  zIndex: 1,
                }}>
                  <img
                    src={data.logo_url}
                    alt={data.title}
                    style={{
                      height: 36,
                      maxWidth: "65%",
                      objectFit: "contain",
                      filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.7))",
                      opacity: 0.9,
                    }}
                  />
                </div>
              ) : (
                <div style={{
                  position: "absolute", bottom: 8, left: 0, right: 0,
                  textAlign: "center", zIndex: 1,
                }}>
                  <span style={{
                    fontFamily: "'Permanent Marker', cursive",
                    fontSize: 18, color: "#f0ebe1",
                    textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                  }}>
                    {data.title}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Content area ── */}
        <div style={{
          padding: "6px 20px 20px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}>

          {/* Year · Runtime · Rating — spec line */}
          <div style={{
            display: "flex", justifyContent: "center", alignItems: "center",
            gap: 8, marginBottom: 10,
          }}>
            {data.year && (
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700, fontSize: 11,
                color: "rgba(240,235,225,0.8)",
                letterSpacing: "0.06em",
              }}>{data.year}</span>
            )}
            {runtimeStr && (
              <>
                <span style={{ color: "rgba(240,235,225,0.3)", fontSize: 10 }}>·</span>
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700, fontSize: 11,
                  color: "rgba(240,235,225,0.8)",
                  letterSpacing: "0.06em",
                }}>{runtimeStr}</span>
              </>
            )}
            {data.rating > 0 && (
              <>
                <span style={{ color: "rgba(240,235,225,0.3)", fontSize: 10 }}>·</span>
                <Stars rating={data.rating} size={13} />
              </>
            )}
          </div>

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
                    color: "rgba(240,235,225,0.45)",
                    letterSpacing: "0.14em", textTransform: "uppercase",
                    flexShrink: 0, paddingTop: 1,
                  }}>DIRECTED BY</span>
                  <span style={{
                    fontFamily: "'Permanent Marker', cursive",
                    fontSize: 12, color: "rgba(240,235,225,0.9)",
                  }}>{director}</span>
                </div>
              )}
              {cast.length > 0 && (
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 800, fontSize: 8,
                    color: "rgba(240,235,225,0.45)",
                    letterSpacing: "0.14em", textTransform: "uppercase",
                    flexShrink: 0, paddingTop: 2,
                  }}>STARRING</span>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10, color: "rgba(240,235,225,0.65)",
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
              color: "rgba(240,235,225,0.8)",
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
                      color: "rgba(240,235,225,0.4)",
                      letterSpacing: "0.14em", textTransform: "uppercase",
                    }}>Budget</div>
                    <div style={{
                      fontFamily: "'Permanent Marker', cursive",
                      fontSize: 16, color: "rgba(240,235,225,0.85)",
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
                      color: "rgba(240,235,225,0.4)",
                      letterSpacing: "0.14em", textTransform: "uppercase",
                    }}>WW Gross</div>
                    <div style={{
                      fontFamily: "'Permanent Marker', cursive",
                      fontSize: 16, color: "rgba(240,235,225,0.85)",
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
                color: "rgba(240,235,225,0.4)",
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
                            fontSize: 9, color: "rgba(240,235,225,0.6)",
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

          {/* Spacer — fills remaining VHS box space */}
          <div style={{ flex: 1 }} />

          {/* ═══ BOTTOM SECTION — studios, barcode, rating ═══ */}
          <div style={{
            borderTop: "2px solid rgba(240,235,225,0.15)",
            marginTop: 8,
            paddingTop: 12,
          }}>
            {/* Studio names — pure white */}
            {studios.length > 0 && (
              <div style={{
                display: "flex", justifyContent: "center", gap: 14,
                marginBottom: 12,
              }}>
                {studios.map((name, i) => (
                  <div key={i} style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 800, fontSize: 9,
                    color: "#f0ebe1",
                    letterSpacing: "0.1em", textTransform: "uppercase",
                  }}>
                    {name}
                  </div>
                ))}
              </div>
            )}

            {/* HOME VIDEO stamp — pure white */}
            <div style={{ textAlign: "center", marginBottom: 6 }}>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900, fontSize: 8,
                color: "#f0ebe1",
                letterSpacing: "0.22em", textTransform: "uppercase",
                border: "1.5px solid rgba(240,235,225,0.4)",
                borderRadius: 2, padding: "3px 8px",
              }}>
                Home Video
              </span>
            </div>

            {/* Barcode + MPAA row */}
            <div style={{ position: "relative" }}>
              {/* Barcode — centered, pure white */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "stretch", height: 26 }}>
                  {stripes.map((s, i) => (
                    <div key={i} style={{
                      width: s.w * 1.5, height: "100%",
                      background: s.dark ? "#f0ebe1" : "transparent",
                      flexShrink: 0,
                    }} />
                  ))}
                </div>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 6, color: "#f0ebe1",
                  letterSpacing: "0.12em",
                }}>
                  {String(seed).padStart(12, "0").slice(0, 12)}
                </div>
              </div>

              {/* MPAA Rating — lower right, pure white */}
              {data.certification && data.certification !== "NR" && (
                <div style={{
                  position: "absolute", bottom: 0, right: 0,
                  border: "1.5px solid #f0ebe1",
                  borderRadius: 2,
                  padding: "2px 6px",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800, fontSize: 11,
                  color: "#f0ebe1",
                  letterSpacing: "0.06em",
                  lineHeight: 1,
                }}>
                  {data.certification}
                </div>
              )}
            </div>
          </div>

          {/* Legal flair — VHS authenticity touch */}
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 6, color: "rgba(240,235,225,0.15)",
            textAlign: "center", marginTop: 10,
            letterSpacing: "0.04em",
          }}>
            THIS CASSETTE IS FOR PRIVATE HOME USE ONLY
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
