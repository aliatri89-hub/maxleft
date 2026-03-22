import { useScrollToItem } from "../../../hooks/useScrollToItem";
import { useBackGesture } from "../../../hooks/useBackGesture";
import { useState, useMemo, useCallback } from "react";
import { fetchCoversForItems, getCoverUrl } from "../../../utils/communityTmdb";
import { useCommunityProgress, useCommunityActions } from "../../../hooks/community";
import FilmspottingAwardsTab from "./FilmspottingAwardsTab";
import FilmspottingHero from "./FilmspottingHero";
import FilmspottingLogModal from "./FilmspottingLogModal";
import AddItemTool from "../dashboard/AddItemTool";
import AdminFab from "../dashboard/AdminFab";
import RSSSyncTool from "../dashboard/RSSSyncTool";
import { useEffect } from "react";

/**
 * FilmspottingScreen — Awards-only community screen.
 * Single tab: Top 10 Lists (CommunityAwardsTab).
 * No swipe, no bottom nav, no commentary.
 */
export default function FilmspottingScreen({ community, miniseries, session, onBack, onToast, onShelvesChanged, communitySubscriptions, onOpenCommunity, scrollToTmdbId, pushNav, removeNav }) {
  const userId = session?.user?.id;
  const accent = community?.theme_config?.accent || "#4ade80";
  // Scroll to shelf when deep-linked from another community
  useScrollToItem(scrollToTmdbId, miniseries, accent);

  const [coverCache, setCoverCache] = useState({});
  const [modalItem, setModalItem] = useState(null);
  const [showAddTool, setShowAddTool] = useState(false);
  const [showRSSSync, setShowRSSSync] = useState(false);

  // ── Android back gesture → close modals ─────────────────
  useBackGesture("communityLogModal", !!modalItem, () => setModalItem(null), pushNav, removeNav);
  useBackGesture("communityAddTool", showAddTool, () => setShowAddTool(false), pushNav, removeNav);
  useBackGesture("communityRSSSync", showRSSSync, () => setShowRSSSync(false), pushNav, removeNav);

  const allItems = useMemo(() => miniseries.flatMap(s => s.items || []), [miniseries]);
  const { progress, setProgress } = useCommunityProgress(community?.id, userId, allItems);
  const { logItem, unlogItem, addToWatchlist } = useCommunityActions(userId, setProgress);

  const handleItemTap = useCallback((itemId) => {
    const item = allItems.find(i => i.id === itemId);
    if (item) setModalItem(item);
  }, [allItems]);

  useEffect(() => {
    if (allItems.length > 0) fetchCoversForItems(allItems, setCoverCache);
  }, [allItems]);

  const handleLog = useCallback(async (itemId, { rating, completed_at, isUpdate }) => {
    const item = allItems.find(i => i.id === itemId);
    const coverUrl = item ? getCoverUrl(item) : null;
    await logItem(itemId, item, coverUrl, { rating, completed_at, isUpdate });
    if (onToast) onToast(isUpdate ? "Updated!" : "Logged!");
    if (!isUpdate && onShelvesChanged) onShelvesChanged();
  }, [allItems, logItem, onToast, onShelvesChanged]);

  const handleUnlog = useCallback(async (itemId) => {
    await unlogItem(itemId);
    if (onToast) onToast("Removed from log");
  }, [unlogItem, onToast]);

  const handleWatchlist = useCallback(async (item, coverUrl) => {
    await addToWatchlist(item, coverUrl);
    if (onToast) onToast("Added to watch list!");
  }, [addToWatchlist, onToast]);

  return (
    <div style={{
      height: "100dvh", background: "#0f0d0b",
      overflowX: "hidden", overflowY: "auto",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
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

      <FilmspottingHero
        community={community}
        miniseries={miniseries}
        progress={progress}
      />

      <FilmspottingAwardsTab
        community={community}
        session={session}
        progress={progress}
        miniseries={miniseries}
        onToggle={handleItemTap}
        coverCacheVersion={coverCache}
      />

      {modalItem && (
        <FilmspottingLogModal
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
        bottomOffset={24}
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
