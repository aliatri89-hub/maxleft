import { useScrollToItem } from "../../../hooks/useScrollToItem";
import { useBackGesture } from "../../../hooks/useBackGesture";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { fetchCoversForItems, getCoverUrl } from "../../../utils/communityTmdb";
import { useCommunityProgress, useCommunityActions } from "../../../hooks/community";
import BigPictureHero from "./BigPictureHero";
import BigPictureFilmographyTab from "./BigPictureFilmographyTab";
import CommunityDraftsTab from "./CommunityDraftsTab";
import BigPictureLogModal from "./BigPictureLogModal";
import CommunityBottomNav from "../shared/CommunityBottomNav";
import AddItemTool from "../dashboard/AddItemTool";
import AdminFab from "../dashboard/AdminFab";
import RSSSyncTool from "../dashboard/RSSSyncTool";

const DEFAULT_TABS = [{ key: "filmography", label: "Filmography", icon: "🎬" }];

/**
 * BigPictureScreen — self-contained community screen for The Big Picture.
 *
 * Films only. Two tabs: filmography (via BigPictureFilmographyTab) and drafts.
 * No commentary tracking, no games, no books.
 * Changing this file never touches Now Playing or Blank Check.
 *
 * Props:
 *   community        — community_pages row
 *   miniseries       — all series for this community
 *   session          — supabase session
 *   onBack           — () => void
 *   onToast          — (msg) => void
 *   onShelvesChanged — () => void
 */
export default function BigPictureScreen({ community, miniseries, session, onBack, onToast, onShelvesChanged, communitySubscriptions, onOpenCommunity, scrollToTmdbId, pushNav, removeNav }) {
  const userId = session?.user?.id;
  const accent = community?.theme_config?.accent || "#e94560";

  const tabs = useMemo(() => {
    const t = community?.theme_config?.tabs;
    return t && Array.isArray(t) && t.length > 0 ? t : DEFAULT_TABS;
  }, [community]);

  const [activeTab, setActiveTab] = useState(() => tabs[0]?.key || "filmography");
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaFilter, setMediaFilter] = useState(null);
  const [filter, setFilter] = useState("all");
  const [coverCache, setCoverCache] = useState({});
  const [modalItem, setModalItem] = useState(null);
  const [showAddTool, setShowAddTool] = useState(false);
  const [showRSSSync, setShowRSSSync] = useState(false);

  // ── Android back gesture → close modals ─────────────────
  useBackGesture("communityLogModal", !!modalItem, () => setModalItem(null), pushNav, removeNav);
  useBackGesture("communityAddTool", showAddTool, () => setShowAddTool(false), pushNav, removeNav);
  useBackGesture("communityRSSSync", showRSSSync, () => setShowRSSSync(false), pushNav, removeNav);
  useBackGesture("communityTab", activeTab !== (tabs[0]?.key || "filmography"), () => setActiveTab(tabs[0]?.key || "filmography"), pushNav, removeNav);

  // Scroll to shelf when deep-linked from another community
  useScrollToItem(scrollToTmdbId, miniseries, accent, setActiveTab);

  // Reset on tab change
  useEffect(() => { setMediaFilter(null); setSearchQuery(""); setFilter("all"); }, [activeTab]);

  // ── Swipe gestures ────────────────────────────────────────
  const touchRef = useRef({ startX: 0, startY: 0, startTime: 0, blocked: false });
  const [slideDir, setSlideDir] = useState(null);
  const [swiping, setSwiping] = useState(false);
  const [dragX, setDragX] = useState(0);
  const hasBottomNav = tabs.length > 1;

  const switchTab = useCallback((direction) => {
    const idx = tabs.findIndex(t => t.key === activeTab);
    const nextIdx = direction === "left" ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= tabs.length) return false;
    setSlideDir(direction);
    setTimeout(() => { setActiveTab(tabs[nextIdx].key); setSlideDir(null); }, 200);
    return true;
  }, [activeTab, tabs]);

  const handleTouchStart = useCallback((e) => {
    let el = e.target;
    while (el && el !== e.currentTarget) {
      if (el.scrollWidth > el.clientWidth + 4) {
        touchRef.current = { startX: 0, startY: 0, startTime: 0, blocked: true };
        setDragX(0); setSwiping(false); return;
      }
      el = el.parentElement;
    }
    const t = e.touches[0];
    touchRef.current = { startX: t.clientX, startY: t.clientY, startTime: Date.now(), blocked: false };
    setDragX(0); setSwiping(false);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (touchRef.current.blocked) return;
    const dx = e.touches[0].clientX - touchRef.current.startX;
    const dy = e.touches[0].clientY - touchRef.current.startY;
    if (!swiping && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) setSwiping(true);
    if (swiping) {
      const idx = tabs.findIndex(t => t.key === activeTab);
      const atStart = idx === 0 && dx > 0;
      const atEnd = idx === tabs.length - 1 && dx < 0;
      setDragX(dx * (atStart || atEnd ? 0.2 : 1));
    }
  }, [swiping, activeTab, tabs]);

  const handleTouchEnd = useCallback(() => {
    if (touchRef.current.blocked) { setDragX(0); setSwiping(false); return; }
    if (!swiping) { setDragX(0); return; }
    const elapsed = Date.now() - touchRef.current.startTime;
    const velocity = Math.abs(dragX) / elapsed;
    const threshold = velocity > 0.5 ? 30 : 80;
    if (Math.abs(dragX) > threshold) switchTab(dragX < 0 ? "left" : "right");
    setDragX(0); setSwiping(false);
  }, [swiping, dragX, switchTab]);

  // ── Data ──────────────────────────────────────────────────
  const allItems = useMemo(() => miniseries.flatMap(s => s.items || []), [miniseries]);

  const heroMiniseries = useMemo(() => {
    if (activeTab === "drafts") return [];
    return miniseries.filter(s => !s.tab_key || s.tab_key === "filmography");
  }, [miniseries, activeTab]);

  const { progress, setProgress } = useCommunityProgress(community?.id, userId, allItems);
  const { logItem, unlogItem, addToWatchlist } = useCommunityActions(userId, setProgress);

  useEffect(() => {
    if (allItems.length === 0) return;
    fetchCoversForItems(allItems, setCoverCache);
  }, [allItems]);

  // ── Handlers ──────────────────────────────────────────────
  const handleItemTap = useCallback((itemId) => {
    const item = allItems.find(i => i.id === itemId);
    if (item) setModalItem(item);
  }, [allItems]);

  const handleLog = useCallback(async (itemId, { rating, completed_at, listened_with_commentary, isUpdate }) => {
    const item = allItems.find(i => i.id === itemId);
    const coverUrl = item ? getCoverUrl(item) : null;
    await logItem(itemId, item, coverUrl, { rating, completed_at, listened_with_commentary, isUpdate });
    const typeLabel = item?.media_type === "film" ? "film" : item?.media_type === "book" ? "book" : "game";
    if (onToast) onToast(isUpdate ? `Updated!` : `Logged!`);
    if (!isUpdate && onShelvesChanged) onShelvesChanged();
  }, [allItems, logItem, onToast, onShelvesChanged]);

  const handleUnlog = useCallback(async (itemId) => {
    await unlogItem(itemId);
    if (onToast) onToast("Removed from log");
  }, [unlogItem, onToast]);

  const handleWatchlist = useCallback(async (item, coverUrl) => {
    await addToWatchlist(item, coverUrl);
    const label = item.media_type === "film" ? "watch list" : item.media_type === "book" ? "reading list" : "play list";
    if (onToast) onToast(`Added to ${label}!`);
  }, [addToWatchlist, onToast]);

  // ── Tab content ───────────────────────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {
      case "drafts":
        return (
          <CommunityDraftsTab
            community={community}
            session={session}
            progress={progress}
            onToggle={handleItemTap}
            miniseries={miniseries}
            coverCacheVersion={coverCache}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        );

      default: // filmography
        return (
          <>
            <BigPictureFilmographyTab
              community={community}
              session={session}
              progress={progress}
              onToggle={handleItemTap}
              miniseries={miniseries}
              coverCacheVersion={coverCache}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              mediaFilter={mediaFilter}
              filter={filter}
              onFilterChange={setFilter}
            />
          </>
        );
    }
  };

  const showHero = activeTab !== "drafts";

  return (
    <div style={{
      minHeight: "100vh", background: "#0f0d0b",
      overflowX: "hidden",
      paddingTop: "env(safe-area-inset-top, 0px)",
      paddingBottom: hasBottomNav ? 72 : "env(safe-area-inset-bottom, 0px)",
    }}>
      {/* Back nav */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(15,13,11,0.95)",
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
        <div style={{ width: 48 }} />
      </div>

      <div
        onTouchStart={hasBottomNav ? handleTouchStart : undefined}
        onTouchMove={hasBottomNav ? handleTouchMove : undefined}
        onTouchEnd={hasBottomNav ? handleTouchEnd : undefined}
        className={slideDir === "left" ? "tab-slide-left" : slideDir === "right" ? "tab-slide-right" : ""}
        style={{
          transform: swiping && dragX !== 0 ? `translateX(${dragX}px)` : undefined,
          opacity: swiping && Math.abs(dragX) > 40 ? 1 - Math.abs(dragX) / 600 : 1,
          transition: swiping ? "none" : "transform 0.2s ease, opacity 0.2s ease",
          willChange: swiping ? "transform, opacity" : "auto",
        }}
      >
        {showHero && (
          <BigPictureHero
            community={community}
            miniseries={heroMiniseries}
            progress={progress}
            activeTab={activeTab}
            mediaFilter={mediaFilter}
            onMediaFilterChange={setMediaFilter}
          />
        )}
        {renderTabContent()}
      </div>

      <CommunityBottomNav
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(newTab) => {
          const oldIdx = tabs.findIndex(t => t.key === activeTab);
          const newIdx = tabs.findIndex(t => t.key === newTab);
          if (newIdx === oldIdx) return;
          setSlideDir(newIdx > oldIdx ? "left" : "right");
          setTimeout(() => { setActiveTab(newTab); setSlideDir(null); setSearchQuery(""); }, 200);
        }}
        accent={accent}
      />

      {modalItem && (
        <BigPictureLogModal
          item={modalItem}
          coverUrl={getCoverUrl(modalItem)}
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
          onNavigateCommunity={(slug, tmdbId) => {
            setModalItem(null);
            onBack();
            onOpenCommunity?.(slug, tmdbId);
          }}
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
    </div>
  );
}
