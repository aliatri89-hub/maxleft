import { useScrollToItem } from "../../../hooks/useScrollToItem";
import { useBackGesture } from "../../../hooks/useBackGesture";
import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchCoversForItems, getCoverUrl } from "../../../utils/communityTmdb";
import { useCommunityProgress, useCommunityActions } from "../../../hooks/community";
import ChapoHero from "./ChapoHero";
import ChapoLogModal from "./ChapoLogModal";
import CommunityFilter from "../shared/CommunityFilter";
import AddItemTool from "../dashboard/AddItemTool";
import AdminFab from "../dashboard/AdminFab";
import RSSSyncTool from "../dashboard/RSSSyncTool";

/**
 * ChapoScreen — Chapo Trap House community with episode-paired grid layout.
 *
 * 2 episodes per row, each showing 2-3 posters as a compact card.
 * Season tabs at the bottom. Episode descriptions in log modal.
 */
export default function ChapoScreen({ community, miniseries, session, onBack, onToast, onShelvesChanged, communitySubscriptions, onOpenCommunity, scrollToTmdbId, pushNav, removeNav }) {
  const userId = session?.user?.id;
  const accent = community?.theme_config?.accent || "#D32F2F";
  const tabs = community?.theme_config?.tabs || [];

  const [activeTab, setActiveTab] = useState(tabs[0]?.key || "ms1");
  const [filter, setFilter] = useState("all");
  const [coverCache, setCoverCache] = useState({});
  const [modalItem, setModalItem] = useState(null);
  const [showAddTool, setShowAddTool] = useState(false);
  const [showRSSSync, setShowRSSSync] = useState(false);

  // ── Android back gesture → close modals ─────────────────
  useBackGesture("communityLogModal", !!modalItem, () => setModalItem(null), pushNav, removeNav);
  useBackGesture("communityAddTool", showAddTool, () => setShowAddTool(false), pushNav, removeNav);
  useBackGesture("communityRSSSync", showRSSSync, () => setShowRSSSync(false), pushNav, removeNav);
  useBackGesture("communityTab", activeTab !== (tabs[0]?.key || "ms1"), () => setActiveTab(tabs[0]?.key || "ms1"), pushNav, removeNav);

  // Scroll to shelf when deep-linked from another community
  useScrollToItem(scrollToTmdbId, miniseries, accent, setActiveTab);

  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t.key === activeTab)) {
      setActiveTab(tabs[0].key);
    }
  }, [tabs]);

  // ── Data ──────────────────────────────────────────────────
  const allItems = useMemo(() => miniseries.flatMap(s => s.items || []), [miniseries]);

  const activeShelves = useMemo(() =>
    miniseries.filter(s => s.tab_key === activeTab),
    [miniseries, activeTab]
  );

  const { progress, setProgress } = useCommunityProgress(community?.id, userId, allItems);
  const { logItem, unlogItem, addToWatchlist } = useCommunityActions(userId, setProgress);

  // Apply seen/unseen filter
  const filteredShelves = useMemo(() => {
    if (filter === "all") return activeShelves;
    return activeShelves.map(s => {
      const items = (s.items || []).filter(i => {
        const seen = !!progress[i.id];
        return filter === "seen" ? seen : !seen;
      });
      return { ...s, items };
    }).filter(s => s.items.length > 0);
  }, [activeShelves, filter, progress]);

  useEffect(() => {
    if (allItems.length === 0) return;
    fetchCoversForItems(allItems, setCoverCache);
  }, [allItems]);

  // ── Handlers ──────────────────────────────────────────────
  const handleItemTap = useCallback((item, parentMs) => {
    if (parentMs) {
      item._episodeTheme = parentMs.title;
      item._episodeDescription = parentMs.description;
      item._patreonUrl = parentMs.patreon_url;
    }
    setModalItem(item);
  }, []);

  const handleLog = useCallback(async (itemId, opts) => {
    const item = allItems.find(i => i.id === itemId);
    const coverUrl = item ? getCoverUrl(item) : null;
    await logItem(itemId, item, coverUrl, opts);
    if (onToast) onToast(opts.isUpdate ? "Updated!" : "Logged!");
    if (!opts.isUpdate && onShelvesChanged) onShelvesChanged();
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
      paddingTop: "env(safe-area-inset-top, 0px)",
      paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
    }}>
      <style>{`
        @keyframes chapoFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .chapo-ep-card {
          animation: chapoFadeIn 0.3s ease both;
        }
        .chapo-poster-wrap {
          position: relative;
          border-radius: 6px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.15s;
        }
        .chapo-poster-wrap:active {
          transform: scale(0.96);
        }
        .chapo-poster-img {
          width: 100%;
          aspect-ratio: 2/3;
          object-fit: cover;
          display: block;
          background: rgba(255,255,255,0.05);
          border-radius: 6px;
        }
        .chapo-seen-badge {
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #22c55e;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        }
      `}</style>

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

      <ChapoHero
        community={community}
        miniseries={activeShelves}
        progress={progress}
      />

      <CommunityFilter value={filter} onChange={setFilter} accent={accent} />

      {/* ═══ Episode Grid — 2 per row ═══ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        padding: "12px 12px 24px",
      }}>
        {filteredShelves.length === 0 && (
          <div style={{
            gridColumn: "1 / -1",
            textAlign: "center", color: "rgba(255,255,255,0.7)",
            fontSize: 14, padding: "48px 20px", fontStyle: "italic",
          }}>
            {filter !== "all" ? "No films match this filter" : "No episodes in this season yet"}
          </div>
        )}

        {filteredShelves.map((ep, epIdx) => {
          const items = ep.items || [];
          const allSeen = items.length > 0 && items.every(i => progress[i.id]);

          return (
            <div
              key={ep.id}
              className="chapo-ep-card"
              style={{
                animationDelay: `${epIdx * 0.04}s`,
                background: "rgba(255,255,255,0.03)",
                border: allSeen
                  ? "1px solid rgba(34,197,94,0.25)"
                  : "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10,
                padding: 10,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {/* Episode theme title */}
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: allSeen ? "#4ade80" : "#fff",
                fontFamily: "'Barlow Condensed', sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                lineHeight: 1.2,
                minHeight: 28,
                display: "flex",
                alignItems: "center",
              }}>
                {ep.title}
              </div>

              {/* Poster grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: items.length === 1 ? "1fr" :
                  items.length === 2 ? "1fr 1fr" : "1fr 1fr 1fr",
                gap: 6,
              }}>
                {items.map((item) => {
                  const coverUrl = getCoverUrl(item);
                  const isSeen = !!progress[item.id];
                  return (
                    <div
                      key={item.id}
                      className="chapo-poster-wrap"
                      onClick={() => handleItemTap(item, ep)}
                    >
                      {coverUrl ? (
                        <img
                          className="chapo-poster-img"
                          src={coverUrl}
                          alt={item.title}
                          loading="lazy"
                        />
                      ) : (
                        <div className="chapo-poster-img" style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, color: "#aaa", textAlign: "center", padding: 4,
                        }}>
                          {item.title}
                        </div>
                      )}
                      {isSeen && (
                        <div className="chapo-seen-badge">✓</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Film titles below posters */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {items.map((item) => (
                  <div key={item.id} style={{
                    fontSize: 9,
                    color: progress[item.id] ? "rgba(74,222,128,0.7)" : "rgba(255,255,255,0.4)",
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {item.title} <span style={{ color: "rgba(255,255,255,0.72)" }}>({item.year})</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {modalItem && (
        <ChapoLogModal
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
        bottomOffset={80}
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

      {/* Bottom tab bar */}
      {tabs.length > 1 && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          zIndex: 20,
          background: "rgba(15,13,11,0.97)",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", justifyContent: "center", gap: 0,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}>
          {tabs.map(tab => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1, maxWidth: 100,
                  background: "none", border: "none",
                  padding: "10px 4px 8px",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 3,
                  cursor: "pointer",
                  borderTop: isActive ? `2px solid ${accent}` : "2px solid transparent",
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: 18 }}>{tab.icon}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  color: isActive ? accent : "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
