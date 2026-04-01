import { useState, useCallback, useEffect, useRef } from "react";
import { trackEvent } from "../hooks/useAnalytics";
import { supabase } from "../supabase";
import ShareShelf from "../components/ShareShelf";
import FeedFilterBar from "../components/feed/FeedFilterBar";
import MoviesPane from "../components/feed/MoviesPane";
import PodcastPane from "../components/feed/PodcastPane";
import ActivityPane from "../components/feed/ActivityPane";

// ════════════════════════════════════════════════
// FEED SCREEN — Movies | Podcasts | Activity
// Coordinates tabs, filters, and pull-to-refresh.
// Each tab's data + rendering lives in its own pane.
// ════════════════════════════════════════════════

const ADMIN_ID = "19410e64-d610-4fab-9c26-d24fafc94696";

const FEED_TABS = [
  { key: "podcast",  label: "Podcasts" },
  { key: "releases", label: "Movies" },
  { key: "activity", label: "Activity" },
];

export default function FeedScreen({
  session, profile, onToast, isActive,
  onNavigateCommunity, onNavigateToCommunities, onNavigateSearch, onNavigateMantl, onNavigateProfile,
  letterboxdSyncSignal, autoLogCompleteSignal,
  communitySubscriptions, favoritePodcasts,
  feedMode, setFeedMode,
  pendingSleeveOpen, setPendingSleeveOpen,
  pushNav, removeNav,
}) {
  const userId = session?.user?.id;
  const isAdmin = userId === ADMIN_ID;

  // ── Shared filter state (passed down to all three panes) ──
  const [sortOrder, setSortOrder] = useState(null);
  const [selectedPodcast, setSelectedPodcast] = useState(null);
  const [favoriteSlugs, setFavoriteSlugs] = useState(null);

  // ── Pull-to-refresh (wraps the whole scroll container) ──
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showShareShelf, setShowShareShelf] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const scrollContainerRef = useRef(null);
  const PULL_THRESHOLD = 70;

  const handleTouchStart = useCallback((e) => {
    const el = scrollContainerRef.current;
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
      // Broadcast refresh signal to whichever pane is active
      setRefreshSignal(s => s + 1);
      // Minimum spinner time so it doesn't flash
      await new Promise(r => setTimeout(r, 600));
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance]);

  // ── Warm up api-proxy edge function on mount so backdrop fetches hit a warm instance ──
  useEffect(() => {
    supabase.functions.invoke("api-proxy", { body: { action: "ping" } }).catch(() => {});
  }, []);

  // ── Analytics: track tab switches ──
  const prevFeedModeRef = useRef(feedMode);
  useEffect(() => {
    if (prevFeedModeRef.current !== feedMode && userId) {
      trackEvent(userId, "feed_mode_switch", { from: prevFeedModeRef.current, to: feedMode });
    }
    prevFeedModeRef.current = feedMode;
  }, [feedMode, userId]);

  return (
    <div style={{
      background: "var(--bg-primary, #0f0d0b)",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* ── Fixed header: tab toggle + filter bar ── */}
      <div style={{ flexShrink: 0, zIndex: 50, background: "var(--bg-primary, #0f0d0b)" }}>
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
          </div>
        </div>

        <FeedFilterBar
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          selectedPodcast={selectedPodcast}
          onPodcastChange={setSelectedPodcast}
          communitySubscriptions={communitySubscriptions}
          favoritePodcasts={favoritePodcasts}
          onFavoriteSlugsReady={setFavoriteSlugs}
        />
      </div>

      {/* ── Scrollable content ── */}
      <div
        ref={scrollContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          paddingBottom: "calc(120px + var(--sab))",
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

        {/* ── Three panes: show/hide by feedMode ── */}
        <div style={{ display: feedMode === "releases" ? "block" : "none" }}>
          <MoviesPane
            isVisible={feedMode === "releases"}
            selectedPodcast={selectedPodcast}
            favoriteSlugs={favoriteSlugs}
            sortOrder={sortOrder}
            onNavigateSearch={onNavigateSearch}
            onNavigateCommunity={onNavigateCommunity}
            pushNav={pushNav}
            removeNav={removeNav}
            refreshSignal={refreshSignal}
          />
        </div>

        <div style={{ display: feedMode === "podcast" ? "block" : "none" }}>
          <PodcastPane
            isVisible={feedMode === "podcast"}
            userId={userId}
            isAdmin={isAdmin}
            selectedPodcast={selectedPodcast}
            favoriteSlugs={favoriteSlugs}
            sortOrder={sortOrder}
            onNavigateSearch={onNavigateSearch}
            refreshSignal={refreshSignal}
          />
        </div>

        <div style={{ display: feedMode === "activity" ? "block" : "none" }}>
          <ActivityPane
            isVisible={feedMode === "activity"}
            userId={userId}
            profile={profile}
            favoritePodcasts={favoritePodcasts}
            selectedPodcast={selectedPodcast}
            favoriteSlugs={favoriteSlugs}
            sortOrder={sortOrder}
            isActive={isActive}
            letterboxdSyncSignal={letterboxdSyncSignal}
            autoLogCompleteSignal={autoLogCompleteSignal}
            onNavigateCommunity={onNavigateCommunity}
            onNavigateToCommunities={onNavigateToCommunities}
            onNavigateMantl={onNavigateMantl}
            onNavigateProfile={onNavigateProfile}
            pushNav={pushNav}
            removeNav={removeNav}
            pendingSleeveOpen={pendingSleeveOpen}
            setPendingSleeveOpen={setPendingSleeveOpen}
            onToast={onToast}
            refreshSignal={refreshSignal}
          />
        </div>
      </div>

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

      {showShareShelf && (
        <ShareShelf
          username={profile?.username}
          onClose={() => setShowShareShelf(false)}
          onToast={onToast}
        />
      )}
    </div>
  );
}
