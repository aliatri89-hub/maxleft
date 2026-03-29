import { t } from "../../../theme";
import { useScrollToItem } from "../../../hooks/useScrollToItem";
import { useBackGesture } from "../../../hooks/useBackGesture";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { fetchCoversForItems, getCoverUrl } from "../../../utils/communityTmdb";
import { useCommunityProgress, useCommunityActions, useBadgeOrchestrator } from "../../../hooks/community";
import { bustCommunityCache } from "../../../hooks/community/useCommunityPage";
import { isComingSoon } from "../../../utils/comingSoon";
import BadgeCelebration from "../shared/BadgeCelebration";
import BadgeProgressToast from "../shared/BadgeProgressToast";
import BadgeDetailScreen from "../shared/BadgeDetailScreen";
import BadgePage from "../shared/BadgePage";
import BlankCheckHero from "./BlankCheckHero";
import BlankCheckPatreonTab from "./BlankCheckPatreonTab";
import CommunityAwardsTab from "./CommunityAwardsTab";
import MiniseriesShelf from "../shared/MiniseriesShelf";
import MiniseriesGrid from "../shared/MiniseriesGrid";
import SeriesDetailView from "../shared/SeriesDetailView";
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
export default function BlankCheckScreen({ community, miniseries, session, onBack, onToast, onShelvesChanged, communitySubscriptions, onOpenCommunity, scrollToTmdbId, letterboxdSyncSignal, pushNav, removeNav, popNav }) {
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
  const [selectedSeries, setSelectedSeries] = useState(null);

  // ── Position overrides (admin image positioner saves) ──────
  // Merges saved thumbnail_position changes into miniseries so the grid
  // reflects new positions immediately without waiting for a re-fetch.
  const [positionOverrides, setPositionOverrides] = useState({});
  const effectiveMiniseries = useMemo(() => {
    if (Object.keys(positionOverrides).length === 0) return miniseries;
    return miniseries.map((s) =>
      positionOverrides[s.id]
        ? { ...s, thumbnail_position: positionOverrides[s.id] }
        : s
    );
  }, [miniseries, positionOverrides]);

  // ── Badge system ──────────────────────────────────────────
  const {
    badges, earnedBadgeIds, badgeProgress, checkForBadge, checkAllBadges,
    getBadgeForItem, revokeBadgeIfNeeded,
    celebrationBadge, setCelebrationBadge,
    detailBadge, setDetailBadge,
    completionToast, showBadgePage, setShowBadgePage,
    earnedCount, showCompletionToast, handleCompletionToastTap,
  } = useBadgeOrchestrator(community?.id, userId, letterboxdSyncSignal);

  // ── Comedy Points (Blank Check exclusive) ──────────────────
  const { checkAndAward: checkComedyPoints, comedyToast, dismissToast: dismissComedyToast } = useComedyPoints(userId);

  // Scroll to shelf when deep-linked from another community
  useScrollToItem(scrollToTmdbId, miniseries, accent, setActiveTab);

  // ── Back gesture handlers (Android / swipe) ──────────────────
  useBackGesture("bcSeriesDetail", !!selectedSeries, () => setSelectedSeries(null), pushNav, removeNav);
  useBackGesture("bcLogModal", !!modalItem, () => setModalItem(null), pushNav, removeNav);
  useBackGesture("bcBadgeDetail", !!detailBadge, () => setDetailBadge(null), pushNav, removeNav);
  useBackGesture("bcBadgePage", showBadgePage, () => setShowBadgePage(false), pushNav, removeNav);
  useBackGesture("bcTab", activeTab !== (tabs[0]?.key || "filmography"), () => { sliderRef.current?.animateToTab(tabs[0]?.key || "filmography"); setActiveTab(tabs[0]?.key || "filmography"); }, pushNav, removeNav);

  // Reset on tab change
  useEffect(() => { setMediaFilter(null); setSearchQuery(""); setSearchOpen(false); setSelectedSeries(null); }, [activeTab]);

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
        showCompletionToast(earnedBadge);
      }
      // Progress notifications handled by notification center (no toasts)

      // ── Comedy Points check (fire-and-forget, doesn't block badge flow) ──
      checkComedyPoints(item);
    }
  }, [allItems, logItem, onToast, onShelvesChanged, checkForBadge, showCompletionToast, checkComedyPoints]);

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
      background: t.bgPrimary, overflowX: "hidden",
      paddingTop: "env(safe-area-inset-top, 0px)",
    }}>
      {/* Back nav */}
      <div style={{
        flexShrink: 0, zIndex: 10,
        background: "rgba(15,13,11,0.95)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 8,
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <button onClick={popNav} style={{
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
                  stroke={earnedCount > 0 ? "#22c55e" : t.textFaint}
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

            {/* Patreon tab — Grid view (same pattern as filmography) */}
            {tabKey === "patreon" && (
              <>
                {/* Search + Filter row */}
                <div style={{
                  padding: "10px 16px 0",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  {searchOpen ? (
                    <div style={{ flex: 1, position: "relative" }}>
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search commentaries…"
                        style={{
                          width: "100%",
                          padding: "8px 36px 8px 34px",
                          background: t.bgInput,
                          border: `1px solid ${accent}`,
                          borderRadius: 10,
                          color: t.textPrimary,
                          fontSize: 14,
                          outline: "none",
                          boxSizing: "border-box",
                          fontFamily: t.fontDisplay,
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
                          color: t.textMuted, fontSize: 12, cursor: "pointer",
                          borderRadius: 20, width: 22, height: 22,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: 0, lineHeight: 1,
                        }}
                      >✕</button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", gap: 5, flex: 1 }}>
                        {[
                          { key: "all", label: "All" },
                          { key: "inprogress", label: "In Progress" },
                          { key: "done", label: "Done" },
                          { key: "notstarted", label: "Not Started" },
                        ].map(f => (
                          <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            style={{
                              padding: "5px 10px",
                              background: filter === f.key ? `${accent}22` : "rgba(255,255,255,0.05)",
                              border: filter === f.key ? `1px solid ${accent}` : "1px solid rgba(255,255,255,0.08)",
                              borderRadius: 20,
                              color: filter === f.key ? accent : t.textMuted,
                              fontSize: 11, fontWeight: 600, cursor: "pointer",
                              fontFamily: t.fontDisplay,
                              letterSpacing: "0.03em",
                              textTransform: "uppercase",
                              transition: "all 0.2s",
                              WebkitTapHighlightColor: "transparent",
                            }}
                          >{f.label}</button>
                        ))}
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
                          background: t.bgInput,
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

                {/* Patreon Miniseries Grid */}
                <MiniseriesGrid
                  miniseries={effectiveMiniseries.filter(s => s.tab_key === "patreon")}
                  progress={progress}
                  onSelectSeries={setSelectedSeries}
                  accent={accent}
                  searchQuery={searchQuery}
                  filter={filter}
                  userId={userId}
                />
              </>
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

            {/* Filmography tab (default) — Grid view */}
            {tabKey !== "patreon" && tabKey !== "awards" && (
              <>
                {/* Search + Filter row */}
                <div style={{
                  padding: "10px 16px 0",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  {searchOpen ? (
                    <div style={{ flex: 1, position: "relative" }}>
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search films, directors, series…"
                        style={{
                          width: "100%",
                          padding: "8px 36px 8px 34px",
                          background: t.bgInput,
                          border: `1px solid ${accent}`,
                          borderRadius: 10,
                          color: t.textPrimary,
                          fontSize: 14,
                          outline: "none",
                          boxSizing: "border-box",
                          fontFamily: t.fontDisplay,
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
                          color: t.textMuted, fontSize: 12, cursor: "pointer",
                          borderRadius: 20, width: 22, height: 22,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: 0, lineHeight: 1,
                        }}
                      >✕</button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", gap: 5, flex: 1 }}>
                        {[
                          { key: "all", label: "All" },
                          { key: "inprogress", label: "In Progress" },
                          { key: "done", label: "Done" },
                          { key: "notstarted", label: "Not Started" },
                        ].map(f => (
                          <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            style={{
                              padding: "5px 10px",
                              background: filter === f.key ? `${accent}22` : "rgba(255,255,255,0.05)",
                              border: filter === f.key ? `1px solid ${accent}` : "1px solid rgba(255,255,255,0.08)",
                              borderRadius: 20,
                              color: filter === f.key ? accent : t.textMuted,
                              fontSize: 11, fontWeight: 600, cursor: "pointer",
                              fontFamily: t.fontDisplay,
                              letterSpacing: "0.03em",
                              textTransform: "uppercase",
                              transition: "all 0.2s",
                              WebkitTapHighlightColor: "transparent",
                            }}
                          >{f.label}</button>
                        ))}
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
                          background: t.bgInput,
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

                {/* Miniseries Grid */}
                <MiniseriesGrid
                  miniseries={effectiveMiniseries.filter(s => !s.tab_key || s.tab_key === "filmography")}
                  progress={progress}
                  onSelectSeries={setSelectedSeries}
                  accent={accent}
                  searchQuery={searchQuery}
                  filter={filter}
                  userId={userId}
                />
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

      {/* Series detail view (slides in from grid) */}
      {selectedSeries && (
        <SeriesDetailView
          series={selectedSeries}
          progress={progress}
          onItemTap={handleItemTap}
          onToggleCommentary={handleToggleCommentary}
          onBack={() => setSelectedSeries(null)}
          CardComponent={BlankCheckItemCard}
          coverCacheVersion={coverCache}
          accent={accent}
          userId={userId}
          communitySlug={community?.slug}
          onPositionSaved={(seriesId, newPos) => {
            setSelectedSeries(prev => prev?.id === seriesId
              ? { ...prev, thumbnail_position: newPos }
              : prev
            );
            // Track override so the grid updates immediately
            setPositionOverrides(prev => ({ ...prev, [seriesId]: newPos }));
            // Bust community cache so re-entering loads the new position
            if (community?.slug) bustCommunityCache(community.slug);
          }}
        />
      )}

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
