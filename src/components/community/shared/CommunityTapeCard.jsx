import { t } from "../../../theme";
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
const VHS_LOGO_BRAND = { color: t.creamDark, text: "VHS", sub: "", weight: 800, isVhs: true };

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
          fontFamily: t.fontDisplay,
          fontWeight: 900,
          fontSize: 9,
          letterSpacing: 2,
          color: brand.color,
        }}>VHS</div>
      ) : (
        <>
          <div style={{
            writingMode: "vertical-rl",
            fontFamily: t.fontDisplay,
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
              fontFamily: t.fontMono,
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
  onFlip,
}) {
  const { left: brandLeft, right: brandRight } = getVhsBrands(community.slug);
  const tapeTitle = community.theme_config?.tape_title || community.name || "";
  const tapeTitleLines = tapeTitle.split("\n");
  const longestLine = Math.max(...tapeTitleLines.map(l => l.length));
  const titleSize = isSubscribed
    ? Math.max(15, Math.min(22, 340 / Math.max(longestLine, 1)))
    : Math.max(14, Math.min(20, 320 / Math.max(longestLine, 1)));

  // Slight rotation for that sharpie-on-a-label feel
  const hash = (community.slug || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const tilt = ((hash % 5) * 0.5 - 1.2);

  return (
    <div
      onClick={() => onTap?.()}
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
        minHeight: 88,
      }}>
        {/* Left dark tape end */}
        <div style={{ width: 5, flexShrink: 0, background: "#1a1612" }} />

        {/* Cream label */}
        <div style={{
          flex: 1,
          background: "#f0ebe1",
          padding: isSubscribed ? "8px 14px" : "10px 14px",
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

          {/* ── Followed: big art + name beside it ── */}
          {isSubscribed && (
            <>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                position: "relative",
                zIndex: 2,
                width: "100%",
                padding: "0 18px",
              }}>
                {artworkUrl && (
                  <img
                    src={artworkUrl}
                    alt=""
                    style={{
                      width: 58, height: 58,
                      borderRadius: 8,
                      objectFit: "cover",
                      flexShrink: 0,
                      border: "1.5px solid rgba(44,40,36,0.12)",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Permanent Marker', cursive",
                    color: t.creamDark,
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    lineHeight: 1.15,
                    textShadow: "1px 1px 0px rgba(44,40,36,0.08)",
                    transform: `rotate(${tilt * 0.4}deg)`,
                  }}>
                    {tapeTitleLines.map((line, i) => (
                      <div key={i} style={{
                        fontSize: i === 0 ? titleSize : Math.max(11, titleSize * 0.6),
                        opacity: i === 0 ? 1 : 0.6,
                      }}>{line}</div>
                    ))}
                  </div>
                  {/* Minimal stat */}
                  {stats?.totalSeries > 0 && (
                    <div style={{
                      fontFamily: "'Permanent Marker', cursive",
                      fontSize: 10,
                      color: "rgba(44,40,36,0.4)",
                      marginTop: 2,
                    }}>
                      {stats.completedSeries} / {stats.totalSeries} series
                    </div>
                  )}
                </div>
              </div>

              {/* ── Flip button (ℹ) — opens sleeve for info / unfollow ── */}
              {onFlip && (
                <button
                  onClick={(e) => { e.stopPropagation(); onFlip(); }}
                  style={{
                    position: "absolute",
                    top: 6, right: 22,
                    zIndex: 4,
                    width: 24, height: 24,
                    borderRadius: 12,
                    border: "none",
                    background: "rgba(44,40,36,0.08)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    WebkitTapHighlightColor: "transparent",
                    padding: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="rgba(44,40,36,0.4)" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </button>
              )}
            </>
          )}

          {/* ── Unfollowed: art + name ── */}
          {!isSubscribed && (
            <>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                position: "relative",
                zIndex: 2,
                width: "100%",
                padding: "0 18px",
              }}>
                {artworkUrl && (
                  <img
                    src={artworkUrl}
                    alt=""
                    style={{
                      width: 48, height: 48,
                      borderRadius: 8,
                      objectFit: "cover",
                      flexShrink: 0,
                      border: "1.5px solid rgba(44,40,36,0.12)",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Permanent Marker', cursive",
                    color: t.creamDark,
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    lineHeight: 1.15,
                    textShadow: "1px 1px 0px rgba(44,40,36,0.08)",
                    transform: `rotate(${tilt * 0.5}deg)`,
                  }}>
                    {tapeTitleLines.map((line, i) => (
                      <div key={i} style={{
                        fontSize: i === 0 ? titleSize : Math.max(10, titleSize * 0.6),
                        opacity: i === 0 ? 1 : 0.6,
                      }}>{line}</div>
                    ))}
                  </div>
                  <div style={{
                    fontFamily: "'Permanent Marker', cursive",
                    fontSize: 9,
                    color: "rgba(44,40,36,0.35)",
                    marginTop: 2,
                  }}>tap to learn more</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right dark tape end */}
        <div style={{ width: 5, flexShrink: 0, background: "#1a1612" }} />
      </div>
    </div>
  );
}
