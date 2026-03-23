// ════════════════════════════════════════════════
// COMMUNITY TAPE CARD — VHS label for Explore screen
// ════════════════════════════════════════════════
// Followed: cream label with podcast art, sharpie name, tap → community
// Unfollowed: clean cream label, sharpie name, tap → sleeve

const NOISE_SVG = "url(\"data:image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='4' height='4' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")";

// VHS brand marks — deterministic per community
const VHS_BRANDS = [
  { color: "#0d5a2d", text: "FUJI", sub: "HQ", weight: 900 },
  { color: "#1a1a2e", text: "Memorex", sub: "HS", weight: 800 },
  { color: "#b8860b", text: "TDK", sub: "SA", weight: 900 },
  { color: "#c41e1e", text: "Kodak", sub: "T-120", weight: 800 },
  { color: "#14398a", text: "Maxell", sub: "HGX", weight: 800 },
  { color: "#9b1b1b", text: "BASF", sub: "E-180", weight: 900 },
];
const VHS_LOGO_BRAND = { color: "#2C2824", text: "VHS", sub: "", weight: 800, isVhs: true };

function getVhsBrands(slug) {
  const hash = (slug || "").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const brand = VHS_BRANDS[hash % VHS_BRANDS.length];
  const vhsOnLeft = hash % 2 === 0;
  return {
    left: vhsOnLeft ? VHS_LOGO_BRAND : brand,
    right: vhsOnLeft ? brand : VHS_LOGO_BRAND,
  };
}

// ── Brand stamp (vertical text on tape edge) ──
function BrandStamp({ brand, side = "right" }) {
  const fontSize = brand.text?.length > 4 ? 7 : 9;
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
        <div style={{
          transform: "rotate(-90deg)",
          opacity: 0.6,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900,
          fontSize: 9,
          letterSpacing: 2,
          color: brand.color,
        }}>VHS</div>
      ) : (
        <>
          <div style={{
            writingMode: "vertical-rl",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: brand.weight,
            fontSize,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: brand.color,
            transform: "rotate(180deg)",
            lineHeight: 1,
          }}>{brand.text}</div>
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
            }}>{brand.sub}</div>
          )}
        </>
      )}
    </div>
  );
}

export default function CommunityTapeCard({
  community,
  isSubscribed,
  artworkUrl,
  accent,
  stats,
  onTap,
  onLongPress,
}) {
  const { left: brandLeft, right: brandRight } = getVhsBrands(community.slug);
  const titleLen = (community.name || "").length;
  const titleSize = isSubscribed
    ? Math.max(16, Math.min(24, 360 / Math.max(titleLen, 1)))
    : Math.max(14, Math.min(20, 320 / Math.max(titleLen, 1)));

  // Slight rotation for that sharpie-on-a-label feel
  const hash = (community.slug || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const tilt = ((hash % 5) * 0.5 - 1.2);

  // Long press handler for followed tapes → see the back
  let pressTimer = null;
  const handleTouchStart = () => {
    if (!onLongPress) return;
    pressTimer = setTimeout(() => {
      onLongPress();
      pressTimer = null;
    }, 500);
  };
  const handleTouchEnd = (e) => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
      // Short tap — navigate
      onTap?.();
    }
    // If pressTimer was already cleared (long press fired), do nothing
  };
  const handleTouchMove = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  const handleClick = (e) => {
    // On desktop, just tap
    if (!("ontouchstart" in window)) {
      onTap?.();
    }
  };

  return (
    <div
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      style={{
        margin: "5px 0",
        borderRadius: 6,
        background: "#302c28",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        cursor: "pointer",
        overflow: "hidden",
        position: "relative",
        backgroundImage: NOISE_SVG,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div style={{
        borderRadius: 4,
        overflow: "hidden",
        display: "flex",
        minHeight: isSubscribed ? 80 : 72,
      }}>
        {/* Left dark tape end */}
        <div style={{ width: 5, flexShrink: 0, background: "#1a1612" }} />

        {/* Cream label */}
        <div style={{
          flex: 1,
          background: "#f0ebe1",
          padding: isSubscribed ? "10px 14px" : "10px 14px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Ghost backdrop — podcast artwork */}
          {artworkUrl && (
            <img
              src={artworkUrl}
              alt=""
              loading="lazy"
              style={{
                position: "absolute", inset: -4,
                width: "calc(100% + 8px)", height: "calc(100% + 8px)",
                objectFit: "cover", objectPosition: "center",
                opacity: 0.15,
                filter: "sepia(0.6) saturate(0.4) brightness(1.0) contrast(1.1)",
                mixBlendMode: "multiply",
                pointerEvents: "none",
              }}
            />
          )}

          {/* Grid lines */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 17px, rgba(0,0,0,0.03) 17px, rgba(0,0,0,0.03) 18px)",
          }} />

          <BrandStamp brand={brandLeft} side="left" />
          <BrandStamp brand={brandRight} side="right" />

          {/* ── Followed: art + name row ── */}
          {isSubscribed && (
            <>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                position: "relative",
                zIndex: 2,
                maxWidth: "85%",
              }}>
                {artworkUrl && (
                  <img
                    src={artworkUrl}
                    alt=""
                    style={{
                      width: 34, height: 34,
                      borderRadius: 6,
                      objectFit: "cover",
                      flexShrink: 0,
                      border: "1.5px solid rgba(44,40,36,0.12)",
                    }}
                  />
                )}
                <div style={{
                  fontFamily: "'Permanent Marker', cursive",
                  fontSize: titleSize,
                  color: "#2C2824",
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                  lineHeight: 1.15,
                  textShadow: "1px 1px 0px rgba(44,40,36,0.08)",
                  transform: `rotate(${tilt * 0.5}deg)`,
                }}>
                  {community.name}
                </div>
              </div>
              {/* Minimal stat */}
              {stats?.totalSeries > 0 && (
                <div style={{
                  fontFamily: "'Permanent Marker', cursive",
                  fontSize: 10,
                  color: "rgba(44,40,36,0.45)",
                  position: "relative",
                  zIndex: 2,
                  marginTop: 2,
                }}>
                  {stats.completedSeries} / {stats.totalSeries} series
                </div>
              )}
              {/* Following indicator */}
              <div style={{
                position: "absolute",
                bottom: 5, right: 28,
                zIndex: 3,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 7,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "2px 6px",
                borderRadius: 2,
                background: "rgba(44,40,36,0.06)",
                color: accent || "rgba(44,40,36,0.5)",
              }}>● following</div>
            </>
          )}

          {/* ── Unfollowed: just the name ── */}
          {!isSubscribed && (
            <>
              <div style={{
                fontFamily: "'Permanent Marker', cursive",
                fontSize: titleSize,
                color: "#2C2824",
                textTransform: "uppercase",
                letterSpacing: "0.02em",
                lineHeight: 1.15,
                textShadow: "1px 1px 0px rgba(44,40,36,0.08)",
                position: "relative",
                zIndex: 2,
                textAlign: "center",
                transform: `rotate(${tilt * 0.6}deg)`,
                maxWidth: "85%",
              }}>
                {community.name}
              </div>
              <div style={{
                fontFamily: "'Permanent Marker', cursive",
                fontSize: 9,
                color: "rgba(44,40,36,0.35)",
                position: "relative",
                zIndex: 2,
                marginTop: 3,
              }}>tap to learn more</div>
            </>
          )}
        </div>

        {/* Right dark tape end */}
        <div style={{ width: 5, flexShrink: 0, background: "#1a1612" }} />
      </div>
    </div>
  );
}
