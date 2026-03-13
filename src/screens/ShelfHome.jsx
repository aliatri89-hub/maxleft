import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabase";
import { DEFAULT_ENABLED_SHELVES, DEFAULT_SHELF_ORDER } from "../utils/constants";
import LazyShelf from "../components/LazyShelf";

// Shelf sections (dark)
import ProfileHero from "../components/shelf/ProfileHero";
import MantlPiece from "../components/shelf/MantlPiece";
import ActivityPane from "../components/shelf/ActivityPane";
import RecapScreen from "./RecapScreen";
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

// ── Toggle button style ──
const toggleStyle = (active) => ({
  padding: "7px 20px", cursor: "pointer",
  background: active ? "rgba(255,255,255,0.08)" : "transparent",
  color: active ? "var(--text-primary)" : "var(--text-faint)",
  border: `1px solid ${active ? "var(--border-medium)" : "var(--border-subtle)"}`,
  fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13,
  textTransform: "uppercase", letterSpacing: "0.04em",
  transition: "all 0.15s",
});

function ShelfHome({ profile, shelves, shelvesLoaded, onShelfIt, session, pushNav, removeNav, onRefresh, onPin, onUnpin, onUpdateProfile, stravaActivities, stravaConnected, stravaLoading, stravaDismissed, setStravaDismissed, onStravaConnect, onStravaDisconnect, onToast, challengeShelf, onOpenChallenge, letterboxdSyncing, steamSyncing, userGroups, onOpenGroup, onAutoComplete, isActive }) {

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
  const [showPinPicker, setShowPinPicker] = useState(false);

  // ── UI state ──
  const [shelfPane, setShelfPane] = useState("shelves");
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [beatAnimId, setBeatAnimId] = useState(null);

  // ── Activity feed ──
  const [activityItems, setActivityItems] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const activityLoaded = useRef(false);

  const loadActivity = useCallback(async () => {
    if (!session) return;
    setActivityLoading(true);
    try {
      const { data } = await supabase.from("feed_activity")
        .select("id, activity_type, action, item_title, item_author, item_cover, item_year, rating, metadata, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setActivityItems(data || []);
    } catch (e) { console.error("Activity load error:", e); }
    setActivityLoading(false);
    activityLoaded.current = true;
  }, [session]);

  useEffect(() => {
    if (showActivityLog && !activityLoaded.current) loadActivity();
  }, [showActivityLog, loadActivity]);

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

      {/* Profile Card */}
      <ProfileHero profile={profile} />

      {/* Shelves / Recap toggle */}
      <div style={{ display: "flex", justifyContent: "center", gap: 0, padding: "12px 16px 4px" }}>
        <div onClick={() => { setShelfPane("shelves"); setShowActivityLog(false); }}
          style={{ ...toggleStyle(shelfPane === "shelves"), borderRadius: "var(--radius-full) 0 0 var(--radius-full)", borderRight: "none" }}>
          📚 Shelves
        </div>
        <div onClick={() => { setShelfPane("recap"); setShowActivityLog(false); }}
          style={{ ...toggleStyle(shelfPane === "recap"), borderRadius: "0 var(--radius-full) var(--radius-full) 0" }}>
          📊 Recap
        </div>
      </div>

      {/* Recap Pane */}
      {shelfPane === "recap" ? (
        <div style={{ padding: "0 0 80px" }}>
          <RecapScreen session={session} profile={profile} onToast={onToast} embedded />

          {/* Activity log toggle */}
          <div style={{ padding: "16px 16px 0", textAlign: "center" }}>
            <div
              onClick={() => { setShowActivityLog(!showActivityLog); }}
              style={{
                fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700,
                color: "var(--text-faint)", cursor: "pointer",
                textTransform: "uppercase", letterSpacing: "0.06em",
                padding: "12px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.06)",
                background: showActivityLog ? "rgba(255,255,255,0.04)" : "transparent",
                transition: "all 0.15s",
              }}
            >
              📋 Activity Log {showActivityLog ? "▾" : "→"}
            </div>
          </div>
          {showActivityLog && (
            <div style={{ padding: "8px 0 0" }}>
              <ActivityPane items={activityItems} loading={activityLoading} />
            </div>
          )}
        </div>
      ) : (
      <>
        {/* My Mantl */}
        <MantlPiece
          profile={profile} shelves={shelves} shelvesLoaded={shelvesLoaded}
          session={session} onUpdateProfile={onUpdateProfile} onToast={onToast}
          onViewItem={(item) => {
            if (item._pinType === "trophy" || item._pinType === "goal") {
              setViewingEvent(item);
            } else {
              setViewingItem(item);
            }
          }}
          onViewCountry={(c) => setViewingCountry(c)}
          onOpenPinPicker={() => { setShowPinPicker(true); }}
        />

        {/* ── Ordered Shelves ── */}
        <div className="shelf-order-wrap">

          {/* Training For + Strava — HIDDEN: focused on media */}
          {/* {isShelfOn("training") && (
            <LazyShelf style={{ order: getShelfPos("training") }} skeleton={skelTraining}>
              <TrainingShelf
                goals={shelves.goals} stravaActivities={stravaActivities}
                stravaConnected={stravaConnected} stravaLoading={stravaLoading}
                stravaDismissed={stravaDismissed} setStravaDismissed={setStravaDismissed}
                onAddEvent={() => setAddingEvent(true)}
                onViewEvent={(item) => setViewingEvent(item)}
                onStravaConnect={onStravaConnect} onStravaDisconnect={onStravaDisconnect}
              />
            </LazyShelf>
          )} */}

          {/* Trophy Case — HIDDEN: focused on media */}
          {/* {isShelfOn("trophies") && (
            <LazyShelf style={{ order: getShelfPos("trophies") }} skeleton={skelCompact}>
              <TrophyShelf
                trophies={shelves.trophies}
                onViewEvent={(item) => setViewingEvent(item)}
                onAddTrophy={() => setAddingTrophy(true)}
                onOpenTrophyCase={() => setTrophyCaseOpen(true)}
              />
            </LazyShelf>
          )} */}

          {/* Passport — HIDDEN: focused on media */}
          {/* {isShelfOn("passport") && (
            <LazyShelf style={{ order: getShelfPos("passport") }} skeleton={skelCompact}>
              <PassportShelf
                countries={shelves.countries} profile={profile}
                onAddCountry={() => setAddingCountry(true)}
                onViewCountry={(c) => setViewingCountry(c)}
                onOpenMap={() => setShowPassportMap(true)}
              />
            </LazyShelf>
          )} */}

          {/* Media Shelves */}
          {["books", "movies", "shows", "games"].filter(key => isShelfOn(key)).map(key => (
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
      </>
      )}

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
          showPinPicker={showPinPicker} setShowPinPicker={setShowPinPicker}
          shelves={shelves} profile={profile} session={session}
          onRefresh={onRefresh} onToast={onToast} onPin={onPin} onUnpin={onUnpin}
          onShelfIt={onShelfIt} onUpdateProfile={onUpdateProfile} onAutoComplete={onAutoComplete}
        />,
        document.body
      )}

    </div>
  );
}

export default ShelfHome;
