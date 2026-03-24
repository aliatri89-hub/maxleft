import { useState, useEffect, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { supabase } from "./supabase";
import "./styles/App.css";

// ─── NATIVE STATUS BAR CONFIG ─────────────────────────────────
// Android 15+ (API 35+) enforces edge-to-edge — overlay: false is ignored.
// Use overlay: true so the WebView correctly reports safe-area insets,
// then let CSS env(safe-area-inset-top) on .mantl-app handle the padding.
if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: true });
  StatusBar.setBackgroundColor({ color: "#0f0d0b" });
  StatusBar.setStyle({ style: Style.Dark });
}

// Utils
import { DEFAULT_ENABLED_SHELVES, DEFAULT_SHELF_ORDER } from "./utils/constants";
import { sb } from "./utils/api";
import { tapLight } from "./utils/haptics";
import { signInWithGoogle, initDeepLinkListener } from "./utils/nativeAuth";
import { initPushNotifications, setupPushListeners, removeDeviceToken } from "./utils/pushNotifications";

// Screens
import LandingScreen from "./screens/LandingScreen";
import UsernameSetup from "./screens/UsernameSetup";
import ShelfHome from "./screens/ShelfHome";
import FeedScreen from "./screens/FeedScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ExploreScreen from "./screens/ExploreScreen";
import SearchScreen from "./screens/SearchScreen";
import CommunityRouter from "./screens/CommunityRouter";
import NPPDashboard from "./components/community/now-playing/NPPDashboard";
import BlankCheckDashboard from "./components/community/blank-check/BlankCheckDashboard";
import TripleFeature from "./features/triple-feature/TripleFeature";
import WhatToWatch from "./features/what-to-watch/WhatToWatch";
import TripleFeaturePublic from "./features/triple-feature/TripleFeaturePublic";
import { hasPlayedToday } from "./features/triple-feature/tripleFeatureApi";
import ReelTime from "./features/reel-time/ReelTime";
import GamesHub from "./features/games-hub/GamesHub";
import { hasPlayedToday as rtHasPlayedToday } from "./features/reel-time/reelTimeApi";

// Hooks
import { useCommunitySubscriptions } from "./hooks/useCommunitySubscriptions";
import { useFavoritePodcasts } from "./hooks/useFavoritePodcasts";
import { useToast } from "./hooks/useToast";
import { useBackNav } from "./hooks/useBackNav";
import { useTabSwipe } from "./hooks/useTabSwipe";
import { useIntegrationSync } from "./hooks/useIntegrationSync";

// Components
import ShelfItModal from "./components/ShelfItModal";
import BadgeProgressToast from "./components/community/shared/BadgeProgressToast";
import LetterboxdSyncToast from "./components/LetterboxdSyncToast";
import InitialAvatar from "./components/InitialAvatar";
import AudioPip from "./components/AudioPip";
import AudioPlayerProvider from "./components/community/shared/AudioPlayerProvider";

// ─── COMMUNITY LOADING SKELETON ───────────────────────────────
function CommunityLoadingSkeleton() {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 0,
      background: "#0f0d0b",
      display: "flex", flexDirection: "column",
      alignItems: "center",
      paddingTop: "env(safe-area-inset-top, 0px)",
    }}>
      <div style={{ width: "100%", display: "flex", alignItems: "center", padding: "16px 18px 12px", gap: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.04)" }} />
        <div style={{ width: 120, height: 14, borderRadius: 6, background: "rgba(255,255,255,0.06)", animation: "community-skeleton-pulse 1.2s ease-in-out infinite" }} />
      </div>
      <div style={{ width: "calc(100% - 36px)", height: 180, borderRadius: 16, background: "rgba(255,255,255,0.03)", margin: "8px 18px 20px", animation: "community-skeleton-pulse 1.2s ease-in-out infinite", animationDelay: "0.15s" }} />
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: "100%", padding: "0 18px", marginBottom: 20 }}>
          <div style={{ width: 100 + i * 20, height: 12, borderRadius: 4, background: "rgba(255,255,255,0.05)", marginBottom: 12, animation: "community-skeleton-pulse 1.2s ease-in-out infinite", animationDelay: `${0.3 + i * 0.15}s` }} />
          <div style={{ display: "flex", gap: 10 }}>
            {[0, 1, 2, 3].map(j => (
              <div key={j} style={{ width: 90, height: 135, borderRadius: 10, flexShrink: 0, background: "rgba(255,255,255,0.03)", animation: "community-skeleton-pulse 1.2s ease-in-out infinite", animationDelay: `${0.3 + i * 0.15 + j * 0.08}s` }} />
            ))}
          </div>
        </div>
      ))}
      <style>{`@keyframes community-skeleton-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────

export default function App() {
  // Public routes — bypass auth entirely
  if (window.location.pathname.replace(/\/+$/, "") === "/play") {
    const splash = document.getElementById("splash-screen");
    if (splash) { splash.classList.add("hidden"); setTimeout(() => splash.remove(), 600); }
    return <TripleFeaturePublic />;
  }

  // ── Core state ──
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [screen, setScreen] = useState("loading");
  const [activeTab, setActiveTab] = useState("feed");
  const [visitedTabs, setVisitedTabs] = useState(new Set(["feed"]));
  const [profileInitView, setProfileInitView] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showTripleFeature, setShowTripleFeature] = useState(false);
  const [showWhatToWatch, setShowWhatToWatch] = useState(false);
  const [showReelTime, setShowReelTime] = useState(false);
  const [showGamesHub, setShowGamesHub] = useState(false);
  const [tfUnplayed, setTfUnplayed] = useState(false);
  const [rtUnplayed, setRtUnplayed] = useState(false);
  const [showShelfIt, setShowShelfIt] = useState(false);
  const [shelfItCategory, setShelfItCategory] = useState(null);
  const [letterboxdToast, setLetterboxdToast] = useState(null);
  const [feedMode, setFeedMode] = useState("releases");

  // ── Profile + shelves ──
  const [profile, setProfile] = useState({
    name: "", username: "", avatar: "", bio: "", avatarUrl: "",
    enabledShelves: { ...DEFAULT_ENABLED_SHELVES },
    shelfOrder: [...DEFAULT_SHELF_ORDER],
  });
  const [shelves, setShelves] = useState({ books: [], movies: [], shows: [], games: [], totalItems: 0 });
  const [shelvesLoaded, setShelvesLoaded] = useState(false);

  // ── Community state ──
  const [communityDashboard, setCommunityDashboard] = useState(() => {
    const host = window.location.hostname;
    if (host === "npp.mymantl.app") return "nowplaying";
    if (host === "bc.mymantl.app") return "blankcheck";
    const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
    const match = path.match(/^community\/([^/]+)\/dashboard$/);
    return match ? match[1] : null;
  });
  const [activeCommunitySlug, setActiveCommunitySlug] = useState(
    () => sessionStorage.getItem("mantl_community") || null
  );
  const [scrollToTmdbId, setScrollToTmdbId] = useState(null);

  // ── Extracted hooks ──
  const { toast, toastExiting, toastDuration, showToast } = useToast();
  const { pushNav, removeNav } = useBackNav(activeTab, setActiveTab);
  const {
    sliderRef, tabSwipeOffset, preloadTab, setPreloadTab,
    syncSliderPosition,
    onTouchStart, onTouchMove, onTouchEnd, TABS,
  } = useTabSwipe(activeTab, setActiveTab, pushNav, removeNav, feedMode, setFeedMode);

  const loadShelves = useCallback(async (userId) => {
    try {
      const [
        { data: allBooks }, { data: activeBooks }, { data: allMovies },
        { data: allShows }, { data: allGames }, { data: allCountries },
      ] = await Promise.all([
        supabase.from("user_books_v").select("id, title, author, cover_url, rating, notes, finished_at, source").eq("user_id", userId).eq("status", "finished").order("finished_at", { ascending: false, nullsFirst: false }),
        supabase.from("user_books_v").select("id, title, author, cover_url, notes, source").eq("user_id", userId).eq("status", "watching"),
        supabase.from("user_films_v").select("id, title, poster_url, rating, year, director, notes, watched_at").eq("user_id", userId).order("watched_at", { ascending: false, nullsFirst: false }),
        supabase.from("user_shows_v").select("id, title, poster_url, tmdb_id, show_status, rating, notes, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("user_games_v").select("id, title, cover_url, genre, game_status, rating, notes, source, external_id, steam_app_id, extra_data, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("countries").select("id, country_code, country_name, status, visit_month, visit_year, trip_month, trip_year, notes, photo_url").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);

      const books = (allBooks || []).map(b => ({ id: b.id, title: b.title, author: b.author, cover: b.cover_url, rating: b.rating, notes: b.notes, finishedAt: b.finished_at, source: b.source || "mantl" }));
      const currentBooks = (activeBooks || []).map(b => ({ id: b.id, title: b.title, author: b.author, cover: b.cover_url, notes: b.notes, isReading: true, source: b.source || "mantl" }));
      const movies = (allMovies || []).map(m => ({ id: m.id, title: m.title, cover: m.poster_url, rating: m.rating, year: m.year, director: m.director, notes: m.notes, watchedAt: m.watched_at }));
      const shows = (allShows || []).sort((a, b) => (a.show_status === "watching" ? -1 : 1) - (b.show_status === "watching" ? -1 : 1)).map(s => ({ id: s.id, title: s.title, cover: s.poster_url, tmdbId: s.tmdb_id, status: s.show_status, isWatching: s.show_status === "watching", rating: s.rating, notes: s.notes }));
      const games = (allGames || []).sort((a, b) => (a.game_status === "playing" ? -1 : 1) - (b.game_status === "playing" ? -1 : 1)).map(g => ({ id: g.id, title: g.title, cover: g.cover_url, platform: g.extra_data?.platform || null, genre: g.genre, status: g.game_status, isPlaying: g.game_status === "playing", isBeat: g.game_status === "beat", rating: g.rating, notes: g.notes, source: g.source || null, externalId: g.external_id || null, steamAppId: g.steam_app_id || null }));
      const countries = (allCountries || []).map(c => ({ id: c.id, countryCode: c.country_code, countryName: c.country_name, flag: "🏳️", status: c.status, visitMonth: c.visit_month, visitYear: c.visit_year, tripMonth: c.trip_month, tripYear: c.trip_year, notes: c.notes, photoUrl: c.photo_url }));

      setShelves({ books: [...currentBooks, ...books], currentBooks, movies, shows, games, countries, totalItems: books.length + movies.length + shows.length + games.length });
    } catch (err) {
      console.error("[Shelves] Failed to load:", err);
    }
    setShelvesLoaded(true);
  }, []);

  const sync = useIntegrationSync({ session, showToast, loadShelves, setProfile });

  const {
    subscriptions: communitySubscriptions, isSubscribed,
    subscribe: subscribeCommunity, unsubscribe: unsubscribeCommunity,
    seedSubscriptions, loaded: subscriptionsLoaded,
  } = useCommunitySubscriptions(session?.user?.id);

  const {
    favorites: favoritePodcasts,
    toggle: toggleFavoritePodcast,
  } = useFavoritePodcasts(session?.user?.id);

  const handleSubscribeCommunity = async (communityId) => {
    await subscribeCommunity(communityId);
  };

  // ── Triple Feature unplayed check ──
  useEffect(() => {
    if (!session?.user?.id) return;
    hasPlayedToday(session.user.id).then((played) => setTfUnplayed(!played));
  }, [session?.user?.id, showTripleFeature]);

  // ── Reel Time unplayed check ──
  useEffect(() => {
    if (!session?.user?.id) return;
    rtHasPlayedToday(session.user.id).then((played) => setRtUnplayed(!played));
  }, [session?.user?.id, showReelTime]);

  // ── Community slug persistence ──
  useEffect(() => {
    if (activeCommunitySlug) sessionStorage.setItem("mantl_community", activeCommunitySlug);
    else sessionStorage.removeItem("mantl_community");
  }, [activeCommunitySlug]);

  useEffect(() => {
    if (activeCommunitySlug) pushNav("community", () => { setScrollToTmdbId(null); setActiveCommunitySlug(null); });
    else removeNav("community");
  }, [activeCommunitySlug]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mark tabs as visited ──
  useEffect(() => {
    setVisitedTabs(prev => {
      const next = new Set(prev);
      if (activeTab) next.add(activeTab);
      if (preloadTab) next.add(preloadTab);
      return next.size !== prev.size ? next : prev;
    });
  }, [activeTab, preloadTab]);

  // ── Sync slider position on tab change ──
  useEffect(() => { syncSliderPosition(); }, [activeTab, syncSliderPosition]);

  // ── Dismiss HTML splash ──
  useEffect(() => {
    if (screen === "loading") return;
    const splash = document.getElementById("splash-screen");
    if (splash) { splash.classList.add("hidden"); setTimeout(() => splash.remove(), 600); }
  }, [screen]);

  // ── AUTH ──
  useEffect(() => {
    initDeepLinkListener(); // Listen for OAuth deep link callbacks on native
    let loadingUserId = null;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        if (loadingUserId === s.user.id) return;
        loadingUserId = s.user.id;
        loadUserData(s.user).finally(() => { loadingUserId = null; });
      } else if (!s) {
        setAuthLoading(false);
        setScreen("landing");
      }
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── PUSH NOTIFICATION LISTENERS (native only, no-op on web) ──
  useEffect(() => {
    return setupPushListeners(showToast, setActiveTab);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = () => signInWithGoogle(showToast);

  const signOut = async () => {
    await removeDeviceToken(); // stop push to this device
    await supabase.auth.signOut();
    setSession(null);
    setScreen("landing");
    setProfile({ name: "", username: "", avatar: "", bio: "", avatarUrl: "" });
    setShelves({ books: [], movies: [], shows: [], games: [], totalItems: 0 });
    setShelvesLoaded(false);
    setActiveTab("feed");
  };

  const deleteAccount = async () => {
    if (!session) return;
    const userId = session.user.id;
    try {
      await supabase.from("feed_activity").delete().eq("user_id", userId);
      await supabase.from("feed_reactions").delete().eq("user_id", userId);
      await supabase.from("feed_comments").delete().eq("user_id", userId);
      await supabase.from("community_user_progress").delete().eq("user_id", userId);
      await supabase.from("user_media_logs").delete().eq("user_id", userId);
      await supabase.from("countries").delete().eq("user_id", userId);
      await supabase.from("wishlist").delete().eq("user_id", userId);
      await supabase.from("blocked_users").delete().eq("user_id", userId);
      await supabase.from("reports").delete().eq("reporter_id", userId);
      await supabase.from("friends").delete().or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);
      await supabase.from("profiles").delete().eq("id", userId);
      await supabase.auth.signOut();
      setSession(null); setScreen("landing");
      setProfile({ name: "", username: "", avatar: "", bio: "", avatarUrl: "" });
      setShelves({ books: [], movies: [], shows: [], games: [], totalItems: 0 });
      setShelvesLoaded(false); setActiveTab("feed");
    } catch (err) { console.error("Delete account error:", err); }
  };

  const loadUserData = async (user) => {
    try {
      let { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (!prof) {
        const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
        const avatarUrl = user.user_metadata?.avatar_url || null;
        const { data: newProf } = await supabase.from("profiles").insert({ id: user.id, name, avatar_url: avatarUrl, avatar_emoji: "👤" }).select().single();
        prof = newProf;
      }
      if (prof) {
        if (!prof.username) {
          setProfile({ name: prof.name || "", username: "", avatar: prof.avatar_emoji || "👤", bio: prof.bio || "", avatarUrl: prof.avatar_url || "" });
          setAuthLoading(false); setScreen("setup"); return;
        }
        const p = {
          name: prof.name || "", username: prof.username || "", avatar: prof.avatar_emoji || "👤", bio: prof.bio || "", avatarUrl: prof.avatar_url || "",
          letterboxd_username: prof.letterboxd_username || null, goodreads_user_id: prof.goodreads_user_id || null, steam_id: prof.steam_id || null,
          enabledShelves: { ...DEFAULT_ENABLED_SHELVES, ...(prof.enabled_shelves || {}) },
          shelfOrder: prof.shelf_order || [...DEFAULT_SHELF_ORDER],
          nextUpBook: prof.next_up_book || null,
          mantlpiece_badges: prof.mantlpiece_badges || null,
        };
        setProfile(p);
        await loadShelves(user.id);
        sync.runInitialSync(p, user.id);
      }
      const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
      if (path && path !== "" && path !== "index.html" && !path.includes("/")) {
        window.history.replaceState(null, "", "/");
      }
      setAuthLoading(false); setScreen("app");
      initPushNotifications(showToast); // register for native push (no-op on web)
    } catch (err) {
      console.error("Load user error:", err);
      setAuthLoading(false); setScreen("landing");
    }
  };

  const handleUsernameComplete = async (username, enabledShelves, communityIds) => {
    if (!session) return;
    const { error } = await supabase.from("profiles").update({ username, enabled_shelves: enabledShelves }).eq("id", session.user.id);
    if (error) { console.error("Username save error:", error); return; }
    if (communityIds && communityIds.length > 0) await seedSubscriptions(communityIds);
    setProfile(prev => ({ ...prev, username, enabledShelves }));
    await loadShelves(session.user.id);
    setScreen("app"); showToast(`Welcome to Mantl, @${username}`);
  };

  const openShelfIt = (category) => {
    setShelfItCategory(category || null);
    setShowShelfIt(true);
    pushNav("shelfIt", () => setShowShelfIt(false));
  };

  // ── Letterboxd toast handler ──
  // syncLetterboxd returns { synced, rewatchCount } on success
  const origSyncLetterboxd = sync.syncLetterboxd;
  const wrappedSyncLetterboxd = async (username, uid, manual) => {
    const result = await origSyncLetterboxd(username, uid, manual);
    if (result) setLetterboxdToast({ synced: result.synced, rewatches: result.rewatchCount });
  };

  // ── RENDER ──

  return (
    <AudioPlayerProvider session={session}>
      <div className="mantl-app">

        {letterboxdToast && (
          <LetterboxdSyncToast
            synced={letterboxdToast.synced}
            rewatches={letterboxdToast.rewatches}
            duration={3600}
            onDone={() => setLetterboxdToast(null)}
            onTap={() => { setActiveTab("feed"); setFeedMode("activity"); }}
          />
        )}

        {toast && (() => {
          const msg = typeof toast === "string" ? toast : "";
          const isError = /couldn't|failed|error|check/i.test(msg);
          const isInfo  = /up to date|syncing|connected|disconnected|welcome/i.test(msg);
          const stripeColor = isError ? "#f87171" : isInfo ? "#EF9F27" : "#34d399";
          const clean = msg.replace(/[\u{1F300}-\u{1FFFF}]/gu, "").replace(/[🎬🎮📚🔁🎧🌍✓]/g, "").trim();
          return (
            <div className={`toast${toastExiting ? " toast-exit" : ""}`}>
              <div style={{ height: 5, background: stripeColor }} />
              <div className="toast-inner"><div className="toast-msg">{clean}</div></div>
              <div className="toast-countdown">
                <div className="toast-countdown-bar" style={{ animationDuration: `${toastDuration}ms` }} />
              </div>
            </div>
          );
        })()}
        <style>{`@keyframes toast-countdown { from { width: 100%; } to { width: 0%; } }`}</style>

        {screen === "loading" && <div className="loading-screen" />}
        {screen === "landing" && <LandingScreen onSignIn={signIn} />}
        {screen === "setup" && <UsernameSetup name={profile.name} session={session} onComplete={handleUsernameComplete} />}

        {screen === "app" && (
          <div className="screen-fade">
            {/* Header */}
            <div className="header">
              <div onClick={() => { tapLight(); setShowGamesHub(true); pushNav("gamesHub", () => setShowGamesHub(false)); }}
                style={{ width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {(tfUnplayed || rtUnplayed) ? (
                  <svg width="20" height="22" viewBox="0 0 22 22" fill="none" style={{ transform: "rotate(-12deg)", transition: "transform 0.3s ease" }}>
                    <rect x="3" y="1" width="16" height="20" rx="2" stroke="#d4af37" strokeWidth="1" fill="none"/>
                    <rect x="6" y="3.5" width="10" height="5.5" rx="1" fill="#d4af37" opacity="0.12"/><rect x="6" y="13" width="10" height="5.5" rx="1" fill="#d4af37" opacity="0.12"/>
                    <line x1="6" y1="11" x2="16" y2="11" stroke="#d4af37" strokeWidth="0.5" opacity="0.4"/>
                    <circle cx="4.5" cy="4" r="0.7" fill="#d4af37" opacity="0.6"/><circle cx="4.5" cy="7.5" r="0.7" fill="#d4af37" opacity="0.6"/><circle cx="4.5" cy="11" r="0.7" fill="#d4af37" opacity="0.6"/><circle cx="4.5" cy="14.5" r="0.7" fill="#d4af37" opacity="0.6"/><circle cx="4.5" cy="18" r="0.7" fill="#d4af37" opacity="0.6"/>
                    <circle cx="17.5" cy="4" r="0.7" fill="#d4af37" opacity="0.6"/><circle cx="17.5" cy="7.5" r="0.7" fill="#d4af37" opacity="0.6"/><circle cx="17.5" cy="11" r="0.7" fill="#d4af37" opacity="0.6"/><circle cx="17.5" cy="14.5" r="0.7" fill="#d4af37" opacity="0.6"/><circle cx="17.5" cy="18" r="0.7" fill="#d4af37" opacity="0.6"/>
                  </svg>
                ) : (
                  <svg width="18" height="20" viewBox="0 0 18 22" fill="none" style={{ transition: "transform 0.3s ease" }}>
                    <rect x="1" y="1" width="16" height="20" rx="2" stroke="#9a8ec2" strokeWidth="1" fill="none"/>
                    <rect x="4.5" y="3.5" width="9" height="5" rx="1" fill="#9a8ec2" opacity="0.15"/><rect x="4.5" y="13.5" width="9" height="5" rx="1" fill="#9a8ec2" opacity="0.15"/>
                    <line x1="4.5" y1="11" x2="13.5" y2="11" stroke="#9a8ec2" strokeWidth="0.5" opacity="0.3"/>
                    <circle cx="2.5" cy="3.5" r="0.7" fill="#9a8ec2" opacity="0.5"/><circle cx="2.5" cy="7" r="0.7" fill="#9a8ec2" opacity="0.5"/><circle cx="2.5" cy="10.5" r="0.7" fill="#9a8ec2" opacity="0.5"/><circle cx="2.5" cy="14" r="0.7" fill="#9a8ec2" opacity="0.5"/><circle cx="2.5" cy="17.5" r="0.7" fill="#9a8ec2" opacity="0.5"/>
                    <circle cx="15.5" cy="3.5" r="0.7" fill="#9a8ec2" opacity="0.5"/><circle cx="15.5" cy="7" r="0.7" fill="#9a8ec2" opacity="0.5"/><circle cx="15.5" cy="10.5" r="0.7" fill="#9a8ec2" opacity="0.5"/><circle cx="15.5" cy="14" r="0.7" fill="#9a8ec2" opacity="0.5"/><circle cx="15.5" cy="17.5" r="0.7" fill="#9a8ec2" opacity="0.5"/>
                  </svg>
                )}
              </div>
              <div onClick={() => { removeNav("tab"); setActiveTab("feed"); setFeedMode("releases"); }} style={{ cursor: "pointer", flex: 1, minWidth: 0, textAlign: "center" }}>
                <div className="header-brand">M<span className="header-play-btn"><span className="header-play-bg" /><span className="header-play-tri" /></span>NTL<span className="header-brand-line" /></div>
                <div className="header-tagline">press play</div>
              </div>
              <AudioPip />
              <div className="header-avatar-wrap" onClick={() => { tapLight(); setShowProfile(true); pushNav("profile", () => setShowProfile(false)); }}>
                <div className="header-profile">
                  {profile.avatarUrl
                    ? <img src={profile.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                    : <InitialAvatar username={profile.username} size={32} />}
                </div>
              </div>
            </div>

            {/* Tab slider */}
            <div className="main" style={{ touchAction: "pan-y" }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
              <div className="tab-slider" ref={sliderRef}>
                <div className="tab-pane" key="feed-tab">
                  <FeedScreen session={session} profile={profile} onToast={showToast} isActive={activeTab === "feed"}
                    onNavigateCommunity={(slug, tmdbId) => { tapLight(); setScrollToTmdbId(tmdbId || null); setActiveCommunitySlug(slug); }}
                    onNavigateSearch={() => { tapLight(); if (activeTab !== "search") pushNav("tab", () => { setActiveTab("feed"); }); setActiveTab("search"); }}
                    onNavigateMantl={() => { tapLight(); if (activeTab !== "shelf") pushNav("tab", () => { setActiveTab("feed"); }); setActiveTab("shelf"); }}
                    letterboxdSyncSignal={sync.letterboxdSyncSignal} autoLogCompleteSignal={sync.autoLogCompleteSignal}
                    communitySubscriptions={communitySubscriptions}
                    feedMode={feedMode} setFeedMode={setFeedMode}
                    pushNav={pushNav} removeNav={removeNav} />
                </div>
                <div className="tab-pane" key="communities-tab">
                  {visitedTabs.has("communities") && <ExploreScreen session={session}
                    onOpenCommunity={(slug) => { setScrollToTmdbId(null); setActiveCommunitySlug(slug); }}
                    isActive={activeTab === "communities"} communitySubscriptions={communitySubscriptions}
                    onSubscribe={handleSubscribeCommunity} onUnsubscribe={unsubscribeCommunity} subscriptionsLoaded={subscriptionsLoaded}
                    pushNav={pushNav} removeNav={removeNav} />}
                </div>
                <div className="tab-pane" key="search-tab">
                  {visitedTabs.has("search") && <SearchScreen session={session} isActive={activeTab === "search"} onToast={showToast} pushNav={pushNav} removeNav={removeNav} />}
                </div>
                <div className="tab-pane" key="shelf-tab">
                  {visitedTabs.has("shelf") && <ShelfHome profile={profile} shelves={shelves} shelvesLoaded={shelvesLoaded}
                    onShelfIt={openShelfIt} session={session} pushNav={pushNav} removeNav={removeNav}
                    onRefresh={async () => { if (session) await loadShelves(session.user.id); }}
                    onUpdateProfile={(updates) => setProfile(prev => ({ ...prev, ...updates }))}
                    onToast={showToast} letterboxdSyncing={sync.letterboxdSyncing}
                    goodreadsSyncing={sync.goodreadsSyncing} steamSyncing={sync.steamSyncing}
                    isActive={activeTab === "shelf"} />}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Community Dashboard (public) */}
        {communityDashboard && (
          <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "#1a1a1a", overflow: "auto", WebkitOverflowScrolling: "touch" }}>
            {communityDashboard === "blankcheck" ? <BlankCheckDashboard session={session} /> : <NPPDashboard session={session} />}
          </div>
        )}

        {/* Triple Feature Game */}
        {showTripleFeature && (
          <div className="overlay-slide-up" style={{ position: "fixed", inset: 0, zIndex: 200, background: "#0a0a0f", overflow: "auto", WebkitOverflowScrolling: "touch" }}>
            <TripleFeature session={session} onBack={() => { removeNav("tripleFeature"); setShowTripleFeature(false); }} onToast={showToast} pushNav={pushNav} removeNav={removeNav} />
          </div>
        )}

        {/* Reel Time Game */}
        {showReelTime && (
          <div className="overlay-slide-up" style={{ position: "fixed", inset: 0, zIndex: 200, background: "#0f0d0b", overflow: "auto", WebkitOverflowScrolling: "touch" }}>
            <ReelTime session={session} onBack={() => { removeNav("reelTime"); setShowReelTime(false); }} onToast={showToast} pushNav={pushNav} removeNav={removeNav} />
          </div>
        )}

        {/* What to Watch */}
        {showWhatToWatch && (
          <WhatToWatch session={session} onBack={() => { removeNav("whatToWatch"); setShowWhatToWatch(false); }} onToast={showToast} pushNav={pushNav} removeNav={removeNav} />
        )}

        {/* Games Hub */}
        {showGamesHub && (
          <div className="overlay-slide-up" style={{ position: "fixed", inset: 0, zIndex: 200, background: "#0f0d0b", overflow: "auto", WebkitOverflowScrolling: "touch" }}>
            <GamesHub
              session={session}
              onBack={() => { removeNav("gamesHub"); setShowGamesHub(false); }}
              pushNav={pushNav} removeNav={removeNav}
              onLaunchGame={(gameId) => {
                setShowGamesHub(false);
                removeNav("gamesHub");
                if (gameId === "tripleFeature") {
                  setShowTripleFeature(true);
                  pushNav("tripleFeature", () => setShowTripleFeature(false));
                } else if (gameId === "reelTime") {
                  setShowReelTime(true);
                  pushNav("reelTime", () => setShowReelTime(false));
                } else if (gameId === "pickAFlick") {
                  setShowWhatToWatch(true);
                  pushNav("whatToWatch", () => setShowWhatToWatch(false));
                } else if (gameId === "creditCheck") {
                  showToast("Credit Check coming soon!");
                }
              }}
              gameStatuses={{
                tripleFeature: tfUnplayed ? "available" : "completed",
                reelTime: rtUnplayed ? "available" : "completed",
                creditCheck: "available",
                pickAFlick: "always",
              }}
            />
          </div>
        )}

        {/* Community View */}
        {activeCommunitySlug && (
          <div className="overlay-fade-in" style={{ position: "fixed", inset: 0, zIndex: 200, background: "#0f0d0b", overflow: "hidden" }}>
            <CommunityLoadingSkeleton />
            <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>
              <CommunityRouter slug={activeCommunitySlug} session={session} onToast={showToast}
                onBack={() => { removeNav("community"); setScrollToTmdbId(null); setActiveCommunitySlug(null); }}
                onShelvesChanged={() => { if (session) loadShelves(session.user.id); }}
                communitySubscriptions={communitySubscriptions}
                onOpenCommunity={(slug, tmdbId) => { setScrollToTmdbId(tmdbId || null); setActiveCommunitySlug(slug); }}
                scrollToTmdbId={scrollToTmdbId}
                letterboxdSyncSignal={sync.letterboxdSyncSignal}
                pushNav={pushNav} removeNav={removeNav} />
            </div>
          </div>
        )}

        {/* Profile overlay */}
        {showProfile && (
          <div className="overlay-slide-up" style={{ position: "fixed", inset: 0, zIndex: 200, background: "var(--bg-primary)", overflow: "auto", WebkitOverflowScrolling: "touch" }}>
            <ProfileScreen profile={profile} shelves={shelves} session={session}
              initialView={profileInitView}
              pushNav={pushNav} removeNav={removeNav}
              onBack={() => { removeNav("profile"); setShowProfile(false); setProfileInitView(null); }}
              onSignOut={signOut} onDeleteAccount={deleteAccount}
              onUpdateAvatar={(url) => setProfile(prev => ({ ...prev, avatarUrl: url }))}
              onUpdateProfile={(updates) => setProfile(prev => ({ ...prev, ...updates }))}
              onToast={showToast}
              onLetterboxdConnect={sync.connectLetterboxd}
              onLetterboxdDisconnect={sync.disconnectLetterboxd}
              onLetterboxdSync={() => { if (session && profile.letterboxd_username) wrappedSyncLetterboxd(profile.letterboxd_username, session.user.id, true); }}
              letterboxdSyncing={sync.letterboxdSyncing}
              onGoodreadsConnect={sync.connectGoodreads}
              onGoodreadsDisconnect={sync.disconnectGoodreads}
              onGoodreadsSync={() => { if (session && profile.goodreads_user_id) sync.syncGoodreads(profile.goodreads_user_id, session.user.id, true); }}
              goodreadsSyncing={sync.goodreadsSyncing}
              onSteamConnect={sync.connectSteam}
              onSteamDisconnect={sync.disconnectSteam}
              onSteamSync={() => { if (session && profile.steam_id) sync.syncSteam(profile.steam_id, session.user.id, true); }}
              steamSyncing={sync.steamSyncing}
              onImportComplete={() => { if (session) loadShelves(session.user.id); }}
              communitySubscriptions={communitySubscriptions}
              onSubscribe={handleSubscribeCommunity}
              onUnsubscribe={unsubscribeCommunity}
              favoritePodcasts={favoritePodcasts}
              onToggleFavoritePodcast={toggleFavoritePodcast}
            />
          </div>
        )}

        {/* Bottom Nav — Communities | Search | Mantl */}
        {screen === "app" && !activeCommunitySlug && !showGamesHub && !showWhatToWatch && !showTripleFeature && !showReelTime && (
          <div className="nav-bar">
            <button className={`nav-item${activeTab === "communities" ? " active" : ""}`}
              onTouchStart={() => { if (activeTab !== "communities") setPreloadTab("communities"); }}
              onClick={() => { tapLight(); if (activeTab !== "communities") pushNav("tab", () => { setActiveTab("feed"); }); setActiveTab("communities"); setPreloadTab(null); }}>
              <div className="nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg></div>
              <div className="nav-label">Communities</div>
            </button>
            <button className={`nav-item${activeTab === "search" ? " active" : ""}`}
              onTouchStart={() => { if (activeTab !== "search") setPreloadTab("search"); }}
              onClick={() => { tapLight(); if (activeTab !== "search") pushNav("tab", () => { setActiveTab("feed"); }); setActiveTab("search"); setPreloadTab(null); }}>
              <div className="nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.5" cy="10.5" r="7.5"/><line x1="21" y1="21" x2="15.8" y2="15.8"/></svg></div>
              <div className="nav-label">Search</div>
            </button>
            <button className={`nav-item${activeTab === "shelf" ? " active" : ""}`}
              onTouchStart={() => { if (activeTab !== "shelf") setPreloadTab("shelf"); }}
              onClick={() => {
                tapLight();
                if (activeTab !== "shelf") pushNav("tab", () => { setActiveTab("feed"); });
                setActiveTab("shelf"); setPreloadTab(null);
              }}>
              <div className="nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><circle cx="8" cy="15" r="2"/><circle cx="16" cy="15" r="2"/></svg></div>
              <div className="nav-label">Mantl</div>
            </button>
          </div>
        )}

        {showShelfIt && (
          <ShelfItModal initialCategory={shelfItCategory}
            onClose={() => { removeNav("shelfIt"); setShowShelfIt(false); }}
            session={session} onToast={showToast}
            onSaved={async (type, status) => {
              if (session) {
                await loadShelves(session.user.id);
                const msg = (type === "book" && status === "reading") ? "Reading!" : (type === "tv" && status === "watching") ? "Watching!" : (type === "game" && status === "playing") ? "Playing!" : "Logged!";
                showToast(msg);
              }
            }} />
        )}

        {sync.syncBadgeToasts.map((t, i) => (
          <BadgeProgressToast key={`sync-badge-${i}`}
            badge={t.badge} current={t.current} total={t.total}
            isComplete={t.isComplete || false} visible={t.visible}
            bottomOffset={24 + i * 82}
            onTap={t.slug ? () => {
              sync.syncBadgeTimers.current.forEach(tid => clearTimeout(tid));
              sync.syncBadgeTimers.current = [];
              sync.setSyncBadgeToasts([]);
              setActiveCommunitySlug(t.slug);
            } : undefined} />
        ))}
      </div>
    </AudioPlayerProvider>
  );
}
