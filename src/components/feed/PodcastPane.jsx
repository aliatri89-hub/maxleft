import { t } from "../../theme";
import { useEffect, useRef, useMemo } from "react";
import { usePodcastFeed } from "../../hooks/community/usePodcastFeed";
import PodcastCard from "./PodcastCard";
import { FeedCard } from "./FeedPrimitives";

// ════════════════════════════════════════════════
// PODCAST PANE — Podcasts tab
// ════════════════════════════════════════════════

const PODCAST_CAP = 500;

export default function PodcastPane({
  isVisible,
  userId,
  isAdmin,
  selectedPodcast,
  favoriteSlugs,
  sortOrder,
  onNavigateSearch,
  onNavigateCommunity,
  refreshSignal,
}) {
  // Server handles slug filtering + sort; client only filters favorites group
  const podcastSlugForHook = selectedPodcast && selectedPodcast !== "__favorites__" ? selectedPodcast : null;
  const podcast = usePodcastFeed(isVisible, userId, podcastSlugForHook, sortOrder);
  const sentinelRef = useRef(null);

  // ── Pull-to-refresh ──
  useEffect(() => {
    if (refreshSignal && isVisible) podcast.refresh();
  }, [refreshSignal]);

  // ── Client-side filter for favorites group ──
  const filteredPodcast = useMemo(() => {
    let items = podcast.items;
    if (selectedPodcast === "__favorites__" && favoriteSlugs) {
      items = items.filter(item => favoriteSlugs.has(item.podcast_slug));
    }
    return items;
  }, [podcast.items, selectedPodcast, favoriteSlugs]);

  // ── Infinite scroll ──
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !podcast.hasMore || !isVisible || podcast.items.length >= PODCAST_CAP) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) podcast.loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [podcast.hasMore, podcast.loadMore, podcast.items.length, isVisible]);

  return (
    <div style={{ padding: "0 14px" }}>
      {/* Loading skeleton */}
      {podcast.loading && podcast.items.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 0" }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              borderRadius: 14,
              background: "var(--bg-card, #1a1714)",
              border: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
              padding: "12px 14px",
              display: "flex", gap: 12, alignItems: "flex-start",
              opacity: 0,
              animation: `feedCardIn 0.35s ease ${i * 0.08}s both`,
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: 10, flexShrink: 0,
                background: "rgba(255,255,255,0.04)",
                animation: "skeleton-pulse 1.5s ease infinite",
                animationDelay: `${i * 0.15}s`,
              }} />
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{
                  width: "70%", height: 14, borderRadius: 4,
                  background: "rgba(255,255,255,0.06)",
                  animation: "skeleton-pulse 1.5s ease infinite",
                  animationDelay: `${i * 0.15}s`,
                }} />
                <div style={{
                  width: "45%", height: 11, borderRadius: 3, marginTop: 8,
                  background: "rgba(255,255,255,0.04)",
                  animation: "skeleton-pulse 1.5s ease infinite",
                  animationDelay: `${i * 0.15 + 0.1}s`,
                }} />
                <div style={{
                  width: "85%", height: 10, borderRadius: 3, marginTop: 10,
                  background: "rgba(255,255,255,0.03)",
                  animation: "skeleton-pulse 1.5s ease infinite",
                  animationDelay: `${i * 0.15 + 0.2}s`,
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty states */}
      {podcast.items.length === 0 && !podcast.loading && (
        <div style={{
          padding: "40px 24px", textAlign: "center",
          color: "var(--text-muted, #8892a8)", fontSize: 13,
          fontFamily: "var(--font-body)",
        }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🎙️</div>
          {selectedPodcast && selectedPodcast !== "__favorites__"
            ? "No episodes with film coverage for this podcast yet"
            : "No recent podcast coverage yet"}
        </div>
      )}
      {podcast.items.length > 0 && filteredPodcast.length === 0 && selectedPodcast === "__favorites__" && (
        <div style={{
          padding: "40px 24px", textAlign: "center",
          color: "var(--text-muted, #8892a8)", fontSize: 13,
          fontFamily: "var(--font-body)",
        }}>
          No episodes from your favorites
        </div>
      )}

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 0" }}>
        {filteredPodcast.slice(0, PODCAST_CAP).map((item, i) => (
          <FeedCard
            key={`pod-${item.episode_id}-${item.tmdb_id}`}
            index={i}
            dismissable={false}
          >
            <PodcastCard item={item} isAdmin={isAdmin} userId={userId} onNavigateCommunity={onNavigateCommunity} />
          </FeedCard>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      {podcast.hasMore && podcast.items.length < PODCAST_CAP && (
        <div ref={sentinelRef} style={{ height: 1 }} />
      )}

      {/* Load-more spinner */}
      {podcast.loading && podcast.items.length > 0 && (
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
      {filteredPodcast.length > 0 && !podcast.loading && (
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
            Looking for something specific?
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
