import { useState, useEffect } from "react";
import { isLogoChecked } from "../../utils/communityTmdb";
import { useAudioPlayer } from "../community/shared/AudioPlayerProvider";
import { getEpisodesForFilm } from "../../hooks/community/useBrowseFeed";
import { Stars, getCommunityAccent, getTimeAgo, isPatreonUrl } from "./FeedPrimitives";
import VhsSleeveSheet from "./VhsSleeveSheet";

// ════════════════════════════════════════════════
// LOG CARD — cinematic backdrop + community context
// ════════════════════════════════════════════════
// VHS brand marks — one per tape (the other side always gets the VHS logo)
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
  // Alternate which side gets the VHS logo vs the real brand based on hash
  const vhsOnLeft = hash % 2 === 0;
  return {
    left: vhsOnLeft ? VHS_LOGO_BRAND : brand,
    right: vhsOnLeft ? brand : VHS_LOGO_BRAND,
  };
}

// VHS logo SVG inline — the actual VHS brand mark
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

function LogCard({ data, onNavigateCommunity, onViewBadgeDetail, isFirst = false, pushNav, removeNav }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isLightLogo, setIsLightLogo] = useState(true);
  const [logoReady, setLogoReady] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [episodes, setEpisodes] = useState(null);
  const [epLoading, setEpLoading] = useState(false);
  const { play: playEpisode, togglePlay, currentEp, isPlaying, addToQueue } = useAudioPlayer();
  const timeAgo = getTimeAgo(data.logged_at || data.completed_at);
  const communities = data.communities || [];
  const { left: brandLeft, right: brandRight } = getVhsBrands(data.title);
  const peekColor = communities[0]
    ? getCommunityAccent(communities[0].community_slug)
    : "#8B5CF6";

  // Unique back-nav key per card instance
  const sleeveNavKey = `sleeve-${data.tmdb_id || data.title}`;

  const openSleeve = async () => {
    setSheetOpen(true);
    setShowHint(false);
    if (pushNav) pushNav(sleeveNavKey, () => setSheetOpen(false));
    // Fetch episodes for this film (if not already loaded)
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

  // ── Audio source derivation ──
  const playableSources = communities.filter(c => c.episode_url && !isPatreonUrl(c.episode_url));
  const externalSources = communities.filter(c => c.episode_url && isPatreonUrl(c.episode_url));
  const hasPlayableAudio = playableSources.length > 0;
  const hasExternalOnly = !hasPlayableAudio && externalSources.length > 0;
  const hasAnyCoverage = communities.length > 0;

  const handlePlay = (e, source) => {
    e.stopPropagation();
    if (!source) return;
    playEpisode({
      guid: `feed-${source.episode_url}`,
      title: source.episode_title || data.title || "Episode",
      enclosureUrl: source.episode_url,
      community: source.community_name || null,
      artwork: source.community_image || null,
    });
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

  return (
    <>
    <div
      style={{
        margin: "4px 16px",
        borderRadius: 6,
        position: "relative",
        cursor: "pointer",
        background: "#302c28",
        padding: "1px 1px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='4' height='4' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")",
      }}
    >
      <div style={{
        borderRadius: 4,
        overflow: "hidden",
      }}>
      {/* Front — always visible */}
        <div
          onClick={() => openSleeve()}
          style={{
            background: "#1a1612",
            borderRadius: 5,
            position: "relative",
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
              {/* Ghost backdrop — faded movie still bleeding through the label */}
              {(data.backdrop_path || data.poster_path) && (
                <img
                  src={data.backdrop_path || data.poster_path}
                  alt=""
                  loading="lazy"
                  style={{
                    position: "absolute", inset: -4,
                    width: "calc(100% + 8px)", height: "calc(100% + 8px)",
                    objectFit: "cover", objectPosition: "center top",
                    opacity: 0.09,
                    filter: "sepia(1) saturate(0.3) brightness(0.9) contrast(1.2)",
                    mixBlendMode: "multiply",
                    pointerEvents: "none",
                  }}
                />
              )}
              {/* Brand stamps on label edges */}
              <BrandStamp brand={brandLeft} side="left" />
              <BrandStamp brand={brandRight} side="right" />

              {/* Grid lines */}
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 17px, rgba(0,0,0,0.03) 17px, rgba(0,0,0,0.03) 18px)",
              }} />

              {/* Logo / skeleton / title — 3-state to prevent text flash */}
              {(() => {
                const expectsLogo = data.tmdb_id && data.media_type !== "book" && data.media_type !== "game";
                const logoLoading = expectsLogo && !data.logo_url && !isLogoChecked(data.tmdb_id);

                return (
                  <>
                    {/* Logo img — hidden until loaded, then fades in */}
                    {data.logo_url && (
                      <img
                        src={data.logo_url}
                        alt={data.title}
                        crossOrigin="anonymous"
                        onLoad={(e) => {
                          setLogoReady(true);
                          // Aspect-ratio-aware scaling — compact logos scale more aggressively
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
                          } catch { /* CORS fail — keep dark filter */ }
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

                    {/* Skeleton — while logo is being fetched or img is loading */}
                    {(logoLoading || (data.logo_url && !logoReady)) && (
                      <div style={{
                        height: 20, width: "55%", borderRadius: 3,
                        background: "rgba(44,40,36,0.06)",
                        position: data.logo_url ? "absolute" : "relative",
                      }} />
                    )}

                    {/* Text fallback — sharpie-on-label when no TMDB logo */}
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

              {/* Sharpie year — under title */}
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

              {/* Sharpie time — bottom left */}
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

              {/* Headphones sticker — audio exists but not playable on MANTL */}
              {hasExternalOnly && (
                <div style={{
                  position: "absolute", bottom: 18, right: 26,
                  opacity: 0.3,
                }} title="Listen on Patreon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2C2824" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                  </svg>
                </div>
              )}

              {/* Headphones sticker — playable audio on MANTL (visual hint on label) */}
              {hasPlayableAudio && (
                <div style={{
                  position: "absolute", bottom: 18, right: 26,
                  opacity: 0.4,
                }} title="Listen on MANTL">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2C2824" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Right dark tape end */}
            <div style={{ width: 5, flexShrink: 0, background: "#1a1612" }} />
          </div>
        </div>
      </div>

      {/* ═══ VCR DECK — playable audio on MANTL ═══ */}
      {hasPlayableAudio && (() => {
        const activeSrc = playableSources.find(s =>
          currentEp && currentEp.enclosureUrl === s.episode_url
        );
        const isThisPlaying = activeSrc && isPlaying;
        return (
        <div
          onClick={(e) => { e.stopPropagation(); setShowPicker(p => !p); }}
          style={{
            background: "linear-gradient(180deg, #1e1a16 0%, #1a1612 50%, #161310 100%)",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            padding: "8px 16px 7px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            position: "relative",
            borderRadius: showPicker ? "0" : "0 0 4px 4px",
            cursor: "pointer",
          }}>
          {/* Top highlight edge */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 15%, rgba(255,255,255,0.08) 85%, transparent)",
          }} />

          {/* Retro VCR panel corner brackets — top-left */}
          <div style={{ position: "absolute", top: 5, left: 10, width: 10, height: 10, pointerEvents: "none",
            borderTop: "2px solid rgba(255,255,255,0.75)", borderLeft: "2px solid rgba(255,255,255,0.75)" }} />
          {/* top-right */}
          <div style={{ position: "absolute", top: 5, right: 10, width: 10, height: 10, pointerEvents: "none",
            borderTop: "2px solid rgba(255,255,255,0.75)", borderRight: "2px solid rgba(255,255,255,0.75)" }} />
          {/* bottom-left */}
          <div style={{ position: "absolute", bottom: 5, left: 10, width: 10, height: 10, pointerEvents: "none",
            borderBottom: "2px solid rgba(255,255,255,0.75)", borderLeft: "2px solid rgba(255,255,255,0.75)" }} />
          {/* bottom-right */}
          <div style={{ position: "absolute", bottom: 5, right: 10, width: 10, height: 10, pointerEvents: "none",
            borderBottom: "2px solid rgba(255,255,255,0.75)", borderRight: "2px solid rgba(255,255,255,0.75)" }} />
          {/* Bottom shadow edge */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.3) 15%, rgba(0,0,0,0.3) 85%, transparent)",
            borderRadius: showPicker ? 0 : "0 0 4px 4px",
          }} />

          {/* Left speaker grille — perforated metal */}
          <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
            {/* Retro frame line behind grill */}
            <div style={{
              position: "absolute", top: "50%", left: 0, right: 0, height: 1,
              transform: "translateY(-50%)",
              background: "linear-gradient(90deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)",
              pointerEvents: "none",
            }} />
            <div style={{
              flex: 1, height: 20, borderRadius: 3,
              background: "radial-gradient(circle, rgba(255,255,255,0.22) 1px, transparent 1px)",
              backgroundSize: "5px 5px",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.2)",
            }} />
          </div>

          {/* ▶ VCR Play button — beveled (visual only, deck div handles clicks) */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                background: "linear-gradient(180deg, #2a2520 0%, #1a1612 40%, #151210 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderBottomColor: "rgba(0,0,0,0.4)",
                borderTopColor: "rgba(255,255,255,0.12)",
                borderRadius: 4,
                padding: "5px 24px",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 4px rgba(0,0,0,0.4)",
                pointerEvents: "none",
              }}
            >
              {isThisPlaying ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </div>
            {/* Green LED */}
            <div style={{
              position: "absolute", top: -1, right: -1,
              width: 5, height: 5, borderRadius: "50%",
              background: isThisPlaying ? "#34d399" : "rgba(52,211,153,0.2)",
              border: isThisPlaying ? "none" : "0.5px solid rgba(52,211,153,0.15)",
              boxShadow: isThisPlaying ? "0 0 4px #34d399, 0 0 8px rgba(52,211,153,0.3)" : "none",
              animation: isThisPlaying ? "ledPulse 2s ease infinite" : "none",
              transition: "all 0.3s ease",
              pointerEvents: "none",
            }} />
          </div>

          {/* Right speaker grille — perforated metal */}
          <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
            {/* Retro frame line behind grill */}
            <div style={{
              position: "absolute", top: "50%", left: 0, right: 0, height: 1,
              transform: "translateY(-50%)",
              background: "linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.18) 100%)",
              pointerEvents: "none",
            }} />
            <div style={{
              flex: 1, height: 20, borderRadius: 3,
              background: "radial-gradient(circle, rgba(255,255,255,0.22) 1px, transparent 1px)",
              backgroundSize: "5px 5px",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.2)",
            }} />
          </div>
        </div>
        );
      })()}

      {/* ═══ PICKER — animated slide down ═══ */}
      <div style={{
        maxHeight: showPicker && hasPlayableAudio ? 200 : 0,
        overflow: "hidden",
        transition: "max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div style={{
          background: "#1a1612",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "6px 12px",
          borderRadius: "0 0 4px 4px",
          opacity: showPicker ? 1 : 0,
          transform: showPicker ? "translateY(0)" : "translateY(-6px)",
          transition: "opacity 0.2s ease, transform 0.25s ease",
        }}>
          {playableSources.map((src, i) => {
            const isActive = currentEp && currentEp.enclosureUrl === src.episode_url;
            const accent = getCommunityAccent(src.community_slug);
            return (
              <div
                key={i}
                onClick={(e) => { handlePlay(e, src); setShowPicker(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "5px 4px",
                  cursor: "pointer",
                  borderRadius: 4,
                  background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
                }}
              >
                {src.community_image && (
                  <img src={src.community_image} alt={src.community_name} style={{
                    width: 22, height: 22, borderRadius: 5, objectFit: "cover",
                    border: `1.5px solid ${accent}44`,
                  }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700, fontSize: 11,
                    color: "rgba(255,255,255,0.7)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {src.episode_title || src.series_title || src.community_name}
                  </div>
                  <div style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 7, color: "rgba(255,255,255,0.25)",
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    {src.community_name}{src.series_title ? ` · ${src.series_title}` : ""}
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={isActive && isPlaying ? accent : "rgba(255,255,255,0.4)"}>
                  {isActive && isPlaying
                    ? <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>
                    : <path d="M8 5v14l11-7z" />
                  }
                </svg>
              </div>
            );
          })}
        </div>
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
          ↕ tap a tape to flip it
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
