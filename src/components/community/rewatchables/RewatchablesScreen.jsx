import { useScrollToItem } from "../../../hooks/useScrollToItem";
import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchCoversForItems, getCoverUrl } from "../../../utils/communityTmdb";
import { useCommunityProgress, useCommunityActions } from "../../../hooks/community";
import { supabase } from "../../../supabase";
import RewatchablesHero from "./RewatchablesHero";
import MiniseriesShelf from "../shared/MiniseriesShelf";
import RewatchablesLogModal from "./RewatchablesLogModal";
import CommunityFilter from "../shared/CommunityFilter";
import AddItemTool from "../dashboard/AddItemTool";
import AdminFab from "../dashboard/AdminFab";
import RSSSyncTool from "../dashboard/RSSSyncTool";

/**
 * RewatchablesScreen — The Rewatchables community.
 *
 * Genre shelves, decades view, rewatch tracking with dates.
 * Rewatch data is community-specific — does NOT write to the main shelf.
 */
export default function RewatchablesScreen({ community, miniseries, session, onBack, onToast, onShelvesChanged, communitySubscriptions, onOpenCommunity, scrollToTmdbId }) {
  const userId = session?.user?.id;
  const accent = community?.theme_config?.accent || "#1DB954";
  // Scroll to shelf when deep-linked from another community
  useScrollToItem(scrollToTmdbId, miniseries, accent);

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState("az");
  const [coverCache, setCoverCache] = useState({});
  const [modalItem, setModalItem] = useState(null);
  const [showAddTool, setShowAddTool] = useState(false);
  const [showRSSSync, setShowRSSSync] = useState(false);

  const allItems = useMemo(() => miniseries.flatMap(s => s.items || []), [miniseries]);

  const { progress, setProgress } = useCommunityProgress(community?.id, userId, allItems);
  const { logItem, unlogItem, addToWatchlist } = useCommunityActions(userId, setProgress);

  useEffect(() => {
    if (allItems.length === 0) return;
    fetchCoversForItems(allItems, setCoverCache);
  }, [allItems]);

  // ── Standard handlers ──
  const handleItemTap = useCallback((itemId) => {
    const item = allItems.find(i => i.id === itemId);
    if (item) setModalItem(item);
  }, [allItems]);

  const handleLog = useCallback(async (itemId, { rating, notes, completed_at, isUpdate }) => {
    const item = allItems.find(i => i.id === itemId);
    const coverUrl = item ? getCoverUrl(item) : null;
    await logItem(itemId, item, coverUrl, { rating, notes, completed_at, isUpdate });
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

  // ── Rewatch: append date, increment count ──
  const handleRewatch = useCallback(async (itemId, rewatchDate) => {
    if (!userId) return;
    const current = progress[itemId] || {};
    const dates = [...(current.rewatch_dates || []), rewatchDate];
    const count = dates.length;

    try {
      const { error } = await supabase
        .from("community_user_progress")
        .update({ rewatch_count: count, rewatch_dates: dates })
        .eq("item_id", itemId)
        .eq("user_id", userId);
      if (error) throw error;

      setProgress((prev) => ({
        ...prev,
        [itemId]: { ...prev[itemId], rewatch_count: count, rewatch_dates: dates },
      }));
      if (onToast) onToast(`Rewatch #${count + 1}! 🔁`);
    } catch (e) {
      console.error("[Rewatchables] Rewatch error:", e);
    }
  }, [userId, progress, setProgress, onToast]);

  // ── Remove rewatch: pop last date, decrement count ──
  const handleRemoveRewatch = useCallback(async (itemId) => {
    if (!userId) return;
    const current = progress[itemId] || {};
    const dates = [...(current.rewatch_dates || [])];
    if (dates.length === 0) return;
    dates.pop();
    const count = dates.length;

    try {
      const { error } = await supabase
        .from("community_user_progress")
        .update({ rewatch_count: count, rewatch_dates: dates })
        .eq("item_id", itemId)
        .eq("user_id", userId);
      if (error) throw error;

      setProgress((prev) => ({
        ...prev,
        [itemId]: { ...prev[itemId], rewatch_count: count, rewatch_dates: dates },
      }));
      if (onToast) onToast("Removed a rewatch");
    } catch (e) {
      console.error("[Rewatchables] Remove rewatch error:", e);
    }
  }, [userId, progress, setProgress, onToast]);

  // ── Decade grouping ──
  const decadeShelves = useMemo(() => {
    if (viewMode !== "decades") return [];
    const byDecade = {};
    allItems.forEach(item => {
      const yr = item.year || 0;
      const decade = yr >= 2020 ? "2020s" : yr >= 2010 ? "2010s" : yr >= 2000 ? "2000s"
        : yr >= 1990 ? "1990s" : yr >= 1980 ? "1980s" : yr >= 1970 ? "1970s" : "Pre-1970s";
      if (!byDecade[decade]) byDecade[decade] = [];
      byDecade[decade].push(item);
    });
    const order = ["2020s", "2010s", "2000s", "1990s", "1980s", "1970s", "Pre-1970s"];
    return order
      .filter(d => byDecade[d]?.length > 0)
      .map(d => ({
        id: `decade-${d}`,
        title: d,
        items: byDecade[d].sort((a, b) => (b.year || 0) - (a.year || 0)),
      }));
  }, [viewMode, allItems]);

  const shelves = viewMode === "az" ? miniseries : decadeShelves;

  return (
    <div style={{
      minHeight: "100vh", background: "#0f0f1a",
      overflowX: "hidden",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
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

      <RewatchablesHero
        community={community}
        miniseries={miniseries}
        progress={progress}
        allItems={allItems}
      />

      <CommunityFilter value={filter} onChange={setFilter} accent={accent} />

      <div style={{ display: "flex", gap: 6, padding: "8px 16px 0", alignItems: "center" }}>
        {[{ key: "az", label: "Genre" }, { key: "decades", label: "Decades" }].map(v => (
          <button
            key={v.key}
            onClick={() => setViewMode(v.key)}
            style={{
              background: viewMode === v.key ? `${accent}25` : "rgba(255,255,255,0.05)",
              border: `1.5px solid ${viewMode === v.key ? accent : "rgba(255,255,255,0.1)"}`,
              borderRadius: 20, padding: "5px 14px",
              color: viewMode === v.key ? accent : "#888",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              transition: "all 0.2s",
              flexShrink: 0,
            }}
          >{v.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ position: "relative", flexShrink: 0 }}>
          <input
            type="text"
            placeholder="Search films..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: searchQuery ? 160 : 110,
              background: "rgba(255,255,255,0.06)",
              border: `1.5px solid ${searchQuery ? accent : "rgba(255,255,255,0.1)"}`,
              borderRadius: 20,
              padding: "5px 12px 5px 28px",
              color: "#fff",
              fontSize: 12,
              outline: "none",
              transition: "all 0.2s",
              fontFamily: "inherit",
            }}
          />
          <span style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            fontSize: 12, color: searchQuery ? accent : "#666",
            pointerEvents: "none",
          }}>🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.1)", border: "none",
                borderRadius: "50%", width: 16, height: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#888", fontSize: 10, cursor: "pointer",
                padding: 0, lineHeight: 1,
              }}
            >✕</button>
          )}
        </div>
      </div>

      <div style={{ paddingTop: 8 }}>
        {shelves.map((s) => {
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

      {modalItem && (
        <RewatchablesLogModal
          item={modalItem}
          coverUrl={getCoverUrl(modalItem)}
          isCompleted={!!progress[modalItem.id]}
          progressData={progress[modalItem.id] || null}
          onLog={handleLog}
          onUnlog={handleUnlog}
          onWatchlist={handleWatchlist}
          onRewatch={handleRewatch}
          onRemoveRewatch={handleRemoveRewatch}
          onClose={() => setModalItem(null)}
          userId={userId}
          miniseries={miniseries}
          onToast={onToast}
          onShelvesChanged={onShelvesChanged}
          communityId={community.id}
          communitySubscriptions={communitySubscriptions}
          onNavigateCommunity={(slug, tmdbId) => {
            setModalItem(null);
            onBack();
            onOpenCommunity?.(slug, tmdbId);
          }}
        />
      )}

      <AdminFab userId={userId} accent={accent}
        onAddItem={() => setShowAddTool(true)}
        onRSSSync={() => setShowRSSSync(true)}
        bottomOffset={24}
      />
      {showAddTool && (
        <AddItemTool community={community} miniseries={miniseries} session={session}
          onClose={() => setShowAddTool(false)} onToast={onToast}
          onAdded={() => { if (onShelvesChanged) onShelvesChanged(); }} />
      )}
      {showRSSSync && (
        <RSSSyncTool community={community} miniseries={miniseries} session={session}
          onClose={() => setShowRSSSync(false)} onToast={onToast}
          onAdded={() => { if (onShelvesChanged) onShelvesChanged(); }} />
      )}
    </div>
  );
}
