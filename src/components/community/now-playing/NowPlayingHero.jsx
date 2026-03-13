import { useMemo, useRef, useState, useEffect } from "react";
import { HeroBanner } from "../primitives";

/**
 * NowPlayingHero — Hero section for the Now Playing Podcast community page.
 *
 * Tab-aware: adapts stats + banner based on activeTab.
 * - "filmography" (default): Watched / Films
 * - "books": Books Read / Total Books / Pages Read
 * - "arcade": 2 themed arcade cabinets — Hunter (Watched) / Shooter (Beat)
 */

export default function NowPlayingHero({
  community, miniseries, progress, activeTab,
  filter, onFilterChange, searchQuery, onSearchChange,
}) {
  const tabHero = community?.theme_config?.tab_heroes?.[activeTab];
  const heroTagline = tabHero?.tagline ?? community?.tagline;
  const heroDescription = tabHero?.description ?? community?.description;

  const isBooks = activeTab === "books";
  const isArcade = activeTab === "arcade";

  const heroBanner = isBooks
    ? "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/BookAndNachosBanner.jpg"
    : (tabHero?.banner_url ?? community?.banner_url);

  const [searchOpen, setSearchOpen] = useState(false);

  // ── Compute stats based on active tab ──
  const stats = useMemo(() => {
    if (isBooks) {
      let total = 0;
      let completed = 0;
      let pages = 0;
      const seen = new Set();

      miniseries.forEach((s) => {
        if (s.tab_key !== "books") return;
        (s.items || []).forEach((i) => {
          const key = `${i.title}::${i.year || ""}`;
          if (seen.has(key)) return;
          seen.add(key);

          total++;
          const pageCount = i.extra_data?.page_count || 0;

          if (progress[i.id]?.status === "completed" || progress[i.id]?.listened_with_commentary !== undefined) {
            completed++;
            pages += pageCount;
          }
        });
      });

      return { completed, total, pages };
    }

    if (isArcade) {
      let filmWatched = 0;
      let gamesBeat = 0;
      let playingGame = null;
      const seenFilms = new Set();
      const seenGames = new Set();

      miniseries.forEach((s) => {
        (s.items || []).forEach((i) => {
          if (i.media_type === "game") {
            const gk = `game::${i.title}::${i.year || ""}`;
            if (seenGames.has(gk)) return;
            seenGames.add(gk);
            const st = progress[i.id]?.status;
            if (st === "completed") gamesBeat++;
            if (st === "playing" && !playingGame) {
              playingGame = {
                title: i.title,
                bgImage: i.extra_data?.bg_image || null,
                year: i.year,
              };
            }
          } else {
            const fk = `film::${i.title}::${i.year || ""}`;
            if (seenFilms.has(fk)) return;
            seenFilms.add(fk);
            if (progress[i.id]) filmWatched++;
          }
        });
      });

      return { completed: filmWatched, total: 0, pages: 0, gamesBeat, playingGame };
    }

    // Default: film stats
    let completed = 0;
    let total = 0;
    miniseries.forEach((s) => {
      const items = (s.items || []).filter((i) => i.media_type === "film" || !i.media_type);
      total += items.length;
      completed += items.filter((i) => progress[i.id]).length;
    });
    return { completed, total, pages: 0 };
  }, [miniseries, progress, isBooks, isArcade]);

  // ── Pop animation on count change ──
  const prevCount = useRef(stats.completed);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (stats.completed !== prevCount.current && prevCount.current !== 0) {
      setPop(true);
      const t = setTimeout(() => setPop(false), 400);
      return () => clearTimeout(t);
    }
    prevCount.current = stats.completed;
  }, [stats.completed]);

  useEffect(() => {
    prevCount.current = stats.completed;
  }, [stats.completed]);

  // ── Accent color per tab ──
  const accent = isBooks ? "#d4a574" : isArcade ? "#00ffc8" : "#facc15";

  // ── Format pages nicely ──
  const formatPages = (n) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
    return String(n);
  };

  return (
    <div style={{
      position: "relative",
      borderBottom: isArcade ? "1px solid rgba(0,255,200,0.06)" : "1px solid rgba(255,255,255,0.06)",
      overflow: "hidden",
      background: isArcade ? "#08080f" : undefined,
    }}>
      <style>{`
        @keyframes statPop {
          0% { transform: scale(1); }
          30% { transform: scale(1.25); }
          60% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        @keyframes screenFlicker {
          0%, 100% { opacity: 1; }
          92% { opacity: 1; }
          93% { opacity: 0.82; }
          94% { opacity: 1; }
          97% { opacity: 0.9; }
          98% { opacity: 1; }
        }
        @keyframes marqueeGlow {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Arcade: amber vignette + scanlines */}
      {isArcade ? (
        <>
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
            background: [
              "radial-gradient(ellipse at center, transparent 30%, rgba(245,197,24,0.05) 70%, rgba(245,197,24,0.10) 100%)",
              "linear-gradient(180deg, rgba(245,197,24,0.03) 0%, transparent 40%, transparent 60%, rgba(245,197,24,0.02) 100%)",
            ].join(", "),
          }} />
          <div style={{
            position: "absolute", top: 0, left: 0, width: "40%", height: "40%",
            background: "radial-gradient(ellipse at top left, rgba(245,197,24,0.07) 0%, transparent 70%)",
            pointerEvents: "none", zIndex: 0,
          }} />
          <div style={{
            position: "absolute", top: 0, right: 0, width: "40%", height: "40%",
            background: "radial-gradient(ellipse at top right, rgba(245,197,24,0.07) 0%, transparent 70%)",
            pointerEvents: "none", zIndex: 0,
          }} />
          <div style={{
            position: "absolute", bottom: 0, left: 0, width: "40%", height: "40%",
            background: "radial-gradient(ellipse at bottom left, rgba(245,197,24,0.05) 0%, transparent 70%)",
            pointerEvents: "none", zIndex: 0,
          }} />
          <div style={{
            position: "absolute", bottom: 0, right: 0, width: "40%", height: "40%",
            background: "radial-gradient(ellipse at bottom right, rgba(245,197,24,0.05) 0%, transparent 70%)",
            pointerEvents: "none", zIndex: 0,
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: "repeating-linear-gradient(0deg, rgba(245,197,24,0.008) 0px, rgba(245,197,24,0.008) 1px, transparent 1px, transparent 3px)",
            pointerEvents: "none", zIndex: 0,
          }} />
        </>
      ) : (
        <HeroBanner
          bannerUrl={heroBanner}
          contain={isBooks ? false : tabHero?.banner_contain}
          position={isBooks ? "center center" : tabHero?.banner_position}
          opacity={isBooks ? 0.2 : tabHero?.banner_opacity}
          gradientStrength={isBooks ? 0.9 : tabHero?.gradient_strength}
        />
      )}

      <div style={{ position: "relative", zIndex: 1, padding: isArcade ? "20px 16px 6px" : "24px 16px 20px" }}>
        {/* Title + tagline */}
        <div style={{
          fontSize: isArcade ? 22 : 28, fontWeight: 800, color: "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.03em", textTransform: "uppercase",
          textAlign: "center", marginBottom: 4, lineHeight: 1.1,
        }}>
          {isArcade ? "Now Playing Arcade" : (heroTagline || community?.name || "Now Playing")}
        </div>
        <div style={{
          fontSize: isArcade ? 11 : 13,
          color: isArcade ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.5)",
          textAlign: "center",
          maxWidth: 300, margin: "0 auto 14px", whiteSpace: "pre-line",
          fontStyle: isArcade ? "italic" : "normal",
        }}>
          {isArcade ? "The Boll and the Beautiful" : heroDescription}
        </div>

        {/* ═══ STATS ═══ */}
        {isArcade ? (
          <div>
            <div style={{
              display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 6,
              padding: "0 0",
            }}>
              <HunterCabinet
                label="Watched"
                value={stats.completed}
                color="#00ffc8"
                pop={pop}
              />

              {stats.playingGame && (
                <CandyCabinet
                  label="Now Playing"
                  gameTitle={stats.playingGame.title}
                  bgImage={stats.playingGame.bgImage}
                />
              )}

              {stats.gamesBeat > 0 && (
                <ShooterCabinet
                  label="Beat"
                  value={stats.gamesBeat}
                  color="#4ade80"
                />
              )}
            </div>
            <div style={{
              textAlign: "center", marginTop: 6, paddingBottom: 4,
              fontSize: 8, color: "rgba(245,197,24,0.18)",
              fontFamily: "'Courier New', monospace",
              letterSpacing: "0.12em", textTransform: "uppercase",
            }}>
              Insert coin to continue
            </div>

            {/* ── Filter pills + search toggle ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              marginTop: 10, padding: "0 0",
            }}>
              {["all", "seen", "unseen"].map((f) => (
                <button
                  key={f}
                  onClick={() => onFilterChange?.(f)}
                  style={{
                    padding: "5px 10px",
                    fontSize: 10, fontWeight: 600,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    borderRadius: 20,
                    border: filter === f
                      ? "1.5px solid #00ffc8"
                      : "1px solid rgba(255,255,255,0.1)",
                    background: filter === f ? "rgba(0,255,200,0.12)" : "rgba(255,255,255,0.04)",
                    color: filter === f ? "#00ffc8" : "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    flexShrink: 0,
                    WebkitTapHighlightColor: "transparent",
                    transition: "all 0.2s",
                  }}
                >
                  {f}
                </button>
              ))}

              <button
                onClick={() => {
                  setSearchOpen((o) => {
                    if (o && searchQuery) onSearchChange?.("");
                    return !o;
                  });
                }}
                style={{
                  width: 30, height: 30,
                  borderRadius: "50%",
                  border: searchOpen ? "1.5px solid #00ffc8" : "1px solid rgba(255,255,255,0.1)",
                  background: searchOpen ? "rgba(0,255,200,0.12)" : "rgba(255,255,255,0.04)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", marginLeft: "auto", flexShrink: 0,
                  WebkitTapHighlightColor: "transparent",
                  transition: "all 0.2s",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke={searchOpen ? "#00ffc8" : "rgba(255,255,255,0.4)"}
                  strokeWidth="2" strokeLinecap="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </div>

            {/* ── Expandable search input ── */}
            <div style={{
              overflow: "hidden",
              maxHeight: searchOpen ? 50 : 0,
              opacity: searchOpen ? 1 : 0,
              transition: "max-height 0.25s ease, opacity 0.2s ease",
              marginTop: searchOpen ? 8 : 0,
            }}>
              <style>{`
                .cs-search-arcade-hero::placeholder { color: rgba(0,255,200,0.2); }
                .cs-search-arcade-hero:focus { border-color: rgba(0,255,200,0.3); outline: none; }
              `}</style>
              <div style={{ position: "relative" }}>
                <input
                  className="cs-search-arcade-hero"
                  type="text"
                  placeholder="Search games & movies..."
                  value={searchQuery || ""}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "8px 14px 8px 32px",
                    background: "rgba(0,255,200,0.03)",
                    border: "1px solid rgba(0,255,200,0.08)",
                    borderRadius: 10,
                    color: "#d0ffe8",
                    fontSize: 13,
                    fontFamily: "inherit",
                    WebkitAppearance: "none",
                  }}
                />
                <div style={{
                  position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                  fontSize: 13, color: "rgba(0,255,200,0.2)", pointerEvents: "none",
                }}>🔍</div>
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange?.("")}
                    style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                      background: "rgba(0,255,200,0.1)", border: "none", borderRadius: "50%",
                      width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
                      color: "rgba(0,255,200,0.5)", fontSize: 11, cursor: "pointer",
                    }}
                  >✕</button>
                )}
              </div>
            </div>
          </div>
        ) : isBooks ? (
          <div style={{
            display: "flex", justifyContent: "center", gap: 24,
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: 30, fontWeight: 800, color: accent,
                fontFamily: "'Barlow Condensed', sans-serif",
                animation: pop ? "statPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" : "none",
                filter: pop ? `drop-shadow(0 0 8px ${accent}80)` : "none",
                transition: "filter 0.3s",
              }}>
                {stats.completed}
              </div>
              <div style={{
                fontSize: 9, color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Read
              </div>
            </div>

            <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />

            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: 30, fontWeight: 800, color: "#fff",
                fontFamily: "'Barlow Condensed', sans-serif",
              }}>
                {stats.total}
              </div>
              <div style={{
                fontSize: 9, color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Books
              </div>
            </div>

            {stats.pages > 0 && (
              <>
                <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    fontSize: 30, fontWeight: 800, color: "rgba(255,255,255,0.6)",
                    fontFamily: "'Barlow Condensed', sans-serif",
                  }}>
                    {formatPages(stats.pages)}
                  </div>
                  <div style={{
                    fontSize: 9, color: "rgba(255,255,255,0.35)",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    Pages
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{
            display: "flex", justifyContent: "center", gap: 24,
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: 30, fontWeight: 800, color: "#facc15",
                fontFamily: "'Barlow Condensed', sans-serif",
                animation: pop ? "statPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" : "none",
                filter: pop ? "drop-shadow(0 0 8px rgba(250,204,21,0.5))" : "none",
                transition: "filter 0.3s",
              }}>
                {stats.completed}
              </div>
              <div style={{
                fontSize: 9, color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Watched
              </div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: 30, fontWeight: 800, color: "#fff",
                fontFamily: "'Barlow Condensed', sans-serif",
              }}>
                {stats.total}
              </div>
              <div style={{
                fontSize: 9, color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Films
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════
   HunterCabinet — Big Buck Hunter style arcade cabinet
   ───────────────────────────────────────────────────────────────────────
   Wide body, faux wood-grain side panels, mounted rifle controller,
   nature-themed marquee with tree/mountain silhouettes. Warm amber &
   forest green tones. Scuff marks, faded sticker, worn coin door.
   140×200 viewBox.
   ═══════════════════════════════════════════════════════════════════════ */

function HunterCabinet({ label, value, color, pop }) {
  const c = (alpha) => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  return (
    <div style={{ textAlign: "center", width: 110 }}>
      <svg width="110" height="157" viewBox="0 0 140 200">
        <defs>
          {/* Wood grain pattern */}
          <pattern id="hunterWood" x="0" y="0" width="6" height="200" patternUnits="userSpaceOnUse">
            <rect width="6" height="200" fill="#1a120a" />
            <line x1="1" y1="0" x2="1.5" y2="200" stroke="#2a1c10" strokeWidth="0.6" opacity="0.5" />
            <line x1="3.5" y1="0" x2="3" y2="200" stroke="#1e1409" strokeWidth="0.4" opacity="0.4" />
            <line x1="5" y1="0" x2="5.2" y2="200" stroke="#261a0e" strokeWidth="0.3" opacity="0.3" />
          </pattern>
          {/* Screen CRT glow */}
          <radialGradient id="hunterScreenGlow" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#0a2a18" />
            <stop offset="100%" stopColor="#040e08" />
          </radialGradient>
          {/* Marquee backlight */}
          <linearGradient id="hunterMarqueeGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a3a20" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#2a5a30" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#1a3a20" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* ── FLOOR SHADOW ── */}
        <ellipse cx="70" cy="198" rx="52" ry="3" fill="rgba(0,0,0,0.35)" />

        {/* ── CABINET BODY ── */}
        <path
          d={[
            "M20,28", "L20,128", "Q20,130 22,131",
            "L17,158", "Q17,159 18,159",
            "L24,159 L24,188 Q24,192 28,192",
            "L42,192 Q46,192 46,188 L46,159",
            "L94,159",
            "L94,188 Q94,192 98,192",
            "L112,192 Q116,192 116,188 L116,159",
            "L122,159 Q123,159 123,158",
            "L118,131 Q120,130 120,128",
            "L120,28",
            "Q120,26 118,26",
            "L22,26 Q20,26 20,28 Z",
          ].join(" ")}
          fill="#0c0a08"
          stroke="rgba(60,45,25,0.35)"
          strokeWidth="0.8"
        />

        {/* ── Wood-grain side panels ── */}
        <rect x="16" y="28" width="8" height="100" rx="1" fill="url(#hunterWood)" opacity="0.7" />
        <rect x="116" y="28" width="8" height="100" rx="1" fill="url(#hunterWood)" opacity="0.7" />

        {/* ── T-molding trim ── */}
        <line x1="24" y1="28" x2="24" y2="128" stroke="rgba(180,160,100,0.15)" strokeWidth="1" />
        <line x1="116" y1="28" x2="116" y2="128" stroke="rgba(180,160,100,0.15)" strokeWidth="1" />

        {/* ── MARQUEE (backlit with nature scene) ── */}
        <path
          d="M24,28 L24,10 Q24,3 31,3 L109,3 Q116,3 116,10 L116,28"
          fill="url(#hunterMarqueeGlow)"
          stroke="rgba(80,120,60,0.4)"
          strokeWidth="0.8"
        />
        <rect x="28" y="6" width="84" height="19" rx="2" fill="rgba(30,60,30,0.3)" />
        {/* Mountain silhouette */}
        <polygon points="28,22 40,12 48,17 58,8 72,16 80,10 92,14 100,9 112,22" fill="rgba(20,40,15,0.5)" />
        {/* Tree silhouettes */}
        <polygon points="34,22 37,13 40,22" fill="rgba(15,35,12,0.6)" />
        <polygon points="88,22 91,11 94,22" fill="rgba(15,35,12,0.6)" />
        <polygon points="104,22 106.5,14 109,22" fill="rgba(15,35,12,0.6)" />
        <polygon points="46,22 48.5,15 51,22" fill="rgba(15,35,12,0.5)" />
        {/* Marquee label */}
        <text
          x="70" y="19" textAnchor="middle"
          fill="rgba(140,200,100,0.85)"
          fontSize="10" fontWeight="800"
          fontFamily="'Barlow Condensed', sans-serif"
          letterSpacing="2"
          style={{ animation: "marqueeGlow 3s ease-in-out infinite" }}
        >
          {label.toUpperCase()}
        </text>
        <line x1="30" y1="5" x2="110" y2="5" stroke="rgba(180,160,100,0.12)" strokeWidth="0.6" />

        {/* ── SPEAKER GRILL ── */}
        <rect x="38" y="30" width="64" height="8" rx="1.5" fill="rgba(20,15,10,0.8)" />
        {[0,1,2,3,4,5,6,7,8,9].map(i => (
          <line key={`hsp${i}`}
            x1={41 + i * 6} y1="31.5" x2={41 + i * 6} y2="36.5"
            stroke="rgba(100,80,50,0.12)" strokeWidth="0.5"
          />
        ))}
        {[0,1,2].map(row => [0,1,2,3,4,5,6,7].map(col => (
          <circle key={`sd${row}-${col}`}
            cx={44 + col * 7} cy={32 + row * 2.5}
            r="0.4" fill="rgba(100,80,50,0.08)"
          />
        )))}

        {/* ── SCREEN BEZEL ── */}
        <rect x="26" y="41" width="88" height="50" rx="3"
          fill="#080604" stroke="rgba(80,60,30,0.25)" strokeWidth="1"
        />
        <rect x="28" y="43" width="84" height="46" rx="2"
          fill="none" stroke="rgba(50,40,20,0.15)" strokeWidth="0.5"
        />
        {/* Corner hex bolts */}
        {[[31,46],[109,46],[31,86],[109,86]].map(([bx,by],i) => (
          <g key={`hb${i}`}>
            <circle cx={bx} cy={by} r="2" fill="rgba(60,45,25,0.15)" stroke="rgba(100,80,50,0.2)" strokeWidth="0.4" />
            <line x1={bx-1} y1={by} x2={bx+1} y2={by} stroke="rgba(100,80,50,0.15)" strokeWidth="0.4" />
          </g>
        ))}

        {/* ── SCREEN GLASS ── */}
        <rect x="32" y="46" width="76" height="40" rx="2" fill="url(#hunterScreenGlow)" />
        {[0,1,2,3,4,5,6,7,8,9].map(i => (
          <line key={`hsc${i}`}
            x1="32" y1={49 + i * 4} x2="108" y2={49 + i * 4}
            stroke="rgba(0,255,100,0.025)" strokeWidth="0.5"
          />
        ))}
        <rect x="32" y="46" width="76" height="40" rx="2"
          fill="none" stroke="rgba(100,200,120,0.06)" strokeWidth="0.8"
        />
        <line x1="36" y1="48" x2="80" y2="47" stroke="rgba(150,220,150,0.08)" strokeWidth="0.6" />

        {/* ── STAT NUMBER ── */}
        <g style={{ animation: "screenFlicker 8s linear infinite" }}>
          <text
            x="70" y="74" textAnchor="middle"
            fill={color}
            fontSize="30" fontWeight="800"
            fontFamily="'Barlow Condensed', sans-serif"
          >
            {value}
          </text>
          {/* Phosphor ghost */}
          <text
            x="70" y="74" textAnchor="middle"
            fill={c(0.06)}
            fontSize="30" fontWeight="800"
            fontFamily="'Barlow Condensed', sans-serif"
            dx="0.5" dy="0.5"
          >
            {value}
          </text>
        </g>

        {/* ── CONTROL PANEL (with mounted rifle) ── */}
        <path
          d="M26,95 L26,112 Q26,114 28,114 L112,114 Q114,114 114,112 L114,95 Q114,93 112,93 L28,93 Q26,93 26,95 Z"
          fill="rgba(18,14,10,0.9)"
          stroke="rgba(80,60,30,0.18)"
          strokeWidth="0.6"
        />
        <line x1="30" y1="94.5" x2="110" y2="94.5" stroke="rgba(180,160,100,0.06)" strokeWidth="0.5" />

        {/* ── MOUNTED RIFLE (pointing right) ── */}
        {/* Stock (left side, wood grain) */}
        <path d="M60,99 L54,99 Q51,99 51,102 L51,110 Q51,112 53,112 L57,112 Q60,112 60,109 Z"
          fill="url(#hunterWood)" stroke="rgba(90,70,40,0.25)" strokeWidth="0.5" opacity="0.8"
        />
        {/* Trigger guard */}
        <path d="M64,103 Q64,108 60,108" fill="none" stroke="rgba(100,80,50,0.2)" strokeWidth="0.6" />
        {/* Barrel */}
        <rect x="60" y="100" width="42" height="3.5" rx="1.5" fill="rgba(50,40,28,0.6)" stroke="rgba(90,70,40,0.25)" strokeWidth="0.5" />
        {/* Muzzle tip */}
        <rect x="100" y="99.5" width="6" height="4.5" rx="1" fill="rgba(60,50,35,0.5)" stroke="rgba(100,80,50,0.2)" strokeWidth="0.4" />
        {/* Scope mount */}
        <rect x="78" y="98" width="10" height="2" rx="1" fill="rgba(40,35,25,0.5)" />
        {/* Scope */}
        <rect x="80" y="96.5" width="6" height="2" rx="1" fill="rgba(50,40,30,0.4)" stroke="rgba(80,65,40,0.2)" strokeWidth="0.3" />

        {/* START button */}
        <circle cx="38" cy="103" r="4.5" fill="rgba(30,60,20,0.4)" stroke="rgba(100,180,80,0.3)" strokeWidth="0.6" />
        <text x="38" y="104.5" textAnchor="middle" fill="rgba(120,200,80,0.5)" fontSize="3.5" fontWeight="700"
          fontFamily="'Courier New', monospace">START</text>

        {/* ── VENT SLOTS ── */}
        {[0,1,2].map(i => (
          <line key={`hv${i}`}
            x1="42" y1={119 + i * 3.5} x2="98" y2={119 + i * 3.5}
            stroke="rgba(60,45,25,0.08)" strokeWidth="0.6"
          />
        ))}

        {/* ── COIN DOOR ── */}
        <rect x="44" y="132" width="52" height="22" rx="2"
          fill="rgba(15,12,8,0.8)" stroke="rgba(140,110,60,0.2)" strokeWidth="0.7"
        />
        <rect x="46" y="134" width="48" height="18" rx="1.5"
          fill="none" stroke="rgba(100,80,50,0.1)" strokeWidth="0.4"
        />
        <rect x="56" y="139" width="28" height="8" rx="2"
          fill="rgba(10,8,5,0.6)" stroke="rgba(140,110,60,0.25)" strokeWidth="0.5"
        />
        <rect x="62" y="142" width="16" height="2" rx="1"
          fill="rgba(0,0,0,0.6)" stroke="rgba(160,130,70,0.3)" strokeWidth="0.3"
        />
        <text x="70" y="149" textAnchor="middle" fill="rgba(140,110,60,0.15)" fontSize="3"
          fontFamily="'Courier New', monospace" letterSpacing="0.5">INSERT COIN</text>

        {/* ── WEAR & TEAR ── */}
        <line x1="30" y1="126" x2="45" y2="127" stroke="rgba(80,65,40,0.06)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="90" y1="130" x2="105" y2="129" stroke="rgba(80,65,40,0.04)" strokeWidth="1" strokeLinecap="round" />
        {/* Faded sticker residue */}
        <rect x="84" y="120" width="18" height="7" rx="1" fill="rgba(100,80,40,0.04)" stroke="rgba(100,80,40,0.03)" strokeWidth="0.3" />
        <text x="93" y="124.5" textAnchor="middle" fill="rgba(100,80,40,0.06)" fontSize="2.5"
          fontFamily="'Courier New', monospace" fontWeight="700">HI-SCORE</text>

        {/* ── LEG SHADOW ── */}
        <rect x="46" y="159" width="48" height="2.5" rx="0.8" fill="rgba(0,0,0,0.25)" />
      </svg>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════
   ShooterCabinet — Time Crisis / Area 51 style shooter cabinet
   ───────────────────────────────────────────────────────────────────────
   Sleek black body, angular marquee, red neon accents, mounted pistol
   grip, caution stripe side panels, industrial vents, warning labels.
   140×200 viewBox.
   ═══════════════════════════════════════════════════════════════════════ */

function ShooterCabinet({ label, value, color }) {
  const c = (alpha) => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  return (
    <div style={{ textAlign: "center", width: 110 }}>
      <svg width="110" height="157" viewBox="0 0 140 200">
        <defs>
          <radialGradient id="shooterScreenGlow" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#0a1a0e" />
            <stop offset="100%" stopColor="#030806" />
          </radialGradient>
          <pattern id="cautionStripes" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="3" height="6" fill="rgba(220,180,30,0.12)" />
            <rect x="3" width="3" height="6" fill="rgba(0,0,0,0.15)" />
          </pattern>
          <linearGradient id="shooterMarqueeGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a0a0a" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#3a1515" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#2a0a0a" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* ── FLOOR SHADOW ── */}
        <ellipse cx="70" cy="198" rx="50" ry="3" fill="rgba(0,0,0,0.35)" />

        {/* ── CABINET BODY ── */}
        <path
          d={[
            "M22,28", "L22,128", "Q22,130 24,131",
            "L19,158", "Q19,159 20,159",
            "L26,159 L26,188 Q26,192 30,192",
            "L42,192 Q46,192 46,188 L46,159",
            "L94,159",
            "L94,188 Q94,192 98,192",
            "L110,192 Q114,192 114,188 L114,159",
            "L120,159 Q121,159 121,158",
            "L116,131 Q118,130 118,128",
            "L118,28",
            "Q118,26 116,26",
            "L24,26 Q22,26 22,28 Z",
          ].join(" ")}
          fill="#0a0a0e"
          stroke="rgba(200,40,40,0.18)"
          strokeWidth="0.8"
        />

        {/* ── Caution stripe side panels ── */}
        <rect x="18" y="28" width="7" height="100" rx="1" fill="url(#cautionStripes)" opacity="0.6" />
        <rect x="115" y="28" width="7" height="100" rx="1" fill="url(#cautionStripes)" opacity="0.6" />

        {/* ── Red LED trim ── */}
        <line x1="25" y1="30" x2="25" y2="126" stroke="rgba(255,40,40,0.12)" strokeWidth="0.8" />
        <line x1="115" y1="30" x2="115" y2="126" stroke="rgba(255,40,40,0.12)" strokeWidth="0.8" />

        {/* ── MARQUEE (angular, aggressive) ── */}
        <path
          d="M25,28 L25,8 Q25,2 32,2 L70,2 L108,2 Q115,2 115,8 L115,28"
          fill="url(#shooterMarqueeGlow)"
          stroke="rgba(255,50,50,0.3)"
          strokeWidth="0.8"
        />
        <rect x="29" y="5" width="82" height="20" rx="2" fill="rgba(40,10,10,0.4)" />
        {/* Chevron accents */}
        <path d="M30,22 L38,15 L30,15 Z" fill="rgba(255,40,40,0.1)" />
        <path d="M110,22 L102,15 L110,15 Z" fill="rgba(255,40,40,0.1)" />
        {/* Crosshair */}
        <circle cx="70" cy="12" r="5" fill="none" stroke="rgba(255,60,60,0.15)" strokeWidth="0.5" />
        <line x1="70" y1="6" x2="70" y2="8" stroke="rgba(255,60,60,0.2)" strokeWidth="0.5" />
        <line x1="70" y1="16" x2="70" y2="18" stroke="rgba(255,60,60,0.2)" strokeWidth="0.5" />
        <line x1="64" y1="12" x2="66" y2="12" stroke="rgba(255,60,60,0.2)" strokeWidth="0.5" />
        <line x1="74" y1="12" x2="76" y2="12" stroke="rgba(255,60,60,0.2)" strokeWidth="0.5" />
        {/* Marquee label */}
        <text
          x="70" y="21" textAnchor="middle"
          fill="rgba(255,90,90,0.85)"
          fontSize="10" fontWeight="800"
          fontFamily="'Barlow Condensed', sans-serif"
          letterSpacing="2.5"
          style={{ animation: "marqueeGlow 4s ease-in-out infinite" }}
        >
          {label.toUpperCase()}
        </text>

        {/* ── SPEAKER GRILL ── */}
        <rect x="36" y="30" width="68" height="8" rx="1.5" fill="rgba(10,10,15,0.9)" />
        {[0,1,2,3,4,5,6,7,8,9,10].map(i => (
          <line key={`ssp${i}`}
            x1={39 + i * 6} y1="31" x2={39 + i * 6} y2="37"
            stroke="rgba(200,40,40,0.06)" strokeWidth="0.5"
          />
        ))}
        <line x1="38" y1="33" x2="102" y2="33" stroke="rgba(200,40,40,0.04)" strokeWidth="0.3" />
        <line x1="38" y1="36" x2="102" y2="36" stroke="rgba(200,40,40,0.04)" strokeWidth="0.3" />

        {/* ── SCREEN BEZEL ── */}
        <rect x="26" y="41" width="88" height="50" rx="2"
          fill="#060608" stroke="rgba(255,50,50,0.15)" strokeWidth="1"
        />
        <rect x="28" y="43" width="84" height="46" rx="1.5"
          fill="none" stroke="rgba(255,50,50,0.06)" strokeWidth="0.5"
        />
        {/* Phillips screws */}
        {[[31,46],[109,46],[31,86],[109,86]].map(([bx,by],i) => (
          <g key={`sb${i}`}>
            <circle cx={bx} cy={by} r="2" fill="rgba(30,30,35,0.8)" stroke="rgba(100,100,110,0.15)" strokeWidth="0.4" />
            <line x1={bx-1} y1={by} x2={bx+1} y2={by} stroke="rgba(120,120,130,0.12)" strokeWidth="0.3" />
            <line x1={bx} y1={by-1} x2={bx} y2={by+1} stroke="rgba(120,120,130,0.12)" strokeWidth="0.3" />
          </g>
        ))}

        {/* ── SCREEN GLASS ── */}
        <rect x="32" y="46" width="76" height="40" rx="2" fill="url(#shooterScreenGlow)" />
        {[0,1,2,3,4,5,6,7,8,9].map(i => (
          <line key={`ssc${i}`}
            x1="32" y1={49 + i * 4} x2="108" y2={49 + i * 4}
            stroke="rgba(74,222,128,0.02)" strokeWidth="0.5"
          />
        ))}
        <rect x="32" y="46" width="76" height="40" rx="2"
          fill="none" stroke="rgba(74,222,128,0.05)" strokeWidth="0.6"
        />
        <line x1="36" y1="48" x2="72" y2="47" stroke="rgba(200,200,210,0.06)" strokeWidth="0.5" />

        {/* ── STAT NUMBER ── */}
        <g style={{ animation: "screenFlicker 6s linear infinite" }}>
          <text
            x="70" y="74" textAnchor="middle"
            fill={color}
            fontSize="30" fontWeight="800"
            fontFamily="'Barlow Condensed', sans-serif"
          >
            {value}
          </text>
          <text
            x="70" y="74" textAnchor="middle"
            fill={c(0.05)}
            fontSize="30" fontWeight="800"
            fontFamily="'Barlow Condensed', sans-serif"
            dx="0.5" dy="0.5"
          >
            {value}
          </text>
        </g>

        {/* ── CONTROL PANEL ── */}
        <path
          d="M28,95 L28,114 Q28,116 30,116 L110,116 Q112,116 112,114 L112,95 Q112,93 110,93 L30,93 Q28,93 28,95 Z"
          fill="rgba(12,12,16,0.9)"
          stroke="rgba(255,50,50,0.1)"
          strokeWidth="0.6"
        />
        <line x1="32" y1="94.5" x2="108" y2="94.5" stroke="rgba(255,50,50,0.05)" strokeWidth="0.5" />

        {/* ── MOUNTED PISTOL ── */}
        <rect x="42" y="99" width="22" height="6" rx="2" fill="rgba(40,40,48,0.7)" stroke="rgba(120,120,130,0.15)" strokeWidth="0.5" />
        <rect x="34" y="100.5" width="10" height="3" rx="1.2" fill="rgba(50,50,58,0.6)" stroke="rgba(130,130,140,0.12)" strokeWidth="0.4" />
        <rect x="32" y="101" width="3" height="2" rx="0.8" fill="rgba(60,60,68,0.5)" />
        {/* Grip */}
        <path d="M54,105 L58,105 Q60,105 60,107 L60,114 Q60,115 58,115 L54,115 Q52,115 52,113 L52,107 Q52,105 54,105 Z"
          fill="rgba(35,35,42,0.8)" stroke="rgba(100,100,110,0.15)" strokeWidth="0.5"
        />
        <path d="M50,106 Q48,109 50,110" fill="none" stroke="rgba(130,130,140,0.2)" strokeWidth="0.5" />
        {/* Cable */}
        <path d="M57,115 Q57,118 60,118 Q80,118 80,115" fill="none" stroke="rgba(80,80,90,0.15)" strokeWidth="1" strokeLinecap="round" />

        {/* P1 START */}
        <circle cx="88" cy="101" r="5" fill="rgba(180,30,30,0.15)" stroke="rgba(255,60,60,0.3)" strokeWidth="0.6" />
        <circle cx="88" cy="101" r="3.5" fill="rgba(200,40,40,0.1)" />
        <text x="88" y="102" textAnchor="middle" fill="rgba(255,80,80,0.5)" fontSize="3" fontWeight="700"
          fontFamily="'Courier New', monospace">P1</text>
        {/* P2 START (dim) */}
        <circle cx="102" cy="101" r="4" fill="rgba(30,30,180,0.08)" stroke="rgba(60,60,255,0.15)" strokeWidth="0.5" />
        <text x="102" y="102" textAnchor="middle" fill="rgba(80,80,255,0.25)" fontSize="3" fontWeight="700"
          fontFamily="'Courier New', monospace">P2</text>

        {/* ── VENT GRILLES ── */}
        {[0,1,2,3].map(i => (
          <line key={`sv${i}`}
            x1="40" y1={120 + i * 3} x2="100" y2={120 + i * 3}
            stroke="rgba(255,50,50,0.04)" strokeWidth="0.6"
          />
        ))}

        {/* ── COIN DOOR ── */}
        <rect x="44" y="134" width="52" height="20" rx="2"
          fill="rgba(10,10,14,0.8)" stroke="rgba(200,200,210,0.12)" strokeWidth="0.6"
        />
        <rect x="46" y="136" width="48" height="16" rx="1.5"
          fill="none" stroke="rgba(150,150,160,0.06)" strokeWidth="0.4"
        />
        <rect x="56" y="140" width="28" height="7" rx="2"
          fill="rgba(8,8,12,0.7)" stroke="rgba(200,200,210,0.15)" strokeWidth="0.5"
        />
        <rect x="62" y="142.5" width="16" height="1.5" rx="0.8"
          fill="rgba(0,0,0,0.5)" stroke="rgba(220,220,230,0.2)" strokeWidth="0.3"
        />
        {/* Coin return */}
        <circle cx="52" cy="148" r="2" fill="rgba(15,15,20,0.7)" stroke="rgba(150,150,160,0.1)" strokeWidth="0.4" />

        {/* ── WARNING STICKER ── */}
        <rect x="80" y="120" width="24" height="9" rx="1" fill="rgba(220,180,30,0.06)" stroke="rgba(220,180,30,0.05)" strokeWidth="0.3" />
        <text x="92" y="125" textAnchor="middle" fill="rgba(220,180,30,0.08)" fontSize="2.8"
          fontFamily="'Courier New', monospace" fontWeight="700">DANGER</text>
        <text x="92" y="128" textAnchor="middle" fill="rgba(220,180,30,0.05)" fontSize="1.8"
          fontFamily="'Courier New', monospace">HIGH VOLTAGE</text>

        {/* ── WEAR MARKS ── */}
        <line x1="32" y1="130" x2="50" y2="131" stroke="rgba(100,100,110,0.04)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="96" y1="50" x2="102" y2="55" stroke="rgba(150,150,160,0.03)" strokeWidth="0.4" />
        <rect x="35" y="121" width="12" height="4" rx="0.5" fill="rgba(200,200,180,0.02)" />

        {/* ── LEG SHADOW ── */}
        <rect x="46" y="159" width="48" height="2.5" rx="0.8" fill="rgba(0,0,0,0.25)" />
      </svg>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════
   CandyCabinet — Classic 80s Japanese candy cab / Galaga-era upright
   ───────────────────────────────────────────────────────────────────────
   Rounded dome marquee, bright gold/amber accents, retro racing stripe
   side panels, joystick + 3 color buttons, game image on the CRT
   screen, game title in the bezel gutter, dual coin slots, "CHAMP '92"
   faded sticker. The "Now Playing" machine.
   140×200 viewBox.
   ═══════════════════════════════════════════════════════════════════════ */

function CandyCabinet({ label, gameTitle, bgImage }) {
  const gold = "rgba(245,197,24,";

  return (
    <div style={{ textAlign: "center", width: 140 }}>
      <svg width="140" height="200" viewBox="0 0 140 200">
        <defs>
          <clipPath id="candyScreen">
            <rect x="30" y="44" width="80" height="42" rx="2" />
          </clipPath>
          <radialGradient id="candyScreenGlow" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#1a1408" />
            <stop offset="100%" stopColor="#0a0804" />
          </radialGradient>
          <pattern id="candyStripes" x="0" y="0" width="8" height="200" patternUnits="userSpaceOnUse">
            <rect width="8" height="200" fill="#12100c" />
            <rect x="1" width="2" height="200" fill="rgba(245,197,24,0.06)" />
            <rect x="5" width="1.5" height="200" fill="rgba(245,130,24,0.04)" />
          </pattern>
          <linearGradient id="candyMarqueeGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a1a08" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#3a2a10" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#2a1a08" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* ── FLOOR SHADOW ── */}
        <ellipse cx="70" cy="198" rx="52" ry="3" fill="rgba(0,0,0,0.35)" />

        {/* ── CABINET BODY ── */}
        <path
          d={[
            "M20,28", "L20,128", "Q20,130 22,131",
            "L17,158", "Q17,159 18,159",
            "L24,159 L24,188 Q24,192 28,192",
            "L42,192 Q46,192 46,188 L46,159",
            "L94,159",
            "L94,188 Q94,192 98,192",
            "L112,192 Q116,192 116,188 L116,159",
            "L122,159 Q123,159 123,158",
            "L118,131 Q120,130 120,128",
            "L120,28",
            "Q120,26 118,26",
            "L22,26 Q20,26 20,28 Z",
          ].join(" ")}
          fill="#0c0a06"
          stroke={`${gold}0.3)`}
          strokeWidth="0.8"
        />

        {/* ── Retro stripe side panels ── */}
        <rect x="16" y="28" width="8" height="100" rx="1" fill="url(#candyStripes)" opacity="0.8" />
        <rect x="116" y="28" width="8" height="100" rx="1" fill="url(#candyStripes)" opacity="0.8" />

        {/* ── Gold T-molding trim ── */}
        <line x1="24" y1="28" x2="24" y2="128" stroke={`${gold}0.18)`} strokeWidth="1" />
        <line x1="116" y1="28" x2="116" y2="128" stroke={`${gold}0.18)`} strokeWidth="1" />

        {/* ── MARQUEE (rounded dome, warm amber) ── */}
        <path
          d="M24,28 L24,12 Q24,2 34,2 L106,2 Q116,2 116,12 L116,28"
          fill="url(#candyMarqueeGlow)"
          stroke={`${gold}0.35)`}
          strokeWidth="0.8"
        />
        <rect x="28" y="5" width="84" height="20" rx="3" fill={`${gold}0.06)`} />
        {/* Sparkle accents */}
        <circle cx="36" cy="11" r="1.2" fill={`${gold}0.2)`} />
        <circle cx="36" cy="11" r="0.5" fill={`${gold}0.5)`} />
        <circle cx="104" cy="11" r="1.2" fill={`${gold}0.2)`} />
        <circle cx="104" cy="11" r="0.5" fill={`${gold}0.5)`} />
        <circle cx="70" cy="7" r="0.8" fill={`${gold}0.15)`} />
        {/* Marquee label */}
        <text
          x="70" y="19" textAnchor="middle"
          fill={`${gold}0.85)`}
          fontSize="9" fontWeight="800"
          fontFamily="'Barlow Condensed', sans-serif"
          letterSpacing="2.5"
          style={{ animation: "marqueeGlow 3.5s ease-in-out infinite" }}
        >
          {label.toUpperCase()}
        </text>
        <line x1="34" y1="4" x2="106" y2="4" stroke={`${gold}0.1)`} strokeWidth="0.6" />

        {/* ── SPEAKER GRILL ── */}
        <rect x="36" y="30" width="68" height="7" rx="1.5" fill="rgba(14,12,8,0.9)" />
        {[0,1,2,3,4,5,6,7,8,9,10].map(i => (
          <line key={`csp${i}`}
            x1={39 + i * 6} y1="31" x2={39 + i * 6} y2="36"
            stroke={`${gold}0.08)`} strokeWidth="0.5"
          />
        ))}

        {/* ── SCREEN BEZEL ── */}
        <rect x="24" y="39" width="92" height="52" rx="4"
          fill="#080604" stroke={`${gold}0.22)`} strokeWidth="1"
        />
        <rect x="26" y="41" width="88" height="48" rx="3"
          fill="none" stroke={`${gold}0.08)`} strokeWidth="0.5"
        />
        {/* Corner hex bolts */}
        {[[29,44],[111,44],[29,86],[111,86]].map(([bx,by],i) => (
          <g key={`cb${i}`}>
            <circle cx={bx} cy={by} r="1.8" fill={`${gold}0.06)`} stroke={`${gold}0.15)`} strokeWidth="0.4" />
            <line x1={bx-0.8} y1={by} x2={bx+0.8} y2={by} stroke={`${gold}0.12)`} strokeWidth="0.3" />
          </g>
        ))}

        {/* ── SCREEN — game image or fallback ── */}
        <rect x="30" y="44" width="80" height="42" rx="2" fill="url(#candyScreenGlow)" />

        {bgImage ? (
          <foreignObject x="30" y="44" width="80" height="42" clipPath="url(#candyScreen)">
            <div xmlns="http://www.w3.org/1999/xhtml" style={{
              width: "100%", height: "100%", overflow: "hidden",
            }}>
              <img
                src={bgImage}
                alt={gameTitle || ""}
                style={{
                  width: "100%", height: "100%",
                  objectFit: "cover", objectPosition: "center",
                  filter: "saturate(1.1) contrast(1.05)",
                  display: "block",
                }}
              />
            </div>
          </foreignObject>
        ) : (
          <text
            x="70" y="70" textAnchor="middle"
            fill={`${gold}0.3)`}
            fontSize="18"
            fontFamily="'Courier New', monospace"
          >
            ?
          </text>
        )}

        {/* CRT scanlines over image */}
        {[0,1,2,3,4,5,6,7,8,9,10].map(i => (
          <line key={`csc${i}`}
            x1="30" y1={46 + i * 3.8} x2="110" y2={46 + i * 3.8}
            stroke={`${gold}0.04)`} strokeWidth="0.5"
          />
        ))}
        <rect x="30" y="44" width="80" height="42" rx="2"
          fill="none" stroke={`${gold}0.08)`} strokeWidth="0.6"
        />
        <line x1="34" y1="46" x2="82" y2="45" stroke={`${gold}0.06)`} strokeWidth="0.5" />

        {/* ── Game title panel (replaces control panel) ── */}
        <rect x="26" y="93" width="88" height="23" rx="2"
          fill="rgba(14,12,8,0.9)" stroke={`${gold}0.15)`} strokeWidth="0.6"
        />
        {gameTitle ? (
          <>
            <text
              x="70" y="102" textAnchor="middle"
              fill={`${gold}0.35)`}
              fontSize="4.5" fontWeight="600"
              fontFamily="'Barlow Condensed', sans-serif"
              letterSpacing="1.5"
            >
              NOW PLAYING
            </text>
            <text
              x="70" y="111" textAnchor="middle"
              fill="rgba(255,255,255,0.92)"
              fontSize="8" fontWeight="800"
              fontFamily="'Barlow Condensed', sans-serif"
              letterSpacing="0.3"
            >
              {gameTitle.length > 16 ? gameTitle.slice(0, 15) + "…" : gameTitle}
            </text>
          </>
        ) : (
          <text
            x="70" y="107" textAnchor="middle"
            fill={`${gold}0.2)`}
            fontSize="6"
            fontFamily="'Courier New', monospace"
          >
            INSERT COIN
          </text>
        )}

        {/* ── VENT SLOTS ── */}
        {[0,1,2].map(i => (
          <line key={`cv${i}`}
            x1="42" y1={120 + i * 3.5} x2="98" y2={120 + i * 3.5}
            stroke={`${gold}0.06)`} strokeWidth="0.6"
          />
        ))}

        {/* ── COIN DOOR (dual slots) ── */}
        <rect x="44" y="132" width="52" height="22" rx="2"
          fill="rgba(12,10,6,0.8)" stroke={`${gold}0.2)`} strokeWidth="0.7"
        />
        <rect x="46" y="134" width="48" height="18" rx="1.5"
          fill="none" stroke={`${gold}0.08)`} strokeWidth="0.4"
        />
        <rect x="50" y="139" width="18" height="7" rx="1.5"
          fill="rgba(8,6,3,0.6)" stroke={`${gold}0.2)`} strokeWidth="0.5"
        />
        <rect x="54" y="141.5" width="10" height="1.5" rx="0.8"
          fill="rgba(0,0,0,0.5)" stroke={`${gold}0.3)`} strokeWidth="0.3"
        />
        <rect x="72" y="139" width="18" height="7" rx="1.5"
          fill="rgba(8,6,3,0.6)" stroke={`${gold}0.2)`} strokeWidth="0.5"
        />
        <rect x="76" y="141.5" width="10" height="1.5" rx="0.8"
          fill="rgba(0,0,0,0.5)" stroke={`${gold}0.3)`} strokeWidth="0.3"
        />
        <text x="59" y="149" textAnchor="middle" fill={`${gold}0.12)`} fontSize="2.5"
          fontFamily="'Courier New', monospace" fontWeight="700">25¢</text>
        <text x="81" y="149" textAnchor="middle" fill={`${gold}0.12)`} fontSize="2.5"
          fontFamily="'Courier New', monospace" fontWeight="700">25¢</text>

        {/* ── WEAR & TEAR ── */}
        <line x1="28" y1="127" x2="44" y2="128" stroke={`${gold}0.04)`} strokeWidth="1.5" strokeLinecap="round" />
        <rect x="82" y="120" width="20" height="7" rx="1" fill={`${gold}0.03)`} stroke={`${gold}0.025)`} strokeWidth="0.3" />
        <text x="92" y="124" textAnchor="middle" fill={`${gold}0.05)`} fontSize="2.2"
          fontFamily="'Courier New', monospace" fontWeight="700">CHAMP '92</text>
        <line x1="106" y1="48" x2="112" y2="52" stroke={`${gold}0.03)`} strokeWidth="0.4" />

        {/* ── LEG SHADOW ── */}
        <rect x="46" y="159" width="48" height="2.5" rx="0.8" fill="rgba(0,0,0,0.25)" />
      </svg>
    </div>
  );
}
