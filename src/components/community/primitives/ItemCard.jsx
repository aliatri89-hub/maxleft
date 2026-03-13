import { useState, useEffect } from "react";
import { getCoverUrl } from "../../../utils/communityTmdb";

const MEDIA_ICONS = { film: "🎬", book: "📚", game: "🎮" };
const MEDIA_GRADIENTS = {
  film: "linear-gradient(135deg, #1a1a2e, #16213e)",
  book: "linear-gradient(135deg, #2a1a1a, #1a1a2e)",
  game: "linear-gradient(135deg, #1a1a2e, #0f2240)",
};

/**
 * ItemCard — Dumb community item card primitive.
 *
 * Renders: poster image, title, year/creator, completion checkmark.
 * Does NOT render: commentary badges, rating arrows, host badges, or
 * any other community-specific overlays.
 *
 * Community-specific wrappers (BCItemCard, NPItemCard, etc.) wrap this
 * and add their own badges/overlays via the `children` prop or by
 * wrapping in a positioned container.
 *
 * Props:
 *   item              — community_items row
 *   isCompleted       — whether item is logged/seen
 *   onToggle          — click handler (typically opens the log modal)
 *   coverCacheVersion — triggers cover URL re-resolve
 *   children          — optional overlay content rendered inside the poster area
 *   bottomOverlay     — optional content rendered at bottom of poster (e.g., host arrows)
 */
export default function ItemCard({
  item,
  isCompleted,
  onToggle,
  coverCacheVersion,
  children,
  bottomOverlay,
}) {
  const [coverUrl, setCoverUrl] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    // 1. Reactive TMDB cache (keyed by tmdb_id — always correct, matches modal)
    let cacheKey = null;
    if ((item.media_type === "film" || item.media_type === "show") && item.tmdb_id) {
      cacheKey = item.media_type === "show" ? `tmdb_tv:${item.tmdb_id}` : `tmdb:${item.tmdb_id}`;
    } else if (item.media_type === "book") {
      cacheKey = `book:${item.isbn || item.title}`;
    } else if (item.media_type === "game") {
      cacheKey = `game:${item.title}`;
    }
    const fromReactiveCache = cacheKey && coverCacheVersion?.[cacheKey];

    // 2. Module-level cache (progressive fetch result)
    const cached = getCoverUrl(item);

    // 3. DB poster_path (may be stale/mismatched from seeding)
    const dbUrl = item.poster_path
      ? item.poster_path.startsWith("http")
        ? item.poster_path
        : `https://image.tmdb.org/t/p/w342${item.poster_path}`
      : null;

    // For books/games, poster_path is manually curated — it should WIN over TMDB caches.
    // For films/shows, reactive cache > module cache > DB fallback (standard TMDB flow).
    const isManualMedia = item.media_type === "book" || item.media_type === "game";
    const url = isManualMedia
      ? (dbUrl || fromReactiveCache || cached)
      : (fromReactiveCache || cached || dbUrl);
    if (url && url !== coverUrl) {
      setCoverUrl(url);
      setImgLoaded(false);
    }
  }, [coverCacheVersion, item]);

  const isBook = item.media_type === "book";
  const isGame = item.media_type === "game";
  const borderColor = isCompleted ? "#4ade80" : "transparent";

  return (
    <div
      onClick={onToggle}
      style={{
        position: "relative",
        width: isBook ? 100 : 120,
        flexShrink: 0,
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Poster area */}
      <div
        style={{
          width: "100%",
          aspectRatio: isGame ? "16/9" : "2/3",
          borderRadius: 8,
          overflow: "hidden",
          background: isCompleted
            ? "linear-gradient(135deg, #1a3a2a, #0f2a1a)"
            : MEDIA_GRADIENTS[item.media_type] || MEDIA_GRADIENTS.film,
          position: "relative",
          border: `2px solid ${borderColor}`,
          transition: "border-color 0.2s",
        }}
      >
        {/* Cover image */}
        {coverUrl && (
          <img
            src={coverUrl}
            alt={item.title}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: imgLoaded ? (isCompleted ? 1 : 0.85) : 0,
              transition: "opacity 0.3s",
            }}
          />
        )}

        {/* Fallback placeholder */}
        {!coverUrl && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: 8, textAlign: "center",
          }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{MEDIA_ICONS[item.media_type] || "🎬"}</div>
            <div style={{ fontSize: 10, color: "#ccc", lineHeight: 1.2, fontWeight: 600 }}>{item.title}</div>
            {item.creator && (
              <div style={{ fontSize: 9, color: "#888", marginTop: 2 }}>{item.creator}</div>
            )}
            {!item.creator && item.year && (
              <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>{item.year}</div>
            )}
          </div>
        )}

        {/* Community-specific overlays injected here */}
        {children}

        {/* Completed overlay */}
        {isCompleted && (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(0deg, rgba(16,185,129,0.25) 0%, transparent 60%)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            paddingBottom: bottomOverlay ? 28 : 6,
          }}>
            <div style={{
              background: "#4ade80", color: "#0a0a0a",
              width: 24, height: 24, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700,
              boxShadow: "0 2px 8px rgba(74,222,128,0.4)",
            }}>✓</div>
          </div>
        )}

        {/* Bottom overlay area (e.g., host review arrows) */}
        {bottomOverlay}
      </div>

      {/* Title */}
      <div style={{
        marginTop: 6,
        fontSize: 11,
        fontWeight: 600,
        color: isCompleted ? "#4ade80" : "#e0e0e0",
        lineHeight: 1.2,
        overflow: "hidden",
        textOverflow: "ellipsis",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
      }}>
        {item.title}
      </div>

      {/* Year / Creator */}
      <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
        {item.creator || item.year}{item.episode_number ? ` · ${item.episode_number}` : ""}
      </div>
    </div>
  );
}
