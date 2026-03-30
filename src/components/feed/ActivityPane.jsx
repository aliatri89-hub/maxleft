import { t } from "../../theme";
import { useState, useEffect, useRef, useMemo } from "react";
import { useActivityFeed } from "../../hooks/community/useActivityFeed";
import ActivityCard from "./ActivityCard";
import EmptyFeed from "./EmptyFeed";
import { FeedCard } from "./FeedPrimitives";
import BadgeCelebration from "../community/shared/BadgeCelebration";
import BadgeDetailScreen from "../community/shared/BadgeDetailScreen";

// ════════════════════════════════════════════════
// ACTIVITY PANE — Activity tab (watch logs)
// ════════════════════════════════════════════════

export default function ActivityPane({
  isVisible,
  userId,
  profile,
  favoritePodcasts,
  selectedPodcast,
  favoriteSlugs,
  sortOrder,
  isActive,
  letterboxdSyncSignal,
  autoLogCompleteSignal,
  onNavigateCommunity,
  onNavigateToCommunities,
  onNavigateMantl,
  onNavigateProfile,
  pushNav,
  removeNav,
  pendingSleeveOpen,
  setPendingSleeveOpen,
  onToast,
  refreshSignal,
}) {
  const {
    activityItems,
    hasMoreActivity,
    loadMoreActivity,
    loading,
    refresh,
  } = useActivityFeed(userId, favoritePodcasts, isVisible);

  const sentinelRef = useRef(null);
  const wasActiveRef = useRef(isActive);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const [celebrationBadge, setCelebrationBadge] = useState(null);
  const [viewingBadgeDetail, setViewingBadgeDetail] = useState(null);

  // ── Paginated rendering — show 10 at a time, cap at 50 ──
  const PAGE_SIZE = 10;
  const ACTIVITY_MAX = 50;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // ── Pull-to-refresh ──
  useEffect(() => {
    if (refreshSignal && isVisible) refresh();
  }, [refreshSignal]);

  // ── Refresh triggers ──
  useEffect(() => {
    if (isActive && !wasActiveRef.current) refreshRef.current();
    wasActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (autoLogCompleteSignal) refreshRef.current();
  }, [autoLogCompleteSignal]);

  useEffect(() => {
    if (letterboxdSyncSignal) refreshRef.current();
  }, [letterboxdSyncSignal]);

  // ── Client-side filter + sort ──
  const filteredActivity = useMemo(() => {
    let items = activityItems;
    if (selectedPodcast === "__favorites__" && favoriteSlugs) {
      items = items.filter(item =>
        item.type === "log" && (item.data?.communities || []).some(c => favoriteSlugs.has(c.community_slug))
      );
    } else if (selectedPodcast) {
      items = items.filter(item =>
        item.type === "log" && (item.data?.communities || []).some(c => c.community_slug === selectedPodcast)
      );
    }
    if (sortOrder === "oldest") items = [...items].reverse();
    return items;
  }, [activityItems, selectedPodcast, favoriteSlugs, sortOrder]);

  // Reset visible count when feed changes (filter, sort, refresh)
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filteredActivity.length, selectedPodcast, sortOrder]);

  // ── Infinite scroll ──
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMoreActivity || !isVisible || activityItems.length >= ACTIVITY_MAX) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMoreActivity(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreActivity, loadMoreActivity, activityItems.length, isVisible]);

  // ── Stable card keys ──
  const getStableKey = (item, i) => {
    if (!item?.data) return `feed-${i}`;
    if (item.type === "log") return `log-${item.data.tmdb_id || item.data.title || i}-${(item.data.logged_at || "").slice(0, 10)}`;
    return `feed-${i}`;
  };

  // ── Loading skeleton (full-screen, only on initial load) ──
  if (loading && activityItems.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0f0d0b)", paddingBottom: "calc(120px + var(--sab))" }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            margin: "6px 16px",
            borderRadius: 10,
            aspectRatio: "16 / 9",
            background: "var(--bg-card, #1a1714)",
            position: "relative",
            overflow: "hidden",
            opacity: 0,
            animation: `feedCardIn 0.35s ease ${i * 0.08}s both`,
          }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.02) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: `badgeShimmer 2s ease ${i * 0.2}s infinite`,
            }} />
            <div style={{
              position: "absolute", bottom: 10, left: 12,
              width: 60, height: 18, borderRadius: 3,
              background: "rgba(240,235,225,0.06)",
            }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Empty state */}
      {activityItems.length === 0 && !loading && (
        <EmptyFeed
          onNavigateToCommunities={onNavigateToCommunities}
          onNavigateMantl={onNavigateMantl}
          onNavigateProfile={onNavigateProfile}
          profile={profile}
        />
      )}
      {activityItems.length > 0 && filteredActivity.length === 0 && selectedPodcast && (
        <div style={{
          padding: "40px 24px", textAlign: "center",
          color: "var(--text-muted, #8892a8)", fontSize: 13,
          fontFamily: "var(--font-body)",
        }}>
          No activity for {selectedPodcast === "__favorites__" ? "your favorites" : "this podcast"} yet
        </div>
      )}

      {/* Cards — paginated rendering */}
      {(() => {
        const firstLogRef = { current: false };
        const capped = filteredActivity.slice(0, ACTIVITY_MAX);
        const rendered = capped.slice(0, visibleCount);
        return rendered.map((item, i) => {
          if (!item?.data) return null;
          const isFirstLog = item.type === "log" && !firstLogRef.current;
          if (item.type === "log") firstLogRef.current = true;
          return (
            <FeedCard
              key={`activity-${getStableKey(item, i)}`}
              index={i}
              dismissable={false}
            >
              <ActivityCard
                data={item.data}
                onNavigateCommunity={onNavigateCommunity}
                onViewBadgeDetail={setViewingBadgeDetail}
                isFirst={isFirstLog}
                pushNav={pushNav}
                removeNav={removeNav}
                pendingSleeveOpen={pendingSleeveOpen}
                setPendingSleeveOpen={setPendingSleeveOpen}
                onToast={onToast}
                onLogDeleted={refresh}
              />
            </FeedCard>
          );
        });
      })()}

      {/* Show more button */}
      {visibleCount < Math.min(filteredActivity.length, ACTIVITY_MAX) && (
        <div style={{ padding: "16px 24px 8px", textAlign: "center" }}>
          <button
            onClick={() => setVisibleCount(v => Math.min(v + PAGE_SIZE, ACTIVITY_MAX))}
            style={{
              fontFamily: t.fontHeadline,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--accent-terra, #c97c5d)",
              letterSpacing: "0.04em",
              background: "rgba(201,124,93,0.08)",
              border: "1px solid rgba(201,124,93,0.25)",
              borderRadius: 20,
              padding: "10px 24px",
              cursor: "pointer",
            }}
          >
            Show {Math.min(PAGE_SIZE, Math.min(filteredActivity.length, ACTIVITY_MAX) - visibleCount)} more
          </button>
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasMoreActivity && activityItems.length < ACTIVITY_MAX && (
        <div ref={sentinelRef} style={{ height: 1 }} />
      )}

      {/* End of feed — only when all cards are rendered */}
      {filteredActivity.length > 0 && !loading && visibleCount >= Math.min(filteredActivity.length, ACTIVITY_MAX) && (
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
    </div>
  );
}
