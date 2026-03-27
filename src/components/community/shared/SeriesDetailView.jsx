import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { isComingSoon } from "../../../utils/comingSoon";

/**
 * SeriesDetailView — Full-screen overlay showing a single miniseries' items.
 *
 * Slides in from the right when a series tile is tapped in MiniseriesGrid.
 * Shows: series art hero, progress bar, vertical grid of item cards.
 *
 * Props:
 *   series              — the selected miniseries object (with items)
 *   progress            — user progress map
 *   onItemTap           — (itemId) => void — opens the log modal
 *   onToggleCommentary  — (itemId, newValue) => void (BC-specific, optional)
 *   onBack              — () => void — animate out and return to grid
 *   CardComponent       — community-specific card component (e.g. BlankCheckItemCard)
 *   coverCacheVersion   — cover cache for item cards
 *   accent              — community accent color
 */
export default function SeriesDetailView({
  series,
  progress,
  onItemTap,
  onToggleCommentary,
  onBack,
  CardComponent,
  coverCacheVersion,
  accent = "#e94560",
}) {
  const [closing, setClosing] = useState(false);
  const scrollRef = useRef(null);

  // Scroll to top on mount
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [series?.id]);

  const handleBack = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onBack();
    }, 250);
  }, [onBack]);

  const items = series?.items || [];
  const completedCount = items.filter((i) => progress[i.id]?.status === "completed").length;
  const pct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const isDone = pct === 100 && items.length > 0;

  // Separate upcoming items
  const upcoming = useMemo(() => items.filter(i => isComingSoon(i)), [items]);
  const regular = useMemo(() => items.filter(i => !isComingSoon(i)), [items]);

  if (!series) return null;

  return (
    <div
      ref={scrollRef}
      className="hide-scrollbar"
      style={{
        position: "absolute",
        inset: 0,
        background: "#0f0d0b",
        zIndex: 20,
        overflowY: "auto",
        overflowX: "hidden",
        animation: closing
          ? "seriesSlideOut 0.25s ease-in forwards"
          : "seriesSlideIn 0.25s ease-out",
      }}
    >
      <style>{`
        @keyframes seriesSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes seriesSlideOut {
          from { transform: translateX(0); }
          to { transform: translateX(100%); }
        }
        @keyframes seriesItemFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Header bar ─────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(15,13,11,0.95)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        padding: "12px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <button onClick={handleBack} style={{
          background: "none", border: "none", color: accent,
          fontSize: 15, fontWeight: 600, cursor: "pointer",
          padding: "4px 8px 4px 0",
        }}>← Series</button>
        <div style={{
          flex: 1, textAlign: "center",
          fontSize: 13, fontWeight: 700, color: "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {series.director_name && series.director_name !== "."
            ? series.director_name
            : series.title}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: isDone ? "#4ade80" : accent,
          fontFamily: "'Barlow Condensed', sans-serif",
        }}>
          {completedCount}/{items.length}
        </div>
      </div>

      {/* ── Series art hero ────────────────────────────────────── */}
      {series.thumbnail_url && (
        <div style={{
          position: "relative",
          aspectRatio: "16/9",
          overflow: "hidden",
        }}>
          <img
            src={series.thumbnail_url}
            alt={series.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.35,
            }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(transparent 20%, #0f0d0b 100%)",
          }} />
          <div style={{
            position: "absolute",
            bottom: 14, left: 16, right: 16,
          }}>
            <div style={{
              fontSize: 20, fontWeight: 800, color: "#fff",
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              lineHeight: 1.1,
              textShadow: "0 2px 8px rgba(0,0,0,0.5)",
            }}>
              {series.title}
            </div>
            {series.director_name && series.director_name !== "." && (
              <div style={{
                fontSize: 12, color: "rgba(255,255,255,0.7)",
                fontFamily: "'Barlow Condensed', sans-serif",
                marginTop: 3,
              }}>
                The Films of {series.director_name}
              </div>
            )}
            {series.episode_range && (
              <div style={{
                fontSize: 11, color: "rgba(255,255,255,0.72)",
                fontFamily: "'Barlow Condensed', sans-serif",
                marginTop: 2,
              }}>
                {series.episode_range}
              </div>
            )}

            {/* Progress bar */}
            <div style={{
              height: 3, borderRadius: 2,
              background: "rgba(255,255,255,0.1)",
              marginTop: 10,
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${pct}%`,
                background: isDone
                  ? "linear-gradient(90deg, #4ade80, #22d3ee)"
                  : `linear-gradient(90deg, ${accent}, #C4734F)`,
                borderRadius: 2,
                transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              }} />
            </div>
          </div>
        </div>
      )}

      {/* ── No series art fallback ─────────────────────────────── */}
      {!series.thumbnail_url && (
        <div style={{ padding: "20px 16px 12px" }}>
          <div style={{
            fontSize: 22, fontWeight: 800, color: "#fff",
            fontFamily: "'Barlow Condensed', sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}>
            {series.title}
          </div>
          {series.director_name && series.director_name !== "." && (
            <div style={{
              fontSize: 13, color: "rgba(255,255,255,0.7)",
              fontFamily: "'Barlow Condensed', sans-serif",
              marginTop: 3,
            }}>
              The Films of {series.director_name}
            </div>
          )}
          <div style={{
            height: 3, borderRadius: 2,
            background: "rgba(255,255,255,0.1)",
            marginTop: 12,
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${pct}%`,
              background: isDone
                ? "linear-gradient(90deg, #4ade80, #22d3ee)"
                : `linear-gradient(90deg, ${accent}, #C4734F)`,
              borderRadius: 2,
            }} />
          </div>
        </div>
      )}

      {/* ── Items grid — 3 columns, vertical ───────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 8,
        padding: "14px 10px 16px",
      }}>
        {regular.map((item, i) => {
          const Card = CardComponent;
          return (
            <div
              key={item.id}
              style={{
                overflow: "hidden",
                animation: `seriesItemFadeIn 0.25s ease-out ${Math.min(i * 0.03, 0.6)}s both`,
              }}
            >
              <Card
                item={item}
                isCompleted={progress[item.id]?.status === "completed"}
                onToggle={() => onItemTap(item.id)}
                coverCacheVersion={coverCacheVersion}
                progress={progress[item.id] || null}
                userRating={progress[item.id]?.rating || null}
                listenedWithCommentary={!!progress[item.id]?.listened_with_commentary}
                onToggleCommentary={onToggleCommentary}
              />
            </div>
          );
        })}
      </div>

      {/* ── Upcoming section ───────────────────────────────────── */}
      {upcoming.length > 0 && (
        <div style={{ padding: "0 12px 120px" }}>
          <div style={{
            fontSize: 13, fontWeight: 700,
            color: "rgba(250,204,21,0.7)",
            fontFamily: "'Barlow Condensed', sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 10,
            paddingLeft: 4,
          }}>
            Coming Soon
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
          }}>
            {upcoming.map((item) => {
              const Card = CardComponent;
              return (
                <div key={item.id}>
                  <Card
                    item={item}
                    isCompleted={progress[item.id]?.status === "completed"}
                    onToggle={() => onItemTap(item.id)}
                    coverCacheVersion={coverCacheVersion}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
