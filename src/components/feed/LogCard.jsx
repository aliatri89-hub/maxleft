import { useState, useEffect } from "react";
import { apiProxy } from "../../utils/api";
import { isLogoChecked } from "../../utils/communityTmdb";
import { useAudioPlayer } from "../community/shared/AudioPlayerProvider";
import { getEpisodesForFilm } from "../../hooks/community/useBrowseFeed";
import { Stars, getCommunityAccent, getTimeAgo } from "./FeedPrimitives";
import VhsSleeveSheet from "./VhsSleeveSheet";

// ════════════════════════════════════════════════
// LOG CARD — cinematic title backdrop + VHS sleeve on flip
// ════════════════════════════════════════════════
// Toggle this to false to revert to cream VHS labels
const USE_TITLE_BACKDROPS = true;

const TMDB_BD = "https://image.tmdb.org/t/p/w780";
const NOISE_SVG = "url(\"data:image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='4' height='4' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")";

// ── En-backdrop cache (survives re-renders, cleared on refresh) ──
const _enBdCache = new Map();

// VHS brand marks — used for cream fallback only
const VHS_BRANDS = [
  { bg: "#f0ebe1", color: "#0d5a2d", text: "FUJI", sub: "HQ", weight: 900 },
  { bg: "#f0ebe1", color: "#1a1a2e", text: "Memorex", sub: "HS", weight: 800 },
  { bg: "#f0ebe1", color: "#b8860b", text: "TDK", sub: "SA", weight: 900 },
  { bg: "#f0ebe1", color: "#c41e1e", text: "Kodak", sub: "T-120", weight: 800 },
  { bg: "#f0ebe1", color: "#14398a", text: "Maxell", sub: "HGX", weight: 800 },
  { bg: "#f0ebe1", color: "#9b1b1b", text: "BASF", sub: "E-180", weight: 900 },
];
const VHS_LOGO_BRAND = { bg: "#f0ebe1", color: "#2C2824", text: "VHS", sub: "", weight: 800, isVhs: true };

function getVhsBrands(title) {
  const hash = (title || "").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const brand = VHS_BRANDS[hash % VHS_BRANDS.length];
  const vhsOnLeft = hash % 2 === 0;
  return {
    left: vhsOnLeft ? VHS_LOGO_BRAND : brand,
    right: vhsOnLeft ? brand : VHS_LOGO_BRAND,
  };
}

function VhsLogoSvg({ color = "#222", size = 18 }) {
  return (
    <svg viewBox="0 0 100 50" width={size} height={size * 0.5} style={{ display: "block" }}>
      <text x="50" y="38" textAnchor="middle" fontFamily="'Barlow Condensed', sans-serif"
        fontWeight="900" fontSize="42" letterSpacing="3" fill={color}>
        VHS
      </text>
    </svg>
  );
}

function BrandStamp({ brand, side = "right" }) {
  const brandFontSize = brand.text && brand.text.length > 4 ? 7 : 9;
  return (
    <div style={{
      position: "absolute",
      top: 0, bottom: 0,
      [side]: 4,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 1,
      zIndex: 1,
    }}>
      {brand.isVhs ? (
        <div style={{ transform: "rotate(-90deg)", opacity: 0.6 }}>
          <VhsLogoSvg color={brand.color} size={20} />
        </div>
      ) : (
        <>
          <div style={{
            writingMode: "vertical-rl",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: brand.weight,
            fontSize: brandFontSize,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: brand.color,
            transform: "rotate(180deg)",
            lineHeight: 1,
          }}>
            {brand.text}
          </div>
          {brand.sub && (
            <div style={{
              writingMode: "vertical-rl",
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 600,
              fontSize: 5,
              letterSpacing: "0.06em",
              color: brand.color,
              opacity: 0.6,
              transform: "rotate(180deg)",
            }}>
              {brand.sub}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
// TITLE BACKDROP FRONT — en-language backdrop from TMDB
// ════════════════════════════════════════════════
function BackdropFront({ url, timeAgo, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 8,
        position: "relative",
        cursor: "pointer",
        overflow: "hidden",
      }}
    >
      <img
        src={url}
        alt=""
        loading="lazy"
        style={{
          display: "block",
          width: "100%",
          aspectRatio: "16 / 9",
          objectFit: "cover",
          objectPosition: "center",
        }}
      />
      {/* Vignette overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.45) 100%)",
      }} />
      {/* Subtle film grain */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.06,
        backgroundImage: NOISE_SVG,
      }} />
      {/* Time ago — bottom left */}
      <div style={{
        position: "absolute", bottom: 8, left: 12,
        fontFamily: "'IBM Plex Mono', monospace",
        fontWeight: 600,
        fontSize: 9,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.6)",
        textShadow: "0 1px 3px rgba(0,0,0,0.8)",
      }}>
        {timeAgo}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// CREAM LABEL FRONT — fallback when no en-backdrop
// ════════════════════════════════════════════════
function CreamFront({ data, timeAgo, brandLeft, brandRight, onClick }) {
  const [isLightLogo, setIsLightLogo] = useState(true);
  const [logoReady, setLogoReady] = useState(false);

  return (
    <div
      onClick={onClick}
      style={{
        background: "#1a1612",
        borderRadius: 5,
        position: "relative",
        cursor: "pointer",
      }}
    >
      <div style={{
        borderRadius: 3,
        overflow: "hidden",
        display: "flex",
        minHeight: 80,
      }}>
        {/* Left dark tape end */}
        <div style={{ width: 5, flexShrink: 0, background: "#1a1612" }} />

        {/* Label — cream center with brand stamps */}
        <div style={{
          flex: 1,
          background: "#f0ebe1",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Ghost backdrop */}
          {(data.backdrop_path || data.poster_path) && (
            <img
              src={data.backdrop_path || data.poster_path}
              alt=""
              loading="lazy"
              style={{
                position: "absolute", inset: -4,
                width: "calc(100% + 8px)", height: "calc(100% + 8px)",
                objectFit: "cover", objectPosition: "center top",
                opacity: 0.2,
                filter: "sepia(0.6) saturate(0.4) brightness(1.0) contrast(1.1)",
                mixBlendMode: "multiply",
                pointerEvents: "none",
              }}
            />
          )}
          <BrandStamp brand={brandLeft} side="left" />
          <BrandStamp brand={brandRight} side="right" />

          {/* Grid lines */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 17px, rgba(0,0,0,0.03) 17px, rgba(0,0,0,0.03) 18px)",
          }} />

          {/* Logo / skeleton / title */}
          {(() => {
            const expectsLogo = data.tmdb_id && data.media_type !== "book" && data.media_type !== "game";
            const logoLoading = expectsLogo && !data.logo_url && !isLogoChecked(data.tmdb_id);

            return (
              <>
                {data.logo_url && (
                  <img
                    src={data.logo_url}
                    alt={data.title}
                    crossOrigin="anonymous"
                    onLoad={(e) => {
                      setLogoReady(true);
                      const nw = e.target.naturalWidth;
                      const nh = e.target.naturalHeight;
                      const aspect = nw / (nh || 1);
                      if (nw > 0 && nw < 300) {
                        const scale = aspect < 2 ? 1.6 : 1.3;
                        e.target.style.transform = `scale(${scale})`;
                      }
                      try {
                        const img = e.target;
                        const c = document.createElement("canvas");
                        const s = 40;
                        c.width = s; c.height = s;
                        const ctx = c.getContext("2d");
                        ctx.drawImage(img, 0, 0, s, s);
                        const px = ctx.getImageData(0, 0, s, s).data;
                        let light = 0, visible = 0;
                        for (let i = 0; i < px.length; i += 4) {
                          if (px[i + 3] < 50) continue;
                          visible++;
                          if ((px[i] + px[i + 1] + px[i + 2]) / 3 > 200) light++;
                        }
                        setIsLightLogo(visible > 0 && light / visible > 0.5);
                      } catch { /* CORS */ }
                    }}
                    style={{
                      maxHeight: 54,
                      minHeight: 36,
                      maxWidth: "90%",
                      width: "auto",
                      objectFit: "contain",
                      objectPosition: "center",
                      position: "relative",
                      filter: isLightLogo ? "brightness(0)" : "none",
                      opacity: logoReady ? (isLightLogo ? 0.8 : 0.85) : 0,
                      transition: "opacity 0.2s ease-in",
                    }}
                  />
                )}

                {(logoLoading || (data.logo_url && !logoReady)) && (
                  <div style={{
                    height: 20, width: "55%", borderRadius: 3,
                    background: "rgba(44,40,36,0.06)",
                    position: data.logo_url ? "absolute" : "relative",
                  }} />
                )}

                {!data.logo_url && !logoLoading && (
                  <div style={{
                    fontFamily: "'Permanent Marker', cursive",
                    fontSize: Math.max(16, Math.min(28, 320 / Math.max(data.title.length, 1))),
                    lineHeight: 1.1,
                    color: "#2C2824",
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    position: "relative",
                    textAlign: "center",
                    transform: `rotate(${((data.tmdb_id || 0) % 5) * 0.6 - 1.2}deg)`,
                    textShadow: "1px 1px 0px rgba(44,40,36,0.08), -0.5px 0.5px 2px rgba(44,40,36,0.06)",
                    padding: "0 8px",
                    maxWidth: "85%",
                    margin: "0 auto",
                    wordBreak: "break-word",
                  }}>
                    {data.title}
                  </div>
                )}
              </>
            );
          })()}

          {/* Sharpie year */}
          {data.year && (
            <div style={{
              fontFamily: "'Permanent Marker', cursive",
              fontSize: 10, color: "rgba(44,40,36,0.5)",
              marginTop: 2, position: "relative",
              textAlign: "center",
            }}>
              {data.year}
            </div>
          )}

          {/* Time ago — bottom left */}
          <div style={{
            position: "absolute", bottom: 4, left: 28,
            fontFamily: "'Permanent Marker', cursive",
            fontSize: 10, color: "#2C2824",
          }}>
            {timeAgo}
          </div>

          {/* Stars — bottom right */}
          {data.rating > 0 && (
            <div style={{ position: "absolute", bottom: 4, right: 28 }}>
              <Stars rating={data.rating} size={14} sharpie />
            </div>
          )}
        </div>

        {/* Right dark tape end */}
        <div style={{ width: 5, flexShrink: 0, background: "#1a1612" }} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// LOG CARD — main component
// ════════════════════════════════════════════════
function LogCard({ data, onNavigateCommunity, onViewBadgeDetail, isFirst = false, pushNav, removeNav }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [episodes, setEpisodes] = useState(null);
  const [epLoading, setEpLoading] = useState(false);
  const [enBackdropUrl, setEnBackdropUrl] = useState(() => {
    // Check cache synchronously so cards that already fetched don't flicker
    if (USE_TITLE_BACKDROPS && data.tmdb_id && _enBdCache.has(data.tmdb_id)) {
      return _enBdCache.get(data.tmdb_id);
    }
    return null;
  });
  const { play: playEpisode, togglePlay, currentEp, isPlaying, addToQueue } = useAudioPlayer();
  const timeAgo = getTimeAgo(data.logged_at || data.completed_at);
  const communities = data.communities || [];
  const { left: brandLeft, right: brandRight } = getVhsBrands(data.title);
  const peekColor = communities[0]
    ? getCommunityAccent(communities[0].community_slug)
    : "#8B5CF6";

  const sleeveNavKey = `sleeve-${data.tmdb_id || data.title}`;

  // ── Fetch en-language backdrop ──
  useEffect(() => {
    if (!USE_TITLE_BACKDROPS || !data.tmdb_id) return;
    if (_enBdCache.has(data.tmdb_id)) {
      setEnBackdropUrl(_enBdCache.get(data.tmdb_id));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const type = (data.media_type === "show") ? "tv" : "movie";
        const res = await apiProxy("tmdb_images", {
          tmdb_id: String(data.tmdb_id), type,
        });
        if (cancelled) return;
        const backdrops = res?.backdrops || [];
        // Pick the best en-language backdrop (has title baked in)
        const enOnes = backdrops
          .filter(b => b.iso_639_1 === "en" && b.file_path)
          .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
        const best = enOnes[0];
        const url = best ? `${TMDB_BD}${best.file_path}` : null;
        _enBdCache.set(data.tmdb_id, url);
        if (!cancelled) setEnBackdropUrl(url);
      } catch {
        _enBdCache.set(data.tmdb_id, null);
      }
    })();
    return () => { cancelled = true; };
  }, [data.tmdb_id, data.media_type]);

  const openSleeve = async () => {
    setSheetOpen(true);
    setShowHint(false);
    if (pushNav) pushNav(sleeveNavKey, () => setSheetOpen(false));
    if (!episodes && data.tmdb_id) {
      setEpLoading(true);
      const eps = await getEpisodesForFilm(data.tmdb_id);
      setEpisodes(eps);
      setEpLoading(false);
    }
  };

  const handlePlayEpisode = (ep) => {
    if (!ep || !ep.audio_url) return;
    playEpisode({
      guid: `log-${ep.episode_id || ep.audio_url}`,
      title: ep.episode_title || data.title || "Episode",
      enclosureUrl: ep.audio_url,
      community: ep.podcast_name || null,
      artwork: ep.podcast_artwork_url || null,
      description: ep.episode_description || null,
    });
  };

  const handleQueueEpisode = (ep) => {
    if (!ep || !ep.audio_url) return;
    addToQueue({
      guid: `log-${ep.episode_id || ep.audio_url}`,
      title: ep.episode_title || data.title || "Episode",
      enclosureUrl: ep.audio_url,
      community: ep.podcast_name || null,
      artwork: ep.podcast_artwork_url || null,
      description: ep.episode_description || null,
    });
  };

  const closeSleeve = () => {
    setSheetOpen(false);
    if (removeNav) removeNav(sleeveNavKey);
  };

  // First-visit tooltip — truly once ever
  useEffect(() => {
    if (!isFirst) return;
    try {
      if (localStorage.getItem("mantl_flip_hint_seen")) return;
    } catch {}
    const t = setTimeout(() => {
      setShowHint(true);
      try { localStorage.setItem("mantl_flip_hint_seen", "1"); } catch {}
    }, 800);
    return () => clearTimeout(t);
  }, [isFirst]);

  const useBackdrop = USE_TITLE_BACKDROPS && enBackdropUrl;

  return (
    <>
    <div
      style={{
        margin: useBackdrop ? "6px 16px" : "4px 16px",
        borderRadius: useBackdrop ? 10 : 6,
        position: "relative",
        cursor: "pointer",
        background: useBackdrop ? "#111" : "#302c28",
        padding: "1px 1px",
        boxShadow: useBackdrop
          ? "inset 0 0 0 1px rgba(255,255,255,0.07), 0 3px 12px rgba(0,0,0,0.5)"
          : "0 2px 8px rgba(0,0,0,0.4)",
        backgroundImage: useBackdrop ? "none" : NOISE_SVG,
      }}
    >
      <div style={{
        borderRadius: useBackdrop ? 9 : 4,
        overflow: "hidden",
      }}>
        {useBackdrop ? (
          <BackdropFront url={enBackdropUrl} timeAgo={timeAgo} onClick={openSleeve} />
        ) : (
          <CreamFront
            data={data}
            timeAgo={timeAgo}
            brandLeft={brandLeft}
            brandRight={brandRight}
            onClick={openSleeve}
          />
        )}
      </div>
    </div>
    {showHint && (
      <div style={{
        textAlign: "center",
        marginTop: 2,
        padding: "3px 0",
        animation: "fadeIn 0.4s ease",
      }}>
        <span style={{
          fontFamily: "'Permanent Marker', cursive",
          fontSize: 11,
          color: peekColor,
          opacity: 0.7,
          letterSpacing: "0.02em",
        }}>
          ↕ tap to see more
        </span>
      </div>
    )}
    <VhsSleeveSheet
      data={data}
      open={sheetOpen}
      onClose={closeSleeve}
      onNavigateCommunity={onNavigateCommunity}
      hideOverview={true}
      episodes={episodes}
      epLoading={epLoading}
      onPlayEpisode={handlePlayEpisode}
      onQueueEpisode={handleQueueEpisode}
      currentEp={currentEp}
      isPlaying={isPlaying}
      onTogglePlay={togglePlay}
    />
    </>
  );
}

export default LogCard;
