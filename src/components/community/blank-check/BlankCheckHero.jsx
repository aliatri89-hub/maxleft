import { useMemo, useEffect } from "react";
import { HeroBanner, StatPill, CyclePill } from "../primitives";
import { useMediaFilter } from "../../../hooks/useMediaFilter";

// ── Easy swap when the inside joke lands ────────────────────
const BANK_NAME = "The Two Friends Bank";
const BANK_SUBTITLE = "est. 2015";

/**
 * BlankCheckHero — Hero section for the Blank Check with Griffin & David community page.
 *
 * Two modes driven by activeTab:
 *   filmography — 3 hero stats + "blank check" for top director
 *   patreon     — nested donut (films + commentary + both), pills
 *
 * Props:
 *   community           — community_pages row
 *   miniseries          — filtered to current tab's series (heroMiniseries from screen)
 *   progress            — user progress map { [itemId]: { rating, rewatch_count, listened_with_commentary, ... } }
 *   activeTab           — current tab key
 */
export default function BlankCheckHero({ community, miniseries, progress, activeTab, mediaFilter, onMediaFilterChange }) {
  const isPatreon = activeTab === "patreon";
  const accent = community?.theme_config?.accent || "#e94560";
  const { cycleMedia, mediaState } = useMediaFilter(mediaFilter, onMediaFilterChange);

  // Load signature font
  useEffect(() => {
    if (document.querySelector('link[data-bc-sig]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.dataset.bcSig = "1";
    link.href = "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Permanent+Marker&display=swap";
    document.head.appendChild(link);
  }, []);

  // ── Per-tab hero overrides ────────────────────────────────
  const tabHero = community?.theme_config?.tab_heroes?.[activeTab];
  const heroTagline = tabHero?.tagline ?? community?.tagline;
  const heroDescription = tabHero?.description ?? community?.description;
  const heroBanner = tabHero?.banner_url ?? community?.banner_url;

  // ── Filmography stats ─────────────────────────────────────
  const filmoStats = useMemo(() => {
    if (isPatreon) return null;

    let totalFilms = 0, completedFilms = 0, completedSeries = 0;
    const directorData = {}; // { directorName: { views, seriesTitle, grossWW } }

    miniseries.forEach((s) => {
      const items = s.items || [];
      const dirName = s.director_name;

      totalFilms += items.length;
      let seriesComplete = true;
      let seriesViews = 0;
      let seriesGross = 0;

      items.forEach((item) => {
        const p = progress[item.id];
        const watched = p?.status === "completed";
        if (watched) {
          completedFilms++;
          seriesViews += 1 + (p.rewatch_count || 0);
          // Sum box office revenue for watched films
          const rev = item.extra_data?.box_office?.revenue;
          if (rev && rev > 0) seriesGross += rev;
        } else {
          seriesComplete = false;
        }
      });

      if (dirName && seriesViews > 0) {
        if (!directorData[dirName]) {
          directorData[dirName] = { views: 0, seriesTitle: s.title, grossWW: 0 };
        }
        directorData[dirName].views += seriesViews;
        directorData[dirName].grossWW += seriesGross;
        // Keep the series with the most views as the display title
        if (seriesViews > directorData[dirName].views - seriesViews) {
          directorData[dirName].seriesTitle = s.title;
        }
      }

      if (items.length > 0 && seriesComplete) completedSeries++;
    });

    // Top director by total views
    const sorted = Object.entries(directorData)
      .sort((a, b) => b[1].views - a[1].views);
    const top = sorted[0] || null;

    return {
      totalFilms,
      completedFilms,
      completedSeries,
      totalSeries: miniseries.length,
      topDirector: top ? {
        name: top[0],
        views: top[1].views,
        seriesTitle: top[1].seriesTitle,
        grossWW: top[1].grossWW,
      } : null,
    };
  }, [isPatreon, miniseries, progress]);

  // ── Patreon stats ─────────────────────────────────────────
  const patreonStats = useMemo(() => {
    if (!isPatreon) return null;

    let totalFilms = 0, seenFilms = 0, listenedCommentary = 0, both = 0, grossWW = 0;

    miniseries.forEach((s) => {
      (s.items || []).forEach((i) => {
        totalFilms++;
        const p = progress[i.id];
        const watched = p?.status === "completed";
        const listened = !!p?.listened_with_commentary;
        if (watched) {
          seenFilms++;
          const rev = i.extra_data?.box_office?.revenue;
          if (rev && rev > 0) grossWW += rev;
        }
        if (listened) listenedCommentary++;
        if (watched && listened) both++;
      });
    });

    return {
      totalFilms, seenFilms, listenedCommentary, both, grossWW,
      seenPct: totalFilms > 0 ? (seenFilms / totalFilms) * 100 : 0,
      listenedPct: totalFilms > 0 ? (listenedCommentary / totalFilms) * 100 : 0,
      bothPct: totalFilms > 0 ? (both / totalFilms) * 100 : 0,
    };
  }, [isPatreon, miniseries, progress]);

  return (
    <div style={{
      position: "relative",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      overflow: "hidden",
    }}>
      <HeroBanner
        bannerUrl={heroBanner}
        contain={tabHero?.banner_contain}
        position={tabHero?.banner_position}
        opacity={tabHero?.banner_opacity}
      />

      <div style={{ position: "relative", zIndex: 1, padding: "24px 16px 20px" }}>
        {/* Title + tagline */}
        <div style={{
          fontSize: heroTagline ? 28 : 22,
          fontWeight: 800, color: "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.03em", textTransform: "uppercase",
          textAlign: "center", marginBottom: 4, lineHeight: 1.1,
        }}>
          {heroTagline || community?.name || "Blank Check"}
        </div>
        {/* Subtitle — box office on patreon, description on filmography */}
        {isPatreon && patreonStats?.grossWW > 0 ? (
          <div style={{ textAlign: "center", margin: "0 auto 20px" }}>
            <div style={{
              fontSize: 13, fontWeight: 700,
              color: "rgba(255,255,255,0.55)",
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: 2,
            }}>
              WW Box Office
            </div>
            <div style={{
              fontSize: 22, color: "#fff",
              fontFamily: "'Permanent Marker', cursive",
              lineHeight: 1,
            }}>
              ${patreonStats.grossWW.toLocaleString("en-US")}
            </div>
          </div>
        ) : (
          <div style={{
            fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center",
            maxWidth: 300, margin: "0 auto 20px", whiteSpace: "pre-line",
          }}>
            {heroDescription}
          </div>
        )}

        {/* ── Filmography hero ──────────────────────────────── */}
        {!isPatreon && filmoStats && miniseries.length > 0 && (
          <>
            <HeroStats
              watched={filmoStats.completedFilms}
              totalFilms={filmoStats.totalFilms}
              completedSeries={filmoStats.completedSeries}
              totalSeries={filmoStats.totalSeries}
              accent={accent}
            />
            {filmoStats.topDirector && (
              <BlankCheck director={filmoStats.topDirector} />
            )}
          </>
        )}

        {/* ── Patreon hero ─────────────────────────────────── */}
        {isPatreon && patreonStats && miniseries.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
              <PatreonRings stats={patreonStats} accent={accent} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <CyclePill
                  label="Seen"
                  value={`${patreonStats.seenFilms}/${patreonStats.totalFilms}`}
                  color={accent}
                  state={mediaState("film")}
                  onClick={() => cycleMedia("film")}
                />
                <CyclePill
                  label="Listened"
                  value={`${patreonStats.listenedCommentary}/${patreonStats.totalFilms}`}
                  color="#facc15"
                  state={mediaState("listened")}
                  onClick={() => cycleMedia("listened")}
                />
                <StatPill
                  label="Both"
                  value={patreonStats.both}
                  color="#4ade80"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   HeroStats — 3 big stats: Watched | Films | Filmographies
   ═══════════════════════════════════════════════════════════════ */

function HeroStats({ watched, totalFilms, completedSeries, totalSeries, accent }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      gap: 0,
    }}>
      <StatColumn value={watched} label="Watched" color={accent} />
      <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.08)", margin: "4px 0" }} />
      <StatColumn value={totalFilms} label="Films" color="#fff" />
      <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.08)", margin: "4px 0" }} />
      <StatColumn value={completedSeries} label="Filmographies" color="#fff" />
    </div>
  );
}

function StatColumn({ value, suffix, label, color }) {
  return (
    <div style={{
      flex: 1, maxWidth: 120,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "8px 0",
    }}>
      <div style={{
        fontSize: 36, fontWeight: 800, color,
        fontFamily: "'Barlow Condensed', sans-serif",
        lineHeight: 1,
      }}>
        {value}
        {suffix && (
          <span style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.3)" }}>
            {suffix}
          </span>
        )}
      </div>
      <div style={{
        fontSize: 10, fontWeight: 600,
        color: "rgba(255,255,255,0.4)",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginTop: 4,
        fontFamily: "'Barlow Condensed', sans-serif",
      }}>
        {label}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   BlankCheck — Most-watched director styled as a real bank check
   ═══════════════════════════════════════════════════════════════ */

function BlankCheck({ director }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        fontSize: 10, fontWeight: 700,
        color: "rgba(255,255,255,0.4)",
        fontFamily: "'Barlow Condensed', sans-serif",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        textAlign: "center",
        marginBottom: 6,
      }}>
        Most Watched Director
      </div>
      <div style={{
        maxWidth: 300, marginLeft: "auto", marginRight: "auto",
      padding: "7px 12px 5px",
      background: "#7ecbc0",
      borderRadius: 5,
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      border: "2px solid #5ba89d",
    }}>
      {/* ── Row 1: Bank name (official) + amount box ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        marginBottom: 1,
      }}>
        <div>
          <div style={{
            fontSize: 7.5, fontWeight: 700, color: "#2a4a45",
            fontFamily: "'Barlow Condensed', sans-serif",
            textTransform: "uppercase", letterSpacing: "0.15em",
            lineHeight: 1,
          }}>
            {BANK_NAME}
          </div>
          <div style={{
            fontSize: 5.5, color: "#3a5a55", fontWeight: 600,
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: "0.1em", textTransform: "uppercase",
            marginTop: 0.5,
          }}>
            {BANK_SUBTITLE}
          </div>
        </div>
        {/* Amount box */}
        <div style={{
          background: "rgba(255,255,255,0.4)",
          border: "2px solid rgba(0,0,0,0.18)",
          borderRadius: 4,
          padding: "2px 8px 1px",
          display: "flex", alignItems: "center",
        }}>
          <span style={{
            fontSize: 14, lineHeight: 1, marginRight: 3,
          }}>🎬</span>
          <span style={{
            fontSize: 22, color: "#1a1a1a",
            fontFamily: "'Permanent Marker', cursive",
            lineHeight: 1,
          }}>
            {director.views}
          </span>
        </div>
      </div>

      {/* ── Row 2: Pay to + director name ── */}
      <div style={{
        borderBottom: "1.5px solid rgba(0,0,0,0.12)",
        paddingBottom: 1, marginBottom: 2,
        display: "flex", alignItems: "baseline", gap: 5,
      }}>
        <span style={{
          fontSize: 6, color: "#2a4a45", fontWeight: 600, textTransform: "uppercase",
          letterSpacing: "0.06em", flexShrink: 0,
          fontFamily: "'Barlow Condensed', sans-serif",
          alignSelf: "flex-end", paddingBottom: 2,
        }}>Pay to</span>
        <span style={{
          fontSize: 22, color: "#1a1a1a",
          fontFamily: "'Permanent Marker', cursive",
          lineHeight: 1,
          whiteSpace: "nowrap",
          marginBottom: -2,
        }}>
          {director.name}
        </span>
      </div>

      {/* ── Row 3: Series title ── */}
      <div style={{
        borderBottom: "1.5px solid rgba(0,0,0,0.12)",
        paddingBottom: 1, marginBottom: 2,
      }}>
        <span style={{
          fontSize: 10, color: "#1a1a1a",
          fontFamily: "'Permanent Marker', cursive",
        }}>
          {director.seriesTitle}
        </span>
      </div>

      {/* ── Row 4: Memo + signature ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
          <span style={{
            fontSize: 5.5, color: "#2a4a45", fontWeight: 600, textTransform: "uppercase",
            letterSpacing: "0.06em", fontFamily: "'Barlow Condensed', sans-serif",
          }}>Memo</span>
          <span style={{
            fontSize: 13, color: "#1a1a1a",
            fontFamily: "'Permanent Marker', cursive",
            lineHeight: 1,
          }}>
            {director.grossWW > 0
              ? `$${director.grossWW.toLocaleString("en-US")} WW`
              : "Sometimes they bounce, baby."}
          </span>
        </div>
        <div style={{
          borderTop: "1.5px solid rgba(0,0,0,0.12)",
          paddingTop: 0, minWidth: 75, textAlign: "center",
        }}>
          <span style={{
            fontSize: 12, color: "#1a1a1a",
            fontFamily: "'Dancing Script', cursive",
            fontWeight: 700,
          }}>
            Griffin & David
          </span>
        </div>
      </div>
    </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   PatreonRings — Nested donut for patreon tab
   3 rings: Films (outer), Commentary (middle), Both (inner)
   ═══════════════════════════════════════════════════════════════ */

function PatreonRings({ stats, accent }) {
  const size = 130;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 7;
  const gap = 4;

  const rings = [
    { r: 52, pct: stats.seenPct, color: accent },
    { r: 52 - strokeWidth - gap, pct: stats.listenedPct, color: "#facc15" },
    { r: 52 - (strokeWidth + gap) * 2, pct: stats.bothPct, color: "#4ade80" },
  ];

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map((ring, i) => {
          const circumference = 2 * Math.PI * ring.r;
          const offset = circumference - (Math.min(ring.pct, 100) / 100) * circumference;
          const isComplete = ring.pct >= 100;
          return (
            <g key={i}>
              <circle
                cx={cx} cy={cy} r={ring.r} fill="none"
                stroke={ring.color} strokeWidth={strokeWidth} opacity={0.12}
              />
              {ring.pct > 0 && (
                <circle
                  cx={cx} cy={cy} r={ring.r} fill="none"
                  stroke={isComplete ? "#4ade80" : ring.color}
                  strokeWidth={strokeWidth} strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={offset}
                  transform={`rotate(-90 ${cx} ${cy})`}
                  style={{
                    transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                    filter: isComplete ? "drop-shadow(0 0 4px rgba(74,222,128,0.4))" : "none",
                  }}
                />
              )}
            </g>
          );
        })}
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          fontSize: 26, fontWeight: 800,
          color: "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
          lineHeight: 1,
        }}>
          {stats.seenFilms}
        </div>
        <div style={{
          fontSize: 9, color: "rgba(255,255,255,0.4)",
          marginTop: 2, letterSpacing: "0.04em",
        }}>
          watched
        </div>
      </div>
    </div>
  );
}
