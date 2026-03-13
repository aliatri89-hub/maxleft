import { useState, useEffect, useMemo, useCallback, useRef } from "react";

import { useScrollToItem } from "../../../hooks/useScrollToItem";
import { useCommunityProgress, useCommunityActions, useBadges } from "../../../hooks/community";
import { fetchCoversForItems, getCoverUrl, getCoverCacheSnapshot } from "../../../utils/communityTmdb";
import NowPlayingHero from "./NowPlayingHero";
import NowPlayingGenreTab from "./NowPlayingGenreTab";
import NowPlayingArcadeTab from "./NowPlayingArcadeTab";
import NowPlayingBooksTab from "./NowPlayingBooksTab";
import NowPlayingLogModal from "./NowPlayingLogModal";
import NowPlayingGameLogModal from "./NowPlayingGameLogModal";
import { useNowPlayingGameBridge } from "../../../hooks/community/useNowPlayingGameBridge";
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
 * Tabs: filmography (genre view) + arcade (video game movies & games) + books (Books & Nachos)
 * Hero: NowPlayingHero (films + books + games, no commentary tracking)
 * Rating style: host verdict arrows (up/down on item cards via extra_data)
 *
 * Props passed from CommunityRouter:
 *   community, miniseries, session, onBack, onToast, onShelvesChanged
 */
export default function NowPlayingScreen({ community, miniseries, session, onBack, onToast, onShelvesChanged, communitySubscriptions, onOpenCommunity, scrollToTmdbId, letterboxdSyncSignal }) {
  const userId = session?.user?.id;
  const accent = community?.theme_config?.accent || "#e94560";
  const rssUrl = community?.theme_config?.rss_url || "https://www.nowplayingpodcast.com/NPP.xml";

  // Load podcast episodes into the global audio player
  const { loadEpisodes, episodes, currentEp, isPlaying, minimize } = useAudioPlayer();
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  useEffect(() => {
    loadEpisodes(rssUrl, {
      community: "Now Playing Podcast",
      artwork: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/1200x1200bf-60.jpg",
    });
  }, [rssUrl, loadEpisodes]);

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
  const [mediaFilter, setMediaFilter] = useState(null);
  const [coverCache, setCoverCache] = useState(() => getCoverCacheSnapshot());
  const [modalItem, setModalItem] = useState(null);
  const [showAddTool, setShowAddTool] = useState(false);
  const [showRSSSync, setShowRSSSync] = useState(false);

  // Scroll to shelf when deep-linked from another community
  useScrollToItem(scrollToTmdbId, miniseries, accent, setActiveTab);

  useEffect(() => { setMediaFilter(null); }, [activeTab]);

  const hasBottomNav = tabs.length >= 1;

  // ── Badge system ──────────────────────────────────────────
  const {
    badges, earnedBadgeIds, badgeProgress, checkForBadge, checkAllBadges,
    getBadgeForItem, revokeBadgeIfNeeded, loading: badgesLoading,
  } = useBadges(community?.id, userId);

  const [celebrationBadge, setCelebrationBadge] = useState(null);
  const [detailBadge, setDetailBadge] = useState(null);
  const [badgeToasts, setBadgeToasts] = useState([]); // [{badge, current, total, isComplete, visible}]
  const badgeToastTimers = useRef([]);
  const [showBadgePage, setShowBadgePage] = useState(false);

  // Count only badges earned in THIS community (earnedBadgeIds may include other communities)
  const earnedCount = useMemo(() => badges.filter(b => earnedBadgeIds.has(b.id)).length, [badges, earnedBadgeIds]);

  // Helper: clear all toast timers
  const clearBadgeToastTimers = () => {
    badgeToastTimers.current.forEach(t => clearTimeout(t));
    badgeToastTimers.current = [];
  };

  // Helper: show a single badge toast (used by handleLog)
  const showSingleBadgeToast = useCallback((toastData, { delayToCelebration, celebrationBadge: celBadge } = {}) => {
    clearBadgeToastTimers();
    setBadgeToasts([{ ...toastData, visible: false }]);

    const t0 = setTimeout(() => {
      setBadgeToasts(prev => prev.map(t => ({ ...t, visible: true })));
    }, 50);
    badgeToastTimers.current.push(t0);

    const displayTime = delayToCelebration ? 2000 : 3000;
    const t1 = setTimeout(() => {
      setBadgeToasts(prev => prev.map(t => ({ ...t, visible: false })));
    }, displayTime);
    badgeToastTimers.current.push(t1);

    const t2 = setTimeout(() => {
      setBadgeToasts([]);
      if (delayToCelebration && celBadge) setCelebrationBadge(celBadge);
    }, displayTime + 500);
    badgeToastTimers.current.push(t2);
  }, []);

  // Helper: show stacked badge progress toasts (used by mount + sync signal)
  const showBadgeProgressToasts = useCallback(() => {
    const toasts = [];
    for (const b of badges) {
      if (earnedBadgeIds.has(b.id)) continue;
      const bp = badgeProgress[b.id];
      if (!bp || bp.current === 0) continue;
      toasts.push({ badge: b, current: bp.current, total: bp.total, isComplete: false });
    }
    if (!toasts.length) return;

    toasts.sort((a, b) => (b.current / b.total) - (a.current / a.total));
    const capped = toasts.slice(0, 3);

    clearBadgeToastTimers();
    setBadgeToasts(capped.map(t => ({ ...t, visible: false })));

    // Stagger entrance
    capped.forEach((_, i) => {
      const tid = setTimeout(() => {
        setBadgeToasts(prev => prev.map((t, j) => j === i ? { ...t, visible: true } : t));
      }, i * 350);
      badgeToastTimers.current.push(tid);
    });

    // Stagger dismissal
    capped.forEach((_, i) => {
      const tid = setTimeout(() => {
        setBadgeToasts(prev => prev.map((t, j) => j === i ? { ...t, visible: false } : t));
      }, 4000 + i * 250);
      badgeToastTimers.current.push(tid);
    });

    const tidClear = setTimeout(() => setBadgeToasts([]), 4000 + capped.length * 250 + 600);
    badgeToastTimers.current.push(tidClear);
  }, [badges, earnedBadgeIds, badgeProgress]);

  // Auto-check badges on load (catches completions from dashboard/sync)
  const badgeAutoChecked = useRef(false);
  useEffect(() => {
    if (badgeAutoChecked.current || badgesLoading || badges.length === 0) return;
    badgeAutoChecked.current = true;
    checkAllBadges().then(earned => {
      if (earned.length > 0) {
        setCelebrationBadge(earned[0]);
      }
    });
  }, [badgesLoading, badges.length, checkAllBadges]);

  // Re-check badges when Letterboxd sync completes while user is in this screen
  const prevSyncSignal = useRef(letterboxdSyncSignal);
  useEffect(() => {
    if (!letterboxdSyncSignal || letterboxdSyncSignal === prevSyncSignal.current) return;
    prevSyncSignal.current = letterboxdSyncSignal;
    checkAllBadges().then(earned => {
      if (earned.length > 0) {
        setCelebrationBadge(earned[0]);
      } else {
        showBadgeProgressToasts();
      }
    });
  }, [letterboxdSyncSignal, checkAllBadges, showBadgeProgressToasts]);

  // ── Tab slider ref (for animated nav taps) ──────────────
  const sliderRef = useRef(null);

  // ── Data ──────────────────────────────────────────────────
  const allItems = useMemo(() => miniseries.flatMap(s => s.items || []), [miniseries]);


  const { progress, setProgress } = useCommunityProgress(community?.id, userId, allItems);
  const { logItem, unlogItem, addToWatchlist } = useCommunityActions(userId, setProgress);

  // ── Game bridge (dual-write to games table + Steam sync) ───
  const gameItems = useMemo(() => allItems.filter(i => i.media_type === "game"), [allItems]);

  const {
    gameProgress, logGameItem, unlogGameItem, addToBacklog,
    userOwnsGame, getSteamStats, steamLoading,
  } = useNowPlayingGameBridge(community?.id, userId, gameItems);

  // Merged progress: films/books from standard hook, games from bridge
  const mergedProgress = useMemo(() => ({ ...progress, ...gameProgress }), [progress, gameProgress]);

  // ── Dynamic shelves ────────────────────────────────────────
  const { recentItems, loading: recentLoading } = useRecentlyLogged(community?.id, userId, allItems, progress, "film");
  const { recentEpisodeItems, loading: episodesLoading } = useRecentEpisodes(episodes, allItems, 10);

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

  const handleLog = useCallback(async (itemId, { rating, notes, completed_at, listened_with_commentary, brown_arrow, isUpdate }) => {
    const item = allItems.find(i => i.id === itemId);
    const coverUrl = item ? getCoverUrl(item) : null;
    await logItem(itemId, item, coverUrl, { rating, notes, completed_at, listened_with_commentary, brown_arrow, isUpdate });

    const typeLabel = item?.media_type === "film" ? "🎬" : item?.media_type === "book" ? "📚" : "🎮";
    if (onToast) onToast(isUpdate ? `Updated! ${typeLabel}` : `Shelf'd! ${typeLabel}`);
    if (!isUpdate && onShelvesChanged) onShelvesChanged();

    // ── Badge check (only on fresh logs, not updates) ──
    if (!isUpdate && item) {
      const earnedBadge = await checkForBadge(itemId);

      if (earnedBadge) {
        // Badge completed! Show toast briefly, then celebration
        const progress = badgeProgress[earnedBadge.id];
        showSingleBadgeToast({
          badge: earnedBadge,
          current: progress?.total || 13,
          total: progress?.total || 13,
          isComplete: true,
        }, { delayToCelebration: true, celebrationBadge: earnedBadge });
      } else {
        // Check if this item contributes to any badge (show progress toast)
        const miniseriesId = item.miniseries_id;
        if (miniseriesId) {
          const badge = getBadgeForItem(itemId, miniseriesId, item.media_type);
          if (badge) {
            const bp = badgeProgress[badge.id];
            if (bp && !bp.complete) {
              showSingleBadgeToast({
                badge,
                current: bp.current + 1, // optimistic +1
                total: bp.total,
                isComplete: false,
              });
            }
          }
        }
      }
    }
  }, [allItems, logItem, onToast, onShelvesChanged, checkForBadge, getBadgeForItem, badgeProgress, showSingleBadgeToast]);

  const handleUnlog = useCallback(async (itemId) => {
    await revokeBadgeIfNeeded(itemId);
    await unlogItem(itemId);
    if (onToast) onToast("Removed from log");
  }, [unlogItem, onToast, revokeBadgeIfNeeded]);

  const handleWatchlist = useCallback(async (item, coverUrl) => {
    await addToWatchlist(item, coverUrl);
    const label = item.media_type === "film" ? "watch list" : item.media_type === "book" ? "reading list" : "play list";
    if (onToast) onToast(`Added to ${label}! 👁`);
  }, [addToWatchlist, onToast]);

  // ── Game-specific handlers (dual-write via bridge) ────────
  const handleGameLog = useCallback(async (itemId, opts) => {
    const item = allItems.find(i => i.id === itemId);
    const coverUrl = item ? getCoverUrl(item) : null;
    await logGameItem(itemId, item, coverUrl, opts);

    if (onToast) onToast(opts.isUpdate ? "Updated! 🎮" : "Shelf'd! 🎮");
    if (!opts.isUpdate && onShelvesChanged) onShelvesChanged();

    // Badge check on fresh game logs
    if (!opts.isUpdate && item) {
      const earnedBadge = await checkForBadge(itemId);
      if (earnedBadge) {
        const bp = badgeProgress[earnedBadge.id];
        showSingleBadgeToast({
          badge: earnedBadge,
          current: bp?.total || 13,
          total: bp?.total || 13,
          isComplete: true,
        }, { delayToCelebration: true, celebrationBadge: earnedBadge });
      } else {
        const miniseriesId = item.miniseries_id;
        if (miniseriesId) {
          const badge = getBadgeForItem(itemId, miniseriesId, item.media_type);
          if (badge) {
            const bp = badgeProgress[badge.id];
            if (bp && !bp.complete) {
              showSingleBadgeToast({
                badge,
                current: bp.current + 1,
                total: bp.total,
                isComplete: false,
              });
            }
          }
        }
      }
    }
  }, [allItems, logGameItem, onToast, onShelvesChanged, checkForBadge, getBadgeForItem, badgeProgress, showSingleBadgeToast]);

  const handleGameUnlog = useCallback(async (itemId) => {
    await revokeBadgeIfNeeded(itemId);
    await unlogGameItem(itemId);
    if (onToast) onToast("Removed from log");
  }, [unlogGameItem, onToast, revokeBadgeIfNeeded]);

  const handleGameWatchlist = useCallback(async (item, coverUrl) => {
    await addToBacklog(item, coverUrl);
    if (onToast) onToast("Added to play list! 🎮");
  }, [addToBacklog, onToast]);

  // ── Compute hero miniseries per tab ─────────────────────
  const getHeroMiniseries = useCallback((tabKey) => {
    if (tabKey === "arcade") return miniseries.filter(s =>
      s.tab_key === "arcade" || (s.genre_bucket === "video_games" && (!s.tab_key || s.tab_key === "filmography"))
    );
    if (tabKey === "books") return miniseries.filter(s => s.tab_key === "books");
    return miniseries.filter(s => !s.tab_key || s.tab_key === "filmography");
  }, [miniseries]);

  return (
    <div style={{
      height: "100dvh", display: "flex", flexDirection: "column",
      background: "#0f0f1a", overflowX: "hidden",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&display=swap');`}</style>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes skeletonPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.15; } }
      `}</style>

      {/* Header */}
      <div style={{
        flexShrink: 0, zIndex: 10,
        background: "rgba(15,15,26,0.95)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 8,
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", color: accent,
          fontSize: 15, cursor: "pointer", padding: "4px 8px 4px 0", fontWeight: 600,
        }}>← Back</button>
        <div style={{
          fontSize: 14, fontWeight: 700, color: "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
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
                color: earnedCount > 0 ? "#ffffffcc" : "#ffffff40",
                fontFamily: "'Barlow Condensed', sans-serif",
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
            <NowPlayingHero
              community={community}
              miniseries={getHeroMiniseries(tabKey)}
              progress={mergedProgress}
              activeTab={tabKey}
              filter={filter}
              onFilterChange={setFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
            {tabKey === "arcade" && (
              <NowPlayingArcadeTab
                community={community}
                session={session}
                progress={mergedProgress}
                miniseries={miniseries}
                onToggle={handleItemTap}
                coverCacheVersion={coverCache}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filter={filter}
                onFilterChange={setFilter}
              />
            )}
            {tabKey === "books" && (
              <NowPlayingBooksTab
                community={community}
                session={session}
                progress={mergedProgress}
                miniseries={miniseries}
                onToggle={handleItemTap}
                coverCacheVersion={coverCache}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filter={filter}
                onFilterChange={setFilter}
              />
            )}
            {tabKey !== "arcade" && tabKey !== "books" && (
              <NowPlayingGenreTab
                community={community}
                filter={filter}
                onFilterChange={setFilter}
                session={session}
                progress={mergedProgress}
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
              />
            )}
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

      {/* Game log modal (media_type === "game") */}
      {modalItem && modalItem.media_type === "game" && (
        <NowPlayingGameLogModal
          item={modalItem}
          coverUrl={getCoverUrl(modalItem)}
          isCompleted={!!mergedProgress[modalItem.id]}
          progressData={mergedProgress[modalItem.id] || null}
          steamStats={getSteamStats(modalItem.id)}
          userOwnsGame={userOwnsGame(modalItem.id)}
          onLog={handleGameLog}
          onUnlog={handleGameUnlog}
          onWatchlist={handleGameWatchlist}
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

      {/* Film / book / show log modal */}
      {modalItem && modalItem.media_type !== "game" && (
        <NowPlayingLogModal
          item={modalItem}
          coverUrl={getCoverUrl(modalItem)}
          coverCacheVersion={coverCache}
          isCompleted={!!mergedProgress[modalItem.id]}
          progressData={mergedProgress[modalItem.id] || null}
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

      {/* Badge progress toasts (stacked) */}
      {badgeToasts.map((t, i) => (
        <BadgeProgressToast
          key={`badge-toast-${t.badge?.id || i}`}
          badge={t.badge}
          current={t.current}
          total={t.total}
          isComplete={t.isComplete}
          visible={t.visible}
          bottomOffset={24 + i * 82}
        />
      ))}

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
