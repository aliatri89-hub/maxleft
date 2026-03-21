import { useState, useRef } from "react";
import { isLogoChecked } from "../../utils/communityTmdb";
import { useAudioPlayer } from "../community/shared/AudioPlayerProvider";
import { getEpisodesForFilm } from "../../hooks/community/useBrowseFeed";
import VhsSleeveSheet from "./VhsSleeveSheet";

// ════════════════════════════════════════════════
// BROWSE CARD — variant tape labels for browse feeds
//   cream     = default (fallback)
//   releases  = printed artwork (backdrop bleed)
//   streaming = film strip (sprocket holes)
// ════════════════════════════════════════════════

const TAPE_EDGE = "#1a1612";
const CREAM = "#f0ebe1";
const NOISE_SVG = "url(\"data:image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='4' height='4' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")";
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtSharpieDate(dateStr) {
  if (!dateStr || dateStr.length < 10) return null;
  const [y, m, d] = dateStr.split("-");
  const mi = parseInt(m, 10);
  if (!mi || mi < 1 || mi > 12) return null;
  return `${MONTHS[mi - 1]} ${parseInt(d, 10)}, ${y}`;
}

// ── Cream label brand stamps ──
const VHS_BRANDS = [
  { color: "#0d5a2d", text: "FUJI", sub: "HQ", weight: 900 },
  { color: "#1a1a2e", text: "Memorex", sub: "HS", weight: 800 },
  { color: "#b8860b", text: "TDK", sub: "SA", weight: 900 },
  { color: "#c41e1e", text: "Kodak", sub: "T-120", weight: 800 },
  { color: "#14398a", text: "Maxell", sub: "HGX", weight: 800 },
  { color: "#9b1b1b", text: "BASF", sub: "E-180", weight: 900 },
];
const VHS_LOGO_BRAND = { color: "#2C2824", text: "VHS", sub: "", weight: 800, isVhs: true };

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
  const fs = brand.text && brand.text.length > 4 ? 7 : 9;
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
            fontWeight: brand.weight, fontSize: fs, letterSpacing: "0.05em",
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

// ── Shared logo / title renderer ──
function LogoOrTitle({ data, logoReady, setLogoReady, isLightLogo, setIsLightLogo, theme }) {
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
            filter: theme.logoFilter(isLightLogo),
            opacity: theme.logoOpacity(isLightLogo, logoReady),
            transition: "opacity 0.2s ease-in",
          }}
        />
      )}
      {(logoLoading || (data.logo_url && !logoReady)) && (
        <div style={{
          height: 20, width: "55%", borderRadius: 3,
          background: theme.skeletonBg,
          position: data.logo_url ? "absolute" : "relative",
        }} />
      )}
      {!data.logo_url && !logoLoading && (
        <div style={{
          fontFamily: "'Permanent Marker', cursive",
          fontSize: Math.max(16, Math.min(28, 320 / Math.max(data.title.length, 1))),
          lineHeight: 1.1, color: theme.textColor, textTransform: "uppercase",
          letterSpacing: "0.02em", position: "relative", textAlign: "center",
          transform: `rotate(${((data.tmdb_id || 0) % 5) * 0.6 - 1.2}deg)`,
          textShadow: theme.textShadow,
          padding: "0 8px", maxWidth: "85%", margin: "0 auto", wordBreak: "break-word",
        }}>{data.title}</div>
      )}
    </>
  );
}

// ════════════════════════════════════
// CREAM — home video, sharpie on blank tape
// ════════════════════════════════════
const CREAM_THEME = {
  textColor: "#2C2824",
  textShadow: "1px 1px 0px rgba(44,40,36,0.08), -0.5px 0.5px 2px rgba(44,40,36,0.06)",
  logoFilter: (isLight) => isLight ? "brightness(0)" : "none",
  logoOpacity: (isLight, ready) => ready ? (isLight ? 0.8 : 0.85) : 0,
  skeletonBg: "rgba(44,40,36,0.06)",
};

function CreamLabel({ data, logoReady, setLogoReady, isLightLogo, setIsLightLogo }) {
  const { left: brandLeft, right: brandRight } = getVhsBrands(data.title);
  const dateStr = fmtSharpieDate(data.release_date);
  return (
    <>
      <div style={{ width: 5, flexShrink: 0, background: TAPE_EDGE }} />
      <div style={{
        flex: 1, background: CREAM, padding: "10px 12px",
        display: "flex", flexDirection: "column", justifyContent: "center",
        alignItems: "center", position: "relative", overflow: "hidden",
      }}>
        <BrandStamp brand={brandLeft} side="left" />
        <BrandStamp brand={brandRight} side="right" />
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 17px, rgba(0,0,0,0.03) 17px, rgba(0,0,0,0.03) 18px)",
        }} />
        <LogoOrTitle data={data} logoReady={logoReady} setLogoReady={setLogoReady}
          isLightLogo={isLightLogo} setIsLightLogo={setIsLightLogo} theme={CREAM_THEME} />
        {dateStr && (
          <div style={{
            position: "absolute", bottom: 5, left: 28,
            fontFamily: "'Permanent Marker', cursive",
            fontSize: 8, color: "rgba(44,40,36,0.7)",
            transform: `rotate(${-0.5 + ((data.tmdb_id || 0) % 3) * 0.4}deg)`,
            whiteSpace: "nowrap", pointerEvents: "none",
          }}>{dateStr}</div>
        )}
      </div>
      <div style={{ width: 5, flexShrink: 0, background: TAPE_EDGE }} />
    </>
  );
}

// ════════════════════════════════════
// ARTWORK — backdrop bleed (new releases)
// ════════════════════════════════════
const ARTWORK_THEME = {
  textColor: "#fff",
  textShadow: "0 2px 10px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.4)",
  logoFilter: () => "drop-shadow(0 2px 6px rgba(0,0,0,0.8))",
  logoOpacity: (_, ready) => ready ? 0.95 : 0,
  skeletonBg: "rgba(255,255,255,0.06)",
};

function ArtworkLabel({ data, logoReady, setLogoReady, isLightLogo, setIsLightLogo }) {
  const dateStr = fmtSharpieDate(data.release_date);
  return (
    <>
      <div style={{ width: 5, flexShrink: 0, background: "#111" }} />
      <div style={{
        flex: 1, position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", justifyContent: "center",
        alignItems: "center", padding: "10px 12px", background: "#151210",
      }}>
        {data.backdrop_path && (
          <img src={data.backdrop_path} alt="" style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "center 25%",
          }} />
        )}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.5) 100%), radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.2) 100%)",
        }} />
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.08,
          backgroundImage: NOISE_SVG,
        }} />
        <LogoOrTitle data={data} logoReady={logoReady} setLogoReady={setLogoReady}
          isLightLogo={isLightLogo} setIsLightLogo={setIsLightLogo} theme={ARTWORK_THEME} />

      </div>
      <div style={{ width: 5, flexShrink: 0, background: "#111" }} />
    </>
  );
}

// ════════════════════════════════════
// FILM STRIP — sprocket holes, celluloid (streaming)
// ════════════════════════════════════
const FILMSTRIP_THEME = {
  textColor: "rgba(240,215,170,0.85)",
  textShadow: "1px 1px 4px rgba(0,0,0,0.5)",
  logoFilter: () => "sepia(0.15) brightness(1.1) drop-shadow(0 1px 3px rgba(0,0,0,0.6))",
  logoOpacity: (_, ready) => ready ? 0.9 : 0,
  skeletonBg: "rgba(240,215,170,0.06)",
};

function SprocketStrip() {
  return (
    <div style={{
      width: 26, flexShrink: 0,
      background: "#0e0c09",
      borderLeft: "1px solid rgba(255,180,60,0.08)",
      borderRight: "1px solid rgba(255,180,60,0.08)",
      display: "flex", flexDirection: "column",
      justifyContent: "space-evenly", alignItems: "center", padding: "8px 0",
    }}>
      {[0,1,2,3,4,5].map(i => (
        <div key={i} style={{
          width: 11, height: 8, borderRadius: 2,
          background: "#2a221a",
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.8), 0 0 0 0.5px rgba(255,180,60,0.12)",
        }} />
      ))}
    </div>
  );
}

function FilmStripLabel({ data, logoReady, setLogoReady, isLightLogo, setIsLightLogo }) {
  const dateStr = fmtSharpieDate(data.release_date);
  return (
    <>
      <SprocketStrip />
      <div style={{
        flex: 1, position: "relative", overflow: "hidden",
        background: "linear-gradient(180deg, #221c12 0%, #2a2016 50%, #1e1a10 100%)",
        padding: "10px 10px",
        display: "flex", flexDirection: "column", justifyContent: "center",
        alignItems: "center",
      }}>
        {/* Grain */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.12,
          backgroundImage: NOISE_SVG,
        }} />
        {/* Top & bottom frame lines */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "rgba(255,180,60,0.18)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(255,180,60,0.18)" }} />
        {/* Vertical scan line shimmer */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,180,60,0.015) 3px, rgba(255,180,60,0.015) 4px)",
        }} />
        <LogoOrTitle data={data} logoReady={logoReady} setLogoReady={setLogoReady}
          isLightLogo={isLightLogo} setIsLightLogo={setIsLightLogo} theme={FILMSTRIP_THEME} />

      </div>
      <SprocketStrip />
    </>
  );
}

// ════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════
export default function BrowseCard({ data, variant, pushNav, removeNav, onNavigateCommunity }) {
  const [isLightLogo, setIsLightLogo] = useState(true);
  const [logoReady, setLogoReady] = useState(false);
  const [episodes, setEpisodes] = useState(null);
  const [epLoading, setEpLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const closeTimer = useRef(null);
  const { play: playEpisode, togglePlay, currentEp, isPlaying, addToQueue } = useAudioPlayer();
  const hasPlayButton = data.podcast_count > 0;

  const sleeveNavKey = `sleeve-browse-${data.tmdb_id || data.title}`;
  const openSleeve = async () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setSheetOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setSheetVisible(true)));
    if (pushNav) pushNav(sleeveNavKey, () => closeSleeve());
    if (!episodes && hasPlayButton) {
      setEpLoading(true);
      const eps = await getEpisodesForFilm(data.tmdb_id);
      setEpisodes(eps);
      setEpLoading(false);
    }
  };
  const closeSleeve = () => {
    setSheetVisible(false);
    closeTimer.current = setTimeout(() => {
      setSheetOpen(false);
      closeTimer.current = null;
    }, 350);
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
      description: ep.episode_description || null,
    });
  };

  const handleQueue = (ep) => {
    if (!ep || !ep.audio_url) return;
    addToQueue({
      guid: `browse-${ep.episode_id || ep.audio_url}`,
      title: ep.episode_title || data.title || "Episode",
      enclosureUrl: ep.audio_url,
      community: ep.podcast_name || null,
      artwork: ep.podcast_artwork_url || null,
      description: ep.episode_description || null,
    });
  };

  const logoProps = { data, logoReady, setLogoReady, isLightLogo, setIsLightLogo };
  const Label = variant === "releases" ? ArtworkLabel
    : variant === "streaming" ? FilmStripLabel
    : CreamLabel;

  const isReleases = variant === "releases";

  return (
    <>
    <div style={{
      margin: "6px 16px",
      borderRadius: isReleases ? 10 : 6,
      position: "relative",
      background: "#302c28", padding: "1px 1px",
      boxShadow: isReleases
        ? "inset 0 0 0 1px rgba(255,255,255,0.07), 0 3px 12px rgba(0,0,0,0.5)"
        : "0 2px 8px rgba(0,0,0,0.4)",
      backgroundImage: NOISE_SVG,
    }}>
      <div style={{ borderRadius: isReleases ? 9 : 4, overflow: "hidden" }}>
        <div onClick={() => openSleeve()} style={{ background: TAPE_EDGE, borderRadius: isReleases ? 8 : 5, position: "relative", cursor: "pointer" }}>
          <div style={{ borderRadius: isReleases ? 7 : 3, overflow: "hidden", display: "flex", minHeight: 80 }}>
            <Label {...logoProps} />
          </div>
        </div>
      </div>
    </div>
    {sheetOpen && (
      <VhsSleeveSheet
        data={data}
        open={sheetVisible}
        onClose={closeSleeve}
        onNavigateCommunity={onNavigateCommunity}
        artworkHero={variant === "releases"}
        hideOverview={true}
        showProviders={variant === "streaming"}
        episodes={episodes}
        epLoading={epLoading}
        onPlayEpisode={handlePlay}
        onQueueEpisode={handleQueue}
        currentEp={currentEp}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
      />
    )}
    </>
  );
}
