import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabase";
import { DEFAULT_ENABLED_SHELVES, DEFAULT_SHELF_ORDER } from "../utils/constants";
import LazyShelf from "../components/LazyShelf";

// Shelf sections (dark)
// HIDDEN: Lifestyle shelves — focused on media (books/movies/shows/games)
// import TrainingShelf from "../components/shelf/TrainingShelf";
// import TrophyShelf from "../components/shelf/TrophyShelf";
// import PassportShelf from "../components/shelf/PassportShelf";
import MediaShelf from "../components/shelf/MediaShelf";
// import HabitsShelf from "../components/shelf/HabitsShelf"; // DISABLED for launch
// import GroupsShelf from "../components/shelf/GroupsShelf"; // DISABLED for launch

// Modals
import ShelfModals from "../components/modals/ShelfModals";

// ── Dark skeleton templates ──
const skelTraining = (
  <div style={{ padding: "0 16px" }}>
    <div className="skeleton-dark" style={{ width: 130, height: 16, marginBottom: 10 }} />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <div className="skeleton-dark" style={{ height: 90, borderRadius: "var(--radius-md)" }} />
      <div className="skeleton-dark" style={{ height: 90, borderRadius: "var(--radius-md)" }} />
    </div>
  </div>
);
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

function ShelfHome({ profile, shelves, shelvesLoaded, onShelfIt, session, pushNav, removeNav, onRefresh, onUpdateProfile, stravaActivities, stravaConnected, stravaLoading, stravaDismissed, setStravaDismissed, onStravaConnect, onStravaDisconnect, onToast, challengeShelf, onOpenChallenge, letterboxdSyncing, steamSyncing, userGroups, onOpenGroup, onAutoComplete, isActive }) {

  // ── Trigger state (controls which modal/overlay is open) ──
  const [viewingItem, setViewingItem] = useState(null);
  const [viewingEvent, setViewingEvent] = useState(null);
  const [addingEvent, setAddingEvent] = useState(false);
  const [trophyCaseOpen, setTrophyCaseOpen] = useState(false);
  const [addingTrophy, setAddingTrophy] = useState(false);
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
  useEffect(() => {
    if (trophyCaseOpen && pushNav) pushNav("trophyCase", () => setTrophyCaseOpen(false));
    else if (!trophyCaseOpen && removeNav) removeNav("trophyCase");
  }, [trophyCaseOpen]);

  // ── Beat toggle (games) ──
  const toggleBeat = async (gameId, currentStatus) => {
    const newStatus = currentStatus === "beat" ? "completed" : "beat";
    setBeatAnimId(gameId);
    setTimeout(() => setBeatAnimId(null), 500);
    const { error } = await supabase.from("games").update({ status: newStatus }).eq("id", gameId);
    if (!error && onRefresh) await onRefresh();
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

          {/* Habits — DISABLED for launch */}

          {/* Groups — DISABLED for launch */}

        </div>

      {/* ── All Modals (portaled to body so slider transform doesn't break fixed positioning) ── */}
      {createPortal(
        <ShelfModals
          addingEvent={addingEvent} setAddingEvent={setAddingEvent}
          viewingEvent={viewingEvent} setViewingEvent={setViewingEvent}
          trophyCaseOpen={trophyCaseOpen} setTrophyCaseOpen={setTrophyCaseOpen}
          addingTrophy={addingTrophy} setAddingTrophy={setAddingTrophy}
          addingCountry={addingCountry} setAddingCountry={setAddingCountry}
          viewingCountry={viewingCountry} setViewingCountry={setViewingCountry}
          showPassportMap={showPassportMap} setShowPassportMap={setShowPassportMap}
          diaryShelf={diaryShelf} setDiaryShelf={setDiaryShelf}
          viewingItem={viewingItem} setViewingItem={setViewingItem}
          shelves={shelves} profile={profile} session={session}
          onRefresh={onRefresh} onToast={onToast}
          onShelfIt={onShelfIt} onUpdateProfile={onUpdateProfile} onAutoComplete={onAutoComplete}
        />,
        document.body
      )}

    </div>
  );
}

export default ShelfHome;
