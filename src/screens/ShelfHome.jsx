import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { updateGameStatus } from "../utils/mediaWrite";
import { DEFAULT_ENABLED_SHELVES, DEFAULT_SHELF_ORDER } from "../utils/constants";
import LazyShelf from "../components/LazyShelf";
import MediaShelf from "../components/shelf/MediaShelf";
import ShelfModals from "../components/modals/ShelfModals";

// ── Skeleton templates ──
const skelCovers = (
  <div style={{ padding: "0 16px" }}>
    <div className="skeleton-dark" style={{ width: 120, height: 18, marginBottom: 14 }} />
    <div style={{ display: "flex", gap: 16 }}>
      {[0,1,2].map(j => <div className="skeleton-dark" key={j} style={{ width: 140, height: 200, borderRadius: 10, flexShrink: 0 }} />)}
    </div>
  </div>
);
const skelCompact = (
  <div style={{ padding: "0 16px" }}>
    <div className="skeleton-dark" style={{ width: 100, height: 16, marginBottom: 10 }} />
    <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", padding: 14, minHeight: 60 }}>
      <div className="skeleton-dark" style={{ height: 14, width: "70%", marginBottom: 8 }} />
      <div className="skeleton-dark" style={{ height: 14, width: "45%" }} />
    </div>
  </div>
);

function ShelfHome({ profile, shelves, shelvesLoaded, onShelfIt, session, pushNav, removeNav, onRefresh, onUpdateProfile, onToast, letterboxdSyncing, goodreadsSyncing, steamSyncing, isActive }) {

  // ── Trigger state (controls which modal/overlay is open) ──
  const [viewingItem, setViewingItem] = useState(null);
  const [addingCountry, setAddingCountry] = useState(false);
  const [viewingCountry, setViewingCountry] = useState(null);
  const [showPassportMap, setShowPassportMap] = useState(false);
  const [diaryShelf, setDiaryShelf] = useState(null);

  // ── UI state ──
  const [beatAnimId, setBeatAnimId] = useState(null);

  // ── Back gesture navigation ──
  useEffect(() => {
    if (viewingItem && pushNav) pushNav("viewItem", () => setViewingItem(null));
    else if (!viewingItem && removeNav) removeNav("viewItem");
  }, [!!viewingItem]);
  useEffect(() => {
    if (diaryShelf && pushNav) pushNav("diary", () => setDiaryShelf(null));
    else if (!diaryShelf && removeNav) removeNav("diary");
  }, [!!diaryShelf]);

  // ── Beat toggle (games) ──
  const toggleBeat = async (gameId, currentStatus) => {
    const newStatus = currentStatus === "beat" ? "backlog" : "beat";
    setBeatAnimId(gameId);
    setTimeout(() => setBeatAnimId(null), 500);
    const ok = await updateGameStatus(gameId, newStatus);
    if (ok && onRefresh) await onRefresh();
  };

  // ── Shelf ordering ──
  const isShelfOn = (key) => (profile.enabledShelves || DEFAULT_ENABLED_SHELVES)[key] !== false;
  const shelfOrder = profile.shelfOrder || DEFAULT_SHELF_ORDER;
  const getShelfPos = (key) => { const i = shelfOrder.indexOf(key); return i >= 0 ? i : 99; };

  return (
    <div className="shelf-home" style={{
      background: "var(--bg-primary)",
      minHeight: "100vh",
      paddingBottom: 100,
    }}>

      {/* ── Movies shelf: always first, hero treatment ── */}
      {isShelfOn("movies") && (
        <MediaShelf
          shelfKey="movies" items={shelves.movies || []} profile={profile}
          onShelfIt={onShelfIt}
          onViewItem={(item) => setViewingItem(item)}
          onOpenDiary={(k) => setDiaryShelf(k)}
          letterboxdSyncing={letterboxdSyncing} steamSyncing={steamSyncing}
          isHero
        />
      )}

        {/* ── Remaining Shelves ── */}
        <div className="shelf-order-wrap">

          {/* Media Shelves (minus movies) */}
          {["books", "shows", "games"].filter(key => isShelfOn(key)).map(key => (
            <LazyShelf key={key} style={{ order: getShelfPos(key) }} skeleton={skelCovers}>
              <MediaShelf
                shelfKey={key} items={shelves[key] || []} profile={profile}
                onShelfIt={onShelfIt}
                onViewItem={(item) => setViewingItem(item)}
                onOpenDiary={(k) => setDiaryShelf(k)}
                letterboxdSyncing={letterboxdSyncing} steamSyncing={steamSyncing}
              />
            </LazyShelf>
          ))}



        </div>

      {/* ── All Modals (portaled to body so slider transform doesn't break fixed positioning) ── */}
      {createPortal(
        <ShelfModals
          addingCountry={addingCountry} setAddingCountry={setAddingCountry}
          viewingCountry={viewingCountry} setViewingCountry={setViewingCountry}
          showPassportMap={showPassportMap} setShowPassportMap={setShowPassportMap}
          diaryShelf={diaryShelf} setDiaryShelf={setDiaryShelf}
          viewingItem={viewingItem} setViewingItem={setViewingItem}
          shelves={shelves} profile={profile} session={session}
          onRefresh={onRefresh} onToast={onToast}
          onShelfIt={onShelfIt} onUpdateProfile={onUpdateProfile}
        />,
        document.body
      )}

    </div>
  );
}

export default ShelfHome;
