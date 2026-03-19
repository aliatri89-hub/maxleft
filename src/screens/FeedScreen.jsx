import { useState, useCallback, useEffect, useRef } from "react";
import { useFeed } from "../hooks/community/useFeed";
import { useDismissedCards } from "../hooks/community/useDismissedCards";
import BadgeCelebration from "../components/community/shared/BadgeCelebration";
import BadgeDetailScreen from "../components/community/shared/BadgeDetailScreen";
import ShareShelf from "../components/ShareShelf";
import {
  LogCard,
  EpisodeCard,
  BadgeCard,
  BadgeCompleteCard,
  TrendingCard,
  UpNextCard,
  RandomPickCard,
  EmptyFeed,
  FeedCard,
} from "../components/feed";

// ════════════════════════════════════════════════
// FEED SCREEN
// ════════════════════════════════════════════════

export default function FeedScreen({ session, profile, onToast, isActive, onNavigateCommunity, letterboxdSyncSignal, autoLogCompleteSignal, communitySubscriptions, requestActivityMode }) {
  const userId = session?.user?.id;
  const [feedMode, setFeedMode] = useState("discover");
  const { feedItems: rawFeedItems, loading, refresh, loadMore, hasMore } = useFeed(userId, communitySubscriptions, feedMode);
  const { isDismissed, dismiss, loaded: dismissLoaded } = useDismissedCards(userId);
  const wasActive = useRef(isActive);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const [celebrationBadge, setCelebrationBadge] = useState(null);
  const [viewingBadgeDetail, setViewingBadgeDetail] = useState(null);
  const [showShareShelf, setShowShareShelf] = useState(false);

  const ACTIVITY_ONLY_TYPES = new Set(["log"]);
  const feedItems = rawFeedItems
    .filter((item) => feedMode !== "activity" || ACTIVITY_ONLY_TYPES.has(item.type));

  // ── Pull-to-refresh ──
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const scrollContainerRef = useRef(null);
  const PULL_THRESHOLD = 70;

  const handleTouchStart = useCallback((e) => {
    const el = scrollContainerRef.current;
    const atTop = (el ? el.scrollTop <= 0 : true) && window.scrollY <= 0;
    if (atTop && !refreshing) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling.current) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) {
      setPullDistance(Math.min(dy * 0.5, 120));
    } else {
      isPulling.current = false;
      setPullDistance(0);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      await refreshRef.current();
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance]);

  // Refresh feed when tab becomes active
  useEffect(() => {
    if (isActive && !wasActive.current) refreshRef.current();
    wasActive.current = isActive;
  }, [isActive]);

  // Refresh after autoLogAndCheckBadges
  useEffect(() => {
    if (autoLogCompleteSignal) refreshRef.current();
  }, [autoLogCompleteSignal]);

  // Refresh after Letterboxd sync
  useEffect(() => {
    if (letterboxdSyncSignal) refreshRef.current();
  }, [letterboxdSyncSignal]);

  // Switch to Activity tab when requested
  useEffect(() => {
    if (requestActivityMode) setFeedMode("activity");
  }, [requestActivityMode]);

  // ── Loading skeleton ──
  if (loading && feedItems.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f0d0b)", paddingBottom: 100 }}>
        <div style={{ padding: "0 16px" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              margin: "6px 0", height: i === 1 ? 120 : 180, borderRadius: 16,
              background: "var(--bg-card, #1a1714)",
              opacity: 0.6 - i * 0.15,
              animation: "skeleton-pulse 1.5s ease infinite",
              animationDelay: `${i * 0.2}s`,
            }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Render card by type ──
  const renderCard = (item, firstLogRef) => {
    const isFirstLog = item.type === "log" && !firstLogRef.current;
    if (item.type === "log") firstLogRef.current = true;

    switch (item.type) {
      case "log":
        return <LogCard data={item.data} onNavigateCommunity={onNavigateCommunity} onViewBadgeDetail={setViewingBadgeDetail} isFirst={isFirstLog} />;
      case "badge":
        return <BadgeCard data={item.data} onNavigateCommunity={onNavigateCommunity} onViewBadgeDetail={setViewingBadgeDetail} />;
      case "badge_complete":
        return <BadgeCompleteCard data={item.data} onCelebrate={(b) => setCelebrationBadge(b)} />;
      case "trending":
        return <TrendingCard data={item.data} onNavigateCommunity={onNavigateCommunity} />;
      case "up_next":
        return <UpNextCard data={item.data} onNavigateCommunity={onNavigateCommunity} />;
      case "random_pick":
        return <RandomPickCard data={item.data} onNavigateCommunity={onNavigateCommunity} />;
      case "episode":
        return <EpisodeCard data={item.data} onNavigateCommunity={onNavigateCommunity} />;
      default:
        return null;
    }
  };

  const getDismissKey = (item) => {
    switch (item.type) {
      case "badge": return { type: "badge", key: item.data.badge_id || item.data.id };
      case "badge_complete": return { type: "badge_complete", key: item.data.badge_id || item.data.id };
      case "up_next": return { type: "up_next", key: item.data.miniseries_id };
      case "random_pick": return { type: "random_pick", key: item.data.item_id };
      case "trending": return { type: "trending", key: item.data.tmdb_id || item.data.title };
      case "episode": return { type: "episode", key: `${item.data.status}-${item.data.item_id}` };
      default: return null;
    }
  };

  const getStableKey = (item, i) => {
    switch (item.type) {
      case "log": return `log-${item.data.tmdb_id || item.data.title}-${(item.data.logged_at || "").slice(0, 10)}`;
      case "badge": return `badge-${item.data.badge_id || item.data.id || item.data.name}`;
      case "badge_complete": return `complete-${item.data.badge_id || item.data.id}`;
      case "trending": return `trending-${item.data.tmdb_id || item.data.title}`;
      case "up_next": return `upnext-${item.data.miniseries_id}`;
      case "random_pick": return `random-${item.data.item_id}`;
      case "episode": return `episode-${item.data.status}-${item.data.tmdb_id}`;
      default: return `feed-${i}`;
    }
  };

  return (
    <div
      ref={scrollContainerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        minHeight: "100vh", background: "var(--bg-primary, #0f0d0b)",
        paddingBottom: 100,
        overflowY: "auto", WebkitOverflowScrolling: "touch",
      }}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: pullDistance, overflow: "hidden",
          transition: refreshing ? "none" : "height 0.15s ease-out",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: pullDistance >= PULL_THRESHOLD
              ? "2.5px solid var(--accent-green, #34d399)"
              : "2.5px solid var(--text-faint, #5a6480)",
            borderTopColor: "transparent",
            animation: refreshing ? "ptr-spin 0.8s linear infinite" : "none",
            transform: refreshing ? "none" : `rotate(${pullDistance * 3}deg)`,
            transition: "border-color 0.2s ease",
          }} />
        </div>
      )}

      {(() => {
        const hasUserActivity = feedItems.some(item => item.type === "log");
        const showWelcome = feedMode !== "discover" && (feedItems.length === 0 || !hasUserActivity);

        if (feedItems.length === 0 && feedMode === "activity") {
          return <EmptyFeed onNavigateCommunity={onNavigateCommunity} />;
        }

        const firstLogRef = { current: false };

        return (
          <div style={{ paddingTop: 4, position: "relative" }}>
            {/* Feed mode toggle */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "6px 16px 4px", position: "relative",
            }}>
              <div className="vhs-toggle">
                {[
                  { key: "discover", label: "▶ Discover" },
                  { key: "activity", label: "● Activity" },
                ].map(tab => (
                  <button
                    key={tab.key}
                    className={`vhs-toggle-btn${feedMode === tab.key ? " active" : ""}`}
                    onClick={() => setFeedMode(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Share shelf button — hidden until share image is polished */}
              {false && feedMode === "activity" && feedItems.some(item => item.type === "log") && (
                <div
                  onClick={() => setShowShareShelf(true)}
                  style={{
                    position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
                    width: 32, height: 32, borderRadius: 8,
                    background: "rgba(240,235,225,0.06)",
                    border: "1px solid rgba(240,235,225,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", transition: "all 0.2s ease",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="#8a7d68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </div>
              )}
            </div>

            {showWelcome && <EmptyFeed onNavigateCommunity={onNavigateCommunity} />}

            {feedMode === "discover" && feedItems.length === 0 && (
              <div style={{
                padding: "40px 24px", textAlign: "center",
                color: "var(--text-muted, #8892a8)", fontSize: 13,
                fontFamily: "var(--font-body)",
              }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
                Subscribe to more communities to unlock episode drops, recommendations, and badge nudges.
              </div>
            )}

            {feedItems.map((item, i) => {
              const dismissKey = getDismissKey(item);
              if (dismissKey && isDismissed(dismissKey.type, dismissKey.key)) return null;

              return (
                <FeedCard
                  key={getStableKey(item, i)}
                  index={i}
                  dismissable={!!dismissKey}
                  onDismiss={dismissKey ? () => dismiss(dismissKey.type, dismissKey.key) : undefined}
                >
                  {renderCard(item, firstLogRef)}
                </FeedCard>
              );
            })}

            {/* Load More */}
            {hasMore && (
              <div style={{ display: "flex", justifyContent: "center", padding: "20px 16px 8px" }}>
                <button
                  onClick={loadMore}
                  style={{
                    padding: "10px 28px", borderRadius: 10,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-muted, #8892a8)",
                    fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    cursor: "pointer", transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  Load more
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Animations */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(52,211,153,0.4); }
          50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(52,211,153,0); }
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.2; }
        }
        @keyframes badgeShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes ptr-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Badge celebration overlay */}
      {celebrationBadge && (
        <BadgeCelebration
          badge={{
            name: celebrationBadge.badge_name || celebrationBadge.name,
            image_url: celebrationBadge.badge_image || celebrationBadge.image_url,
            accent_color: celebrationBadge.accent_color,
            audio_url: celebrationBadge.audio_url || null,
            tagline: celebrationBadge.tagline || null,
          }}
          onClose={() => setCelebrationBadge(null)}
          onViewBadge={() => {
            const badgeForDetail = {
              id: celebrationBadge.badge_id || celebrationBadge.id,
              name: celebrationBadge.badge_name || celebrationBadge.name,
              image_url: celebrationBadge.badge_image || celebrationBadge.image_url,
              accent_color: celebrationBadge.accent_color,
              tagline: celebrationBadge.tagline || null,
              progress_tagline: celebrationBadge.progress_tagline || null,
              description: celebrationBadge.description || null,
              miniseries_id: celebrationBadge.miniseries_id,
              media_type_filter: celebrationBadge.media_type_filter || null,
              earned_at: celebrationBadge.earned_at || null,
            };
            setCelebrationBadge(null);
            setViewingBadgeDetail(badgeForDetail);
          }}
        />
      )}

      {viewingBadgeDetail && (
        <BadgeDetailScreen
          badge={viewingBadgeDetail}
          userId={userId}
          earnedAt={viewingBadgeDetail.earned_at || new Date().toISOString()}
          onClose={() => setViewingBadgeDetail(null)}
        />
      )}

      {showShareShelf && (
        <ShareShelf
          items={feedItems
            .filter(item => item.type === "log")
            .slice(0, 6)
            .map(item => item.data)}
          username={profile?.username}
          onClose={() => setShowShareShelf(false)}
          onToast={onToast}
        />
      )}
    </div>
  );
}
