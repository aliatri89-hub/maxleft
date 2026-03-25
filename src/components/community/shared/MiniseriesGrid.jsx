import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { isComingSoon } from "../../../utils/comingSoon";

/**
 * MiniseriesGrid — 3-column visual grid of miniseries tiles.
 *
 * Replaces the flat shelf stack for communities with series-level artwork.
 * Each tile shows: thumbnail art, director name, progress count + bar.
 * Tap → onSelectSeries(series) to drill into the detail view.
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

    // Search: match on series title or director name
    const q = (searchQuery || "").trim().toLowerCase();
    if (q.length >= 2) {
      list = list.filter((s) =>
        s.title.toLowerCase().includes(q) ||
        (s.director_name || "").toLowerCase().includes(q)
      );
    }

    // Filter: series-level status
    if (filter === "done") list = list.filter((s) => s._pct === 100 && s._total > 0);
    if (filter === "inprogress") list = list.filter((s) => s._completed > 0 && s._pct < 100);
    if (filter === "unseen") list = list.filter((s) => s._completed === 0);

    return list;
  }, [seriesWithProgress, searchQuery, filter]);

  return (
    <div>
      {/* Dynamic shelves above grid (Recently Logged, New Episodes) */}
      {!searchQuery.trim() && filter === "all" && dynamicShelves}

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 3,
        padding: "6px 3px 0",
      }}>
        {filtered.map((s) => (
          <GridTile
            key={s.id}
            series={s}
            accent={accent}
            onTap={() => onSelectSeries(s)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{
          textAlign: "center", padding: "40px 16px",
          color: "rgba(255,255,255,0.25)", fontSize: 14,
          fontFamily: "'Barlow Condensed', sans-serif",
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
   GridTile — Single series tile in the grid
   ═══════════════════════════════════════════════════════════════ */

function GridTile({ series, accent, onTap }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const isDone = series._pct === 100 && series._total > 0;
  const hasProgress = series._completed > 0;

  return (
    <div
      onClick={onTap}
      style={{
        position: "relative",
        aspectRatio: "1",
        cursor: "pointer",
        overflow: "hidden",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Series artwork */}
      {series.thumbnail_url ? (
        <img
          src={series.thumbnail_url}
          alt={series.title}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            opacity: imgLoaded ? 1 : 0,
            transition: "opacity 0.3s",
          }}
        />
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
            fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)",
            fontFamily: "'Barlow Condensed', sans-serif",
            textAlign: "center", lineHeight: 1.2,
          }}>
            {series.title}
          </div>
        </div>
      )}

      {/* Shimmer placeholder while image loads */}
      {series.thumbnail_url && !imgLoaded && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(255,255,255,0.03)",
        }} />
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
          color: isDone ? "#fff" : (hasProgress ? accent : "rgba(255,255,255,0.5)"),
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.03em",
        }}>
          {series._completed}/{series._total}
        </span>
      </div>

      {/* Bottom info — progress bar + director name */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        padding: "0 6px 5px",
      }}>
        {/* Progress bar */}
        {hasProgress && (
          <div style={{
            height: 2, borderRadius: 1,
            background: "rgba(255,255,255,0.15)",
            marginBottom: 4,
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

        <div style={{
          fontSize: 10, fontWeight: 700, color: "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
          lineHeight: 1.15,
          letterSpacing: "0.01em",
          textShadow: "0 1px 3px rgba(0,0,0,0.8)",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}>
          {series.director_name && series.director_name !== "." ? series.director_name : series.title}
        </div>
      </div>
    </div>
  );
}
