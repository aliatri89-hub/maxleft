import { t } from "../../../theme";
import { supabase } from "../../../supabase";
import { useScrollToItem } from "../../../hooks/useScrollToItem";
import { useBackGesture } from "../../../hooks/useBackGesture";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { fetchCoversForItems, getCoverUrl } from "../../../utils/communityTmdb";
import { sbImg } from "../../feed/FeedPrimitives";
import { useCommunityProgress, useCommunityActions } from "../../../hooks/community";
import OriginalsHero from "./OriginalsHero";
import OriginalsPostCard from "./OriginalsPostCard";
import MiniseriesShelf from "../shared/MiniseriesShelf";
import CommunityFilter from "../shared/CommunityFilter";
import CommunityLogModal from "../shared/CommunityLogModal";
import AdminFab from "../dashboard/AdminFab";
import AddItemTool from "../dashboard/AddItemTool";

/**
 * OriginalsScreen — MANTL Originals community.
 *
 * Curated film shelves with editorial blog posts. No podcast, no audio.
 * Each shelf has a tappable post card above it, then a standard poster grid.
 * Uses MiniseriesShelf for consistent poster layout.
 */
export default function OriginalsScreen({
  community, miniseries, session, onBack, onToast,
  onShelvesChanged, communitySubscriptions, onOpenCommunity,
  scrollToTmdbId, pushNav, removeNav, popNav,
}) {
  const userId = session?.user?.id;
  const accent = community?.theme_config?.accent || "#e94560";

  const [filter, setFilter] = useState("all");
  const [coverCache, setCoverCache] = useState({});
  const [modalItem, setModalItem] = useState(null);
  const [showAddTool, setShowAddTool] = useState(false);
  const [authors, setAuthors] = useState({});
  const hasAutoOpened = useRef(false);

  // ── Fetch authors (for avatar in blurb cards) ──
  useEffect(() => {
    supabase.from("originals_authors").select("name, avatar_url")
      .then(({ data }) => {
        const map = {};
        (data || []).forEach(a => { map[a.name] = a; });
        setAuthors(map);
      });
  }, []);

  // ── Android back gestures ──
  useBackGesture("communityLogModal", !!modalItem, () => setModalItem(null), pushNav, removeNav);
  useBackGesture("communityAddTool", showAddTool, () => setShowAddTool(false), pushNav, removeNav);

  // Scroll disabled — auto-open handles deep links directly
  useScrollToItem(null, miniseries, accent);

  // ── Data ──
  const allItems = useMemo(() => miniseries.flatMap(s => s.items || []), [miniseries]);
  const { progress, setProgress } = useCommunityProgress(community?.id, userId, allItems);
  const { logItem, unlogItem, addToWatchlist } = useCommunityActions(userId, setProgress);

  useEffect(() => {
    if (allItems.length === 0) return;
    fetchCoversForItems(allItems, setCoverCache);
  }, [allItems]);

  // Auto-open log modal when deep-linked from editorial feed card
  useEffect(() => {
    if (!scrollToTmdbId || allItems.length === 0 || hasAutoOpened.current) return;
    const item = allItems.find(i => String(i.tmdb_id) === String(scrollToTmdbId));
    if (!item) return;
    hasAutoOpened.current = true;
    setModalItem(item);
  }, [scrollToTmdbId, allItems]);

  // True only while waiting for the auto-open modal — false once it's fired
  const isAutoOpening = !!scrollToTmdbId && !hasAutoOpened.current;

  // ── Handlers ──
  const handleItemTap = useCallback((itemId) => {
    const item = allItems.find(i => i.id === itemId);
    if (item) setModalItem(item);
  }, [allItems]);

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

  // Sort shelves by sort_order
  const sortedShelves = useMemo(() =>
    [...miniseries].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [miniseries]
  );

  return (
    <div style={{
      height: "100%", background: t.bgPrimary,
      overflowX: "hidden", overflowY: "auto",
      paddingBottom: "calc(72px + var(--sab))",
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
        }}>MANTL Originals</div>
        <div style={{ width: 48 }} />
      </div>

      <OriginalsHero
        community={community}
        miniseries={miniseries}
        progress={progress}
        accent={accent}
        style={{ visibility: isAutoOpening ? "hidden" : "visible" }}
      />

      {!isAutoOpening && <CommunityFilter value={filter} onChange={setFilter} accent={accent} />}

      {/* ═══ Shelves with post cards ═══ */}
      {!isAutoOpening && <div style={{ paddingTop: 8 }}>
        {sortedShelves.length === 0 && (
          <div style={{
            textAlign: "center", color: t.textMuted,
            fontSize: 14, padding: "48px 20px", fontStyle: "italic",
          }}>
            No shelves yet
          </div>
        )}

        {sortedShelves.map((shelf) => (
          <div key={shelf.id}>
            {/* Blog post card acts as shelf title */}
            <OriginalsPostCard
              miniseriesId={shelf.id}
              accent={accent}
              shelfTitle={shelf.title}
            />

            {/* Standard poster shelf — title hidden, PostCard handles it */}
            <MiniseriesShelf
              series={{
                ...shelf,
                items: [...(shelf.items || [])].sort((a, b) => {
                const sortKey = t => t.replace(/^(the|a|an)\s+/i, "").replace(/^[^a-z0-9]+/i, "").trim();
                return sortKey(a.title).localeCompare(sortKey(b.title));
              }),
              }}
              progress={progress}
              onToggle={handleItemTap}
              filter={filter}
              accent={accent}
              hideTitle
            />
          </div>
        ))}
      </div>}

      {/* Log Modal */}
      {modalItem && (
        <CommunityLogModal
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
          config={{
            communitySlug: "staff-picks",
            communityName: "MANTL Staff Picks",
            platforms: [],
          }}
          renderEditorial={() => {
            const blurb = modalItem?.extra_data?.editorial_blurb;
            const blurbAuthor = modalItem?.extra_data?.blurb_author || "Ali";
            const authorData = authors[blurbAuthor];
            if (!blurb) return null;
            return (
              <div style={{
                marginBottom: 16,
                padding: "14px 16px",
                background: "rgba(233,69,96,0.06)",
                border: "1px solid rgba(233,69,96,0.15)",
                borderRadius: 12,
                position: "relative",
                zIndex: 1,
                animation: "clmContentFadeIn 0.3s ease",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  marginBottom: 8,
                }}>
                  {authorData?.avatar_url ? (
                    <img src={authorData.avatar_url} alt="" style={{
                      width: 32, height: 32, borderRadius: "50%", objectFit: "cover",
                      border: "1.5px solid rgba(233,69,96,0.3)",
                    }} />
                  ) : (
                    <span style={{ fontSize: 13 }}>📝</span>
                  )}
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    fontFamily: t.fontBody,
                    color: t.textPrimary,
                  }}>
                    {blurbAuthor}
                  </span>
                  <span style={{ color: t.textSecondary }}>·</span>
                  <span style={{
                    fontSize: 10, fontWeight: 800,
                    fontFamily: t.fontDisplay,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: accent,
                  }}>
                    Staff Pick
                  </span>
                </div>
                <div style={{
                  fontSize: 13, lineHeight: 1.65,
                  color: t.textMuted,
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  whiteSpace: "pre-line",
                }}>
                  {blurb}
                </div>
              </div>
            );
          }}
        />
      )}

      <AdminFab
        userId={userId}
        accent={accent}
        onAddItem={() => setShowAddTool(true)}
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
    </div>
  );
}
