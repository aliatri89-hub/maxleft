import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Stars, getCommunityAccent, resolveImg, TMDB_BACKDROP } from "./FeedPrimitives";
import { apiProxy } from "../../utils/api";
import { supabase } from "../../supabase";

const TMDB_IMG_BASE = "https://image.tmdb.org/t/p";

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

  // Lazy-load heavy detail fields (stripped from feed query to save bandwidth)
  const [detail, setDetail] = useState(null);
  useEffect(() => {
    if (!open || !data?.tmdb_id) return;
    // Already have detail data (either from a previous open or from full feed data)
    if (merged.overview !== undefined || data.credits !== undefined) return;
    let cancelled = false;
    supabase
      .from("media")
      .select("overview,tagline,budget,revenue,runtime,credits,production_companies,still_paths")
      .eq("tmdb_id", data.tmdb_id)
      .maybeSingle()
      .then(({ data: d }) => {
        if (cancelled || !d) return;
        setDetail(d);
      });
    return () => { cancelled = true; };
  }, [open, data?.tmdb_id]);

  // Reset detail when card changes
  useEffect(() => { setDetail(null); }, [data?.tmdb_id]);

  // Merge lazy detail into data
  const merged = detail ? { ...data, ...detail,
    director: data.director || (detail.credits?.crew?.find(c => c.job === "Director")?.name) || data.creator || null,
    cast_names: data.cast_names?.length ? data.cast_names : (detail.credits?.cast?.slice(0,6).map(c => c?.name).filter(Boolean) || []),
    studio_names: data.studio_names?.length ? data.studio_names : (Array.isArray(detail.production_companies) ? detail.production_companies.slice(0,3).map(c => ({ name: c?.name || c, logo_url: c?.logo_path ? ("https://image.tmdb.org/t/p/w92" + c.logo_path) : null })).filter(s => s.name) : []),
  } : data;

  const communities = merged?.communities || [];
  const backdropUrl = resolveImg(merged?.backdrop_path, TMDB_BACKDROP);
  const budgetStr = fmtMoney(merged?.budget);
  const grossStr = fmtMoney(merged?.revenue);
  const runtimeStr = fmtRuntime(merged?.runtime);
  const director = merged?.director || merged?.creator || null;
  const cast = merged?.cast_names || [];
  const studios = merged?.studio_names || [];
  const [extraBackdrops, setExtraBackdrops] = useState([]);
  const genreFont = getGenreFont(data?.genre);
  const seed = data?.tmdb_id
    ? Number(data.tmdb_id)
    : (data?.title || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const stripes = makeBarcode(seed);

  // Load genre font + Oswald (credits font) on demand when sheet opens
  useEffect(() => {
    if (open) {
      loadGoogleFont("Oswald");
      if (genreFont.family !== "Barlow Condensed") {
        loadGoogleFont(genreFont.family);
      }
    }
  }, [open, genreFont.family]);

  // Fetch extra backdrops — use cached still_paths when available, else fetch + cache
  useEffect(() => {
    setExtraBackdrops([]);
    if (!open || !data?.tmdb_id) return;
    let cancelled = false;

    // If still_paths are already cached in the DB, use them instantly
    if (merged.still_paths?.length) {
      const stills = merged.still_paths.map(p =>
        p.startsWith("http") ? p : `${TMDB_IMG_BASE}/w780${p}`
      );
      setExtraBackdrops(stills);
      return;
    }

    (async () => {
      try {
        const type = (data.media_type === "show") ? "tv" : "movie";
        const rawHero = data.backdrop_path || "";
        const heroMatch = rawHero.match(/\/[^/]+$/);
        const heroBdPath = heroMatch ? heroMatch[0] : rawHero;

        // Fetch from TMDB
        let backdrops = null;
        const imgRes = await apiProxy("tmdb_images", {
          tmdb_id: String(data.tmdb_id), type,
        });
        if (imgRes?.backdrops?.length) {
          backdrops = imgRes.backdrops;
        } else {
          const detailRes = await apiProxy("tmdb_details", {
            tmdb_id: String(data.tmdb_id), type, append: "images",
          });
          if (detailRes?.images?.backdrops?.length) {
            backdrops = detailRes.images.backdrops;
          }
        }

        if (cancelled || !backdrops?.length) return;

        // Deduplicate: exclude hero backdrop by file_path match
        const heroPath = heroBdPath.replace(/^\//, "");
        const base = backdrops.filter(b =>
          b.file_path &&
          b.file_path.replace(/^\//, "") !== heroPath &&
          (!b.aspect_ratio || b.aspect_ratio > 1.4)
        );

        // Deduplicate by file_path (TMDB sometimes returns near-dupes)
        const seen = new Set();
        const deduped = base.filter(b => {
          const key = b.file_path;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        const nullLang = deduped.filter(b => !b.iso_639_1)
          .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
        const enLang = deduped.filter(b => b.iso_639_1 === "en")
          .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
        const clean = nullLang.length >= 2 ? nullLang : [...nullLang, ...enLang];

        const picks = [];
        if (clean.length >= 4) {
          const a = Math.max(1, Math.floor(clean.length * 0.25));
          const b = Math.min(clean.length - 1, Math.floor(clean.length * 0.65));
          picks.push(clean[a], clean[b]);
        } else if (clean.length >= 2) {
          picks.push(clean[0], clean[clean.length - 1]);
        } else if (clean.length === 1) {
          picks.push(clean[0]);
        }

        if (!cancelled && picks.length) {
          // Final dedup — ensure no duplicate paths in the pick set
          const uniquePaths = [...new Set(picks.map(b => b.file_path))];
          const stills = uniquePaths.map(p => `${TMDB_IMG_BASE}/w780${p}`);
          setExtraBackdrops(stills);

          // Write back to media so next open (by anyone) is instant
          supabase
            .from("media")
            .update({ still_paths: uniquePaths })
            .eq("tmdb_id", data.tmdb_id)
            .then(() => {});
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [open, data?.tmdb_id]);

  // Prevent background scroll while sheet is open
  useLayoutEffect(() => {
    if (open) {
      const pane = document.querySelector('.tab-pane');
      if (pane) {
        pane.style.overflow = 'hidden';
        return () => { pane.style.overflow = ''; };
      }
    }
  }, [open]);

  // Swipe-to-dismiss — stopPropagation prevents React portal event bubbling
  // from reaching FeedScreen's pull-to-refresh handlers
  const handleTouchStart = (e) => {
    e.stopPropagation();
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
  };
  const handleTouchMove = (e) => {
    e.stopPropagation();
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && sheetRef.current) {
      currentY.current = dy;
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  };
  const handleTouchEnd = (e) => {
    e.stopPropagation();
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
            url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.14'/%3E%3C/svg%3E"),
            #171411
          `.trim(),
          backgroundSize: "100px 100px, auto",
          borderRadius: "14px 14px 0 0",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: open ? "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)" : "transform 0.25s ease-in",
          willChange: "transform",
          paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
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
          background: "linear-gradient(#171411, #171411EE, transparent)",
        }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: "rgba(255,255,255,0.2)",
          }} />
        </div>

        {/* ── Tagline — genre-driven typography ── */}
        {merged.tagline && (
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
            {merged.tagline}
          </div>
        )}

        {/* ── Hero + Stills + Logo — layered: hero(back) → stills(mid) → logo(front) ── */}
        {backdropUrl && (
          <div style={{ position: "relative", width: "100%", marginBottom: 0 }}>
            {/* Hero backdrop — z1 (back) */}
            <div style={{ position: "relative", width: "100%", overflow: "hidden", zIndex: 1 }}>
              <img src={backdropUrl} alt="" style={{
                width: "100%", height: 200,
                objectFit: "cover", objectPosition: "center top",
                display: "block",
              }} />
              {/* Gradient to dark — top and bottom */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "30%",
                background: "linear-gradient(rgba(23,20,17,0.6), transparent)",
                pointerEvents: "none",
              }} />
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: "60%",
                background: "linear-gradient(transparent, #171411)",
                pointerEvents: "none",
              }} />
            </div>

            {/* Movie logo — z3 (front, above stills) */}
            {data.logo_url ? (
              <div style={{
                position: "absolute", bottom: 12, left: 0, right: 0,
                display: "flex", justifyContent: "center",
                zIndex: 3, pointerEvents: "none",
              }}>
                <img
                  src={data.logo_url}
                  alt={data.title}
                  style={{
                    height: 40,
                    maxWidth: "70%",
                    objectFit: "contain",
                    filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.8))",
                    opacity: 0.95,
                  }}
                />
              </div>
            ) : (
              <div style={{
                position: "absolute", bottom: 10, left: 0, right: 0,
                textAlign: "center", zIndex: 3, pointerEvents: "none",
              }}>
                <span style={{
                  fontFamily: "'Permanent Marker', cursive",
                  fontSize: 20, color: "#f0ebe1",
                  textShadow: "0 2px 8px rgba(0,0,0,0.9)",
                }}>
                  {data.title}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── No-backdrop fallback: standalone title ── */}
        {!backdropUrl && (
          <div style={{
            padding: "8px 24px 12px",
            textAlign: "center",
          }}>
            {data.logo_url ? (
              <img
                src={data.logo_url}
                alt={data.title}
                style={{
                  height: 44,
                  maxWidth: "75%",
                  objectFit: "contain",
                  filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))",
                  opacity: 0.95,
                }}
              />
            ) : (
              <div style={{
                fontFamily: "'Permanent Marker', cursive",
                fontSize: 22, color: "#f0ebe1",
                lineHeight: 1.2,
              }}>
                {data.title}
              </div>
            )}
            {data.year && (
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, color: "rgba(240,235,225,0.35)",
                letterSpacing: "0.1em", marginTop: 4,
              }}>
                {data.year}
              </div>
            )}
          </div>
        )}

        {/* ── Scene stills — overlap hero when present, sit naturally without ── */}
        {extraBackdrops.length > 0 && (
          <div style={{
            display: "flex", gap: 8, justifyContent: "center",
            padding: "0 20px",
            marginTop: backdropUrl ? -28 : 0,
            marginBottom: 6,
            position: "relative", zIndex: 2,
          }}>
            {extraBackdrops.map((url, i) => (
              <div key={i} style={{
                flex: 1, maxWidth: "48%", aspectRatio: "16/9",
                borderRadius: 2, overflow: "hidden", position: "relative",
                border: "2px solid rgba(240,235,225,0.18)",
                boxShadow: "inset 0 0 8px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)",
              }}>
                <img
                  src={url}
                  alt=""
                  style={{
                    width: "100%", height: "100%",
                    objectFit: "cover", display: "block",
                  }}
                  loading="lazy"
                />
                {/* Film grain on stills */}
                <div style={{
                  position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.1,
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='4' height='4' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E\")",
                }} />
              </div>
            ))}
          </div>
        )}

        {/* ── Content area ── */}
        <div style={{
          padding: "6px 20px 20px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}>

          {/* Director + Cast — VHS billing block */}
          {(director || cast.length > 0) && (
            <div style={{
              borderTop: "1px solid rgba(240,235,225,0.06)",
              borderBottom: "1px solid rgba(240,235,225,0.06)",
              padding: "10px 0", marginBottom: 14, textAlign: "center",
            }}>
              {director && (
                <div style={{
                  display: "flex", alignItems: "baseline", justifyContent: "center",
                  gap: 6, marginBottom: cast.length > 0 ? 8 : 0,
                }}>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 400, fontSize: 8,
                    color: "rgba(240,235,225,0.4)",
                    letterSpacing: "0.1em", textTransform: "lowercase",
                  }}>directed by</span>
                  <span style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 500, fontSize: 14,
                    color: "rgba(240,235,225,0.9)",
                    letterSpacing: "0.06em", textTransform: "uppercase",
                  }}>{director}</span>
                </div>
              )}
              {cast.length > 0 && (<>
                {/* Top 3 billed — same size names, no connectors */}
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", flexWrap: "wrap", gap: "0 10px" }}>
                  {cast.slice(0, 3).map((name, i) => (
                    <span key={i} style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 500, fontSize: 14,
                      color: "rgba(240,235,225,0.9)",
                      letterSpacing: "0.06em", textTransform: "uppercase",
                    }}>{name}</span>
                  ))}
                </div>
                {/* Also starring — second line */}
                {cast.length > 3 && (
                  <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", justifyContent: "center", gap: 5 }}>
                    <span style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 400, fontSize: 8,
                      color: "rgba(240,235,225,0.4)",
                      letterSpacing: "0.1em",
                    }}>also starring</span>
                    <span style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 400, fontSize: 11,
                      color: "rgba(240,235,225,0.6)",
                      letterSpacing: "0.04em", textTransform: "uppercase",
                    }}>{cast.slice(3).join(", ")}</span>
                  </div>
                )}
              </>)}
            </div>
          )}

          {/* Overview / Synopsis */}
          {merged.overview && (
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, lineHeight: 1.55,
              color: "rgba(240,235,225,0.65)",
              textAlign: "center",
              marginBottom: 14,
            }}>
              {merged.overview}
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

          {/* ═══ BOTTOM SECTION — studios, barcode row ═══ */}
          <div style={{
            borderTop: "2px solid rgba(240,235,225,0.15)",
            marginTop: 8,
            paddingTop: 12,
          }}>
            {/* Studio names + logos */}
            {studios.length > 0 && (
              <div style={{
                display: "flex", justifyContent: "center", alignItems: "center",
                gap: 16, marginBottom: 10, flexWrap: "wrap",
              }}>
                {studios.map((studio, i) => (
                  <div key={i} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  }}>
                    {studio.logo_url ? (
                      <img
                        src={studio.logo_url}
                        alt={studio.name}
                        style={{
                          height: 18, width: "auto", maxWidth: 72,
                          objectFit: "contain",
                          filter: "brightness(0) invert(1)",
                          opacity: 0.85,
                        }}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 800, fontSize: 9,
                        color: "#f0ebe1",
                        letterSpacing: "0.1em", textTransform: "uppercase",
                      }}>
                        {studio.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Bottom row: Budget/Gross left · Barcode center · MPAA right */}
            <div style={{
              display: "flex", alignItems: "flex-end", justifyContent: "space-between",
            }}>
              {/* Budget / Gross — bottom left */}
              <div style={{ minWidth: 60 }}>
                {(budgetStr || grossStr) && (
                  <div style={{ display: "flex", gap: 10 }}>
                    {budgetStr && (
                      <div>
                        <div style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 800, fontSize: 6,
                          color: "rgba(240,235,225,0.35)",
                          letterSpacing: "0.12em", textTransform: "uppercase",
                        }}>Budget</div>
                        <div style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 700, fontSize: 13,
                          color: "rgba(240,235,225,0.7)",
                          letterSpacing: "0.02em",
                          lineHeight: 1.1,
                        }}>{budgetStr}</div>
                      </div>
                    )}
                    {grossStr && (
                      <div>
                        <div style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 800, fontSize: 6,
                          color: "rgba(240,235,225,0.35)",
                          letterSpacing: "0.12em", textTransform: "uppercase",
                        }}>WW Gross</div>
                        <div style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 700, fontSize: 13,
                          color: "rgba(240,235,225,0.7)",
                          letterSpacing: "0.02em",
                          lineHeight: 1.1,
                        }}>{grossStr}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Barcode — center */}
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

              {/* MPAA Rating — bottom right */}
              <div style={{ minWidth: 60, display: "flex", justifyContent: "flex-end" }}>
                {data.certification && data.certification !== "NR" && (
                  <div style={{
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
