import { useScrollToItem } from "../../../hooks/useScrollToItem";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { fetchCoversForItems, getCoverUrl } from "../../../utils/communityTmdb";
import { useCommunityProgress, useCommunityActions } from "../../../hooks/community";
import FilmJunkHero from "./FilmJunkHero";
import FilmJunkListsTab from "./FilmJunkListsTab";
import FilmJunkAwardsTab from "./FilmJunkAwardsTab";
import MiniseriesShelf from "../shared/MiniseriesShelf";
import FilmJunkLogModal from "./FilmJunkLogModal";
import CommunityBottomNav from "../shared/CommunityBottomNav";
import CommunityFilter from "../shared/CommunityFilter";
import AddItemTool from "../dashboard/AddItemTool";
import AdminFab from "../dashboard/AdminFab";
import RSSSyncTool from "../dashboard/RSSSyncTool";

const DEFAULT_TABS = [
  { key: "lists", label: "Lists", icon: "📋" },
  { key: "awards", label: "Junkies", icon: "🏆" },
];

/**
 * FilmJunkScreen — self-contained community screen for Film Junk.
 *
 * Films-only community. No commentary tracking, no book/game media types.
 * Two main tabs: Lists (ranked per-host lists) and Junkies Awards (consensus).
 *
 * Follows the community module pattern:
 *   - Owns all tab routing, state, swipe gestures, and hero rendering.
 *   - Changing this file never touches other communities.
 *
 * Props:
 *   community        — community_pages row
 *   miniseries       — all series for this community
 *   session          — supabase session
 *   onBack           — () => void
 *   onToast          — (msg) => void
 *   onShelvesChanged — () => void
 */
export default function FilmJunkScreen({ community, miniseries, session, onBack, onToast, onShelvesChanged, communitySubscriptions, onOpenCommunity, scrollToTmdbId }) {
  const userId = session?.user?.id;
  const accent = community?.theme_config?.accent || "#78C044";

  const tabs = useMemo(() => {
    const t = community?.theme_config?.tabs;
    return t && Array.isArray(t) && t.length > 0 ? t : DEFAULT_TABS;
  }, [community]);

  const [activeTab, setActiveTab] = useState(() => tabs[0]?.key || "lists");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [coverCache, setCoverCache] = useState({});
  const [modalItem, setModalItem] = useState(null);
  const [showAddTool, setShowAddTool] = useState(false);
  const [showRSSSync, setShowRSSSync] = useState(false);

  // Scroll to shelf when deep-linked from another community
  useScrollToItem(scrollToTmdbId, miniseries, accent, setActiveTab);

  // Reset on tab change
  useEffect(() => { setSearchQuery(""); }, [activeTab]);

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
    if (activeTab === "awards" || activeTab === "lists") return [];
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

  const handleLog = useCallback(async (itemId, { rating, completed_at, isUpdate }) => {
    const item = allItems.find(i => i.id === itemId);
    const coverUrl = item ? getCoverUrl(item) : null;
    await logItem(itemId, item, coverUrl, { rating, completed_at, isUpdate });
    if (onToast) onToast(isUpdate ? "Updated! 🎬" : "Shelf'd! 🎬");
    if (!isUpdate && onShelvesChanged) onShelvesChanged();
  }, [allItems, logItem, onToast, onShelvesChanged]);

  const handleUnlog = useCallback(async (itemId) => {
    await unlogItem(itemId);
    if (onToast) onToast("Removed from log");
  }, [unlogItem, onToast]);

  const handleWatchlist = useCallback(async (item, coverUrl) => {
    await addToWatchlist(item, coverUrl);
    if (onToast) onToast("Added to watch list! 👁");
  }, [addToWatchlist, onToast]);

  // ── Tab content ───────────────────────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {
      case "lists":
        return (
          <FilmJunkListsTab
            community={community}
            session={session}
            progress={progress}
            miniseries={miniseries}
            coverCacheVersion={coverCache}
            onToggle={handleItemTap}
          />
        );

      case "awards":
        return (
          <FilmJunkAwardsTab
            community={community}
            session={session}
            progress={progress}
            miniseries={miniseries}
            coverCacheVersion={coverCache}
            onToggle={handleItemTap}
          />
        );

      default: // filmography fallback
        return (
          <>
            <CommunityFilter value={filter} onChange={setFilter} accent={accent} />
            <div style={{ paddingTop: 8 }}>
              {miniseries.filter(s => !s.tab_key || s.tab_key === "filmography").map((s) => {
                const q = searchQuery.trim().toLowerCase();
                let items = s.items || [];
                if (q.length >= 2) {
                  items = items.filter(i =>
                    i.title.toLowerCase().includes(q) ||
                    (i.creator || "").toLowerCase().includes(q) ||
                    String(i.year || "").includes(q)
                  );
                }
                if (items.length === 0) return null;
                return (
                  <MiniseriesShelf
                    key={s.id}
                    series={{ ...s, items }}
                    progress={progress}
                    onToggle={handleItemTap}
                    coverCacheVersion={coverCache}
                    filter={filter}
                  />
                );
              })}
            </div>
          </>
        );
    }
  };

  // Hide the main hero on Lists and Awards tabs — they have their own inline heroes
  const showHero = activeTab !== "awards" && activeTab !== "lists";

  return (
    <div style={{
      minHeight: "100vh", background: "#0f0f1a",
      overflowX: "hidden",
      paddingBottom: hasBottomNav ? 72 : "env(safe-area-inset-bottom, 0px)",
    }}>
      {/* Back nav */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
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
          <FilmJunkHero
            community={community}
            miniseries={heroMiniseries}
            progress={progress}
            activeTab={activeTab}
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
        <FilmJunkLogModal
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
