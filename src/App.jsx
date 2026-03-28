import { t } from "./theme";
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { supabase } from "./supabase";
import "./styles/App.css";
import { ShelvesProvider, useShelves } from "./contexts/ShelvesProvider";

// ─── ADMIN PANEL (lazy-loaded, desktop-only) ─────────────────
const AdminShell = lazy(() => import("./admin/AdminShell"));

// ─── NATIVE STATUS BAR CONFIG ─────────────────────────────────
// Android 15+ (API 35+) enforces edge-to-edge — overlay: false is ignored.
// Use overlay: true so the WebView correctly reports safe-area insets,
// then let CSS env(safe-area-inset-top) on .mantl-app handle the padding.
if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: true });
  StatusBar.setBackgroundColor({ color: t.bgPrimary });
  StatusBar.setStyle({ style: Style.Dark });
}

// Utils
import { DEFAULT_ENABLED_SHELVES, DEFAULT_SHELF_ORDER } from "./utils/constants";
import { tapLight } from "./utils/haptics";
import { signInWithGoogle, initDeepLinkListener, isNativeAuthPending, clearNativeAuthPending } from "./utils/nativeAuth";
import { initPushNotifications, setupPushListeners, removeDeviceToken } from "./utils/pushNotifications";

// Screens (eager — critical path)
import LandingScreen from "./screens/LandingScreen";
import UsernameSetup from "./screens/UsernameSetup";
import FeedScreen from "./screens/FeedScreen";
import CommunityRouter from "./screens/CommunityRouter";

// Screens (lazy — loaded on demand)
const MyMantlScreen = lazy(() => import("./screens/MyMantlScreen"));
const ProfileScreen = lazy(() => import("./screens/ProfileScreen"));
const CommunitiesScreen = lazy(() => import("./screens/CommunitiesScreen"));
const SearchScreen = lazy(() => import("./screens/SearchScreen"));

// Community dashboards (lazy — public routes)
const NPPDashboard = lazy(() => import("./components/community/now-playing/NPPDashboard"));
const BlankCheckDashboard = lazy(() => import("./components/community/blank-check/BlankCheckDashboard"));

// Games & features (lazy — overlay screens)
const TripleFeature = lazy(() => import("./features/triple-feature/TripleFeature"));
const WhatToWatch = lazy(() => import("./features/what-to-watch/WhatToWatch"));
const TripleFeaturePublic = lazy(() => import("./features/triple-feature/TripleFeaturePublic"));
const GamesHubPublic = lazy(() => import("./features/games-hub/GamesHubPublic"));
import { hasPlayedToday } from "./features/triple-feature/tripleFeatureApi";
const ReelTime = lazy(() => import("./features/reel-time/ReelTime"));
const GamesHub = lazy(() => import("./features/games-hub/GamesHub"));
import { hasPlayedToday as rtHasPlayedToday } from "./features/reel-time/reelTimeApi";
const CastConnections = lazy(() => import("./features/cast-connections/CastConnections"));
import { hasPlayedToday as ccHasPlayedToday } from "./features/cast-connections/castConnectionsApi";
const BadgeOverviewPage = lazy(() => import("./components/BadgeOverviewPage"));

// Hooks
import { useCommunitySubscriptions } from "./hooks/useCommunitySubscriptions";
import { useFavoritePodcasts } from "./hooks/useFavoritePodcasts";
import { useToast } from "./hooks/useToast";
import { useBackNav } from "./hooks/useBackNav";
import { useTabSwipe } from "./hooks/useTabSwipe";
import { useIntegrationSync } from "./hooks/useIntegrationSync";
import useNotifications from "./hooks/useNotifications";
import { useAnalytics } from "./hooks/useAnalytics";

// Components
import ErrorBoundary from "./components/ErrorBoundary";
import ShelfItModal from "./components/ShelfItModal";
import LetterboxdSyncToast from "./components/LetterboxdSyncToast";
import InitialAvatar from "./components/InitialAvatar";
import AudioPip from "./components/AudioPip";
import AudioPlayerProvider from "./components/community/shared/AudioPlayerProvider";
import NotificationBell from "./components/NotificationBell";
import NotificationCenter from "./components/NotificationCenter";

// ─── COMMUNITY LOADING SKELETON ───────────────────────────────
function CommunityLoadingSkeleton() {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 0,
      background: t.bgPrimary,
      display: "flex", flexDirection: "column",
      alignItems: "center",
      paddingTop: "env(safe-area-inset-top, 0px)",
    }}>
      <div style={{ width: "100%", display: "flex", alignItems: "center", padding: "16px 18px 12px", gap: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: t.bgElevated }} />
        <div style={{ width: 120, height: 14, borderRadius: 6, background: t.bgInput, animation: "community-skeleton-pulse 1.2s ease-in-out infinite" }} />
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
  // Admin panel — lazy-loaded, desktop-only, auth-gated
  if (window.location.pathname.replace(/\/+$/, "") === "/admin") {
    const splash = document.getElementById("splash-screen");
    if (splash) { splash.classList.add("hidden"); setTimeout(() => splash.remove(), 600); }
    return (
      <Suspense fallback={<div style={{ background: t.bgPrimary, height: "100vh" }} />}>
        <AdminShell />
      </Suspense>
    );
  }

  // Public routes — bypass auth entirely
  if (window.location.pathname.replace(/\/+$/, "") === "/play") {
    const splash = document.getElementById("splash-screen");
    if (splash) { splash.classList.add("hidden"); setTimeout(() => splash.remove(), 600); }
    return (
      <Suspense fallback={<div style={{ background: t.bgPrimary, height: "100vh" }} />}>
        <GamesHubPublic />
      </Suspense>
    );
  }

  return (
    <ShelvesProvider>
      <AppMain />
    </ShelvesProvider>
  );
}

function AppMain() {
  const { shelves, shelvesLoaded, loadShelves, refreshShelves, resetShelves } = useShelves();
  // ── Core state ──
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [screen, setScreen] = useState("loading");
  const [activeTab, setActiveTab] = useState("feed");
  const [visitedTabs, setVisitedTabs] = useState(new Set(["feed"]));
  const [profileInitView, setProfileInitView] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTripleFeature, setShowTripleFeature] = useState(false);
  const [showWhatToWatch, setShowWhatToWatch] = useState(false);
  const [showReelTime, setShowReelTime] = useState(false);
  const [showCastConnections, setShowCastConnections] = useState(false);
  const [showBadgeOverview, setShowBadgeOverview] = useState(false);
  const [tfUnplayed, setTfUnplayed] = useState(false);
  const [rtUnplayed, setRtUnplayed] = useState(false);
  const [ccUnplayed, setCcUnplayed] = useState(false);
  const [showShelfIt, setShowShelfIt] = useState(false);
  const [shelfItCategory, setShelfItCategory] = useState(null);
  const [letterboxdToast, setLetterboxdToast] = useState(null);
  const [feedMode, setFeedMode] = useState("releases");
  const [pendingSleeveOpen, setPendingSleeveOpen] = useState(null); // tmdb_id from push notification tap
  const [searchDeepLink, setSearchDeepLink] = useState(null); // { tmdbId, title } — from new_coverage notification tap

  // ── Profile + shelves ──
  const [profile, setProfile] = useState({
    name: "", username: "", avatar: "", bio: "", avatarUrl: "",
    enabledShelves: { ...DEFAULT_ENABLED_SHELVES },
    shelfOrder: [...DEFAULT_SHELF_ORDER],
  });

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
  const { pushNav, removeNav, dismissOverlays, popNav } = useBackNav(activeTab, setActiveTab);
  const {
    sliderRef, tabSwipeOffset, preloadTab, setPreloadTab,
    syncSliderPosition,
    onTouchStart, onTouchMove, onTouchEnd, TABS,
  } = useTabSwipe(activeTab, setActiveTab, pushNav, removeNav, feedMode, setFeedMode);

  const sync = useIntegrationSync({ session, showToast, setProfile });
  const syncRef = useRef(sync);
  useEffect(() => { syncRef.current = sync; });

  const {
    subscriptions: communitySubscriptions, isSubscribed,
    subscribe: subscribeCommunity, unsubscribe: unsubscribeCommunity,
    seedSubscriptions, loaded: subscriptionsLoaded,
  } = useCommunitySubscriptions(session?.user?.id);

  const {
    favorites: favoritePodcasts,
    toggle: toggleFavoritePodcast,
  } = useFavoritePodcasts(session?.user?.id);

  const { notifications, unreadCount, markAllSeen } = useNotifications(session);
  const { track } = useAnalytics(session?.user?.id);

  // ── Analytics: track tab switches ──
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    if (prevTabRef.current !== activeTab && session?.user?.id) {
      track("tab_switch", { from: prevTabRef.current, to: activeTab });
    }
    prevTabRef.current = activeTab;
  }, [activeTab, session?.user?.id, track]);

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

  // ── Cast Connections unplayed check ──
  useEffect(() => {
    if (!session?.user?.id) return;
    ccHasPlayedToday(session.user.id).then((played) => setCcUnplayed(!played));
  }, [session?.user?.id, showCastConnections]);

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
    let callbackTimeout = null;
    let nativeAuthTimeout = null;

    // If we landed with auth tokens in the URL, set a fallback timeout
    // so users don't get stuck on loading if token processing fails
    const hash = window.location.hash;
    const isOAuthCallback = hash && (hash.includes("access_token") || hash.includes("refresh_token"));
    if (isOAuthCallback) {
      callbackTimeout = setTimeout(() => {
        setAuthLoading(false);
        setScreen("landing");
      }, 5000);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (callbackTimeout) { clearTimeout(callbackTimeout); callbackTimeout = null; }
      if (nativeAuthTimeout) { clearTimeout(nativeAuthTimeout); nativeAuthTimeout = null; }
      setSession(s);
      if (s && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        clearNativeAuthPending(); // auth succeeded, clear the flag
        if (loadingUserId === s.user.id) return;
        loadingUserId = s.user.id;
        loadUserData(s.user).finally(() => { loadingUserId = null; });
      } else if (!s) {
        // If URL has auth tokens, Supabase is still processing the OAuth callback —
        // stay on loading screen instead of flashing the landing page
        if (isOAuthCallback) return;
        // On native, if we just opened the system browser for Google OAuth,
        // the app resumes with no session before the deep link arrives —
        // don't flash the landing page during this gap
        if (isNativeAuthPending()) {
          // Safety: if the deep link never arrives (user dismissed browser),
          // fall back to landing after a few seconds
          if (nativeAuthTimeout) clearTimeout(nativeAuthTimeout);
          nativeAuthTimeout = setTimeout(() => {
            if (isNativeAuthPending()) {
              clearNativeAuthPending();
              setAuthLoading(false);
              setScreen("landing");
            }
          }, 5000);
          return;
        }
        setAuthLoading(false);
        setScreen("landing");
      }
    });
    return () => { subscription.unsubscribe(); if (callbackTimeout) clearTimeout(callbackTimeout); if (nativeAuthTimeout) clearTimeout(nativeAuthTimeout); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── PUSH NAVIGATION HANDLER (shared by push listeners + notification center) ──
  const handlePushNav = useCallback((data) => {
    if (data?.type === 'watched_coverage' && data?.tmdb_id) {
      setActiveTab("feed");
      setFeedMode("activity");
      setPendingSleeveOpen(parseInt(data.tmdb_id));
    } else if (data?.type === 'new_coverage' && data?.tmdb_id) {
      // Deep link to search screen — pre-searches the film and auto-expands
      // so the user lands directly on the playable episode list.
      // Works for all podcasts uniformly (communities and non-communities alike).
      setSearchDeepLink({ tmdbId: parseInt(data.tmdb_id), title: data.film_title || "" });
      setActiveTab("search");
    } else if (data?.type === 'new_coverage_digest') {
      setActiveTab("feed");
      setFeedMode("activity");
    } else if (data?.type === 'badge_digest' || data?.type === 'badge_earned' || data?.type === 'badge_progress') {
      setShowBadgeOverview(true);
      pushNav("badgeOverview", () => setShowBadgeOverview(false));
    } else {
      setActiveTab("feed");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── PUSH NOTIFICATION LISTENERS (native only, no-op on web) ──
  useEffect(() => {
    return setupPushListeners(showToast, handlePushNav);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = () => signInWithGoogle(showToast);

  const signOut = async () => {
    await removeDeviceToken(); // stop push to this device
    await supabase.auth.signOut();
    setSession(null);
    setScreen("landing");
    setProfile({ name: "", username: "", avatar: "", bio: "", avatarUrl: "" });
    resetShelves();
    setActiveTab("feed");
  };

  const deleteAccount = async () => {
    if (!session) return;
    const userId = session.user.id;
    try {
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
      resetShelves(); setActiveTab("feed");
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
        };
        setProfile(p);
        await loadShelves(user.id);
        sync.runInitialSync(p, user.id, {
          onLetterboxdSync: async (username, uid) => {
            const result = await syncRef.current.syncLetterboxd(username, uid);
            if (result) setLetterboxdToast({ synced: result.synced, rewatches: result.rewatchCount });
          },
        });
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
    <ErrorBoundary name="MANTL">
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
          const stripeColor = isError ? t.red : isInfo ? "#EF9F27" : "#34d399";
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
            <div className="header" style={{ position: "relative" }}>
              {/* Left: profile avatar */}
              <div className="header-avatar-wrap" onClick={() => { tapLight(); setShowProfile(true); pushNav("profile", () => setShowProfile(false)); }}>
                <div className="header-profile">
                  {profile.avatarUrl
                    ? <img src={profile.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                    : <InitialAvatar username={profile.username} size={32} />}
                </div>
              </div>
              {/* Center: logo (absolutely centered) */}
              <div onClick={() => { dismissOverlays(); removeNav("tab"); setActiveTab("feed"); setFeedMode("releases"); }}
                style={{ cursor: "pointer", position: "absolute", left: "50%", transform: "translateX(-50%)", textAlign: "center", zIndex: 1, pointerEvents: "auto" }}>
                <div className="header-brand">M<span className="header-play-btn"><span className="header-play-bg" /><span className="header-play-tri" /></span>NTL<span className="header-brand-line" /></div>
                <div className="header-tagline">press play</div>
              </div>
              {/* Right: audio pip + bell */}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
                <AudioPip />
                <NotificationBell
                  unreadCount={unreadCount}
                  onClick={() => { setShowNotifications(true); pushNav("notifications", () => setShowNotifications(false)); }}
                />
              </div>
            </div>

            {/* Tab slider */}
            <div className="main" style={{ touchAction: "pan-y" }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
              <div className="tab-slider" ref={sliderRef}>
                <div className="tab-pane" key="feed-tab">
                  <ErrorBoundary name="Feed">
                  <FeedScreen session={session} profile={profile} onToast={showToast} isActive={activeTab === "feed"}
                    onNavigateCommunity={(slug, tmdbId) => { tapLight(); setScrollToTmdbId(tmdbId || null); setActiveCommunitySlug(slug); }}
                    onNavigateSearch={() => { tapLight(); if (activeTab !== "search") pushNav("tab", () => { setActiveTab("feed"); }); setActiveTab("search"); }}
                    onNavigateMantl={() => { tapLight(); if (activeTab !== "mantl") pushNav("tab", () => { setActiveTab("feed"); }); setActiveTab("mantl"); }}
                    letterboxdSyncSignal={sync.letterboxdSyncSignal} autoLogCompleteSignal={sync.autoLogCompleteSignal}
                    communitySubscriptions={communitySubscriptions}
                    favoritePodcasts={favoritePodcasts}
                    feedMode={feedMode} setFeedMode={setFeedMode}
                    pendingSleeveOpen={pendingSleeveOpen} setPendingSleeveOpen={setPendingSleeveOpen}
                    pushNav={pushNav} removeNav={removeNav} />
                  </ErrorBoundary>
                </div>
                <div className="tab-pane" key="communities-tab">
                  {visitedTabs.has("communities") && <ErrorBoundary name="Communities"><Suspense fallback={<CommunityLoadingSkeleton />}>
                    <CommunitiesScreen session={session}
                    onOpenCommunity={(slug) => { setScrollToTmdbId(null); setActiveCommunitySlug(slug); }}
                    isActive={activeTab === "communities"} communitySubscriptions={communitySubscriptions}
                    onSubscribe={handleSubscribeCommunity} onUnsubscribe={unsubscribeCommunity} subscriptionsLoaded={subscriptionsLoaded}
                    pushNav={pushNav} removeNav={removeNav} />
                  </Suspense></ErrorBoundary>}
                </div>
                <div className="tab-pane" key="games-tab">
                  {visitedTabs.has("games") && <ErrorBoundary name="Games"><Suspense fallback={<CommunityLoadingSkeleton />}>
                    <GamesHub session={session} isTab
                    onLaunchGame={(gameId) => {
                      if (gameId === "tripleFeature") {
                        setShowTripleFeature(true);
                        pushNav("tripleFeature", () => setShowTripleFeature(false));
                      } else if (gameId === "reelTime") {
                        setShowReelTime(true);
                        pushNav("reelTime", () => setShowReelTime(false));
                      } else if (gameId === "pickAFlick") {
                        setShowWhatToWatch(true);
                        pushNav("whatToWatch", () => setShowWhatToWatch(false));
                      } else if (gameId === "castConnections") {
                        setShowCastConnections(true);
                        pushNav("castConnections", () => setShowCastConnections(false));
                      } else if (gameId === "badges") {
                        setShowBadgeOverview(true);
                        pushNav("badgeOverview", () => setShowBadgeOverview(false));
                      }
                    }}
                    gameStatuses={{
                      tripleFeature: tfUnplayed ? "available" : "completed",
                      reelTime: rtUnplayed ? "available" : "completed",
                      castConnections: ccUnplayed ? "available" : "completed",
                      pickAFlick: "always",
                    }}
                  />
                  </Suspense></ErrorBoundary>}
                </div>
                <div className="tab-pane" key="search-tab">
                  {visitedTabs.has("search") && <ErrorBoundary name="Search"><Suspense fallback={<CommunityLoadingSkeleton />}>
                    <SearchScreen session={session} isActive={activeTab === "search"} onToast={showToast} pushNav={pushNav} removeNav={removeNav} initialTmdbId={searchDeepLink?.tmdbId} initialTitle={searchDeepLink?.title} onDeepLinkConsumed={() => setSearchDeepLink(null)} />
                  </Suspense></ErrorBoundary>}
                </div>
                <div className="tab-pane" key="shelf-tab">
                  {visitedTabs.has("mantl") && <ErrorBoundary name="My MANTL"><Suspense fallback={<CommunityLoadingSkeleton />}>
                    <MyMantlScreen profile={profile}
                    onShelfIt={openShelfIt} session={session} pushNav={pushNav} removeNav={removeNav}
                    onRefresh={refreshShelves}
                    onUpdateProfile={(updates) => setProfile(prev => ({ ...prev, ...updates }))}
                    onToast={showToast} letterboxdSyncing={sync.letterboxdSyncing}
                    steamSyncing={sync.steamSyncing}
                    isActive={activeTab === "mantl"} />
                  </Suspense></ErrorBoundary>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Community Dashboard (public) */}
        {communityDashboard && (
          <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "#1a1a1a", overflow: "auto", WebkitOverflowScrolling: "touch" }}>
            <ErrorBoundary name="Dashboard">
              <Suspense fallback={<CommunityLoadingSkeleton />}>
                {communityDashboard === "blankcheck" ? <BlankCheckDashboard session={session} /> : <NPPDashboard session={session} />}
              </Suspense>
            </ErrorBoundary>
          </div>
        )}

        {/* Triple Feature Game */}
        {showTripleFeature && (
          <div className="overlay-slide-up" style={{ position: "fixed", inset: 0, zIndex: 200, background: "#0a0a0f", overflow: "auto", WebkitOverflowScrolling: "touch" }}>
            <ErrorBoundary name="Triple Feature">
              <Suspense fallback={<CommunityLoadingSkeleton />}>
                <TripleFeature session={session} onBack={() => { removeNav("tripleFeature"); setShowTripleFeature(false); }} onToast={showToast} pushNav={pushNav} removeNav={removeNav} />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}

        {/* Reel Time Game */}
        {showReelTime && (
          <div className="overlay-slide-up" style={{ position: "fixed", inset: 0, zIndex: 200, background: t.bgPrimary, overflow: "auto", WebkitOverflowScrolling: "touch" }}>
            <ErrorBoundary name="Reel Time">
              <Suspense fallback={<CommunityLoadingSkeleton />}>
                <ReelTime session={session} onBack={() => { removeNav("reelTime"); setShowReelTime(false); }} onToast={showToast} pushNav={pushNav} removeNav={removeNav} />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}

        {/* Cast Connections Game */}
        {showCastConnections && (
          <div className="overlay-slide-up" style={{ position: "fixed", inset: 0, zIndex: 200, background: t.bgPrimary, overflow: "auto", WebkitOverflowScrolling: "touch" }}>
            <ErrorBoundary name="Cast Connections">
              <Suspense fallback={<CommunityLoadingSkeleton />}>
                <CastConnections session={session} onBack={() => { removeNav("castConnections"); setShowCastConnections(false); }} onToast={showToast} />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}

        {/* What to Watch */}
        {showWhatToWatch && (
          <ErrorBoundary name="What to Watch">
            <Suspense fallback={<CommunityLoadingSkeleton />}>
              <WhatToWatch session={session} onBack={() => { removeNav("whatToWatch"); setShowWhatToWatch(false); }} onToast={showToast} pushNav={pushNav} removeNav={removeNav} />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* Badge Overview */}
        {showBadgeOverview && (
          <ErrorBoundary name="Badges">
            <Suspense fallback={<CommunityLoadingSkeleton />}>
              <BadgeOverviewPage
                userId={session?.user?.id}
                onClose={() => { removeNav("badgeOverview"); setShowBadgeOverview(false); }}
                onNavigateCommunity={(slug) => {
                  removeNav("badgeOverview");
                  setShowBadgeOverview(false);
                  setActiveCommunitySlug(slug);
                }}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* Community View */}
        {activeCommunitySlug && (
          <div className="overlay-fade-in" style={{ position: "fixed", inset: 0, zIndex: 200, background: t.bgPrimary, overflow: "hidden" }}>
            <CommunityLoadingSkeleton />
            <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>
              <CommunityRouter slug={activeCommunitySlug} session={session} onToast={showToast}
                onBack={() => { removeNav("community"); setScrollToTmdbId(null); setActiveCommunitySlug(null); }}
                popNav={popNav}
                onShelvesChanged={refreshShelves}
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
            <ErrorBoundary name="Profile">
              <Suspense fallback={<CommunityLoadingSkeleton />}>
                <ProfileScreen profile={profile} session={session}
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
                  onSteamConnect={sync.connectSteam}
                  onSteamDisconnect={sync.disconnectSteam}
                  onSteamSync={() => { if (session && profile.steam_id) sync.syncSteam(profile.steam_id, session.user.id, true); }}
                  steamSyncing={sync.steamSyncing}
                  onImportComplete={refreshShelves}
                  communitySubscriptions={communitySubscriptions}
                  onSubscribe={handleSubscribeCommunity}
                  onUnsubscribe={unsubscribeCommunity}
              favoritePodcasts={favoritePodcasts}
              onToggleFavoritePodcast={toggleFavoritePodcast}
            />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}

        {/* Notification center panel */}
        {showNotifications && (
          <NotificationCenter
            notifications={notifications}
            onClose={() => { removeNav("notifications"); setShowNotifications(false); }}
            onNavigate={handlePushNav}
            onOpen={markAllSeen}
          />
        )}

        {/* Bottom Nav — Communities | Games | Search | Mantl */}
        {/* Floating back button — shown on iOS/Android when nav bar is hidden */}
        {screen === "app" && (activeCommunitySlug || showWhatToWatch || showTripleFeature || showReelTime || showCastConnections) && (
          <div
            onClick={() => { popNav(); }}
            style={{
              position: "fixed",
              top: "calc(env(safe-area-inset-top, 0px) + 12px)",
              left: 16,
              zIndex: 9000,
              display: "flex", alignItems: "center", gap: 4,
              padding: "7px 12px 7px 8px",
              background: "rgba(15,13,11,0.75)",
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span style={{
              fontSize: 13, fontWeight: 600,
              fontFamily: "'Barlow Condensed', sans-serif",
              color: "rgba(255,255,255,0.8)",
              letterSpacing: "0.02em",
            }}>Back</span>
          </div>
        )}

        {screen === "app" && !activeCommunitySlug && !showWhatToWatch && !showTripleFeature && !showReelTime && !showCastConnections && (
          <div className="nav-bar">
            <button className={`nav-item${activeTab === "communities" ? " active" : ""}`}
              onTouchStart={() => { if (activeTab !== "communities") setPreloadTab("communities"); }}
              onClick={() => { tapLight(); dismissOverlays(); if (activeTab !== "communities") pushNav("tab", () => { setActiveTab("feed"); }); setActiveTab("communities"); setPreloadTab(null); }}>
              <div className="nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg></div>
              <div className="nav-label">Communities</div>
            </button>
            <button className={`nav-item${activeTab === "games" ? " active" : ""}`}
              onTouchStart={() => { if (activeTab !== "games") setPreloadTab("games"); }}
              onClick={() => { tapLight(); dismissOverlays(); if (activeTab !== "games") pushNav("tab", () => { setActiveTab("feed"); }); setActiveTab("games"); setPreloadTab(null); }}>
              <div className="nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="8" y1="2" x2="8" y2="22"/><line x1="16" y1="2" x2="16" y2="22"/><circle cx="5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="5" cy="18" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="18" r="1" fill="currentColor" stroke="none"/></svg></div>
              <div className="nav-label">Games</div>
            </button>
            <button className={`nav-item${activeTab === "search" ? " active" : ""}`}
              onTouchStart={() => { if (activeTab !== "search") setPreloadTab("search"); }}
              onClick={() => { tapLight(); dismissOverlays(); if (activeTab !== "search") pushNav("tab", () => { setActiveTab("feed"); }); setActiveTab("search"); setPreloadTab(null); }}>
              <div className="nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.5" cy="10.5" r="7.5"/><line x1="21" y1="21" x2="15.8" y2="15.8"/></svg></div>
              <div className="nav-label">Search</div>
            </button>
            <button className={`nav-item${activeTab === "mantl" ? " active" : ""}`}
              onTouchStart={() => { if (activeTab !== "mantl") setPreloadTab("mantl"); }}
              onClick={() => {
                tapLight(); dismissOverlays();
                if (activeTab !== "mantl") pushNav("tab", () => { setActiveTab("feed"); });
                setActiveTab("mantl"); setPreloadTab(null);
              }}>
              <div className="nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9a6 6 0 0 0 12 0V3H6v6z"/><path d="M6 5H3v2a4 4 0 0 0 4 4"/><path d="M18 5h3v2a4 4 0 0 1-4 4"/><line x1="12" y1="15" x2="12" y2="18"/><path d="M8 21h8"/><path d="M8 21l1-3h6l1 3"/></svg></div>
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
                await refreshShelves();
                const msg = (type === "book" && status === "reading") ? "Reading!" : (type === "tv" && status === "watching") ? "Watching!" : (type === "game" && status === "playing") ? "Playing!" : "Logged!";
                showToast(msg);
              }
            }} />
        )}

      </div>
    </AudioPlayerProvider>
    </ErrorBoundary>
  );
}
