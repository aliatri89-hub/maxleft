import { t } from "../../../theme";
import { useScrollToItem } from "../../../hooks/useScrollToItem";
import { useBackGesture } from "../../../hooks/useBackGesture";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { fetchCoversForItems, getCoverUrl } from "../../../utils/communityTmdb";
import { useCommunityProgress, useCommunityActions, useBadgeOrchestrator } from "../../../hooks/community";
import BadgeCelebration from "../shared/BadgeCelebration";
import BadgeProgressToast from "../shared/BadgeProgressToast";
import BadgeDetailScreen from "../shared/BadgeDetailScreen";
import BadgePage from "../shared/BadgePage";
import HDTGMHero from "./HDTGMHero";
import MiniseriesShelf from "../shared/MiniseriesShelf";
import HDTGMLogModal from "./HDTGMLogModal";
import AddItemTool from "../dashboard/AddItemTool";
import AdminFab from "../dashboard/AdminFab";
import RSSSyncTool from "../dashboard/RSSSyncTool";

/**
 * HDTGMScreen — self-contained community screen for How Did This Get Made?
 *
 * The simplest community: single tab, films only, genre shelves with decades toggle.
 * No commentary, no Patreon tab, no awards, no books/games.
 * Changing this file never touches any other community.
 *
 * Props:
 *   community        — community_pages row
 *   miniseries       — all series for this community
 *   session          — supabase session
 *   onBack           — () => void
 *   onToast          — (msg) => void
 *   onShelvesChanged — () => void
 */
export default function HDTGMScreen({ community, miniseries, session, onBack, onToast, onShelvesChanged, communitySubscriptions, onOpenCommunity, scrollToTmdbId, pushNav, removeNav, popNav }) {
  const userId = session?.user?.id;
  const accent = community?.theme_config?.accent || "#4A9BB5";
  // Scroll to shelf when deep-linked from another community
  useScrollToItem(scrollToTmdbId, miniseries, accent);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState("az"); // "az" | "decades"
  const [coverCache, setCoverCache] = useState({});
  const [modalItem, setModalItem] = useState(null);
  const [showAddTool, setShowAddTool] = useState(false);
  const [showRSSSync, setShowRSSSync] = useState(false);

  // ── Badge system ──────────────────────────────────────────
  const {
    badges, earnedBadgeIds, badgeProgress, checkForBadge,
    revokeBadgeIfNeeded,
    celebrationBadge, setCelebrationBadge,
    detailBadge, setDetailBadge,
    completionToast, showBadgePage, setShowBadgePage,
    earnedCount, showCompletionToast, handleCompletionToastTap,
  } = useBadgeOrchestrator(community?.id, userId, null);

  // ── Android back gesture → close modals ─────────────────
  useBackGesture("communityLogModal", !!modalItem, () => setModalItem(null), pushNav, removeNav);
  useBackGesture("communityAddTool", showAddTool, () => setShowAddTool(false), pushNav, removeNav);
  useBackGesture("communityRSSSync", showRSSSync, () => setShowRSSSync(false), pushNav, removeNav);
  useBackGesture("hdtgmSearch", searchOpen, () => { setSearchOpen(false); setSearchQuery(""); }, pushNav, removeNav);
  useBackGesture("hdtgmBadgeDetail", !!detailBadge, () => setDetailBadge(null), pushNav, removeNav);
  useBackGesture("hdtgmBadgePage", showBadgePage, () => setShowBadgePage(false), pushNav, removeNav);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // ── Data ──────────────────────────────────────────────────
  const allItems = useMemo(() => miniseries.flatMap(s => s.items || []), [miniseries]);

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
    if (onToast) onToast(isUpdate ? "Updated!" : "Logged!");
    if (!isUpdate && onShelvesChanged) onShelvesChanged();

    // ── Badge check ──
    if (!isUpdate && item) {
      const earnedBadge = await checkForBadge(itemId);
      if (earnedBadge) showCompletionToast(earnedBadge);
    }
  }, [allItems, logItem, onToast, onShelvesChanged]);

  const handleUnlog = useCallback(async (itemId) => {
    await revokeBadgeIfNeeded(itemId);
    await unlogItem(itemId);
    if (onToast) onToast("Removed from log");
  }, [unlogItem, onToast, revokeBadgeIfNeeded]);

  const handleWatchlist = useCallback(async (item, coverUrl) => {
    await addToWatchlist(item, coverUrl);
    if (onToast) onToast("Added to watch list!");
  }, [addToWatchlist, onToast]);

  // ── Decade grouping (client-side re-sort of same data) ──
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
      height: "100%", background: t.bgPrimary,
      overflowX: "hidden", overflowY: "auto",
      paddingBottom: "var(--sab)",
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
                background: "none", border: "none",
                padding: "4px 4px", cursor: "pointer",
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
                fontSize: 11, fontWeight: 700,
                color: earnedCount > 0 ? t.textSecondary : t.textFaint,
                fontFamily: t.fontDisplay,
              }}>
                {earnedCount}/{badges.length}
              </span>
            </button>
          )}
        </div>
      </div>

      <HDTGMHero
        community={community}
        miniseries={miniseries}
        progress={progress}
      />

      {/* View mode + filter — single row, overlaps into hero */}
      <div style={{ display: "flex", gap: 6, padding: "8px 16px 0", alignItems: "center", position: "relative", zIndex: 2, marginTop: -36 }}>
        {[{ key: "az", label: "Genre" }, { key: "decades", label: "Decades" }].map(v => (
          <button
            key={v.key}
            onClick={() => setViewMode(v.key)}
            style={{
              background: viewMode === v.key ? `${accent}25` : "rgba(255,255,255,0.05)",
              border: `1.5px solid ${viewMode === v.key ? accent : "rgba(255,255,255,0.1)"}`,
              borderRadius: 20, padding: "5px 14px",
              color: viewMode === v.key ? accent : t.textMuted,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              transition: "all 0.2s",
              flexShrink: 0,
            }}
          >
            {v.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {[{ key: "all", label: "All" }, { key: "seen", label: "Seen" }, { key: "unseen", label: "Unseen" }].map(opt => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            style={{
              background: filter === opt.key ? accent + "22" : "rgba(255,255,255,0.05)",
              border: filter === opt.key ? "1px solid " + accent : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20, padding: "5px 14px",
              color: filter === opt.key ? accent : t.textMuted,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: t.fontDisplay,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={() => {
            if (searchOpen) {
              setSearchOpen(false);
              setSearchQuery("");
            } else {
              setSearchOpen(true);
            }
          }}
          style={{
            width: 30, height: 30, borderRadius: "50%",
            border: searchOpen || searchQuery
              ? `1.5px solid ${accent}`
              : `1px solid ${t.borderMedium}`,
            background: searchOpen || searchQuery
              ? "rgba(255,255,255,0.06)"
              : "rgba(255,255,255,0.04)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={searchOpen || searchQuery ? accent : t.textFaint}
            strokeWidth="2" strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </div>

      {/* ─── Expandable search input ── */}
      <div style={{
        overflow: "hidden",
        maxHeight: searchOpen ? 50 : 0,
        opacity: searchOpen ? 1 : 0,
        transition: "max-height 0.25s ease, opacity 0.2s ease",
        padding: searchOpen ? "6px 16px 0" : "0 16px",
      }}>
        <div style={{ position: "relative" }}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search films, years..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 36px 8px 32px",
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${t.bgHover}`,
              borderRadius: 10,
              color: t.textSecondary,
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
              WebkitAppearance: "none",
            }}
          />
          <div style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            fontSize: 13, color: t.textSecondary, pointerEvents: "none",
          }}>🔍</div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%",
                width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
                color: t.textSecondary, fontSize: 11, cursor: "pointer",
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
        <HDTGMLogModal
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

      {/* Badge celebration */}
      {celebrationBadge && (
        <BadgeCelebration
          pushNav={pushNav}
          removeNav={removeNav}
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

      {/* Badge completion toast */}
      {completionToast && (
        <BadgeProgressToast
          badge={completionToast.badge}
          current={completionToast.current}
          total={completionToast.total}
          isComplete={true}
          visible={completionToast.visible}
          bottomOffset={24}
          onTap={handleCompletionToastTap}
        />
      )}
    </div>
  );
}
