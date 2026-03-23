import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useFeed } from "../hooks/community/useFeed";
import { useBrowseFeed } from "../hooks/community/useBrowseFeed";
import BadgeCelebration from "../components/community/shared/BadgeCelebration";
import BadgeDetailScreen from "../components/community/shared/BadgeDetailScreen";
import ShareShelf from "../components/ShareShelf";
import FeedFilterBar from "../components/feed/FeedFilterBar";
import {
  LogCard,
  BrowseCard,
  EmptyFeed,
  FeedCard,
} from "../components/feed";
import IngestReviewTool from "../components/feed/IngestReviewTool";
import BrowseLoadingSplash from "../components/feed/BrowseLoadingSplash";

// ════════════════════════════════════════════════
// FEED SCREEN — New Releases | Streaming | Activity | Inbox (admin)
// ════════════════════════════════════════════════

const ADMIN_ID = "19410e64-d610-4fab-9c26-d24fafc94696";

const BASE_TABS = [
  { key: "releases",  label: "New Releases" },
  { key: "streaming", label: "Streaming" },
  { key: "activity",  label: "Activity" },
];
const INBOX_TAB = { key: "inbox", label: "Inbox" };

export default function FeedScreen({ session, profile, onToast, isActive, onNavigateCommunity, onNavigateSearch, onNavigateMantl, letterboxdSyncSignal, autoLogCompleteSignal, communitySubscriptions, feedMode, setFeedMode, pushNav, removeNav, onOpenWhatToWatch }) {
  const userId = session?.user?.id;
  const isAdmin = userId === ADMIN_ID;
  const FEED_TABS = useMemo(() => isAdmin ? [...BASE_TABS, INBOX_TAB] : BASE_TABS, [isAdmin]);
  const {
    activityItems,
    hasMoreActivity,
    loadMoreActivity,
    loading, refresh,
  } = useFeed(userId, communitySubscriptions);
  const releases = useBrowseFeed("releases", feedMode === "releases");
  const streaming = useBrowseFeed("streaming", feedMode === "streaming");
  const wasActive = useRef(isActive);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const [celebrationBadge, setCelebrationBadge] = useState(null);
  const [viewingBadgeDetail, setViewingBadgeDetail] = useState(null);
  const [showShareShelf, setShowShareShelf] = useState(false);
  const activitySentinelRef = useRef(null);
  const releasesSentinelRef = useRef(null);
  const streamingSentinelRef = useRef(null);

  // ── Filter state ──
  const [sortOrder, setSortOrder] = useState(null);  // null = default, "recent", "oldest"
  const [selectedPodcast, setSelectedPodcast] = useState(null);

  // ── Filtered + sorted browse items ──
  const filteredReleases = useMemo(() => {
    let items = releases.items;
    if (selectedPodcast) {
      items = items.filter(m => (m.community_slugs || []).includes(selectedPodcast));
    }
    if (sortOrder === "oldest") items = [...items].reverse();
    return items;
  }, [releases.items, selectedPodcast, sortOrder]);

  const filteredStreaming = useMemo(() => {
    let items = streaming.items;
    if (selectedPodcast) {
      items = items.filter(m => (m.community_slugs || []).includes(selectedPodcast));
    }
    if (sortOrder === "oldest") items = [...items].reverse();
    return items;
  }, [streaming.items, selectedPodcast, sortOrder]);

  // ── Filtered + sorted activity items ──
  const filteredActivity = useMemo(() => {
    let items = activityItems;
    if (selectedPodcast) {
      items = items.filter(item =>
        item.type === "log" && (item.data?.communities || []).some(c => c.community_slug === selectedPodcast)
      );
    }
    if (sortOrder === "oldest") items = [...items].reverse();
    return items;
  }, [activityItems, selectedPodcast, sortOrder]);

  // ── Pull-to-refresh ──
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const scrollContainerRef = useRef(null);
  const PULL_THRESHOLD = 70;

  const handleTouchStart = useCallback((e) => {
    const el = scrollContainerRef.current?.closest('.tab-pane') ?? scrollContainerRef.current;
    const atTop = (el ? el.scrollTop <= 0 : true);
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

  // ── Infinite scroll — all tabs capped at 50 ──
  const BROWSE_CAP = 50;
  const ACTIVITY_CAP = 30;

  useEffect(() => {
    const el = releasesSentinelRef.current;
    if (!el || !releases.hasMore || feedMode !== "releases" || releases.items.length >= BROWSE_CAP) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) releases.loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [releases.hasMore, releases.loadMore, releases.items.length, feedMode]);

  useEffect(() => {
    const el = streamingSentinelRef.current;
    if (!el || !streaming.hasMore || feedMode !== "streaming" || streaming.items.length >= BROWSE_CAP) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) streaming.loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [streaming.hasMore, streaming.loadMore, streaming.items.length, feedMode]);

  useEffect(() => {
    const el = activitySentinelRef.current;
    if (!el || !hasMoreActivity || feedMode !== "activity" || activityItems.length >= ACTIVITY_CAP) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMoreActivity(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreActivity, loadMoreActivity, activityItems.length, feedMode]);

  // ── Loading skeleton (only for initial activity load — browse tabs use inline loading) ──
  const showSkeleton = feedMode === "activity" && loading && activityItems.length === 0;

  if (showSkeleton) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f0d0b)", paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))" }}>
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

  // ── Render card ──
  const renderCard = (item, firstLogRef) => {
    if (!item?.data) return null;
    const isFirstLog = item.type === "log" && !firstLogRef.current;
    if (item.type === "log") firstLogRef.current = true;

    if (item.type === "log") {
      return <LogCard data={item.data} onNavigateCommunity={onNavigateCommunity} onViewBadgeDetail={setViewingBadgeDetail} isFirst={isFirstLog} pushNav={pushNav} removeNav={removeNav} />;
    }
    return null;
  };

  const getStableKey = (item, i) => {
    if (!item?.data) return `feed-${i}`;
    if (item.type === "log") return `log-${item.data.tmdb_id || item.data.title || i}-${(item.data.logged_at || "").slice(0, 10)}`;
    return `feed-${i}`;
  };

  return (
    <div
      ref={scrollContainerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        background: "var(--bg-primary, #0f0d0b)",
        paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))",
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

      {/* Feed tab toggle */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "6px 16px 4px", position: "relative",
      }}>
        <div className="vhs-toggle">
          {FEED_TABS.map(tab => (
            <button
              key={tab.key}
              className={`vhs-toggle-btn${feedMode === tab.key ? " active" : ""}`}
              onClick={() => setFeedMode(tab.key)}
            >
              {tab.label}
            </button>
          ))}
          {onOpenWhatToWatch && (
            <button
              className="vhs-toggle-btn"
              onClick={onOpenWhatToWatch}
              style={{ color: "#d4af37" }}
            >
              Pick a Flick
            </button>
          )}
        </div>
      </div>

      {/* Feed filter bar */}
      <FeedFilterBar
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        selectedPodcast={selectedPodcast}
        onPodcastChange={setSelectedPodcast}
        communitySubscriptions={communitySubscriptions}
      />

      {/* ── New Releases pane ── */}
      <div style={{ display: feedMode === "releases" ? "block" : "none" }}>
        {releases.loading && releases.items.length === 0 && (
          <BrowseLoadingSplash mode="releases" />
        )}
        {releases.items.length === 0 && !releases.loading && (
          <div style={{
            padding: "40px 24px", textAlign: "center",
            color: "var(--text-muted, #8892a8)", fontSize: 13,
            fontFamily: "var(--font-body)",
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🎬</div>
            No podcast coverage for current releases yet
          </div>
        )}
        {releases.items.length > 0 && filteredReleases.length === 0 && selectedPodcast && (
          <div style={{
            padding: "40px 24px", textAlign: "center",
            color: "var(--text-muted, #8892a8)", fontSize: 13,
            fontFamily: "var(--font-body)",
          }}>
            No releases covered by this podcast
          </div>
        )}
        {filteredReleases.slice(0, BROWSE_CAP).map((item) => (
          <BrowseCard key={`rel-${item.tmdb_id}`} data={item} variant="releases" pushNav={pushNav} removeNav={removeNav} onNavigateCommunity={onNavigateCommunity} />
        ))}
        {releases.hasMore && releases.items.length < BROWSE_CAP && <div ref={releasesSentinelRef} style={{ height: 1 }} />}
        {releases.loading && releases.items.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", padding: "16px" }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              border: "2.5px solid var(--text-faint, #5a6480)",
              borderTopColor: "transparent",
              animation: "ptr-spin 0.8s linear infinite",
            }} />
          </div>
        )}
        {filteredReleases.length > 0 && !releases.loading && (
          <div style={{
            padding: "28px 24px 36px", textAlign: "center",
          }}>
            <div style={{
              width: 40, height: 1,
              background: "var(--border-subtle, rgba(255,255,255,0.08))",
              margin: "0 auto 14px",
            }} />
            <div style={{
              fontFamily: "'Permanent Marker', cursive",
              fontSize: 12,
              color: "var(--text-faint, #5a6480)",
              letterSpacing: "0.04em",
            }}>
              — end of new releases —
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

      {/* ── Streaming pane ── */}
      <div style={{ display: feedMode === "streaming" ? "block" : "none" }}>
        {streaming.loading && streaming.items.length === 0 && (
          <BrowseLoadingSplash mode="streaming" />
        )}
        {streaming.items.length === 0 && !streaming.loading && (
          <div style={{
            padding: "40px 24px", textAlign: "center",
            color: "var(--text-muted, #8892a8)", fontSize: 13,
            fontFamily: "var(--font-body)",
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📺</div>
            No podcast coverage for streaming films yet
          </div>
        )}
        {streaming.items.length > 0 && filteredStreaming.length === 0 && selectedPodcast && (
          <div style={{
            padding: "40px 24px", textAlign: "center",
            color: "var(--text-muted, #8892a8)", fontSize: 13,
            fontFamily: "var(--font-body)",
          }}>
            No streaming films covered by this podcast
          </div>
        )}
        {filteredStreaming.slice(0, BROWSE_CAP).map((item) => (
          <BrowseCard key={`str-${item.tmdb_id}`} data={item} variant="streaming" pushNav={pushNav} removeNav={removeNav} onNavigateCommunity={onNavigateCommunity} />
        ))}
        {streaming.hasMore && streaming.items.length < BROWSE_CAP && <div ref={streamingSentinelRef} style={{ height: 1 }} />}
        {streaming.loading && streaming.items.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", padding: "16px" }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              border: "2.5px solid var(--text-faint, #5a6480)",
              borderTopColor: "transparent",
              animation: "ptr-spin 0.8s linear infinite",
            }} />
          </div>
        )}
        {filteredStreaming.length > 0 && !streaming.loading && (
          <div style={{
            padding: "28px 24px 36px", textAlign: "center",
          }}>
            <div style={{
              width: 40, height: 1,
              background: "var(--border-subtle, rgba(255,255,255,0.08))",
              margin: "0 auto 14px",
            }} />
            <div style={{
              fontFamily: "'Permanent Marker', cursive",
              fontSize: 12,
              color: "var(--text-faint, #5a6480)",
              letterSpacing: "0.04em",
            }}>
              — end of streaming —
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

      {/* ── Activity pane ── */}
      <div style={{ display: feedMode === "activity" ? "block" : "none" }}>
        {activityItems.length === 0 && !loading && (
          <EmptyFeed onNavigateCommunity={onNavigateCommunity} />
        )}
        {activityItems.length > 0 && filteredActivity.length === 0 && selectedPodcast && (
          <div style={{
            padding: "40px 24px", textAlign: "center",
            color: "var(--text-muted, #8892a8)", fontSize: 13,
            fontFamily: "var(--font-body)",
          }}>
            No activity for this podcast yet
          </div>
        )}
        {(() => {
          const firstLogRef = { current: false };
          return filteredActivity.slice(0, ACTIVITY_CAP).map((item, i) => (
            <FeedCard
              key={`activity-${getStableKey(item, i)}`}
              index={i}
              dismissable={false}
            >
              {renderCard(item, firstLogRef)}
            </FeedCard>
          ));
        })()}
        {hasMoreActivity && activityItems.length < ACTIVITY_CAP && <div ref={activitySentinelRef} style={{ height: 1 }} />}
        {filteredActivity.length > 0 && !loading && (
          <div style={{
            padding: "28px 24px 36px", textAlign: "center",
          }}>
            <div style={{
              width: 40, height: 1,
              background: "var(--border-subtle, rgba(255,255,255,0.08))",
              margin: "0 auto 14px",
            }} />
            <div style={{
              fontFamily: "'Permanent Marker', cursive",
              fontSize: 12,
              color: "var(--text-faint, #5a6480)",
              letterSpacing: "0.04em",
            }}>
              — end of activity —
            </div>
            <div style={{
              marginTop: 16,
              fontFamily: "var(--font-body)",
              fontSize: 12,
              color: "var(--text-faint, #5a6480)",
            }}>
              Looking for your full watch history?
            </div>
            <div
              onClick={onNavigateMantl}
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
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              View diary on My MANTL
            </div>
          </div>
        )}
      </div>

      {/* ── Inbox pane (admin only) ── */}
      {isAdmin && (
        <div style={{ display: feedMode === "inbox" ? "block" : "none" }}>
          <IngestReviewTool userId={userId} onToast={onToast} session={session} />
        </div>
      )}

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
        @keyframes feedCardIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
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
          items={activityItems
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
