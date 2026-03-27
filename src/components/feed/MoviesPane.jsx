import { t } from "../../theme";
import { useEffect, useRef, useMemo } from "react";
import { useMoviesFeed } from "../../hooks/community/useMoviesFeed";
import MovieCard from "./MovieCard";
import { FeedCard } from "./FeedPrimitives";

// ════════════════════════════════════════════════
// MOVIES PANE — New Releases tab
// ════════════════════════════════════════════════

const MOVIES_CAP = 50;

export default function MoviesPane({
  isVisible,
  selectedPodcast,
  favoriteSlugs,
  sortOrder,
  onNavigateSearch,
  onNavigateCommunity,
  pushNav,
  removeNav,
}) {
  const movies = useMoviesFeed("releases", isVisible);
  const sentinelRef = useRef(null);

  // ── Client-side filter + sort ──
  const filteredMovies = useMemo(() => {
    let items = movies.items;
    if (selectedPodcast === "__favorites__" && favoriteSlugs) {
      items = items.filter(m => (m.community_slugs || []).some(s => favoriteSlugs.has(s)));
    } else if (selectedPodcast) {
      items = items.filter(m => (m.community_slugs || []).includes(selectedPodcast));
    }
    if (sortOrder === "oldest") items = [...items].reverse();
    return items;
  }, [movies.items, selectedPodcast, favoriteSlugs, sortOrder]);

  // ── Infinite scroll ──
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !movies.hasMore || !isVisible || movies.items.length >= MOVIES_CAP) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) movies.loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [movies.hasMore, movies.loadMore, movies.items.length, isVisible]);

  return (
    <div>
      {/* Loading skeleton */}
      {movies.loading && movies.items.length === 0 && (
        <div style={{ padding: "4px 0" }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              margin: "6px 16px",
              borderRadius: 10,
              minHeight: 80,
              background: "var(--bg-card, #1a1714)",
              border: "1px solid rgba(255,255,255,0.04)",
              position: "relative",
              overflow: "hidden",
              opacity: 0,
              animation: `feedCardIn 0.35s ease ${i * 0.08}s both`,
            }}>
              <div style={{ display: "flex", minHeight: 80, borderRadius: 9, overflow: "hidden" }}>
                <div style={{ width: 5, flexShrink: 0, background: "#1a1612" }} />
                <div style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.015)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                }}>
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.02) 50%, transparent 100%)",
                    backgroundSize: "200% 100%",
                    animation: "badgeShimmer 2s ease infinite",
                    animationDelay: `${i * 0.2}s`,
                  }} />
                  <div style={{
                    width: `${50 + (i * 7) % 30}%`, height: 16, borderRadius: 4,
                    background: "rgba(255,255,255,0.05)",
                    animation: "skeleton-pulse 1.5s ease infinite",
                    animationDelay: `${i * 0.15}s`,
                  }} />
                </div>
                <div style={{ width: 5, flexShrink: 0, background: "#1a1612" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty states */}
      {movies.items.length === 0 && !movies.loading && (
        <div style={{
          padding: "40px 24px", textAlign: "center",
          color: "var(--text-muted, #8892a8)", fontSize: 13,
          fontFamily: "var(--font-body)",
        }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🎬</div>
          No podcast coverage for current releases yet
        </div>
      )}
      {movies.items.length > 0 && filteredMovies.length === 0 && selectedPodcast && (
        <div style={{
          padding: "40px 24px", textAlign: "center",
          color: "var(--text-muted, #8892a8)", fontSize: 13,
          fontFamily: "var(--font-body)",
        }}>
          No releases covered by {selectedPodcast === "__favorites__" ? "your favorites" : "this podcast"}
        </div>
      )}

      {/* Cards */}
      {filteredMovies.slice(0, MOVIES_CAP).map((item, i) => (
        <FeedCard key={`rel-${item.tmdb_id}`} index={i} dismissable={false}>
          <MovieCard
            data={item}
            variant="releases"
            pushNav={pushNav}
            removeNav={removeNav}
            onNavigateCommunity={onNavigateCommunity}
          />
        </FeedCard>
      ))}

      {/* Infinite scroll sentinel */}
      {movies.hasMore && movies.items.length < MOVIES_CAP && (
        <div ref={sentinelRef} style={{ height: 1 }} />
      )}

      {/* Load-more spinner */}
      {movies.loading && movies.items.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", padding: "16px" }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%",
            border: "2.5px solid var(--text-faint, #5a6480)",
            borderTopColor: "transparent",
            animation: "ptr-spin 0.8s linear infinite",
          }} />
        </div>
      )}

      {/* End of feed */}
      {filteredMovies.length > 0 && !movies.loading && (
        <div style={{ padding: "28px 24px 36px", textAlign: "center" }}>
          <div style={{
            width: 40, height: 1,
            background: "var(--border-subtle, rgba(255,255,255,0.08))",
            margin: "0 auto 14px",
          }} />
          <div style={{
            fontFamily: t.fontHeadline,
            fontSize: 12,
            color: "var(--text-faint, #5a6480)",
            letterSpacing: "0.04em",
          }}>
            — end of feed —
          </div>
          <div style={{
            marginTop: 16,
            fontFamily: "var(--font-body)",
            fontSize: 12,
            color: "var(--text-faint, #5a6480)",
          }}>
            Looking for something?
          </div>
          <div
            onClick={onNavigateSearch}
            style={{
              marginTop: 10,
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--accent-terra, #c97c5d)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              borderRadius: 20,
              border: "1px solid rgba(201,124,93,0.25)",
              background: "rgba(201,124,93,0.08)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Search all films
          </div>
        </div>
      )}
    </div>
  );
}
