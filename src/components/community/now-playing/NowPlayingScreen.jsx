import { t } from "../../../theme";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";

import { useScrollToItem } from "../../../hooks/useScrollToItem";
import { useBackGesture } from "../../../hooks/useBackGesture";
import { useCommunityProgress, useCommunityActions, useBadgeOrchestrator } from "../../../hooks/community";
import { fetchCoversForItems, getCoverUrl, getCoverCacheSnapshot } from "../../../utils/communityTmdb";
import { isComingSoon } from "../../../utils/comingSoon";
import NowPlayingHero from "./NowPlayingHero";
import NowPlayingGenreTab from "./NowPlayingGenreTab";
import NowPlayingLogModal from "./NowPlayingLogModal";
import { useAudioPlayer } from "../shared/AudioPlayerProvider";
import CommunityBottomNav from "../shared/CommunityBottomNav";
import CommunityTabSlider from "../shared/CommunityTabSlider";
import BadgeCelebration from "../shared/BadgeCelebration";
import BadgeProgressToast from "../shared/BadgeProgressToast";
import BadgeDetailScreen from "../shared/BadgeDetailScreen";
import BadgePage from "../shared/BadgePage";
import AddItemTool from "../dashboard/AddItemTool";
import AdminFab from "../dashboard/AdminFab";
import RSSSyncTool from "../dashboard/RSSSyncTool";
import { useRecentlyLogged } from "../../../hooks/community/useRecentlyLogged";
import { useRecentEpisodes } from "../../../hooks/community/useRecentEpisodes";

/**
 * NowPlayingScreen — Self-contained screen for the Now Playing Podcast community.
 *
 * Tabs: filmography (genre-bucketed view)
 * Hero: NowPlayingHero (film stats)
 * Rating style: host verdict arrows (up/down on item cards via extra_data)
 *
 * Props passed from CommunityRouter:
 *   community, miniseries, session, onBack, onToast, onShelvesChanged
 */
export default function NowPlayingScreen({ community, miniseries, session, onBack, onToast, onShelvesChanged, communitySubscriptions, onOpenCommunity, scrollToTmdbId, letterboxdSyncSignal, pushNav, removeNav, popNav }) {
  const userId = session?.user?.id;
  const accent = community?.theme_config?.accent || "#e94560";

  const { currentEp, isPlaying, minimize } = useAudioPlayer();
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  // Auto-minimize the mini bar when leaving this community screen
  // But only if audio is paused — if playing, keep the mini bar so user has controls
  useEffect(() => {
    return () => {
      if (!isPlayingRef.current) minimize();
    };
  }, [minimize]);

  const tabs = useMemo(() => {
    const t = community?.theme_config?.tabs;
    return (t && Array.isArray(t) && t.length > 0) ? t : [{ key: "filmography", label: "Filmography", icon: "🎬" }];
  }, [community]);

  const [activeTab, setActiveTab] = useState(tabs[0]?.key || "filmography");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [coverCache, setCoverCache] = useState(() => getCoverCacheSnapshot());
  const [modalItem, setModalItem] = useState(null);
  const [showAddTool, setShowAddTool] = useState(false);
  const [showRSSSync, setShowRSSSync] = useState(false);

  // Ref for genre tab to expose its "back to grid" function
  const genreResetRef = useRef(null);

  // ── Android back gesture → close modals ─────────────────
  useBackGesture("communityLogModal", !!modalItem, () => setModalItem(null), pushNav, removeNav);
  useBackGesture("communityAddTool", showAddTool, () => setShowAddTool(false), pushNav, removeNav);
  useBackGesture("communityRSSSync", showRSSSync, () => setShowRSSSync(false), pushNav, removeNav);
  useBackGesture("communityTab", activeTab !== (tabs[0]?.key || "filmography"), () => setActiveTab(tabs[0]?.key || "filmography"), pushNav, removeNav);

  // Scroll to shelf when deep-linked from another community
  useScrollToItem(scrollToTmdbId, miniseries, accent, setActiveTab);

  const hasBottomNav = tabs.length >= 1;

  // ── Badge system ──────────────────────────────────────────
  const {
    badges, earnedBadgeIds, badgeProgress, checkForBadge, checkAllBadges,
    getBadgeForItem, revokeBadgeIfNeeded,
    celebrationBadge, setCelebrationBadge,
    detailBadge, setDetailBadge,
    completionToast, showBadgePage, setShowBadgePage,
    earnedCount, showCompletionToast, handleCompletionToastTap,
  } = useBadgeOrchestrator(community?.id, userId, letterboxdSyncSignal);
  useBackGesture("badgeCelebration", !!celebrationBadge, () => setCelebrationBadge(null), pushNav, removeNav);
  useBackGesture("badgeDetail", !!detailBadge, () => setDetailBadge(null), pushNav, removeNav);
  useBackGesture("badgePage", showBadgePage, () => setShowBadgePage(false), pushNav, removeNav);

  // ── Tab slider ref (for animated nav taps) ──────────────
  const sliderRef = useRef(null);

  // ── Data ──────────────────────────────────────────────────
  const allItems = useMemo(() => miniseries.flatMap(s => s.items || []), [miniseries]);
  const upcomingCount = useMemo(() => allItems.filter(i => isComingSoon(i)).length, [allItems]);


  const { progress, setProgress } = useCommunityProgress(community?.id, userId, allItems);
  const { logItem, unlogItem, addToWatchlist } = useCommunityActions(userId, setProgress);

  // ── Dynamic shelves ────────────────────────────────────────
  const { recentItems, loading: recentLoading } = useRecentlyLogged(community?.id, userId, allItems, progress, "film");
  const { recentEpisodeItems, loading: episodesLoading } = useRecentEpisodes([], allItems, 10, "nowplaying", community?.theme_config?.episode_source);

  // Stable fingerprint: only changes when the actual item set changes,
  // not when the parent re-provides miniseries with a new array reference.
  const allItemsKey = useMemo(() => allItems.map(i => i.id).join(","), [allItems]);

  useEffect(() => {
    if (allItems.length === 0) return;
    fetchCoversForItems(allItems, setCoverCache);
  }, [allItemsKey]);

  // ── Handlers ──────────────────────────────────────────────
  const handleItemTap = useCallback((itemId) => {
    const item = allItems.find(i => i.id === itemId);
    if (item) setModalItem(item);
  }, [allItems]);

  const handleLog = useCallback(async (itemId, { rating, completed_at, listened_with_commentary, brown_arrow, isUpdate }) => {
    const item = allItems.find(i => i.id === itemId);
    const coverUrl = item ? getCoverUrl(item) : null;
    await logItem(itemId, item, coverUrl, { rating, completed_at, listened_with_commentary, brown_arrow, isUpdate });

    if (onToast) onToast(isUpdate ? `Updated!` : `Logged!`);
    if (!isUpdate && onShelvesChanged) onShelvesChanged();

    // ── Badge check (only on fresh logs, not updates) ──
    if (!isUpdate && item) {
      const earnedBadge = await checkForBadge(itemId);

      if (earnedBadge) {
        showCompletionToast(earnedBadge);
      }
      // Progress notifications handled by notification center (no toasts)
    }
  }, [allItems, logItem, onToast, onShelvesChanged, checkForBadge, showCompletionToast]);

  const handleUnlog = useCallback(async (itemId) => {
    await revokeBadgeIfNeeded(itemId);
    await unlogItem(itemId);
    if (onToast) onToast("Removed from log");
  }, [unlogItem, onToast, revokeBadgeIfNeeded]);

  const handleWatchlist = useCallback(async (item, coverUrl) => {
    await addToWatchlist(item, coverUrl);
    if (onToast) onToast("Added to watch list!");
  }, [addToWatchlist, onToast]);


  // ── Compute hero miniseries per tab ─────────────────────
  const getHeroMiniseries = useCallback((tabKey) => {
    return miniseries.filter(s => !s.tab_key || s.tab_key === "filmography");
  }, [miniseries]);

  return (
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      background: t.bgPrimary, overflowX: "hidden",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&display=swap');`}</style>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes skeletonPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.15; } }
        @keyframes shelfFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Header */}
      <div style={{
        flexShrink: 0, zIndex: 10,
        background: "rgba(15,13,11,0.95)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 8,
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <button onClick={() => {
          if (genreResetRef.current) {
            genreResetRef.current();
          } else {
            popNav();
          }
        }} style={{
          background: "none", border: "none", color: accent,
          fontSize: 15, cursor: "pointer", padding: "4px 8px 4px 0", fontWeight: 600,
        }}>← Back</button>
        <div style={{
          fontSize: 14, fontWeight: 700, color: t.textPrimary,
          fontFamily: t.fontDisplay,
          flex: 1, textAlign: "center",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{community.name}</div>
        <div style={{ width: 48 }}>
          {badges.length > 0 && (
            <button
              onClick={() => setShowBadgePage(true)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "none",
                border: "none",
                padding: "4px 4px",
                cursor: "pointer",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1L2 3.5V7C2 10.87 4.56 14.47 8 15.5C11.44 14.47 14 10.87 14 7V3.5L8 1Z"
                  fill="rgba(255,255,255,0.08)"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 8L7.5 9.5L10.5 6.5"
                  stroke={earnedCount > 0 ? "#22c55e" : "rgba(255,255,255,0.2)"}
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: earnedCount > 0 ? t.textSecondary : t.textFaint,
                fontFamily: t.fontDisplay,
              }}>
                {earnedCount}/{badges.length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Tab slider — all panes side-by-side, smooth swipe */}
      <CommunityTabSlider
        ref={sliderRef}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(key) => { setActiveTab(key); setSearchQuery(""); }}
        bottomPad={hasBottomNav ? 80 : 0}
      >
        {(tabKey) => (
          <>
            {tabKey !== "upcoming" && (
              <NowPlayingHero
                community={community}
                miniseries={getHeroMiniseries(tabKey)}
                progress={progress}
                activeTab={tabKey}
              />
            )}
            <NowPlayingGenreTab
              community={community}
              filter={filter}
              onFilterChange={setFilter}
              session={session}
              progress={progress}
              miniseries={miniseries}
              onToggle={handleItemTap}
              onToggleCommentary={null}
              coverCacheVersion={coverCache}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              recentItems={recentItems}
              recentEpisodeItems={recentEpisodeItems}
              progressLoading={recentLoading}
              episodesLoading={episodesLoading}
              upcomingCount={upcomingCount}
              activeTab={tabKey}
              genreResetRef={genreResetRef}
            />
          </>
        )}
      </CommunityTabSlider>

      <CommunityBottomNav
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(newTab) => {
          if (newTab === activeTab) return;
          sliderRef.current?.animateToTab(newTab);
          setActiveTab(newTab);
          setSearchQuery("");
        }}
        accent={accent}
      />

      {/* Film log modal */}
      {modalItem && (
        <NowPlayingLogModal
          item={modalItem}
          coverUrl={getCoverUrl(modalItem)}
          coverCacheVersion={coverCache}
          isCompleted={!!progress[modalItem.id]}
          progressData={progress[modalItem.id] || null}
          onLog={handleLog}
          onUnlog={handleUnlog}
          onWatchlist={handleWatchlist}
          userId={userId}
          miniseries={miniseries}
          onClose={() => setModalItem(null)}
          communityId={community.id}
          communitySubscriptions={communitySubscriptions}
          onToast={onToast}
          onShelvesChanged={onShelvesChanged}
          onNavigateCommunity={(slug, tmdbId) => {
            setModalItem(null);
            onBack();
            onOpenCommunity?.(slug, tmdbId);
          }}
        />
      )}

      {/* Badge celebration */}
      {celebrationBadge && (
        <BadgeCelebration
          badge={celebrationBadge}
          onClose={() => {
            const badge = celebrationBadge;
            setCelebrationBadge(null);
            setDetailBadge(badge);
          }}
        />
      )}

      {/* Badge detail screen */}
      {detailBadge && (
        <BadgeDetailScreen
          badge={detailBadge}
          userId={userId}
          earnedAt={new Date().toISOString()}
          onClose={() => setDetailBadge(null)}
        />
      )}

      {/* Badge collection page */}
      {showBadgePage && (
        <BadgePage
          badges={badges}
          earnedBadgeIds={earnedBadgeIds}
          badgeProgress={badgeProgress}
          userId={userId}
          accent={accent}
          onClose={() => setShowBadgePage(false)}
        />
      )}

      {/* Badge completion toast — shows above nav, tap to celebrate */}
      {completionToast && (
        <BadgeProgressToast
          badge={completionToast.badge}
          current={completionToast.current}
          total={completionToast.total}
          isComplete={true}
          visible={completionToast.visible}
          bottomOffset={hasBottomNav ? 80 : 24}
          onTap={handleCompletionToastTap}
        />
      )}

      {/* Podcast player FAB — moved to AudioPlayerProvider for global visibility */}

      {/* Admin: floating menu button */}
      <AdminFab
        userId={userId}
        accent={accent}
        onAddItem={() => setShowAddTool(true)}
        onRSSSync={() => setShowRSSSync(true)}
        bottomOffset={hasBottomNav ? 80 : 24}
      />

      {/* Admin: add item tool */}
      {showAddTool && (
        <AddItemTool
          community={community}
          miniseries={miniseries}
          session={session}
          onClose={() => setShowAddTool(false)}
          onToast={onToast}
          onAdded={(newItem) => {
            if (onShelvesChanged) onShelvesChanged();
          }}
        />
      )}

      {/* Admin: RSS sync tool */}
      {showRSSSync && (
        <RSSSyncTool
          community={community}
          miniseries={miniseries}
          session={session}
          onClose={() => setShowRSSSync(false)}
          onToast={onToast}
          onAdded={() => {
            if (onShelvesChanged) onShelvesChanged();
          }}
        />
      )}
    </div>
  );
}
