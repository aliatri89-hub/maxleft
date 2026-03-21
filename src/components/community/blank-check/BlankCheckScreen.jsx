import { useScrollToItem } from "../../../hooks/useScrollToItem";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { fetchCoversForItems, getCoverUrl } from "../../../utils/communityTmdb";
import { useCommunityProgress, useCommunityActions, useBadgeOrchestrator } from "../../../hooks/community";
import { isComingSoon } from "../../../utils/comingSoon";
import BadgeCelebration from "../shared/BadgeCelebration";
import BadgeProgressToast from "../shared/BadgeProgressToast";
import BadgeDetailScreen from "../shared/BadgeDetailScreen";
import BadgePage from "../shared/BadgePage";
import BlankCheckHero from "./BlankCheckHero";
import BlankCheckPatreonTab from "./BlankCheckPatreonTab";
import CommunityAwardsTab from "./CommunityAwardsTab";
import MiniseriesShelf from "../shared/MiniseriesShelf";
import BlankCheckItemCard from "./BlankCheckItemCard";
import BlankCheckLogModal from "./BlankCheckLogModal";
import CommunityBottomNav from "../shared/CommunityBottomNav";
import CommunityTabSlider from "../shared/CommunityTabSlider";
import CommunityFilter from "../shared/CommunityFilter";
import AddItemTool from "../dashboard/AddItemTool";
import AdminFab from "../dashboard/AdminFab";
import RSSSyncTool from "../dashboard/RSSSyncTool";
import { useAudioPlayer } from "../shared/AudioPlayerProvider";
import ComedyPointsToast from "../shared/ComedyPointsToast";
import { useComedyPoints } from "../../../hooks/community/useComedyPoints";
import { useRecentlyLogged } from "../../../hooks/community/useRecentlyLogged";
import { useRecentEpisodes } from "../../../hooks/community/useRecentEpisodes";

const DEFAULT_TABS = [{ key: "filmography", label: "Filmography", icon: "🎬" }];

/**
 * BlankCheckScreen — self-contained community screen for Blank Check with Griffin & David.
 *
 * Owns all tab routing, state, swipe gestures, and hero rendering.
 * Commentary toggle wiring lives here — it's BC-specific.
 * Changing this file never touches Now Playing or Big Picture.
 *
 * Props:
 *   community        — community_pages row
 *   miniseries       — all series for this community
 *   session          — supabase session
 *   onBack           — () => void
 *   onToast          — (msg) => void
 *   onShelvesChanged — () => void
 */
export default function BlankCheckScreen({ community, miniseries, session, onBack, onToast, onShelvesChanged, communitySubscriptions, onOpenCommunity, scrollToTmdbId, letterboxdSyncSignal }) {
  const userId = session?.user?.id;
  const accent = community?.theme_config?.accent || "#e94560";

  const { currentEp, isPlaying, minimize } = useAudioPlayer();
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  // Auto-minimize mini bar when leaving — but only if audio is paused
  useEffect(() => {
    return () => {
      if (!isPlayingRef.current) minimize();
    };
  }, [minimize]);

  const tabs = useMemo(() => {
    const t = community?.theme_config?.tabs;
    return t && Array.isArray(t) && t.length > 0 ? t : DEFAULT_TABS;
  }, [community]);

  const [activeTab, setActiveTab] = useState(() => tabs[0]?.key || "filmography");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const [filter, setFilter] = useState("all");
  const [mediaFilter, setMediaFilter] = useState(null);
  const [coverCache, setCoverCache] = useState({});
  const [modalItem, setModalItem] = useState(null);
  const [showAddTool, setShowAddTool] = useState(false);
  const [showRSSSync, setShowRSSSync] = useState(false);

  // ── Badge system ──────────────────────────────────────────
  const {
    badges, earnedBadgeIds, badgeProgress, checkForBadge, checkAllBadges,
    getBadgeForItem, revokeBadgeIfNeeded,
    celebrationBadge, setCelebrationBadge,
    detailBadge, setDetailBadge,
    badgeToasts, showBadgePage, setShowBadgePage,
    earnedCount, showSingleBadgeToast, showBadgeProgressToasts,
  } = useBadgeOrchestrator(community?.id, userId, letterboxdSyncSignal);

  // ── Comedy Points (Blank Check exclusive) ──────────────────
  const { checkAndAward: checkComedyPoints, comedyToast, dismissToast: dismissComedyToast } = useComedyPoints(userId);

  // Scroll to shelf when deep-linked from another community
  useScrollToItem(scrollToTmdbId, miniseries, accent, setActiveTab);

  // Reset on tab change
  useEffect(() => { setMediaFilter(null); setSearchQuery(""); setSearchOpen(false); }, [activeTab]);

  // ── Tab slider ref (for animated nav taps) ──────────────
  const sliderRef = useRef(null);
  const hasBottomNav = tabs.length > 1;

  // ── Data ──────────────────────────────────────────────────
  const allItems = useMemo(() => miniseries.flatMap(s => s.items || []), [miniseries]);
  const upcomingCount = useMemo(() => allItems.filter(i => isComingSoon(i)).length, [allItems]);

  // ── Flat upcoming schedule (all items sorted by air_date) ───
  const upcomingSchedule = useMemo(() => {
    if (filter !== "upcoming") return [];
    const filmSeries = miniseries.filter(s => !s.tab_key || s.tab_key === "filmography");
    const all = filmSeries.flatMap((s) =>
      (s.items || []).filter((i) => isComingSoon(i)).map((i) => ({ ...i, _shelfTitle: s.title }))
    );
    const seen = new Set();
    const deduped = all.filter((i) => {
      const key = `${i.title}::${i.year || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return deduped.sort((a, b) => (a.air_date || "").localeCompare(b.air_date || ""));
  }, [filter, miniseries]);

  const patreonItemIds = useMemo(() => {
    const ids = new Set();
    miniseries.filter(s => s.tab_key === "patreon").forEach(s => {
      (s.items || []).forEach(item => ids.add(item.id));
    });
    return ids;
  }, [miniseries]);

  const getHeroMiniseries = useCallback((tabKey) => {
    if (tabKey === "patreon") return miniseries.filter(s => s.tab_key === "patreon");
    if (tabKey === "awards") return [];
    return miniseries.filter(s => !s.tab_key || s.tab_key === "filmography");
  }, [miniseries]);

  const { progress, setProgress } = useCommunityProgress(community?.id, userId, allItems);
  const { logItem, logCommentaryOnly, unlogItem, addToWatchlist } = useCommunityActions(userId, setProgress);

  // ── Dynamic shelves ────────────────────────────────────────
  const { recentItems, loading: recentLoading } = useRecentlyLogged(community?.id, userId, allItems, progress);
  const { recentEpisodeItems, loading: episodesLoading } = useRecentEpisodes([], allItems, 10, "blankcheck", community?.theme_config?.episode_source);

  useEffect(() => {
    if (allItems.length === 0) return;
    fetchCoversForItems(allItems, setCoverCache);
  }, [allItems]);

  // ── Handlers ──────────────────────────────────────────────
  const handleItemTap = useCallback((itemId) => {
    const item = allItems.find(i => i.id === itemId);
    if (item) {
      if (item.title === "Suicide Squad") {
        new Audio("https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/NOTProf%20Krispy%20-%20twisted_sound_cue4.wav").play().catch(() => {});
      }
      if (item.title === "Unbreakable") {
        new Audio("https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/unbreakable.mp3").play().catch(() => {});
      }
      setModalItem(item);
    }
  }, [allItems]);

  const handleLog = useCallback(async (itemId, { rating, completed_at, listened_with_commentary, isUpdate }) => {
    const item = allItems.find(i => i.id === itemId);
    const coverUrl = item ? getCoverUrl(item) : null;
    await logItem(itemId, item, coverUrl, { rating, completed_at, listened_with_commentary, isUpdate });
    if (onToast) onToast(isUpdate ? "Updated!" : "Logged!");
    if (!isUpdate && onShelvesChanged) onShelvesChanged();

    // ── Badge check (only on fresh logs, not updates) ──
    if (!isUpdate && item) {
      const earnedBadge = await checkForBadge(itemId);

      if (earnedBadge) {
        const progress = badgeProgress[earnedBadge.id];
        showSingleBadgeToast({
          badge: earnedBadge,
          current: progress?.total || 14,
          total: progress?.total || 14,
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

      // ── Comedy Points check (fire-and-forget, doesn't block badge flow) ──
      checkComedyPoints(item);
    }
  }, [allItems, logItem, onToast, onShelvesChanged, checkForBadge, getBadgeForItem, badgeProgress, showSingleBadgeToast, checkComedyPoints]);

  const handleUnlog = useCallback(async (itemId) => {
    await revokeBadgeIfNeeded(itemId);
    await unlogItem(itemId);
    if (onToast) onToast("Removed from log");
  }, [unlogItem, onToast, revokeBadgeIfNeeded]);

  const handleWatchlist = useCallback(async (item, coverUrl) => {
    await addToWatchlist(item, coverUrl);
    if (onToast) onToast("Added to watch list!");
  }, [addToWatchlist, onToast]);

  // Commentary toggle — BC-specific, decoupled from film logging
  const handleToggleCommentary = useCallback(async (itemId, newValue) => {
    await logCommentaryOnly(itemId, newValue);
    if (onToast) onToast(newValue ? "Commentary logged!" : "Commentary removed");
  }, [logCommentaryOnly, onToast]);

  const isMediaVisible = useCallback((mediaType) => {
    if (!mediaFilter) return true;
    const [mode, type] = mediaFilter.split(":");
    if (type === "listened") return true;
    if (mode === "solo") return (mediaType || "film") === type;
    if (mode === "hide") return (mediaType || "film") !== type;
    return true;
  }, [mediaFilter]);

  return (
    <div style={{
      height: "100dvh", display: "flex", flexDirection: "column",
      background: "#0f0f1a", overflowX: "hidden",
    }}>
      {/* Back nav */}
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
        onTabChange={(key) => { setActiveTab(key); setSearchQuery(""); setSearchOpen(false); }}
        bottomPad={hasBottomNav ? 80 : 0}
      >
        {(tabKey) => (
          <>
            {/* Hero — hidden on awards tab */}
            {tabKey !== "awards" && (
              <BlankCheckHero
                community={community}
                miniseries={getHeroMiniseries(tabKey)}
                progress={progress}
                activeTab={tabKey}
                mediaFilter={mediaFilter}
                onMediaFilterChange={setMediaFilter}
              />
            )}

            {/* Patreon tab */}
            {tabKey === "patreon" && (
              <BlankCheckPatreonTab
                community={community}
                progress={progress}
                onToggle={handleItemTap}
                onToggleCommentary={handleToggleCommentary}
                miniseries={miniseries}
                coverCacheVersion={coverCache}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                mediaFilter={mediaFilter}
              />
            )}

            {/* Awards tab */}
            {tabKey === "awards" && (
              <CommunityAwardsTab
                community={community}
                session={session}
                progress={progress}
                miniseries={miniseries}
                onToggle={handleItemTap}
              />
            )}

            {/* Filmography tab (default) */}
            {tabKey !== "patreon" && tabKey !== "awards" && (
              <>
                {/* Search + Filter row */}
                <div style={{
                  padding: "10px 16px 0",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  {searchOpen ? (
                    /* Expanded search input — takes full row */
                    <div style={{ flex: 1, position: "relative" }}>
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search films, directors, years…"
                        style={{
                          width: "100%",
                          padding: "8px 36px 8px 34px",
                          background: "rgba(255,255,255,0.06)",
                          border: `1px solid ${accent}`,
                          borderRadius: 10,
                          color: "#fff",
                          fontSize: 14,
                          outline: "none",
                          boxSizing: "border-box",
                          fontFamily: "'Barlow Condensed', sans-serif",
                          letterSpacing: "0.01em",
                        }}
                      />
                      <span style={{
                        position: "absolute", left: 10, top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        display: "flex", alignItems: "center",
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </span>
                      <button
                        onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
                        style={{
                          position: "absolute", right: 8, top: "50%",
                          transform: "translateY(-50%)",
                          background: "rgba(255,255,255,0.1)", border: "none",
                          color: "#aaa", fontSize: 12, cursor: "pointer",
                          borderRadius: 20, width: 22, height: 22,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: 0, lineHeight: 1,
                        }}
                      >✕</button>
                    </div>
                  ) : (
                    /* Collapsed: filter pills + search icon on right */
                    <>
                      <div style={{ flex: 1 }}>
                        <CommunityFilter value={filter} onChange={setFilter} accent={accent} upcomingCount={upcomingCount} />
                      </div>
                      <button
                        onClick={() => {
                          setSearchOpen(true);
                          setTimeout(() => searchInputRef.current?.focus(), 50);
                        }}
                        style={{
                          flexShrink: 0,
                          width: 34, height: 34,
                          borderRadius: 10,
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer",
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>


                {/* Dynamic shelves — only on filmography tab with no search + no filter */}
                {!searchQuery.trim() && filter === "all" && (
                  <>
                    {recentItems.length > 0 && (
                      <MiniseriesShelf
                        key="recent-logged"
                        series={{ id: "recent-logged", title: "⏪ Recently Logged", items: recentItems }}
                        progress={progress}
                        onToggle={handleItemTap}
                        onToggleCommentary={handleToggleCommentary}
                        CardComponent={BlankCheckItemCard}
                        coverCacheVersion={coverCache}
                        filter="all"
                        hideTracker
                      />
                    )}
                    {recentEpisodeItems.length > 0 && (
                      <MiniseriesShelf
                        key="recent-episodes"
                        series={{ id: "recent-episodes", title: "🎙 New Episodes", items: recentEpisodeItems.map(r => r.item) }}
                        progress={progress}
                        onToggle={handleItemTap}
                        onToggleCommentary={handleToggleCommentary}
                        CardComponent={BlankCheckItemCard}
                        coverCacheVersion={coverCache}
                        filter="all"
                        hideTracker
                      />
                    )}
                  </>
                )}

                {filter === "upcoming" ? (
                  /* Flat date-sorted schedule for upcoming */
                  upcomingSchedule.length === 0 ? (
                    <div style={{
                      textAlign: "center", padding: "40px 0",
                      fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13,
                      color: "rgba(255,255,255,0.25)", fontStyle: "italic",
                    }}>No upcoming items</div>
                  ) : (
                    <div style={{ padding: "16px 0", overflow: "hidden" }}>
                      <div className="hide-scrollbar" style={{
                        display: "flex", overflowX: "auto", gap: 12,
                        paddingLeft: 16, paddingRight: 16,
                      }}>
                        {upcomingSchedule.map((item) => (
                          <div key={item.id} style={{ flexShrink: 0, width: 120 }}>
                            <BlankCheckItemCard
                              item={item}
                              isCompleted={!!progress[item.id]?.status}
                              onToggle={() => handleItemTap(item)}
                              coverCacheVersion={coverCache}
                            />
                            <div style={{
                              fontSize: 10, fontWeight: 700, color: "rgba(250,204,21,0.7)",
                              fontFamily: "'Barlow Condensed', sans-serif",
                              letterSpacing: "0.04em", textTransform: "uppercase",
                              marginTop: 4,
                            }}>
                              {new Date(item.air_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </div>
                            <div style={{
                              fontSize: 9, color: "#666", marginTop: 1,
                              fontFamily: "'Barlow Condensed', sans-serif",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {item._shelfTitle}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ) : (
                <div style={{ paddingTop: 8 }}>
                  {miniseries.filter(s => !s.tab_key || s.tab_key === "filmography").map((s) => {
                    const q = searchQuery.trim().toLowerCase();
                    let items = (s.items || []).filter(i => isMediaVisible(i.media_type));
                    if (q.length >= 2) {
                      const seriesMatch =
                        s.title.toLowerCase().includes(q) ||
                        (s.director_name || "").toLowerCase().includes(q);
                      if (!seriesMatch) {
                        items = items.filter(i =>
                          i.title.toLowerCase().includes(q) ||
                          (i.creator || "").toLowerCase().includes(q) ||
                          String(i.year || "").includes(q)
                        );
                      }
                    }
                    if (items.length === 0) return null;
                    return (
                      <MiniseriesShelf
                        key={s.id}
                        series={{ ...s, items }}
                        progress={progress}
                        onToggle={handleItemTap}
                        onToggleCommentary={handleToggleCommentary}
                        CardComponent={BlankCheckItemCard}
                        coverCacheVersion={coverCache}
                        filter={filter}
                        shelfCap={10}
                        accent={accent}
                      />
                    );
                  })}
                </div>
                )}
                {searchQuery.trim().length >= 2 &&
                  miniseries.filter(s => !s.tab_key || s.tab_key === "filmography").every((s) => {
                    const q = searchQuery.trim().toLowerCase();
                    const seriesMatch = s.title.toLowerCase().includes(q) || (s.director_name || "").toLowerCase().includes(q);
                    const items = (s.items || []).filter(i => isMediaVisible(i.media_type));
                    return !seriesMatch && !items.some(i =>
                      i.title.toLowerCase().includes(q) || (i.creator || "").toLowerCase().includes(q) || String(i.year || "").includes(q)
                    );
                  }) && (
                    <div style={{ textAlign: "center", padding: "40px 16px", color: "#555", fontSize: 14 }}>
                      No results for "{searchQuery.trim()}"
                    </div>
                  )
                }
              </>
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
          setSearchOpen(false);
        }}
        accent={accent}
      />

      {modalItem && (
        <BlankCheckLogModal
          item={modalItem}
          coverUrl={getCoverUrl(modalItem)}
          isCompleted={progress[modalItem.id]?.status === "completed"}
          progressData={progress[modalItem.id] || null}
          isPatreon={patreonItemIds.has(modalItem.id)}
          coverCacheVersion={coverCache}
          onLog={handleLog}
          onUnlog={handleUnlog}
          onWatchlist={handleWatchlist}
          onToggleCommentary={handleToggleCommentary}
          onClose={() => setModalItem(null)}
          userId={userId}
          miniseries={miniseries}
          communityId={community.id}
          communitySubscriptions={communitySubscriptions}
          onNavigateCommunity={(slug, tmdbId) => {
            setModalItem(null);
            onBack();
            onOpenCommunity?.(slug, tmdbId);
          }}
          onToast={onToast}
          onShelvesChanged={onShelvesChanged}
        />
      )}

      <AdminFab
        userId={userId}
        accent={accent}
        onAddItem={() => setShowAddTool(true)}
        onRSSSync={() => setShowRSSSync(true)}
        bottomOffset={hasBottomNav ? 80 : 24}
      />

      {showAddTool && (
        <AddItemTool
          community={community}
          miniseries={miniseries}
          session={session}
          onClose={() => setShowAddTool(false)}
          onToast={onToast}
          onAdded={() => { if (onShelvesChanged) onShelvesChanged(); }}
        />
      )}

      {showRSSSync && (
        <RSSSyncTool
          community={community}
          miniseries={miniseries}
          session={session}
          onClose={() => setShowRSSSync(false)}
          onToast={onToast}
          onAdded={() => { if (onShelvesChanged) onShelvesChanged(); }}
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

      {/* Comedy Points toast (BC exclusive) */}
      {comedyToast && (
        <ComedyPointsToast
          points={comedyToast.points}
          visible={comedyToast.visible}
          onDone={dismissComedyToast}
        />
      )}
    </div>
  );
}
