import { t } from "../../../theme";
import { useMemo, useRef, useState, useEffect } from "react";
import { HeroBanner } from "../primitives";
import { useSlideReveal } from "../../../hooks/useSlideReveal";

/**
 * NowPlayingHero — Hero section for the Now Playing Podcast community page.
 *
 * Banner + title + tagline + stats ONLY.
 * Filter pills and search live in NowPlayingScreen (matching BlankCheck pattern).
 */

export default function NowPlayingHero({
  community, miniseries, progress, activeTab,
}) {
  const tabHero = community?.theme_config?.tab_heroes?.[activeTab];
  const heroTagline = tabHero?.tagline ?? community?.tagline;

  const isBooks = activeTab === "books";
  const isArcade = activeTab === "arcade";

  const heroBanner = isBooks
    ? "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/BookAndNachosBanner.jpg"
    : (tabHero?.banner_url ?? community?.banner_url);

  // ── Compute stats based on active tab ──
  const stats = useMemo(() => {
    if (isBooks) {
      let total = 0, completed = 0, pages = 0;
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
      let filmWatched = 0, gamesBeat = 0;
      const seenFilms = new Set(), seenGames = new Set();
      miniseries.forEach((s) => {
        (s.items || []).forEach((i) => {
          if (i.media_type === "game") {
            const gk = `game::${i.title}::${i.year || ""}`;
            if (seenGames.has(gk)) return;
            seenGames.add(gk);
            if (progress[i.id]?.status === "completed") gamesBeat++;
          } else {
            const fk = `film::${i.title}::${i.year || ""}`;
            if (seenFilms.has(fk)) return;
            seenFilms.add(fk);
            if (progress[i.id]) filmWatched++;
          }
        });
      });
      return { completed: filmWatched, total: seenFilms.size + seenGames.size, gamesBeat };
    }

    let completed = 0, total = 0;
    miniseries.forEach((s) => {
      const items = (s.items || []).filter((i) => i.media_type === "film" || !i.media_type);
      total += items.length;
      completed += items.filter((i) => progress[i.id]).length;
    });
    return { completed, total };
  }, [miniseries, progress, isBooks, isArcade]);

  const watchedRevealed = useSlideReveal(stats.completed);
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

  useEffect(() => { prevCount.current = stats.completed; }, [stats.completed]);

  const accent = isBooks ? t.sand : isArcade ? t.mint : "#facc15";

  const formatPages = (n) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
    return String(n);
  };

  return (
    <div style={{
      position: "relative",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      overflow: "hidden",
    }}>
      <HeroBanner
        bannerUrl={isArcade
          ? "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/BannerNowPlayingArcade.jpg"
          : heroBanner}
        contain={isBooks ? false : (isArcade ? false : tabHero?.banner_contain)}
        position={isBooks ? "center center" : (isArcade ? "center center" : tabHero?.banner_position)}
        opacity={isBooks ? 0.2 : (isArcade ? 0.3 : tabHero?.banner_opacity)}
        gradientStrength={isBooks ? 0.9 : (isArcade ? 0.85 : tabHero?.gradient_strength)}
      />

      <div style={{ position: "relative", zIndex: 1, padding: "24px 16px 20px" }}>
        <div style={{
          fontSize: 28, fontWeight: 800, color: t.textPrimary,
          fontFamily: t.fontDisplay,
          letterSpacing: "0.03em", textTransform: "uppercase",
          textAlign: "center", marginBottom: 4, lineHeight: 1.1,
        }}>
          {isArcade ? "Now Playing Arcade" : isBooks ? "Books & Nachos" : (heroTagline || community?.name || "Now Playing")}
        </div>

        {isArcade ? (
          <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: t.mint, fontFamily: t.fontDisplay }}>{stats.completed}</div>
              <div style={{ fontSize: 9, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Watched</div>
            </div>
            <div style={{ width: 1, background: t.bgHover }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: t.purple, fontFamily: t.fontDisplay }}>{stats.gamesBeat || 0}</div>
              <div style={{ fontSize: 9, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Beat</div>
            </div>
            <div style={{ width: 1, background: t.bgHover }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: t.textPrimary, fontFamily: t.fontDisplay }}>{stats.total}</div>
              <div style={{ fontSize: 9, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Titles</div>
            </div>
          </div>
        ) : isBooks ? (
          <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: accent, fontFamily: t.fontDisplay }}>{stats.completed}</div>
              <div style={{ fontSize: 9, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Read</div>
            </div>
            <div style={{ width: 1, background: t.bgHover }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: t.textPrimary, fontFamily: t.fontDisplay }}>{stats.total}</div>
              <div style={{ fontSize: 9, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Books</div>
            </div>
            {stats.pages > 0 && (<>
              <div style={{ width: 1, background: t.bgHover }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: t.textSecondary, fontFamily: t.fontDisplay }}>{formatPages(stats.pages)}</div>
                <div style={{ fontSize: 9, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Pages</div>
              </div>
            </>)}
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ overflow: "hidden", height: 36 }}>
                <div style={{
                  fontSize: 30, fontWeight: 800, color: t.gold,
                  fontFamily: t.fontDisplay,
                  transform: watchedRevealed ? "translateY(0)" : "translateY(100%)",
                  opacity: watchedRevealed ? 1 : 0,
                  transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease",
                }}>
                  {stats.completed}
                </div>
              </div>
              <div style={{ fontSize: 9, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Watched</div>
            </div>
            <div style={{ width: 1, background: t.bgHover }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: t.textPrimary, fontFamily: t.fontDisplay }}>{stats.total}</div>
              <div style={{ fontSize: 9, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Films</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
