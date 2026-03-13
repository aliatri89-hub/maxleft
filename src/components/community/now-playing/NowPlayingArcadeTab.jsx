import { useState, useMemo, useEffect } from "react";
import NowPlayingItemCard from "./NowPlayingItemCard";

/**
 * NowPlayingArcadeTab — Video game franchise shelves for Now Playing Arcade.
 *
 * Merges two data sources into unified shelves:
 *   1. Filmography shelves with genre_bucket='video_games' → movie items (portrait)
 *   2. Arcade shelves with tab_key='arcade' → game items (landscape)
 *
 * Matched by shelf title (e.g. "Resident Evil" in both → combined shelf).
 * Unmatched shelves from either source show as-is.
 * Same item IDs everywhere → progress tracks across tabs automatically.
 */

export default function NowPlayingArcadeTab({
  community,
  session,
  progress = {},
  miniseries = [],
  onToggle,
  coverCacheVersion,
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
}) {
  const arcadeAccent = "#00ffc8";

  // Dismiss keyboard when this tab mounts — search input in parent may still be focused
  useEffect(() => {
    if (document.activeElement) document.activeElement.blur();
  }, []);

  // ── Merge filmography video_games + arcade game shelves ──
  const mergedShelves = useMemo(() => {
    // Source 1: arcade shelves (games)
    const arcadeSeries = miniseries.filter((s) => s.tab_key === "arcade");

    // Source 2: filmography shelves tagged as video games (movies)
    const vgFilmSeries = miniseries.filter(
      (s) => s.genre_bucket === "video_games" && (!s.tab_key || s.tab_key === "filmography")
    );

    // Build a map of arcade shelves by normalized title
    const normalize = (t) => (t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const arcadeByTitle = {};
    arcadeSeries.forEach((s) => {
      arcadeByTitle[normalize(s.title)] = s;
    });

    // Track which arcade shelves got matched
    const matchedArcadeKeys = new Set();
    const merged = [];

    // For each filmography VG shelf, try to find a matching arcade shelf
    vgFilmSeries.forEach((filmShelf) => {
      const key = normalize(filmShelf.title);
      const arcadeShelf = arcadeByTitle[key];

      const movieItems = (filmShelf.items || []).map((i) => ({
        ...i,
        media_type: i.media_type || "film",
      }));

      if (arcadeShelf) {
        // Matched! Merge movie + game items into one virtual shelf
        matchedArcadeKeys.add(key);
        const gameItems = (arcadeShelf.items || []).map((i) => ({
          ...i,
          media_type: i.media_type || "game",
        }));

        merged.push({
          ...filmShelf,
          // Use arcade shelf description if film shelf doesn't have one
          description: filmShelf.description || arcadeShelf.description,
          _arcadeId: arcadeShelf.id,
          items: [...movieItems, ...gameItems],
          _sort: arcadeShelf.sort_order ?? filmShelf.sort_order ?? 99,
        });
      } else {
        // Film shelf only (no matching game shelf) — still show in Arcade
        merged.push({
          ...filmShelf,
          items: movieItems,
          _sort: 50 + (filmShelf.sort_order ?? 99),
        });
      }
    });

    // Add unmatched arcade shelves (games only, no film counterpart)
    arcadeSeries.forEach((arcadeShelf) => {
      const key = normalize(arcadeShelf.title);
      if (!matchedArcadeKeys.has(key)) {
        const gameItems = (arcadeShelf.items || []).map((i) => ({
          ...i,
          media_type: i.media_type || "game",
        }));
        merged.push({
          ...arcadeShelf,
          items: gameItems,
          _sort: arcadeShelf.sort_order ?? 99,
        });
      }
    });

    // Sort: matched franchise shelves first by arcade sort_order, then unmatched
    merged.sort((a, b) => (a._sort ?? 99) - (b._sort ?? 99));

    return merged;
  }, [miniseries]);

  // ── Search + filter ──
  const visibleSeries = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    const isSearching = q.length >= 2;

    return mergedShelves
      .map((s) => {
        let items = s.items || [];

        if (filter === "seen") items = items.filter((i) => progress[i.id]?.status === "completed");
        else if (filter === "unseen") items = items.filter((i) => progress[i.id]?.status !== "completed");

        if (isSearching) {
          items = items.filter((i) =>
            i.title.toLowerCase().includes(q) ||
            (i.creator || "").toLowerCase().includes(q) ||
            String(i.year || "").includes(q)
          );
        }

        const seen = new Set();
        items = items.filter((i) => {
          const key = `${i.media_type}::${i.title}::${i.year || ""}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        return items.length === 0 ? null : { ...s, items };
      })
      .filter(Boolean);
  }, [mergedShelves, searchQuery, filter, progress]);

  // ── Arcade palette ──
  const arcadeBg = "#08080f";

  return (
    <div style={{
      padding: "0 0 100px",
      background: arcadeBg,
      minHeight: "60vh",
      position: "relative",
    }}>
      {/* CRT scanline overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "repeating-linear-gradient(0deg, rgba(0,255,200,0.015) 0px, rgba(0,255,200,0.015) 1px, transparent 1px, transparent 3px)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* Neon gradient wash */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 160,
        background: "linear-gradient(180deg, rgba(0,255,200,0.04) 0%, transparent 100%)",
        pointerEvents: "none",
      }} />

      {/* ─── Shelves ─────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {visibleSeries.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "40px 0",
            fontFamily: "'Courier New', monospace", fontSize: 13,
            color: "rgba(0,255,200,0.2)", fontStyle: "normal",
          }}>
            {searchQuery ? "No matching games" : "No games here yet"}
          </div>
        ) : (
          <div style={{ paddingTop: 12 }}>
            {visibleSeries.map((s) => (
              <ArcadeShelf
                key={s._arcadeId || s.id}
                series={s}
                progress={progress}
                onToggle={onToggle}
                coverCacheVersion={coverCacheVersion}
                accent={arcadeAccent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   ArcadeShelf — stacked layout: movies (portrait) + games (landscape)
   ═══════════════════════════════════════════════════════════════ */

function ArcadeShelf({ series, progress, onToggle, coverCacheVersion, accent }) {
  const items = series.items || [];
  const movies = items.filter((i) => (i.media_type || "film") === "film");
  const games = items.filter((i) => i.media_type === "game");

  const allCompleted = items.filter((i) => progress[i.id]?.status === "completed").length;
  const allPct = items.length > 0 ? Math.round((allCompleted / items.length) * 100) : 0;

  return (
    <div data-shelf-id={series.id} style={{ marginBottom: 28, overflow: "hidden" }}>

      {/* ── Shelf header ── */}
      <div style={{ padding: "0 16px", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          {series.director_emoji && <span style={{ fontSize: 20 }}>{series.director_emoji}</span>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 15, fontWeight: 700, color: "#fff",
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.02em",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {series.title}
            </div>
            {series.description && (
              <div style={{ fontSize: 12, color: "#888", marginTop: 1 }}>
                {series.description}
              </div>
            )}
          </div>
          <div style={{
            fontSize: 13, fontWeight: 700,
            color: allPct === 100 ? "#4ade80" : accent,
            fontFamily: "'Barlow Condensed', sans-serif",
          }}>
            {allCompleted}/{items.length}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 3, borderRadius: 2, background: "rgba(0,255,200,0.06)", overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 2,
            width: `${allPct}%`,
            background: allPct === 100
              ? "linear-gradient(90deg, #4ade80, #22d3ee)"
              : accent,
            boxShadow: allPct > 0 && allPct < 100 ? `0 0 6px ${accent}60` : "none",
            transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          }} />
        </div>
      </div>

      {/* ── Movie row (portrait cards) ── */}
      {movies.length > 0 && (
        <>
          {games.length > 0 && (
            <div style={{
              padding: "0 16px 4px",
              fontSize: 10, fontWeight: 700,
              color: "rgba(255,255,255,0.3)",
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}>
              🎬 Films ({movies.length})
            </div>
          )}
          <div
            className="hide-scrollbar"
            style={{
              display: "flex", gap: 12,
              overflowX: "auto", overflowY: "hidden",
              padding: "0 16px 4px",
              scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {movies.map((item) => (
              <NowPlayingItemCard
                key={item.id}
                item={item}
                isCompleted={progress[item.id]?.status === "completed"}
                onToggle={() => onToggle(item.id)}
                coverCacheVersion={coverCacheVersion}
                progress={progress[item.id] || null}
                userRating={progress[item.id]?.rating || null}
                brownArrow={!!progress[item.id]?.brown_arrow}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Game row (landscape cards) ── */}
      {games.length > 0 && (
        <>
          <div style={{
            padding: movies.length > 0 ? "8px 16px 4px" : "0 16px 4px",
            fontSize: 10, fontWeight: 700,
            color: "rgba(255,255,255,0.3)",
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>
            🎮 Games ({games.length})
          </div>
          <div
            className="hide-scrollbar"
            style={{
              display: "flex", gap: 10,
              overflowX: "auto", overflowY: "hidden",
              padding: "0 16px 4px",
              scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {games.map((item) => (
              <GameLandscapeCard
                key={item.id}
                item={item}
                isCompleted={progress[item.id]?.status === "completed"}
                onToggle={() => onToggle(item.id)}
                accent={accent}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   GameLandscapeCard — wide card using RAWG background image
   ═══════════════════════════════════════════════════════════════ */

function GameLandscapeCard({ item, isCompleted, onToggle, accent }) {
  const extra = item.extra_data || {};
  const bgImage = extra.bg_image || "";
  const year = item.year;
  const platforms = extra.platforms || "";

  return (
    <div
      onClick={onToggle}
      style={{
        flexShrink: 0,
        width: 200,
        height: 120,
        borderRadius: 10,
        overflow: "hidden",
        position: "relative",
        cursor: "pointer",
        border: isCompleted
          ? `2px solid #4ade80`
          : `1px solid ${accent}18`,
        boxShadow: isCompleted
          ? "0 0 12px rgba(74,222,128,0.2)"
          : "none",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
    >
      {/* Background image */}
      {bgImage ? (
        <img
          src={bgImage}
          alt={item.title}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: isCompleted ? "brightness(0.5)" : "brightness(0.7)",
            transition: "filter 0.3s",
          }}
        />
      ) : (
        <div style={{
          width: "100%", height: "100%",
          background: "linear-gradient(135deg, #0a0f0a, #121a1a)",
        }} />
      )}

      {/* Gradient overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)",
      }} />

      {/* Completed checkmark */}
      {isCompleted && (
        <div style={{
          position: "absolute", top: 6, right: 6,
          width: 22, height: 22, borderRadius: "50%",
          background: "rgba(74, 222, 128, 0.9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(74,222,128,0.4)",
        }}>
          <span style={{ fontSize: 12, color: "#fff", lineHeight: 1 }}>✓</span>
        </div>
      )}

      {/* 🎮 badge */}
      <div style={{
        position: "absolute", top: 6, left: 6,
        fontSize: 10,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        borderRadius: 4,
        padding: "2px 5px",
        color: accent,
        fontWeight: 600,
        fontFamily: "'Courier New', monospace",
        letterSpacing: "0.03em",
      }}>
        🎮
      </div>

      {/* Text overlay */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "8px 10px",
      }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.02em",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
        }}>
          {item.title}
        </div>
        <div style={{
          fontSize: 10, color: "rgba(0,255,200,0.4)",
          fontFamily: "'Barlow Condensed', sans-serif",
          marginTop: 1,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {[year, platforms.split(",")[0]?.trim()].filter(Boolean).join(" · ")}
        </div>
      </div>
    </div>
  );
}
