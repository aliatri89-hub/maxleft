import { t } from "../../../theme";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { isComingSoon } from "../../../utils/comingSoon";

/**
 * MiniseriesGrid — 2-column visual grid of miniseries tiles.
 *
 * Progressive image loading: tiles render immediately with shimmer
 * placeholders, images only begin loading when a tile enters the
 * viewport (via IntersectionObserver), then each fades in smoothly.
 * Inspired by Letterboxd's clean, efficient grid loading.
 *
 * Props:
 *   miniseries       — array of series objects (already filtered to the active tab)
 *   progress         — user progress map { [itemId]: { status, ... } }
 *   onSelectSeries   — (series) => void
 *   accent           — community accent color
 *   searchQuery      — current search string (controlled externally)
 *   filter           — "all" | "inprogress" | "done" | "unseen"
 *   dynamicShelves   — optional ReactNode rendered above the grid (e.g. Recently Logged row)
 */
export default function MiniseriesGrid({
  miniseries,
  progress,
  onSelectSeries,
  accent = "#e94560",
  searchQuery = "",
  filter = "all",
  dynamicShelves,
  userId,
}) {
  // ── Compute per-series progress ────────────────────────────────
  const seriesWithProgress = useMemo(() => {
    return miniseries.map((s) => {
      const items = s.items || [];
      const total = items.length;
      const completed = items.filter((i) => progress[i.id]?.status === "completed").length;
      const upcoming = items.filter((i) => isComingSoon(i)).length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { ...s, _total: total, _completed: completed, _pct: pct, _upcoming: upcoming };
    });
  }, [miniseries, progress]);

  // ── Apply search + filter ──────────────────────────────────────
  const filtered = useMemo(() => {
    let list = seriesWithProgress;

    // Search: match on series title, director name, OR any film title within the series
    const q = (searchQuery || "").trim().toLowerCase();
    if (q.length >= 2) {
      list = list.filter((s) =>
        s.title.toLowerCase().includes(q) ||
        (s.director_name || "").toLowerCase().includes(q) ||
        (s.items || []).some((i) =>
          i.title.toLowerCase().includes(q) ||
          String(i.year || "").includes(q)
        )
      );
    }

    // Filter: series-level status
    if (filter === "done") list = list.filter((s) => s._pct === 100 && s._total > 0);
    if (filter === "inprogress") list = list.filter((s) => s._completed > 0 && s._pct < 100);
    if (filter === "notstarted" || filter === "unseen") list = list.filter((s) => s._completed === 0);

    return list;
  }, [seriesWithProgress, searchQuery, filter]);

  return (
    <div>
      {/* Dynamic shelves above grid (Recently Logged, New Episodes) */}
      {!searchQuery.trim() && filter === "all" && dynamicShelves}

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 4,
        padding: "6px 4px 0",
      }}>
        {filtered.map((s) => (
          <GridTile
            key={s.id}
            series={s}
            accent={accent}
            userId={userId}
            onTap={() => onSelectSeries(s)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{
          textAlign: "center", padding: "40px 16px",
          color: t.textSecondary, fontSize: 14,
          fontFamily: t.fontDisplay,
          fontStyle: "italic",
        }}>
          {searchQuery.trim().length >= 2
            ? `No series match "${searchQuery.trim()}"`
            : "No series"}
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   GridTile — Single series tile with viewport-based image loading
   ═══════════════════════════════════════════════════════════════ */

function GridTile({ series, accent, onTap, userId }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [localPosition, setLocalPosition] = useState(series.thumbnail_position || "top center");
  const tileRef = useRef(null);
  const isDone = series._pct === 100 && series._total > 0;
  const hasProgress = series._completed > 0;

  // ── IntersectionObserver: only start loading image when near viewport ──
  useEffect(() => {
    const el = tileRef.current;
    if (!el || !series.thumbnail_url) return;

    // rootMargin: start loading 200px before tile enters viewport
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [series.thumbnail_url]);

  return (
    <div
      ref={tileRef}
      onClick={onTap}
      style={{
        position: "relative",
        aspectRatio: "1",
        cursor: "pointer",
        overflow: "hidden",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Shimmer placeholder — visible until image loads */}
      {series.thumbnail_url && !imgLoaded && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, #1a1817 0%, #252220 50%, #1a1817 100%)",
          backgroundSize: "200% 100%",
          animation: "gridShimmer 1.5s ease-in-out infinite",
        }} />
      )}

      {/* Series artwork — only mounts when near viewport */}
      {series.thumbnail_url ? (
        shouldLoad && (
          <img
            src={series.thumbnail_url}
            alt={series.title}
            onLoad={() => setImgLoaded(true)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: localPosition,
              display: "block",
              opacity: imgLoaded ? 1 : 0,
              transition: "opacity 0.35s ease",
            }}
          />
        )
      ) : (
        /* Fallback: dark tile with emoji + title */
        <div style={{
          width: "100%", height: "100%",
          background: "linear-gradient(135deg, #1a1a2e, #16213e)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: 8,
        }}>
          {series.director_emoji && (
            <span style={{ fontSize: 28, marginBottom: 4 }}>{series.director_emoji}</span>
          )}
          <div style={{
            fontSize: 11, fontWeight: 700, color: t.textSecondary,
            fontFamily: t.fontDisplay,
            textAlign: "center", lineHeight: 1.2,
          }}>
            {series.title}
          </div>
        </div>
      )}

      {/* Bottom gradient overlay */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        height: "55%",
        background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
        pointerEvents: "none",
      }} />

      {/* Progress pill — top right */}
      <div style={{
        position: "absolute",
        top: 5, right: 5,
        background: isDone ? "rgba(74,222,128,0.9)" : "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
        borderRadius: 6,
        padding: "2px 6px",
        display: "flex",
        alignItems: "center",
        gap: 3,
      }}>
        {isDone && (
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
            <path d="M3.5 6l1.8 1.8 3.2-3.6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: isDone ? t.textPrimary : (hasProgress ? accent : t.textMuted),
          fontFamily: t.fontDisplay,
          letterSpacing: "0.03em",
        }}>
          {series._completed}/{series._total}
        </span>
      </div>

      {/* Bottom info — progress bar + series title + director */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        padding: "0 5px 5px",
      }}>
        {/* Progress bar */}
        {hasProgress && (
          <div style={{
            height: 2, borderRadius: 1,
            background: "rgba(255,255,255,0.15)",
            marginBottom: 3,
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${series._pct}%`,
              background: isDone
                ? "linear-gradient(90deg, #4ade80, #22d3ee)"
                : `linear-gradient(90deg, ${accent}, #C4734F)`,
              borderRadius: 1,
            }} />
          </div>
        )}

        {/* Series title (podcast name) */}
        <div style={{
          fontSize: 13, fontWeight: 800, color: t.textPrimary,
          fontFamily: t.fontDisplay,
          lineHeight: 1.2,
          letterSpacing: "0.01em",
          textShadow: "0 1px 6px rgba(0,0,0,1)",
          textAlign: "center",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}>
          {series.title}
        </div>

        {/* Director name (subtitle) */}
        {series.director_name && series.director_name !== "." && (
          <div style={{
            fontSize: 10, fontWeight: 600,
            color: t.textSecondary,
            fontFamily: t.fontDisplay,
            textAlign: "center",
            textShadow: "0 1px 3px rgba(0,0,0,0.8)",
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {series.director_name}
          </div>
        )}
      </div>

      {/* Shared shimmer animation */}
      <style>{`
        @keyframes gridShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
