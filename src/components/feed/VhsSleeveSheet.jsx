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

// Strip HTML tags + podcast promo tails from RSS descriptions
const PROMO_MARKERS = [
  /\bJoin our Patreon\b/i,
  /\bFollow us [@on]/i,
  /\bBe sure to (?:follow|subscribe)/i,
  /\bLearn more about your ad choices/i,
  /\bThanks to our SPONSOR/i,
  /\bThis episode is (?:brought to you|sponsored) by/i,
  /\bWeekly Plugs\b/i,
  /\bProducers?:/i,
  /\bVideo Producers?:/i,
  /\bGo to hdtgm\.com/i,
  /\bHave a Last Looks/i,
  /\bUse #slashtag/i,
  /\bWatch this episode on/i,
  /\bwe're making video versions/i,
  /\n\{[A-Z][^}]+Series\}/,           // NPP series tags like {Avengers Series}
  /\n•\s+Go to\b/i,                   // HDTGM bullet-point promos
];

function stripHtml(str) {
  if (!str) return "";
  // 1. HTML → plain text
  let text = str
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // 2. Truncate at earliest promo marker
  let cutIdx = text.length;
  for (const marker of PROMO_MARKERS) {
    const match = text.match(marker);
    if (match && match.index < cutIdx) cutIdx = match.index;
  }
  if (cutIdx < text.length) {
    text = text.slice(0, cutIdx).replace(/[\s\n:—–-]+$/, "").trim();
  }

  return text;
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

export default function VhsSleeveSheet({ data, open, onClose, onNavigateCommunity, artworkHero, hideOverview, episodes, epLoading, onPlayEpisode, currentEp, isPlaying, onTogglePlay }) {
  const sheetRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  // Lazy-load heavy detail fields — try media table first, fall back to TMDB API
  const [detail, setDetail] = useState(null);
  const [expandedEpId, setExpandedEpId] = useState(null); // which episode row is expanded
  const [hiddenEpIds, setHiddenEpIds] = useState(new Set()); // admin-deleted episodes
  const [isAdmin, setIsAdmin] = useState(false);
  const prevTmdbId = useRef(null);

  // Admin check (once)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id === "19410e64-d610-4fab-9c26-d24fafc94696") setIsAdmin(true);
    });
  }, []);

  useEffect(() => {
    if (!open || !data?.tmdb_id) return;

    // Reset detail when card changes
    if (data.tmdb_id !== prevTmdbId.current) {
      setDetail(null);
      setExpandedEpId(null);
      setHiddenEpIds(new Set());
      prevTmdbId.current = data.tmdb_id;
    }

    // Skip if we already have credits for THIS card
    if (data.credits) return;

    let cancelled = false;
    (async () => {
      // Try media table first (fast, cached for logged films)
      const { data: d } = await supabase
        .from("media")
        .select("overview,tagline,budget,revenue,runtime,credits,production_companies,still_paths,creator,genre")
        .eq("tmdb_id", data.tmdb_id)
        .maybeSingle();

      if (cancelled) return;
      if (d) { setDetail(d); return; }

      // Fallback: fetch from TMDB API (browse cards — film not in media table)
      const type = (data.media_type === "show") ? "tv" : "movie";
      const tmdbDetail = await apiProxy("tmdb_details", {
        tmdb_id: String(data.tmdb_id), type, append: "credits",
      });
      if (cancelled || !tmdbDetail || tmdbDetail.error) return;
      const detailObj = {
        overview: tmdbDetail.overview || null,
        tagline: tmdbDetail.tagline || null,
        budget: tmdbDetail.budget || null,
        revenue: tmdbDetail.revenue || null,
        runtime: tmdbDetail.runtime || null,
        credits: tmdbDetail.credits || null,
        production_companies: tmdbDetail.production_companies || null,
        genre: (tmdbDetail.genres || []).slice(0, 2).map(g => g.name).join(", ") || null,
        still_paths: null,
      };
      setDetail(detailObj);

      // Cache to media table — next person gets instant load
      const director = tmdbDetail.credits?.crew?.find(c => c.job === "Director")?.name || null;
      const genre = (tmdbDetail.genres || []).slice(0, 2).map(g => g.name).join(", ") || null;
      supabase
        .from("media")
        .upsert({
          media_type: "film",
          tmdb_id: data.tmdb_id,
          title: data.title || tmdbDetail.title,
          year: data.year ? parseInt(data.year) : (tmdbDetail.release_date || "").slice(0, 4) ? parseInt((tmdbDetail.release_date || "").slice(0, 4)) : null,
          creator: director,
          poster_path: data.poster_path || (tmdbDetail.poster_path ? `https://image.tmdb.org/t/p/w342${tmdbDetail.poster_path}` : null),
          backdrop_path: data.backdrop_path || (tmdbDetail.backdrop_path ? `https://image.tmdb.org/t/p/w780${tmdbDetail.backdrop_path}` : null),
          runtime: tmdbDetail.runtime || null,
          genre,
          overview: detailObj.overview,
          tagline: detailObj.tagline,
          budget: detailObj.budget,
          revenue: detailObj.revenue,
          credits: detailObj.credits,
          production_companies: detailObj.production_companies,
          certification: tmdbDetail.certification || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "tmdb_id", ignoreDuplicates: false })
        .then(() => {});
    })();
    return () => { cancelled = true; };
  }, [open, data?.tmdb_id]);

  // Merge lazy detail into data
  const merged = detail ? { ...data, ...detail,
    director: data.director || (detail.credits?.crew?.find(c => c.job === "Director")?.name) || detail?.creator || data.creator || null,
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
  // When opened from artwork card, swap hero to avoid duplicating the tape label image
  const heroUrl = artworkHero && extraBackdrops.length > 0 ? extraBackdrops[0] : backdropUrl;
  // Still image: use second pick for artwork (first is hero), first pick otherwise
  const stillUrl = artworkHero ? (extraBackdrops[1] || null) : (extraBackdrops[0] || null);
  const genreFont = getGenreFont(merged?.genre);
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

        // Pick 2 stills at spread-out positions for visual variety
        // Targets: index 4 and 9 (positions ~5 and ~10), with fallbacks
        function pickAt(arr, target, ...fallbacks) {
          for (const idx of [target, ...fallbacks]) {
            if (idx >= 0 && idx < arr.length) return arr[idx];
          }
          return arr.length > 0 ? arr[0] : null;
        }
        const pick1 = pickAt(clean, 4, 2, 0);       // hero replacement for artwork cards
        const pick2 = pickAt(clean, 9, 6, 3, 1);     // still image
        // Dedupe: if both resolve to same image, only keep one
        const picks = pick1 && pick2 && pick1.file_path === pick2.file_path
          ? [pick1] : [pick1, pick2].filter(Boolean);

        if (!cancelled && picks.length > 0) {
          const paths = picks.map(p => p.file_path);
          const stills = paths.map(p => `${TMDB_IMG_BASE}/w780${p}`);
          setExtraBackdrops(stills);

          // Write back to media so next open (by anyone) is instant
          supabase
            .from("media")
            .update({ still_paths: paths })
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
        {heroUrl && (
          <div style={{ position: "relative", width: "100%", marginBottom: 0 }}>
            {/* Hero backdrop — z1 (back) */}
            <div style={{ position: "relative", width: "100%", overflow: "hidden", zIndex: 1 }}>
              <img src={heroUrl} alt="" style={{
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
        {!heroUrl && (
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

        {/* ── Scene still (left) + Cast billing (right) ── */}
        {(stillUrl || cast.length > 0) && (
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-end",
            padding: "0 20px",
            marginTop: heroUrl && stillUrl ? -28 : 0,
            marginBottom: 6,
            position: "relative", zIndex: 2,
          }}>
            {/* Still — left side */}
            {stillUrl && (
              <div style={{
                flex: "0 0 52%", aspectRatio: "16/9",
                borderRadius: 2, overflow: "hidden", position: "relative",
                border: "2px solid rgba(240,235,225,0.18)",
                boxShadow: "inset 0 0 8px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)",
              }}>
                <img
                  src={stillUrl}
                  alt=""
                  style={{
                    width: "100%", height: "100%",
                    objectFit: "cover", display: "block",
                  }}
                  loading="lazy"
                />
                <div style={{
                  position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.1,
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='4' height='4' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E\")",
                }} />
              </div>
            )}

            {/* Cast billing — right side (top 3 only) */}
            {cast.length > 0 && (
              <div style={{
                flex: 1, display: "flex", flexDirection: "column",
                justifyContent: "flex-end",
                paddingBottom: 2,
              }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 400, fontSize: 8,
                  color: "rgba(240,235,225,0.4)",
                  letterSpacing: "0.1em", textTransform: "lowercase",
                  marginBottom: 3,
                }}>starring</div>
                {cast.slice(0, 3).map((name, i) => (
                  <div key={i} style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 500, fontSize: 14,
                    color: "rgba(240,235,225,0.9)",
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    lineHeight: 1.4,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{name}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Also starring + Directed by — centered billing block ── */}
        {(director || cast.length > 3) && (
          <div style={{
            padding: "6px 20px 0", textAlign: "center",
          }}>
            {cast.length > 3 && (
              <div style={{ marginBottom: 6, display: "flex", alignItems: "baseline", justifyContent: "center", gap: 5 }}>
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
            {director && (
              <div style={{
                display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6,
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
          </div>
        )}

        {/* ── Content area ── */}
        <div style={{
          padding: "6px 20px 20px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}>

          {/* Cast fallback — only when no stills (cast normally shows next to still) */}
          {cast.length > 0 && !stillUrl && (
            <div style={{
              borderTop: "1px solid rgba(240,235,225,0.06)",
              borderBottom: "1px solid rgba(240,235,225,0.06)",
              padding: "10px 0", marginBottom: 14, textAlign: "center",
            }}>
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

          {/* ═══ EPISODE PICKER — when opened from browse cards ═══ */}
          {(episodes || epLoading) && (
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
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(240,235,225,0.4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                </svg>
                Listen
              </div>
              {epLoading && !episodes && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "12px 0",
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%",
                    border: "2px solid rgba(240,235,225,0.1)",
                    borderTopColor: "rgba(240,235,225,0.5)",
                    animation: "ptr-spin 0.8s linear infinite",
                  }} />
                </div>
              )}
              {episodes && episodes.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {episodes.filter(ep => !hiddenEpIds.has(ep.episode_id)).map((ep, i) => {
                    const epKey = ep.episode_id || i;
                    const isActive = currentEp && currentEp.enclosureUrl === ep.audio_url;
                    const isActiveAndPlaying = isActive && isPlaying;
                    const isExpanded = expandedEpId === epKey;
                    const descText = stripHtml(ep.episode_description);
                    return (
                      <div key={epKey}>
                        <div
                          onClick={() => setExpandedEpId(isExpanded ? null : epKey)}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "7px 6px", cursor: "pointer", borderRadius: 6,
                            background: isExpanded ? "rgba(240,235,225,0.04)" : isActive ? "rgba(240,235,225,0.03)" : "transparent",
                            transition: "background 0.15s",
                          }}
                        >
                          {ep.podcast_artwork_url && (
                            <img src={ep.podcast_artwork_url} alt={ep.podcast_name} style={{
                              width: 32, height: 32, borderRadius: 8, objectFit: "cover",
                              border: isExpanded ? "1.5px solid #c4734f" : isActive ? "1.5px solid #c4734f" : "1.5px solid rgba(240,235,225,0.1)",
                              flexShrink: 0,
                            }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontFamily: "'Barlow Condensed', sans-serif",
                              fontWeight: 700, fontSize: 13,
                              color: isExpanded || isActive ? "#f0ebe1" : "rgba(240,235,225,0.7)",
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            }}>{ep.episode_title || ep.podcast_name}</div>
                            <div style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: 9, color: "rgba(240,235,225,0.35)",
                              textTransform: "uppercase", letterSpacing: "0.04em",
                            }}>{ep.podcast_name}{ep.podcast_tier === "deep" ? " · deep dive" : ""}</div>
                          </div>
                          {/* Play/pause button — separate tap target */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isActiveAndPlaying) {
                                onTogglePlay?.();
                              } else {
                                onPlayEpisode?.(ep);
                              }
                            }}
                            style={{
                              width: 32, height: 32, borderRadius: "50%",
                              background: isActiveAndPlaying ? "rgba(196,115,79,0.15)" : "rgba(240,235,225,0.04)",
                              border: isActiveAndPlaying ? "1px solid rgba(196,115,79,0.3)" : "1px solid rgba(240,235,225,0.08)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              flexShrink: 0,
                              transition: "all 0.15s",
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill={isActiveAndPlaying ? "#c4734f" : "rgba(240,235,225,0.5)"}>
                              {isActiveAndPlaying
                                ? <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>
                                : <path d="M8 5v14l11-7z" />
                              }
                            </svg>
                          </div>
                          {/* Admin: unlink episode from film */}
                          {isAdmin && ep.episode_id && (
                            <div
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!confirm(`Unlink "${ep.episode_title || ep.podcast_name}" from this film?`)) return;
                                const { error } = await supabase
                                  .from("podcast_episode_films")
                                  .delete()
                                  .eq("episode_id", ep.episode_id)
                                  .eq("tmdb_id", data.tmdb_id);
                                if (!error) {
                                  setHiddenEpIds(prev => new Set([...prev, ep.episode_id]));
                                }
                              }}
                              style={{
                                width: 26, height: 26, borderRadius: "50%",
                                background: "rgba(239,68,68,0.08)",
                                border: "1px solid rgba(239,68,68,0.2)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0, cursor: "pointer", marginLeft: -2,
                              }}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.6)" strokeWidth="2" strokeLinecap="round">
                                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                              </svg>
                            </div>
                          )}
                        </div>
                        {/* Inline accordion description */}
                        <div style={{
                          maxHeight: isExpanded ? 300 : 0,
                          overflow: "hidden",
                          transition: "max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}>
                          {descText ? (
                            <div style={{
                              padding: "4px 6px 10px 48px",
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: 10, lineHeight: 1.55,
                              color: "rgba(240,235,225,0.5)",
                              whiteSpace: "pre-wrap",
                            }}>
                              {descText}
                            </div>
                          ) : isExpanded ? (
                            <div style={{
                              padding: "4px 6px 10px 48px",
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: 9, fontStyle: "italic",
                              color: "rgba(240,235,225,0.25)",
                            }}>
                              No description available
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Overview / Synopsis — only on log sleeves, hidden on browse */}
          {!hideOverview && merged.overview && (
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
