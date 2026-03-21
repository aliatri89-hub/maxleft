import { useState } from "react";
import { isLogoChecked } from "../../utils/communityTmdb";
import { useAudioPlayer } from "../community/shared/AudioPlayerProvider";
import { getEpisodesForFilm } from "../../hooks/community/useBrowseFeed";
import VhsSleeveSheet from "./VhsSleeveSheet";

// ════════════════════════════════════════════════
// BROWSE CARD — VHS tape + play button for TMDB browse results
// ════════════════════════════════════════════════

const VHS_BRANDS = [
  { bg: "#f0ebe1", color: "#0d5a2d", text: "FUJI", sub: "HQ", weight: 900 },
  { bg: "#f0ebe1", color: "#1a1a2e", text: "Memorex", sub: "HS", weight: 800 },
  { bg: "#f0ebe1", color: "#b8860b", text: "TDK", sub: "SA", weight: 900 },
  { bg: "#f0ebe1", color: "#c41e1e", text: "Kodak", sub: "T-120", weight: 800 },
  { bg: "#f0ebe1", color: "#14398a", text: "Maxell", sub: "HGX", weight: 800 },
  { bg: "#f0ebe1", color: "#9b1b1b", text: "BASF", sub: "E-180", weight: 900 },
];
const VHS_LOGO_BRAND = { bg: "#f0ebe1", color: "#2C2824", text: "VHS", sub: "", weight: 800, isVhs: true };

// Format "1979-05-25" → "May 25, 1979" (sharpie-on-tape style)
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtSharpieDate(dateStr) {
  if (!dateStr || dateStr.length < 10) return null;
  const [y, m, d] = dateStr.split("-");
  const mi = parseInt(m, 10);
  if (!mi || mi < 1 || mi > 12) return null;
  return `${MONTHS[mi - 1]} ${parseInt(d, 10)}, ${y}`;
}

function getVhsBrands(title) {
  const hash = (title || "").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const brand = VHS_BRANDS[hash % VHS_BRANDS.length];
  const vhsOnLeft = hash % 2 === 0;
  return { left: vhsOnLeft ? VHS_LOGO_BRAND : brand, right: vhsOnLeft ? brand : VHS_LOGO_BRAND };
}

function VhsLogoSvg({ color = "#222", size = 18 }) {
  return (
    <svg viewBox="0 0 100 50" width={size} height={size * 0.5} style={{ display: "block" }}>
      <text x="50" y="38" textAnchor="middle" fontFamily="'Barlow Condensed', sans-serif"
        fontWeight="900" fontSize="42" letterSpacing="3" fill={color}>VHS</text>
    </svg>
  );
}

function BrandStamp({ brand, side = "right" }) {
  const brandFontSize = brand.text && brand.text.length > 4 ? 7 : 9;
  return (
    <div style={{
      position: "absolute", top: 0, bottom: 0, [side]: 4,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 1, zIndex: 1,
    }}>
      {brand.isVhs ? (
        <div style={{ transform: "rotate(-90deg)", opacity: 0.6 }}>
          <VhsLogoSvg color={brand.color} size={20} />
        </div>
      ) : (
        <>
          <div style={{
            writingMode: "vertical-rl", fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: brand.weight, fontSize: brandFontSize, letterSpacing: "0.05em",
            textTransform: "uppercase", color: brand.color, transform: "rotate(180deg)", lineHeight: 1,
          }}>{brand.text}</div>
          {brand.sub && (
            <div style={{
              writingMode: "vertical-rl", fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 500, fontSize: 5.5, letterSpacing: "0.08em",
              color: brand.color, opacity: 0.5, transform: "rotate(180deg)", lineHeight: 1,
            }}>{brand.sub}</div>
          )}
        </>
      )}
    </div>
  );
}

export default function BrowseCard({ data, pushNav, removeNav, onNavigateCommunity }) {
  const [isLightLogo, setIsLightLogo] = useState(true);
  const [logoReady, setLogoReady] = useState(false);
  const [episodes, setEpisodes] = useState(null); // null = not loaded yet
  const [epLoading, setEpLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { play: playEpisode, togglePlay, currentEp, isPlaying } = useAudioPlayer();
  const { left: brandLeft, right: brandRight } = getVhsBrands(data.title);
  const hasPlayButton = data.podcast_count > 0;

  const sleeveNavKey = `sleeve-browse-${data.tmdb_id || data.title}`;
  const openSleeve = async () => {
    setSheetOpen(true);
    if (pushNav) pushNav(sleeveNavKey, () => setSheetOpen(false));
    // Lazy-load episodes on first sleeve open
    if (!episodes && hasPlayButton) {
      setEpLoading(true);
      const eps = await getEpisodesForFilm(data.tmdb_id);
      setEpisodes(eps);
      setEpLoading(false);
    }
  };
  const closeSleeve = () => {
    setSheetOpen(false);
    if (removeNav) removeNav(sleeveNavKey);
  };

  const handlePlay = (ep) => {
    if (!ep || !ep.audio_url) return;
    playEpisode({
      guid: `browse-${ep.episode_id || ep.audio_url}`,
      title: ep.episode_title || data.title || "Episode",
      enclosureUrl: ep.audio_url,
      community: ep.podcast_name || null,
      artwork: ep.podcast_artwork_url || null,
    });
  };

  // Check if currently playing an episode from this film
  const isThisPlaying = episodes && currentEp && isPlaying &&
    episodes.some(ep => currentEp.enclosureUrl === ep.audio_url);

  return (
    <>
    <div style={{
      margin: "4px 16px", borderRadius: 6, position: "relative",
      background: "#302c28", padding: "1px 1px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='4' height='4' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")",
    }}>
      <div style={{ borderRadius: 4, overflow: "hidden" }}>
        {/* ═══ VHS TAPE LABEL ═══ */}
        <div onClick={() => openSleeve()} style={{ background: "#1a1612", borderRadius: 5, position: "relative", cursor: "pointer" }}>
          <div style={{ borderRadius: 3, overflow: "hidden", display: "flex", minHeight: 80 }}>
            <div style={{ width: 5, flexShrink: 0, background: "#1a1612" }} />

            <div style={{
              flex: 1, background: "#f0ebe1", padding: "10px 12px",
              display: "flex", flexDirection: "column", justifyContent: "center",
              alignItems: "center", position: "relative", overflow: "hidden",
            }}>
              <BrandStamp brand={brandLeft} side="left" />
              <BrandStamp brand={brandRight} side="right" />

              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 17px, rgba(0,0,0,0.03) 17px, rgba(0,0,0,0.03) 18px)",
              }} />

              {(() => {
                const expectsLogo = data.tmdb_id;
                const logoLoading = expectsLogo && !data.logo_url && !isLogoChecked(data.tmdb_id);
                return (
                  <>
                    {data.logo_url && (
                      <img
                        src={data.logo_url} alt={data.title} crossOrigin="anonymous"
                        onLoad={(e) => {
                          setLogoReady(true);
                          const nw = e.target.naturalWidth;
                          const nh = e.target.naturalHeight;
                          const aspect = nw / (nh || 1);
                          if (nw > 0 && nw < 300) {
                            e.target.style.transform = `scale(${aspect < 2 ? 1.6 : 1.3})`;
                          }
                          try {
                            const img = e.target;
                            const c = document.createElement("canvas");
                            c.width = 40; c.height = 40;
                            const ctx = c.getContext("2d");
                            ctx.drawImage(img, 0, 0, 40, 40);
                            const px = ctx.getImageData(0, 0, 40, 40).data;
                            let light = 0, visible = 0;
                            for (let i = 0; i < px.length; i += 4) {
                              if (px[i + 3] < 50) continue;
                              visible++;
                              if ((px[i] + px[i + 1] + px[i + 2]) / 3 > 200) light++;
                            }
                            setIsLightLogo(visible > 0 && light / visible > 0.5);
                          } catch {}
                        }}
                        style={{
                          maxHeight: 54, minHeight: 36, maxWidth: "90%", width: "auto",
                          objectFit: "contain", objectPosition: "center", position: "relative",
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
                        lineHeight: 1.1, color: "#2C2824", textTransform: "uppercase",
                        letterSpacing: "0.02em", position: "relative", textAlign: "center",
                        transform: `rotate(${((data.tmdb_id || 0) % 5) * 0.6 - 1.2}deg)`,
                        textShadow: "1px 1px 0px rgba(44,40,36,0.08), -0.5px 0.5px 2px rgba(44,40,36,0.06)",
                        padding: "0 8px", maxWidth: "85%", margin: "0 auto", wordBreak: "break-word",
                      }}>{data.title}</div>
                    )}
                  </>
                );
              })()}

              {/* Sharpie release date — lower left, like handwritten on the tape */}
              {(() => {
                const dateStr = fmtSharpieDate(data.release_date);
                return dateStr ? (
                  <div style={{
                    position: "absolute", bottom: 5, left: 28,
                    fontFamily: "'Permanent Marker', cursive",
                    fontSize: 8, color: "#2C2824", opacity: 0.7,
                    transform: `rotate(${-0.5 + ((data.tmdb_id || 0) % 3) * 0.4}deg)`,
                    whiteSpace: "nowrap", pointerEvents: "none",
                  }}>{dateStr}</div>
                ) : null;
              })()}

              {/* Headphones sticker on label — visual hint that coverage exists */}
              {hasPlayButton && (
                <div style={{
                  position: "absolute", bottom: 4, right: 28, opacity: 0.4,
                }} title="Listen on MANTL">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2C2824" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                  </svg>
                </div>
              )}
            </div>

            <div style={{ width: 5, flexShrink: 0, background: "#1a1612" }} />
          </div>
        </div>
      </div>
    </div>
    <VhsSleeveSheet
        data={data}
        open={sheetOpen}
        onClose={closeSleeve}
        onNavigateCommunity={onNavigateCommunity}
        episodes={episodes}
        epLoading={epLoading}
        onPlayEpisode={handlePlay}
        currentEp={currentEp}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
      />
    </>
  );
}
