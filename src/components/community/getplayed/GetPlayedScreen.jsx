import { t } from "../../../theme";
import { useScrollToItem } from "../../../hooks/useScrollToItem";
import { useBackGesture } from "../../../hooks/useBackGesture";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { fetchCoversForItems, getCoverUrl } from "../../../utils/communityTmdb";
import { useGetPlayedBridge } from "./useGetPlayedBridge";
import GetPlayedHero from "./GetPlayedHero";
import MiniseriesShelf from "../shared/MiniseriesShelf";
import GetPlayedItemCard from "./GetPlayedItemCard";
import GetPlayedLogModal from "./GetPlayedLogModal";
import CommunityBottomNav from "../shared/CommunityBottomNav";
import AddItemTool from "../dashboard/AddItemTool";
import AdminFab from "../dashboard/AdminFab";
import RSSSyncTool from "../dashboard/RSSSyncTool";
import { FadeImg } from "../../feed/FeedPrimitives";

const DEFAULT_TABS = [
  { key: "lists", label: "Lists", icon: "📋" },
  { key: "playalong", label: "Play Along", icon: "🎮" },
  { key: "gameslop", label: "Game Slop", icon: "🪣" },
];

export default function GetPlayedScreen({ community, miniseries, session, onBack, onToast, onShelvesChanged, communitySubscriptions, onOpenCommunity, scrollToTmdbId, pushNav, removeNav }) {
  const userId = session?.user?.id;
  const accent = community?.theme_config?.accent || "#e91e8c";
  // Scroll to shelf when deep-linked from another community
  useScrollToItem(scrollToTmdbId, miniseries, accent);

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

  // ── Android back gesture → close modals ─────────────────
  useBackGesture("communityLogModal", !!modalItem, () => setModalItem(null), pushNav, removeNav);
  useBackGesture("communityAddTool", showAddTool, () => setShowAddTool(false), pushNav, removeNav);
  useBackGesture("communityRSSSync", showRSSSync, () => setShowRSSSync(false), pushNav, removeNav);
  useBackGesture("communityTab", activeTab !== (tabs[0]?.key || "lists"), () => setActiveTab(tabs[0]?.key || "lists"), pushNav, removeNav);

  useEffect(() => { setSearchQuery(""); setFilter("all"); }, [activeTab]);

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

  const wpypItemIds = useMemo(() => {
    const ids = new Set();
    miniseries
      .filter(s => s.tab_key === "playalong" || s.title?.toLowerCase().includes("we play"))
      .forEach(s => (s.items || []).forEach(item => ids.add(item.id)));
    allItems.forEach(i => {
      if (i.tags?.includes("wpyp") || i.segment_type === "we_play_you_play") ids.add(i.id);
    });
    return ids;
  }, [miniseries, allItems]);

  const wpypItems = useMemo(() =>
    allItems.filter(i => wpypItemIds.has(i.id)),
  [allItems, wpypItemIds]);

  const heroMiniseries = useMemo(() => {
    if (activeTab === "playalong") return miniseries.filter(s =>
      s.tab_key === "playalong" || s.title?.toLowerCase().includes("we play")
    );
    if (activeTab === "gameslop") return miniseries.filter(s => s.tab_key === "gameslop");
    return miniseries.filter(s => s.tab_key === "lists");
  }, [miniseries, activeTab]);

  const { progress, setProgress, logItem, unlogItem, addToWatchlist, userOwnsGame, playingNow } =
    useGetPlayedBridge(community?.id, userId, allItems);

  useEffect(() => {
    if (allItems.length === 0) return;
    fetchCoversForItems(allItems, setCoverCache);
  }, [allItems]);

  // ── Handlers ──────────────────────────────────────────────
  const handleItemTap = useCallback((itemId) => {
    const item = allItems.find(i => i.id === itemId);
    if (item) setModalItem(item);
  }, [allItems]);

  const handleLog = useCallback(async (itemId, { rating, completed_at, played_along, platform, status, isUpdate }) => {
    const item = allItems.find(i => i.id === itemId);
    const coverUrl = item ? getCoverUrl(item) : null;
    await logItem(itemId, item, coverUrl, { rating, completed_at, played_along, platform, status, isUpdate });
    if (onToast) onToast(isUpdate ? "Updated!" : "Logged!");
    if (!isUpdate && onShelvesChanged) onShelvesChanged();
  }, [allItems, logItem, onToast, onShelvesChanged]);

  const handleUnlog = useCallback(async (itemId) => {
    await unlogItem(itemId);
    if (onToast) onToast("Removed from log");
  }, [unlogItem, onToast]);

  const handleWatchlist = useCallback(async (item, coverUrl) => {
    await addToWatchlist(item, coverUrl);
    if (onToast) onToast("Added to play list!");
  }, [addToWatchlist, onToast]);

  // ── Tab content ───────────────────────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {
      case "playalong": {
        const wpypSeries = miniseries.filter(s =>
          s.tab_key === "playalong" || s.title?.toLowerCase().includes("we play")
        );
        const allWpypItems = wpypSeries.flatMap(s => s.items || []);

        const byYear = {};
        allWpypItems.forEach((item) => {
          const year = item.air_date ? new Date(item.air_date).getFullYear() : "Unknown";
          if (!byYear[year]) byYear[year] = [];
          byYear[year].push(item);
        });
        const sortedYears = Object.keys(byYear).sort((a, b) => b - a);

        return (
          <>
            <div style={{ padding: "12px 16px 4px" }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: t.cyan,
                textTransform: "uppercase", letterSpacing: "0.1em",
                marginBottom: 4,
              }}>
                We Play, You Play
              </div>
              <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 12 }}>
                Games the hosts invited listeners to play along with
              </div>
            </div>

            {/* Status filter pills */}
            <div style={{ display: "flex", gap: 6, padding: "0 16px 12px" }}>
              {[
                { key: "all", label: "All", color: t.textPrimary },
                { key: "beat", label: "Beat", color: t.green },
                { key: "playing", label: "Playing", color: t.cyan },
                { key: "backlog", label: "Backlog", color: t.gold },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  style={{
                    padding: "5px 14px",
                    background: filter === f.key
                      ? f.key === "all" ? "rgba(255,255,255,0.12)" : `${f.color}18`
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${filter === f.key
                      ? f.key === "all" ? t.textFaint : `${f.color}50`
                      : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 20,
                    color: filter === f.key ? f.color : t.textFaint,
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    transition: "all 0.2s",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {sortedYears.map((year) => {
              let yearItems = byYear[year].sort((a, b) =>
                new Date(b.air_date || 0) - new Date(a.air_date || 0)
              );

              // Apply status filter
              if (filter && filter !== "all") {
                yearItems = yearItems.filter((item) => {
                  const p = progress[item.id];
                  if (filter === "beat") return p && (p.status === "completed" || p.status === "beat" || (!p.status));
                  if (filter === "playing") return p?.status === "playing";
                  if (filter === "backlog") return p?.status === "backlog";
                  return true;
                });
              }

              if (yearItems.length === 0) return null;
              const yearCompleted = yearItems.filter(i => progress[i.id]).length;

              return (
                <div key={`wpyp-${year}`} style={{ marginBottom: 24, padding: "0 16px" }}>
                  {/* Year header */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginBottom: 10,
                  }}>
                    <div style={{
                      fontSize: 15, fontWeight: 700, color: t.textPrimary,
                      fontFamily: t.fontDisplay,
                      letterSpacing: "0.02em",
                    }}>
                      {year}
                    </div>
                    <div style={{
                      fontSize: 12, fontWeight: 700,
                      color: yearCompleted === yearItems.length && yearItems.length > 0 ? t.green : "#e91e8c",
                      fontFamily: t.fontDisplay,
                    }}>
                      {yearCompleted}/{yearItems.length}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{
                    height: 3, borderRadius: 2, background: t.bgHover,
                    overflow: "hidden", marginBottom: 12,
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 2,
                      width: `${yearItems.length > 0 ? (yearCompleted / yearItems.length) * 100 : 0}%`,
                      background: yearCompleted === yearItems.length && yearItems.length > 0
                        ? "linear-gradient(90deg, #4ade80, #22d3ee)"
                        : "linear-gradient(90deg, #e91e8c, #00d4ff)",
                      transition: "width 0.4s ease",
                    }} />
                  </div>

                  {/* 2-column grid */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}>
                    {yearItems.map((item) => {
                      const p = progress[item.id];
                      const isBeat = p && (p.status === "completed" || p.status === "beat" || !p.status);
                      const isPlaying = p?.status === "playing";
                      const isBacklog = p?.status === "backlog";
                      const resolvedCover = coverCache?.[item.id] || item.poster_path || null;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleItemTap(item.id)}
                          style={{
                            background: t.bgElevated,
                            border: isBeat ? "2px solid rgba(74,222,128,0.4)"
                              : isPlaying ? "2px solid rgba(0,212,255,0.4)"
                              : isBacklog ? "2px solid rgba(250,204,21,0.4)"
                              : `1px solid ${t.bgHover}`,
                            borderRadius: 12,
                            overflow: "hidden",
                            cursor: "pointer",
                            padding: 0, textAlign: "left",
                            WebkitTapHighlightColor: "transparent",
                            transition: "border-color 0.2s",
                          }}
                        >
                          {/* Cover image */}
                          <div style={{
                            width: "100%", aspectRatio: "16/9",
                            background: "linear-gradient(135deg, #1a1a2e, #16213e)",
                            position: "relative", overflow: "hidden",
                          }}>
                            {resolvedCover ? (
                              <FadeImg loading="lazy" src={resolvedCover} alt={item.title}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <div style={{
                                width: "100%", height: "100%",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 28, color: t.textSecondary,
                              }}>🎮</div>
                            )}

                            {/* Beat badge — only for explicitly completed/beat */}
                            {isBeat && !isPlaying && !isBacklog && (
                              <div style={{
                                position: "absolute", top: 6, right: 6,
                                background: "rgba(74,222,128,0.9)",
                                width: 22, height: 22, borderRadius: "50%",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, color: t.textPrimary,
                              }}>✓</div>
                            )}

                            {/* Bottom status banner */}
                            {isPlaying && (
                              <div style={{
                                position: "absolute", bottom: 0, left: 0, right: 0,
                                background: "rgba(0,212,255,0.85)",
                                padding: "3px 0", textAlign: "center",
                              }}>
                                <span style={{
                                  fontSize: 9, fontWeight: 800, color: t.textPrimary,
                                  textTransform: "uppercase", letterSpacing: "0.08em",
                                }}>▶ Playing</span>
                              </div>
                            )}
                            {isBacklog && (
                              <div style={{
                                position: "absolute", bottom: 0, left: 0, right: 0,
                                background: "rgba(250,204,21,0.85)",
                                padding: "3px 0", textAlign: "center",
                              }}>
                                <span style={{
                                  fontSize: 9, fontWeight: 800, color: t.bgCard,
                                  textTransform: "uppercase", letterSpacing: "0.08em",
                                }}>📋 Backlog</span>
                              </div>
                            )}

                            {/* Gradient overlay for text */}
                            <div style={{
                              position: "absolute", bottom: 0, left: 0, right: 0,
                              height: isPlaying || isBacklog ? 0 : "50%",
                              background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
                            }} />
                          </div>

                          {/* Info */}
                          <div style={{ padding: "8px 10px 10px" }}>
                            <div style={{
                              fontSize: 13, fontWeight: 700, color: t.textPrimary,
                              fontFamily: t.fontDisplay,
                              lineHeight: 1.2, marginBottom: 2,
                              overflow: "hidden", textOverflow: "ellipsis",
                              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                            }}>
                              {item.title}
                            </div>
                            <div style={{
                              fontSize: 10, color: t.textSecondary,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {item.creator}{item.year ? ` · ${item.year}` : ""}
                            </div>
                            {item.episode_number && (
                              <div style={{
                                fontSize: 9, color: t.textSecondary, marginTop: 2,
                              }}>
                                {item.episode_number}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        );
      }

      case "gameslop": {
        const slopSeries = miniseries
          .filter(s => s.tab_key === "gameslop")
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const slopItems = slopSeries.flatMap(s => s.items || []);
        const slopCompleted = slopItems.filter(i => progress[i.id]).length;

        return (
          <>
            {slopSeries.map((s) => {
              const items = (s.items || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
              if (items.length === 0) return null;
              return (
                <MiniseriesShelf
                  key={s.id}
                  series={{ ...s, items }}
                  progress={progress}
                  onToggle={handleItemTap}
                  CardComponent={GetPlayedItemCard}
                  cardProps={{ isWpyp: false }}
                  coverCacheVersion={coverCache}
                />
              );
            })}
          </>
        );
      }

      default: // episodes
        return (
          <>
            <div style={{ paddingTop: 8 }}>
              {miniseries
                .filter(s => s.tab_key === "lists")
                .map((s) => {
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
                      CardComponent={GetPlayedItemCard}
                      cardProps={{ isWpyp: false }}
                      coverCacheVersion={coverCache}
                    />
                  );
                })}
            </div>
          </>
        );
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: t.bgPrimary,
      overflowX: "hidden",
      paddingTop: "env(safe-area-inset-top, 0px)",
      paddingBottom: hasBottomNav ? 72 : "env(safe-area-inset-bottom, 0px)",
    }}>
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
          fontSize: 14, fontWeight: 700, color: t.textPrimary,
          fontFamily: t.fontDisplay,
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
        <GetPlayedHero
          community={community}
          miniseries={heroMiniseries}
          progress={progress}
          activeTab={activeTab}
          wpypItems={wpypItems}
          playingNow={playingNow}
        />
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
        <GetPlayedLogModal
          item={modalItem}
          coverUrl={getCoverUrl(modalItem)}
          isCompleted={!!progress[modalItem.id]}
          progressData={progress[modalItem.id] || null}
          isWpyp={wpypItemIds.has(modalItem.id)}
          userOwnsGame={userOwnsGame(modalItem.id)}
          onLog={handleLog}
          onUnlog={handleUnlog}
          onWatchlist={handleWatchlist}
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
