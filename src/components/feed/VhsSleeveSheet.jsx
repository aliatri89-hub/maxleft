import { t } from "../../theme";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Stars, resolveImg, TMDB_BACKDROP, isPatreonUrl, FadeImg } from "./FeedPrimitives";
import { resolveAudioUrl, toPlayerEpisode } from "../../utils/episodeUrl";
import { apiProxy, fetchTMDBWatchProviders } from "../../utils/api";
import { supabase } from "../../supabase";
import WatchProviders from "../community/shared/WatchProviders";
import QuickLogModal from "./QuickLogModal";
import { useAudioPlayer, renderWithTimecodes } from "../community/shared/AudioPlayerProvider";

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

export default function VhsSleeveSheet({ data, open, onClose, onNavigateCommunity, artworkHero, showProviders, episodes, epLoading, onPlayEpisode, onQueueEpisode, currentEp, isPlaying, buffering, onTogglePlay }) {
  const sheetRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const { seekTo, currentEp: playerCurrentEp, queue, removeFromQueue, showNudge } = useAudioPlayer();
  const [queuedUrls, setQueuedUrls] = useState(new Set());

  const handleTimecodeSeek = (ep, sec) => {
    const epUrl = resolveAudioUrl(ep);
    const isCurrent = playerCurrentEp?.enclosureUrl === epUrl;
    if (isCurrent) { seekTo(sec); return; }
    if (onPlayEpisode) onPlayEpisode({ ...ep, startAt: sec });
  };

  // Lazy-load heavy detail fields — try media table first, fall back to TMDB API
  const [detail, setDetail] = useState(null);
  const [expandedEpId, setExpandedEpId] = useState(null); // which episode row is expanded
  const [hiddenEpIds, setHiddenEpIds] = useState(new Set()); // admin-deleted episodes
  const [isAdmin, setIsAdmin] = useState(false);
  const [providers, setProviders] = useState(null);
  const [onWatchlist, setOnWatchlist] = useState(false);
  const [watchlistSaving, setWatchlistSaving] = useState(false);
  const [isLogged, setIsLogged] = useState(!!data?.logged_at || !!data?.completed_at);
  const [showLogModal, setShowLogModal] = useState(false);
  const userIdRef = useRef(null);
  const [userId, setUserId] = useState(null);
  const prevTmdbId = useRef(null);

  // Session check (once)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        userIdRef.current = session.user.id;
        setUserId(session.user.id);
        if (session.user.id === "19410e64-d610-4fab-9c26-d24fafc94696") setIsAdmin(true);
      }
    });
  }, []);

  // Check watchlist status when card opens
  useEffect(() => {
    if (!open || !data?.title || !userId) { setOnWatchlist(false); return; }
    supabase.from("wishlist").select("id")
      .eq("user_id", userId).eq("title", data.title)
      .in("item_type", ["movie", "show"])
      .maybeSingle()
      .then(({ data: row }) => setOnWatchlist(!!row));
  }, [open, data?.title, userId]);

  const toggleWatchlist = async () => {
    if (!userIdRef.current || !data?.title || watchlistSaving) return;
    setWatchlistSaving(true);
    try {
      if (onWatchlist) {
        await supabase.from("wishlist").delete()
          .eq("user_id", userIdRef.current).eq("title", data.title)
          .in("item_type", ["movie", "show"]);
        setOnWatchlist(false);
      } else {
        const coverUrl = data.poster_path
          ? `https://image.tmdb.org/t/p/w342${data.poster_path}`
          : data.cover_url || null;
        await supabase.from("wishlist").insert({
          user_id: userIdRef.current,
          item_type: "movie",
          title: data.title,
          cover_url: coverUrl,
          year: data.year || null,
        });
        setOnWatchlist(true);
      }
    } catch (e) { console.warn("[VhsSleeve] Watchlist error:", e); }
    setWatchlistSaving(false);
  };

  // Check if film is already logged
  useEffect(() => {
    if (!open || !data?.tmdb_id || !userId) return;
    // Activity feed cards already know they're logged — trust the data
    if (data.logged_at || data.completed_at) { setIsLogged(true); return; }
    // Browse/discover cards need a DB check via the films view (has tmdb_id)
    supabase.from("user_films_v").select("id")
      .eq("user_id", userId).eq("tmdb_id", data.tmdb_id)
      .limit(1)
      .then(({ data: rows, error }) => {
        if (error) { console.warn("[VhsSleeve] isLogged check error:", error); return; }
        setIsLogged(rows && rows.length > 0);
      });
  }, [open, data?.tmdb_id, userId]);

  const handleLog = () => {
    if (!userIdRef.current || !data?.tmdb_id) return;
    setShowLogModal(true);
  };

  const onLogged = () => {
    setIsLogged(true);
    if (onWatchlist) {
      supabase.from("wishlist").delete()
        .eq("user_id", userIdRef.current).eq("title", data.title)
        .in("item_type", ["movie", "show"])
        .then(() => setOnWatchlist(false));
    }
  };

  useEffect(() => {
    if (!open || !data?.tmdb_id) return;

    // Reset detail when card changes
    if (data.tmdb_id !== prevTmdbId.current) {
      setDetail(null);
      setExpandedEpId(null);
      setHiddenEpIds(new Set());
      setProviders(null);
      setOnWatchlist(false);
      setIsLogged(!!data?.logged_at || !!data?.completed_at);
      setShowLogModal(false);
      prevTmdbId.current = data.tmdb_id;
    }

    // Skip if we already have credits with actual cast data for THIS card
    if (data.credits?.cast?.length > 0) return;

    let cancelled = false;
    (async () => {
      // Try media table first (fast, cached for logged films)
      const { data: d } = await supabase
        .from("media")
        .select("overview,tagline,budget,revenue,runtime,credits,production_companies,still_paths,creator,genre")
        .eq("tmdb_id", data.tmdb_id)
        .maybeSingle();

      if (cancelled) return;
      if (d && d.credits?.cast?.length > 0) { setDetail(d); return; }

      // Fallback: fetch from TMDB API (browse cards — film not in media table, or credits not cached)
      const partialDetail = d || null;
      const type = (data.media_type === "show") ? "tv" : "movie";
      const tmdbDetail = await apiProxy("tmdb_details", {
        tmdb_id: String(data.tmdb_id), type, append: "credits",
      });
      if (cancelled || !tmdbDetail || tmdbDetail.error) {
        // Still use partial detail if TMDB fails (has overview/tagline at least)
        if (!cancelled && partialDetail) setDetail(partialDetail);
        return;
      }
      const detailObj = {
        ...(partialDetail || {}),
        overview: tmdbDetail.overview || partialDetail?.overview || null,
        tagline: tmdbDetail.tagline || partialDetail?.tagline || null,
        budget: tmdbDetail.budget || partialDetail?.budget || null,
        revenue: tmdbDetail.revenue || partialDetail?.revenue || null,
        runtime: tmdbDetail.runtime || partialDetail?.runtime || null,
        credits: tmdbDetail.credits || null,
        production_companies: tmdbDetail.production_companies || partialDetail?.production_companies || null,
        genre: (tmdbDetail.genres || []).slice(0, 2).map(g => g.name).join(", ") || partialDetail?.genre || null,
        still_paths: partialDetail?.still_paths || null,
      };
      setDetail(detailObj);

      // Cache to media table via RPC — next person gets instant load
      const director = tmdbDetail.credits?.crew?.find(c => c.job === "Director")?.name || null;
      const genre = (tmdbDetail.genres || []).slice(0, 2).map(g => g.name).join(", ") || null;
      supabase.rpc("hydrate_media", {
        p_tmdb_id: data.tmdb_id,
        p_media_type: "film",
        p_title: data.title || tmdbDetail.title || null,
        p_year: data.year ? parseInt(data.year) : (tmdbDetail.release_date || "").slice(0, 4) ? parseInt((tmdbDetail.release_date || "").slice(0, 4)) : null,
        p_creator: director,
        p_poster_path: data.poster_path || (tmdbDetail.poster_path ? `https://image.tmdb.org/t/p/w342${tmdbDetail.poster_path}` : null),
        p_backdrop_path: data.backdrop_path || (tmdbDetail.backdrop_path ? `https://image.tmdb.org/t/p/w780${tmdbDetail.backdrop_path}` : null),
        p_runtime: tmdbDetail.runtime || null,
        p_genre: genre,
        p_overview: detailObj.overview || null,
        p_tagline: detailObj.tagline || null,
        p_budget: detailObj.budget || null,
        p_revenue: detailObj.revenue || null,
        p_credits: detailObj.credits || null,
        p_production_companies: detailObj.production_companies || null,
        p_certification: tmdbDetail.certification || null,
      }).then(() => {});
    })();
    return () => { cancelled = true; };
  }, [open, data?.tmdb_id]);

  // ── Fetch watch providers (streaming feed only) ──
  useEffect(() => {
    if (!open || !showProviders || !data?.tmdb_id) return;
    if (providers) return; // already loaded for this card
    let cancelled = false;
    fetchTMDBWatchProviders(data.tmdb_id)
      .then(res => {
        if (cancelled || !res?.results) return;
        const lang = navigator.language || "en-US";
        const cc = lang.includes("-") ? lang.split("-")[1].toUpperCase() : "US";
        const region = res.results[cc] || res.results["US"] || null;
        if (region) {
          setProviders({
            stream: region.flatrate || [],
            rent: region.rent || [],
            buy: region.buy || [],
            country: cc,
            link: region.link || null,
          });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open, showProviders, data?.tmdb_id]);

  // Merge lazy detail into data
  const merged = detail ? { ...data, ...detail,
    director: data.director || (detail.credits?.crew?.find(c => c.job === "Director")?.name) || detail?.creator || data.creator || null,
    cast_names: data.cast_names?.length ? data.cast_names : (detail.credits?.cast?.slice(0,6).map(c => c?.name).filter(Boolean) || []),
    studio_names: data.studio_names?.length ? data.studio_names : (Array.isArray(detail.production_companies) ? detail.production_companies.slice(0,3).map(c => ({ name: c?.name || c, logo_url: c?.logo_path ? ("https://image.tmdb.org/t/p/w92" + c.logo_path) : null })).filter(s => s.name) : []),
  } : data;

  const backdropUrl = resolveImg(merged?.backdrop_path, TMDB_BACKDROP);
  const budgetStr = fmtMoney(merged?.budget);
  const grossStr = fmtMoney(merged?.revenue);
  const runtimeStr = fmtRuntime(merged?.runtime);
  const director = merged?.director || merged?.creator || null;
  const cast = merged?.cast_names || [];
  const studios = merged?.studio_names || [];
  // Stable stills: compute synchronously from cached still_paths to avoid flicker
  const cachedStills = useMemo(() => {
    const paths = data?.still_paths || detail?.still_paths;
    if (!paths?.length) return null;
    return paths.map(p => p.startsWith("http") ? p : `${TMDB_IMG_BASE}/w780${p}`);
  }, [data?.still_paths, detail?.still_paths]);

  const [fetchedStills, setFetchedStills] = useState([]);
  const fetchedForRef = useRef(null); // track which tmdb_id we fetched for

  const extraBackdrops = cachedStills || fetchedStills;
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

  // Fetch extra backdrops only when not cached in DB
  useEffect(() => {
    if (!open || !data?.tmdb_id) return;

    // Already have cached stills from data.still_paths — nothing to fetch
    if (cachedStills) return;

    // Already fetched for this movie — keep showing those
    if (fetchedForRef.current === data.tmdb_id && fetchedStills.length > 0) return;

    // Different movie — fetch new ones but DON'T clear yet; keep old stills visible
    // until new ones arrive so there's no blank gap

    let cancelled = false;

    (async () => {
      try {
        const type = (data.media_type === "show") ? "tv" : "movie";
        const rawHero = data.backdrop_path || "";
        // Normalize: extract just the filename regardless of full URL or raw path
        // "https://image.tmdb.org/t/p/w780/abc.jpg" → "/abc.jpg"
        // "/abc.jpg" → "/abc.jpg"
        const heroMatch = rawHero.match(/\/[^/]+\.jpg/i);
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
          // Final safety: remove any still that exactly matches the hero URL
          const heroFull = backdropUrl || "";
          const safeStills = stills.filter(s => s !== heroFull);
          if (!safeStills.length) return;
          fetchedForRef.current = data.tmdb_id;
          setFetchedStills(safeStills);

          // Write back to media so next open (by anyone) is instant
          supabase.rpc("hydrate_media", {
            p_tmdb_id: data.tmdb_id,
            p_still_paths: paths,
          }).then(() => {});
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [open, data?.tmdb_id, cachedStills, backdropUrl]);

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
      <style>{`@keyframes sleeve-spin { to { transform: rotate(360deg); } }`}</style>
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
            background: t.textFaint,
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
              <FadeImg key={heroUrl} src={heroUrl} alt="" style={{
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
                <FadeImg
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
                  fontFamily: t.fontSharpie,
                  fontSize: 20, color: t.cream,
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
              <FadeImg
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
                fontFamily: t.fontSharpie,
                fontSize: 22, color: t.cream,
                lineHeight: 1.2,
              }}>
                {data.title}
              </div>
            )}
            {data.year && (
              <div style={{
                fontFamily: t.fontBody,
                fontSize: 11, color: "rgba(240,235,225,0.35)",
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
                <FadeImg
                  key={stillUrl}
                  src={stillUrl}
                  alt=""
                  style={{
                    width: "100%", height: "100%",
                    objectFit: "cover", display: "block",
                  }}
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
                  fontFamily: t.fontDisplay,
                  fontWeight: 400, fontSize: 10,
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
                  fontFamily: t.fontDisplay,
                  fontWeight: 400, fontSize: 10,
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
                  fontFamily: t.fontDisplay,
                  fontWeight: 400, fontSize: 10,
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



          {/* ═══ WHERE TO WATCH — streaming feed only ═══ */}
          {providers && (providers.stream.length > 0 || providers.rent.length > 0) && (
            <WatchProviders providers={providers} />
          )}

          {/* ═══ LOG + WATCHLIST BUTTONS ═══ */}
          {userId && (
            <div style={{ padding: "6px 0 2px", display: "flex", gap: 8, flexWrap: "wrap" }}>
              {/* Log button */}
              <button
                onClick={handleLog}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 14px 5px 10px",
                  background: isLogged ? "rgba(76,175,80,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isLogged ? "rgba(76,175,80,0.2)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 20,
                  color: isLogged ? "#81c784" : "rgba(240,235,225,0.45)",
                  fontFamily: t.fontDisplay,
                  fontSize: 11, fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {isLogged ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                )}
                {isLogged ? "Logged" : "Log"}
              </button>
              {/* Watchlist button — hide once logged */}
              {!isLogged && (
                <button
                  onClick={toggleWatchlist}
                  disabled={watchlistSaving}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "5px 14px 5px 10px",
                    background: onWatchlist ? "rgba(76,175,80,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${onWatchlist ? "rgba(76,175,80,0.2)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 20,
                    color: onWatchlist ? "#81c784" : "rgba(240,235,225,0.45)",
                    fontFamily: t.fontDisplay,
                    fontSize: 11, fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    cursor: watchlistSaving ? "wait" : "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {onWatchlist ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )}
                  {onWatchlist ? "On Watchlist" : "Watchlist"}
                </button>
              )}
            </div>
          )}

          {/* ═══ EPISODE PICKER — when opened from browse cards ═══ */}
          {(epLoading || (episodes && episodes.length > 0)) && (
            <div style={{
              borderTop: "1px solid rgba(240,235,225,0.06)",
              paddingTop: 12, marginBottom: 14,
            }}>
              <div style={{
                fontFamily: t.fontDisplay,
                fontWeight: 800, fontSize: 10,
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
                    const epUrl = resolveAudioUrl(ep);
                    const isActive = currentEp && epUrl && currentEp.enclosureUrl === epUrl;
                    const isActiveAndPlaying = isActive && isPlaying;
                    const isActiveBuffering = isActive && buffering && !isPlaying;
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
                            <img src={ep.podcast_artwork_url} loading="lazy" alt={ep.podcast_name} style={{
                              width: 32, height: 32, borderRadius: 8, objectFit: "cover",
                              border: isExpanded ? "1.5px solid #c4734f" : isActive ? "1.5px solid #c4734f" : "1.5px solid rgba(240,235,225,0.1)",
                              flexShrink: 0,
                            }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontFamily: t.fontDisplay,
                              fontWeight: 700, fontSize: 13,
                              color: isExpanded || isActive ? t.cream : "rgba(240,235,225,0.7)",
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            }}>{ep.episode_title || ep.podcast_name}</div>
                            <div style={{
                              fontFamily: t.fontBody,
                              fontSize: 11, color: "rgba(240,235,225,0.35)",
                              textTransform: "uppercase", letterSpacing: "0.04em",
                            }}>{ep.podcast_name}{ep.podcast_tier === "deep" ? " · deep dive" : ""}</div>
                          </div>
                          {/* Play/pause OR Patreon badge */}
                          {isPatreonUrl(epUrl) ? (
                            <a
                              href={epUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="Listen on Patreon"
                              style={{
                                width: 32, height: 32, borderRadius: "50%",
                                background: "rgba(249,104,58,0.1)",
                                border: "1px solid rgba(249,104,58,0.25)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0,
                                transition: "all 0.15s",
                                textDecoration: "none",
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                                <path fill="#F96836" d="M5 22V9a7 7 0 017-7h2a5.5 5.5 0 010 11h-4v9H5zm5-12h2a2.5 2.5 0 000-5h-2v5z"/>
                              </svg>
                            </a>
                          ) : (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isActiveBuffering) return;
                                if (isActiveAndPlaying) {
                                  onTogglePlay?.();
                                } else {
                                  onPlayEpisode?.(ep);
                                }
                              }}
                              style={{
                                width: 32, height: 32, borderRadius: "50%",
                                background: (isActiveAndPlaying || isActiveBuffering) ? "rgba(196,115,79,0.15)" : "rgba(240,235,225,0.04)",
                                border: (isActiveAndPlaying || isActiveBuffering) ? "1px solid rgba(196,115,79,0.3)" : "1px solid rgba(240,235,225,0.08)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0,
                                transition: "all 0.15s",
                                cursor: isActiveBuffering ? "default" : "pointer",
                              }}
                            >
                              {isActiveBuffering ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: "sleeve-spin 0.8s linear infinite" }}>
                                  <circle cx="12" cy="12" r="9" stroke="rgba(196,115,79,0.25)" strokeWidth="2.5" />
                                  <path d="M12 3a9 9 0 0 1 9 9" stroke="#c4734f" strokeWidth="2.5" strokeLinecap="round" />
                                </svg>
                              ) : (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill={isActiveAndPlaying ? "#c4734f" : "rgba(240,235,225,0.5)"}>
                                  {isActiveAndPlaying
                                    ? <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>
                                    : <path d="M8 5v14l11-7z" />
                                  }
                                </svg>
                              )}
                            </div>
                          )}
                          {/* Queue: toggle add/remove from up next */}
                          {onQueueEpisode && !isActive && !isPatreonUrl(epUrl) && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                const inQueue = queuedUrls.has(epUrl);
                                if (inQueue) {
                                  const idx = queue.findIndex(q => q.enclosureUrl === epUrl);
                                  if (idx !== -1) removeFromQueue(idx);
                                  setQueuedUrls(prev => { const n = new Set(prev); n.delete(epUrl); return n; });
                                  showNudge("Removed from Up Next", true);
                                } else {
                                  onQueueEpisode(ep);
                                  setQueuedUrls(prev => new Set([...prev, epUrl]));
                                }
                              }}
                              title={queuedUrls.has(epUrl) ? "Remove from Up Next" : "Add to Up Next"}
                              style={{
                                width: 28, height: 28, borderRadius: "50%",
                                background: queuedUrls.has(epUrl) ? "rgba(240,235,225,0.08)" : "rgba(240,235,225,0.03)",
                                border: queuedUrls.has(epUrl) ? "1px solid rgba(240,235,225,0.2)" : "1px solid rgba(240,235,225,0.06)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0, cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                            >
                              {queuedUrls.has(epUrl) ? (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(240,235,225,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(240,235,225,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19" />
                                  <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                              )}
                            </div>
                          )}
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
                          maxHeight: isExpanded ? "none" : 0,
                          overflow: "hidden",
                          transition: "max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}>
                          {descText ? (() => {
                            // Split into hook sentence + rest
                            const splitIdx = descText.search(/[.!?](\s|$)/);
                            const hook = splitIdx > 0 ? descText.slice(0, splitIdx + 1) : descText;
                            const rest = splitIdx > 0 ? descText.slice(splitIdx + 1).trim() : "";
                            return (
                              <div style={{
                                padding: "4px 6px 10px 48px",
                                fontFamily: t.fontSerif,
                                fontSize: 13, lineHeight: 1.55,
                                color: "rgba(240,235,225,0.5)",
                                whiteSpace: "pre-wrap",
                              }}>
                                <span style={{ color: "rgba(240,235,225,0.75)", fontWeight: 600 }}>{renderWithTimecodes(hook, (sec) => handleTimecodeSeek(ep, sec))}</span>
                                {rest && <>{" "}{renderWithTimecodes(rest, (sec) => handleTimecodeSeek(ep, sec))}</>}
                              </div>
                            );
                          })() : isExpanded ? (
                            <div style={{
                              padding: "4px 6px 10px 48px",
                              fontFamily: t.fontSerif,
                              fontSize: 12, fontStyle: "italic",
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

          {/* Overview / Synopsis — fallback when no podcast coverage */}
          {(() => {
            const visibleEps = episodes?.filter(ep => !hiddenEpIds.has(ep.episode_id)) || [];
            const hasAudio = visibleEps.length > 0 || epLoading;
            return !hasAudio && merged.overview ? (
              <div style={{
                fontFamily: t.fontSerif,
                fontSize: 12, lineHeight: 1.55,
                color: "rgba(240,235,225,0.65)",
                textAlign: "center",
                marginBottom: 14,
              }}>
                {merged.overview}
              </div>
            ) : null;
          })()}

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
                        fontFamily: t.fontDisplay,
                        fontWeight: 800, fontSize: 11,
                        color: t.cream,
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
                          fontFamily: t.fontDisplay,
                          fontWeight: 800, fontSize: 8,
                          color: "rgba(240,235,225,0.35)",
                          letterSpacing: "0.12em", textTransform: "uppercase",
                        }}>Budget</div>
                        <div style={{
                          fontFamily: t.fontDisplay,
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
                          fontFamily: t.fontDisplay,
                          fontWeight: 800, fontSize: 8,
                          color: "rgba(240,235,225,0.35)",
                          letterSpacing: "0.12em", textTransform: "uppercase",
                        }}>WW Gross</div>
                        <div style={{
                          fontFamily: t.fontDisplay,
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
                      background: s.dark ? t.cream : "transparent",
                      flexShrink: 0,
                    }} />
                  ))}
                </div>
                <div style={{
                  fontFamily: t.fontBody,
                  fontSize: 6, color: t.cream,
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
                    fontFamily: t.fontDisplay,
                    fontWeight: 800, fontSize: 11,
                    color: t.cream,
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
            fontFamily: t.fontBody,
            fontSize: 6, color: "rgba(240,235,225,0.15)",
            textAlign: "center", marginTop: 10,
            letterSpacing: "0.04em",
          }}>
            THIS CASSETTE IS FOR PRIVATE HOME USE ONLY
          </div>
        </div>
      </div>

      {/* ═══ LOG MODAL ═══ */}
      <QuickLogModal
        data={data}
        open={showLogModal}
        onClose={() => setShowLogModal(false)}
        onLogged={onLogged}
      />
    </>,
    document.body
  );
}
