import { t } from "../../../theme";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FadeImg } from "../../feed/FeedPrimitives";

// ════════════════════════════════════════════════
// COMMUNITY SLEEVE SHEET — VHS box-back for podcast discovery
// ════════════════════════════════════════════════
// Hollywood-style billing: hosts as "starring," network as "produced by,"
// podcast description as synopsis, stats, follow CTA, barcode.

// Deterministic barcode (matches VhsSleeveSheet.jsx)
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

// Slug abbreviations for MPAA-style box
const SLUG_ABBREV = {
  blankcheck: "BC", nowplaying: "NP", bigpicture: "BP",
  filmjunk: "FJ", hdtgm: "HD", filmspotting: "FS",
  rewatchables: "RW", chapo: "CT",
  "staff-picks": "MO",
};

export default function CommunitySleeveSheet({
  community,
  open,
  onClose,
  artworkUrl,
  accent,
  stats,
  isSubscribed,
  onFollow,
  onUnfollow,
  onNavigate,
  subscriptionsLoaded,
}) {
  const sheetRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const theme = community?.theme_config || {};
  const hosts = theme.hosts || [];
  const topHosts = hosts.slice(0, 3);
  const alsoHosts = hosts.slice(3);
  const network = theme.network || null;
  const podcastAbout = theme.podcast_about || null;
  const sleeveHero = theme.sleeve_hero || null;
  const sleeveHeroFit = theme.sleeve_hero_fit || "cover";
  const slug = community?.slug || "";
  const abbrev = SLUG_ABBREV[slug] || slug.slice(0, 2).toUpperCase();

  // Barcode seed from slug
  const seed = slug.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const stripes = makeBarcode(seed);
  const barcodeNum = String(seed * 17 + 1284016).padStart(12, "0");

  // Load Oswald on demand
  useEffect(() => {
    if (open) {
      const id = "google-font-oswald";
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap";
        document.head.appendChild(link);
      }
    }
  }, [open]);

  // Prevent background scroll
  useLayoutEffect(() => {
    if (open) {
      const pane = document.querySelector(".tab-pane");
      if (pane) {
        pane.style.overflow = "hidden";
        return () => { pane.style.overflow = ""; };
      }
    }
  }, [open]);

  // Swipe-to-dismiss
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

  if (!community) return null;

  const s = stats || { totalSeries: 0, totalBadges: 0 };

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
          paddingBottom: "calc(80px + var(--sab))",
          maxWidth: 420,
          marginLeft: "auto",
          marginRight: "auto",
          border: "3px solid rgba(240,235,225,0.28)",
          borderBottom: "none",
          boxShadow: "0 -4px 30px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(240,235,225,0.1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Drag handle */}
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

        {/* ── Hero image — feed-style framing ── */}
        {sleeveHero && (
          <div style={{
            position: "relative",
            width: "100%",
            height: 220,
            overflow: "hidden",
            marginBottom: -44,
          }}>
            <FadeImg
              src={sleeveHero}
              alt=""
              placeholderColor="#171411"
              style={{
                width: "100%",
                height: "100%",
                objectFit: sleeveHeroFit,
                objectPosition: "center top",
                ...(sleeveHeroFit === "contain" ? { padding: "20px 40px" } : {}),
              }}
            />
            {/* Warm amber overlay */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: "rgba(255, 200, 140, 0.1)",
              mixBlendMode: "multiply",
            }} />
            {/* Bottom gradient — hard fade into sheet bg */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: "linear-gradient(180deg, transparent 0%, transparent 40%, rgba(23,20,17,0.6) 70%, #171411 100%)",
            }} />
            {/* Worn edges — vignette + inner shadow */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              boxShadow: "inset 0 0 30px 8px rgba(0,0,0,0.3)",
            }} />
            {/* Film grain */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.05,
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='4' height='4' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")",
            }} />
          </div>
        )}

        {/* ── Podcast name + art — inline row ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: sleeveHero ? "0 20px 12px" : "6px 20px 12px",
          position: "relative",
          zIndex: 2,
        }}>
          {artworkUrl && (
            <FadeImg
              src={artworkUrl}
              alt=""
              placeholderColor="rgba(240,235,225,0.05)"
              style={{
                width: 56, height: 56,
                borderRadius: 12,
                objectFit: "cover",
                flexShrink: 0,
                border: `2px solid ${accent}44`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              }}
            />
          )}
          <div style={{
            fontFamily: t.fontSharpie,
            fontSize: 24,
            color: "rgba(240,235,225,0.95)",
            lineHeight: 1.15,
            letterSpacing: "0.02em",
          }}>
            {community.name}
          </div>
        </div>

        {/* ── Billing — hosts as "starring" ── */}
        {topHosts.length > 0 && (
          <div style={{ padding: "0 20px" }}>
            <div style={{
              fontFamily: t.fontDisplay,
              fontWeight: 400, fontSize: 10,
              color: "rgba(240,235,225,0.4)",
              letterSpacing: "0.1em",
              textTransform: "lowercase",
              marginBottom: 3,
            }}>starring</div>
            {topHosts.map((h, i) => (
              <div key={h.key || i} style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 500, fontSize: 14,
                color: "rgba(240,235,225,0.9)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                lineHeight: 1.4,
              }}>{h.name}</div>
            ))}
          </div>
        )}

        {/* Also starring + produced by / "a podcast about" */}
        {(alsoHosts.length > 0 || network || podcastAbout) && (
          <div style={{ textAlign: "center", padding: "8px 20px 0" }}>
            {alsoHosts.length > 0 && (
              <div style={{
                display: "flex", alignItems: "baseline",
                justifyContent: "center", gap: 5, marginBottom: 4,
              }}>
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
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}>{alsoHosts.map(h => h.name).join(", ")}</span>
              </div>
            )}
            {podcastAbout && (
              <div style={{
                display: "flex", alignItems: "baseline",
                justifyContent: "center", gap: 6,
              }}>
                <span style={{
                  fontFamily: t.fontDisplay,
                  fontWeight: 400, fontSize: 10,
                  color: "rgba(240,235,225,0.4)",
                  letterSpacing: "0.1em",
                }}>a podcast about</span>
                <span style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 500, fontSize: 14,
                  color: "rgba(240,235,225,0.9)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}>{podcastAbout}</span>
              </div>
            )}
            {network && !podcastAbout && (
              <div style={{
                display: "flex", alignItems: "baseline",
                justifyContent: "center", gap: 6,
              }}>
                <span style={{
                  fontFamily: t.fontDisplay,
                  fontWeight: 400, fontSize: 10,
                  color: "rgba(240,235,225,0.4)",
                  letterSpacing: "0.1em",
                }}>produced by</span>
                <span style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 500, fontSize: 14,
                  color: "rgba(240,235,225,0.9)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}>{network}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Description ── */}
        {community.description && (
          <div style={{
            fontFamily: t.fontBody,
            fontSize: 13,
            lineHeight: 1.7,
            color: "rgba(240,235,225,0.85)",
            padding: "16px 20px 0",
            letterSpacing: "0.01em",
          }}>
            {community.description}
          </div>
        )}

        {/* ── Stats ── */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: 20,
          padding: "16px 20px 0",
          fontFamily: t.fontDisplay,
          fontSize: 14, fontWeight: 600,
          color: "rgba(240,235,225,0.4)",
        }}>
          {s.totalSeries > 0 && (
            <span>
              <span style={{ fontWeight: 700, color: "rgba(240,235,225,0.7)" }}>
                {s.totalSeries}
              </span> series
            </span>
          )}
          {s.totalBadges > 0 && (
            <span>
              <span style={{ fontWeight: 700, color: "rgba(240,235,225,0.7)" }}>
                {s.totalBadges}
              </span> badges
            </span>
          )}
        </div>

        {/* ── Follow / Navigate CTA ── */}
        {subscriptionsLoaded && (
          <div style={{ padding: "20px 20px 0" }}>
            {isSubscribed ? (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onNavigate?.(); }}
                  style={{
                    flex: 1,
                    padding: "13px 16px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: t.fontDisplay,
                    fontWeight: 700, fontSize: 14,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    background: accent || "#e94560",
                    color: t.textPrimary,
                    WebkitTapHighlightColor: "transparent",
                  }}
                >Enter Community</button>
                <button
                  onClick={(e) => { e.stopPropagation(); onUnfollow?.(); }}
                  style={{
                    padding: "13px 14px",
                    borderRadius: 8,
                    border: `1.5px solid rgba(240,235,225,0.15)`,
                    cursor: "pointer",
                    fontFamily: t.fontDisplay,
                    fontWeight: 600, fontSize: 11,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    background: "transparent",
                    color: "rgba(240,235,225,0.4)",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >Unfollow</button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onFollow?.(); }}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: t.fontDisplay,
                  fontWeight: 700, fontSize: 14,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  background: accent || "#e94560",
                  color: t.textPrimary,
                  WebkitTapHighlightColor: "transparent",
                }}
              >+ Follow Community</button>
            )}
          </div>
        )}

        {/* ── Bottom row: network left, barcode right ── */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          padding: "24px 20px 8px",
        }}>
          {/* Left: network + MPAA box */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            {network && (
              <span style={{
                fontFamily: t.fontDisplay,
                fontWeight: 700, fontSize: 12,
                color: "rgba(240,235,225,0.3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontStyle: "italic",
              }}>{network}</span>
            )}
            <div style={{
              width: 22, height: 22,
              border: "1.5px solid rgba(240,235,225,0.3)",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: t.fontDisplay,
              fontWeight: 800, fontSize: 11,
              color: "rgba(240,235,225,0.4)",
            }}>{abbrev}</div>
          </div>

          {/* Right: barcode */}
          <div>
            <div style={{ display: "flex", height: 28 }}>
              {stripes.map((s, i) => (
                <div key={i} style={{
                  width: s.w,
                  height: "100%",
                  background: s.dark ? "rgba(240,235,225,0.25)" : "transparent",
                }} />
              ))}
            </div>
            <div style={{
              fontFamily: t.fontBody,
              fontSize: 9,
              color: "rgba(240,235,225,0.3)",
              textAlign: "center",
              marginTop: 2,
              letterSpacing: "0.15em",
            }}>{barcodeNum}</div>
          </div>
        </div>

        {/* Fine print */}
        <div style={{
          fontFamily: t.fontBody,
          fontSize: 6,
          color: "rgba(240,235,225,0.15)",
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          padding: "4px 20px 20px",
        }}>This cassette is for private home use only</div>
      </div>
    </>,
    document.body
  );
}
