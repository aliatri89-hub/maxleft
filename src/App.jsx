import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";
import "./styles/App.css";

// Utils
import { DEFAULT_ENABLED_SHELVES, DEFAULT_SHELF_ORDER } from "./utils/constants";
import { TMDB_IMG, sb, fetchTMDBRaw, searchTMDBRaw } from "./utils/api";
import { tapLight, tapMedium, notifySuccess } from "./utils/haptics";

// Screens
import LandingScreen from "./screens/LandingScreen";
import UsernameSetup from "./screens/UsernameSetup";
import ShelfHome from "./screens/ShelfHome";
import FeedScreen from "./screens/FeedScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ExploreScreen from "./screens/ExploreScreen";
import CommunityRouter from "./screens/CommunityRouter";
import NPPDashboard from "./components/community/now-playing/NPPDashboard";
import BlankCheckDashboard from "./components/community/blank-check/BlankCheckDashboard";
import TripleFeature from "./features/triple-feature/TripleFeature";
import TripleFeaturePublic from "./features/triple-feature/TripleFeaturePublic";
import { hasPlayedToday } from "./features/triple-feature/tripleFeatureApi";

// Hooks
import { useCommunitySubscriptions } from "./hooks/useCommunitySubscriptions";

// Components
import ShelfItModal from "./components/ShelfItModal";
import FlappyMantl from "./components/FlappyMantl";
// import ComedyPointsReveal from "./components/community/shared/ComedyPointsReveal"; // DISABLED for launch
// import ComedyPointsToast from "./components/community/shared/ComedyPointsToast"; // DISABLED for launch
import BadgeProgressToast from "./components/community/shared/BadgeProgressToast";
import LetterboxdSyncToast from "./components/LetterboxdSyncToast";
import InitialAvatar from "./components/InitialAvatar";
import AudioPlayerProvider from "./components/community/shared/AudioPlayerProvider";
import { toLogTimestamp } from "./utils/helpers";
import { upsertMediaLog, toPosterPath, logGame } from "./utils/mediaWrite";

// ─── COMMUNITY LOADING SKELETON ───────────────────────────────
// Shown instantly when navigating to a community from feed cards.
// Sits behind CommunityRouter (which renders on top once data loads).
function CommunityLoadingSkeleton() {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 0,
      background: "#0f0f1a",
      display: "flex", flexDirection: "column",
      alignItems: "center",
      paddingTop: "env(safe-area-inset-top, 0px)",
    }}>
      {/* Back button placeholder + header bar */}
      <div style={{
        width: "100%", display: "flex", alignItems: "center",
        padding: "16px 18px 12px", gap: 14,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: "rgba(255,255,255,0.04)",
        }} />
        <div style={{
          width: 120, height: 14, borderRadius: 6,
          background: "rgba(255,255,255,0.06)",
          animation: "community-skeleton-pulse 1.2s ease-in-out infinite",
        }} />
      </div>
      {/* Hero area placeholder */}
      <div style={{
        width: "calc(100% - 36px)", height: 180, borderRadius: 16,
        background: "rgba(255,255,255,0.03)",
        margin: "8px 18px 20px",
        animation: "community-skeleton-pulse 1.2s ease-in-out infinite",
        animationDelay: "0.15s",
      }} />
      {/* Shelf placeholders */}
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: "100%", padding: "0 18px", marginBottom: 20 }}>
          <div style={{
            width: 100 + i * 20, height: 12, borderRadius: 4,
            background: "rgba(255,255,255,0.05)",
            marginBottom: 12,
            animation: "community-skeleton-pulse 1.2s ease-in-out infinite",
            animationDelay: `${0.3 + i * 0.15}s`,
          }} />
          <div style={{ display: "flex", gap: 10 }}>
            {[0, 1, 2, 3].map(j => (
              <div key={j} style={{
                width: 90, height: 135, borderRadius: 10, flexShrink: 0,
                background: "rgba(255,255,255,0.03)",
                animation: "community-skeleton-pulse 1.2s ease-in-out infinite",
                animationDelay: `${0.3 + i * 0.15 + j * 0.08}s`,
              }} />
            ))}
          </div>
        </div>
      ))}
      <style>{`
        @keyframes community-skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────

export default function App() {
  // Public routes — bypass auth entirely
  if (window.location.pathname.replace(/\/+$/, "") === "/play") {
    // Dismiss the HTML splash screen (it sits at z-index 9999)
    const splash = document.getElementById("splash-screen");
    if (splash) { splash.classList.add("hidden"); setTimeout(() => splash.remove(), 600); }
    return <TripleFeaturePublic />;
  }

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [screen, setScreen] = useState("loading"); // loading, landing, setup, app
  const [activeTab, setActiveTab] = useState("feed"); // feed, explore, shelf
  const [visitedTabs, setVisitedTabs] = useState(new Set(["feed"])); // only mount tabs after first visit
  const navTapCount = useRef(0);
  const navTapTimer = useRef(null);
  const hasSyncedThisSession = useRef(false);
  const tabSwipeStart = useRef(null);
  const tabSwipeDelta = useRef(0);
  const sliderRef = useRef(null);
  const [tabSwipeOffset, setTabSwipeOffset] = useState(0); // for indicator bar only
  const [preloadTab, setPreloadTab] = useState(null); // tab name to pre-render during swipe
  const [easterEggGame, setEasterEggGame] = useState(false);
  const [showComedyPoints, setShowComedyPoints] = useState(false); // DISABLED for launch
  const [syncComedyToast, setSyncComedyToast] = useState(null); // DISABLED for launch
  const feedTapCount = useRef(0);
  const feedTapTimer = useRef(null);
  const [profileInitView, setProfileInitView] = useState(null); // null or "challenge"
  const [showProfile, setShowProfile] = useState(false); // profile overlay
  const [showTripleFeature, setShowTripleFeature] = useState(false); // Triple Feature game overlay
  const [tfUnplayed, setTfUnplayed] = useState(false); // gold dot on dice icon
  const [showShelfIt, setShowShelfIt] = useState(false);
  const [shelfItCategory, setShelfItCategory] = useState(null);
  const [toast, setToast] = useState(null);
  const [toastExiting, setToastExiting] = useState(false);
  const [toastDuration, setToastDuration] = useState(2200);
  const toastTimer = useRef(null);
  const [letterboxdToast, setLetterboxdToast] = useState(null); // { synced, rewatches }
  const [syncBadgeToasts, setSyncBadgeToasts] = useState([]); // [{badge, current, total, visible}]
  const syncBadgeTimers = useRef([]);

  // Community dashboard: /community/{slug}/dashboard OR subdomain like npp.mymantl.app
  const [communityDashboard, setCommunityDashboard] = useState(() => {
    // Subdomain detection: npp.mymantl.app → "nowplaying"
    const host = window.location.hostname;
    if (host === "npp.mymantl.app") return "nowplaying";
    if (host === "bc.mymantl.app") return "blankcheck";

    // Path detection: /community/{slug}/dashboard
    const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
    const match = path.match(/^community\/([^/]+)\/dashboard$/);
    return match ? match[1] : null;
  });


  // Communities
  const [activeCommunitySlug, setActiveCommunitySlug] = useState(
    () => sessionStorage.getItem("mantl_community") || null
  );
  const [scrollToTmdbId, setScrollToTmdbId] = useState(null);

  // Persist community slug across refresh
  useEffect(() => {
    if (activeCommunitySlug) {
      sessionStorage.setItem("mantl_community", activeCommunitySlug);
    } else {
      sessionStorage.removeItem("mantl_community");
    }
  }, [activeCommunitySlug]);

  // Push nav entry when entering a community so back gesture returns to feed
  useEffect(() => {
    if (activeCommunitySlug) {
      pushNav("community", () => { setScrollToTmdbId(null); setActiveCommunitySlug(null); });
    } else {
      removeNav("community");
    }
  }, [activeCommunitySlug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark tabs as visited when activated or preloaded (so component mounts)
  useEffect(() => {
    setVisitedTabs(prev => {
      const next = new Set(prev);
      if (activeTab) next.add(activeTab);
      if (preloadTab) next.add(preloadTab);
      return next.size !== prev.size ? next : prev;
    });
  }, [activeTab, preloadTab]);


  // User data
  const [profile, setProfile] = useState({
    name: "", username: "", avatar: "", bio: "", avatarUrl: "",
    enabledShelves: { ...DEFAULT_ENABLED_SHELVES },
    shelfOrder: [...DEFAULT_SHELF_ORDER],
  });

  // Shelf data
  const [shelves, setShelves] = useState({
    books: [], movies: [], shows: [], games: [],
    totalItems: 0,
  });
  const [shelvesLoaded, setShelvesLoaded] = useState(false);


  // Letterboxd
  const [letterboxdSyncing, setLetterboxdSyncing] = useState(false);
  const [letterboxdLastSync, setLetterboxdLastSync] = useState(null);
  const [letterboxdSyncSignal, setLetterboxdSyncSignal] = useState(null); // timestamp — triggers badge re-check in community screens
  const [autoLogCompleteSignal, setAutoLogCompleteSignal] = useState(null); // timestamp — triggers feed refresh after community_user_progress rows are written

  // Goodreads
  const [goodreadsSyncing, setGoodreadsSyncing] = useState(false);
  const [goodreadsLastSync, setGoodreadsLastSync] = useState(null);

  // Steam
  const [steamSyncing, setSteamSyncing] = useState(false);

  // Sync locks (refs are synchronous — prevents race conditions that useState can't)
  const letterboxdLock = useRef(false);
  const goodreadsLock = useRef(false);
  const steamLock = useRef(false);

  // Community subscriptions
  const {
    subscriptions: communitySubscriptions,
    isSubscribed,
    subscribe: subscribeCommunity,
    unsubscribe: unsubscribeCommunity,
    seedSubscriptions,
    loaded: subscriptionsLoaded,
  } = useCommunitySubscriptions(session?.user?.id);

  // Wrap subscribe to backfill shelf films into the newly subscribed community
  const handleSubscribeCommunity = async (communityId) => {
    await subscribeCommunity(communityId);
  };

  // Triple Feature — check if today's puzzle is unplayed (for gold dot)
  useEffect(() => {
    if (!session?.user?.id) return;
    hasPlayedToday(session.user.id).then((played) => setTfUnplayed(!played));
  }, [session?.user?.id, showTripleFeature]); // re-check when game closes


  // ── Android back gesture / browser back button navigation ──
  // Components register close callbacks; popstate fires the deepest one
  const backActions = useRef([]); // [{ key, fn }]
  const pushNav = useCallback((key, fn) => {
    // Remove any existing handler for same key (prevent duplicates)
    backActions.current = backActions.current.filter(a => a.key !== key);
    backActions.current.push({ key, fn });
    window.history.pushState({ nav: key }, "");
  }, []);
  const removeNav = useCallback((key) => {
    backActions.current = backActions.current.filter(a => a.key !== key);
  }, []);
  useEffect(() => {
    window.history.replaceState({ nav: 0 }, "");
    const onPop = () => {
      if (backActions.current.length > 0) {
        const action = backActions.current.pop();
        action.fn();
      } else if (activeTab !== "feed") {
        // No registered overlays — go to feed
        setActiveTab("feed");
        window.scrollTo(0, 0);
      } else {
        // Already on feed with nothing open — re-push to prevent app close
        window.history.pushState({ nav: 0 }, "");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [activeTab]);

  // Dismiss HTML splash screen when React has real content to show
  // (not on mount — the HTML splash IS the loading experience)
  useEffect(() => {
    if (screen === "loading") return;
    const splash = document.getElementById("splash-screen");
    if (splash) {
      splash.classList.add("hidden");
      setTimeout(() => splash.remove(), 600);
    }
  }, [screen]);

  // Animate slider to a tab by name (for nav button taps)
  const animateSlider = (tabName) => {
    if (sliderRef.current) {
      const trackEnabled = false; // DISABLED: habits/track tab
      const tabs = ["feed", "explore", "shelf"]; // reordered: feed, communities, my mantl
      const idx = tabs.indexOf(tabName);
      sliderRef.current.classList.add("animating");
      sliderRef.current.style.transform = `translateX(-${idx * 100}%)`;
      sliderRef.current.style.setProperty("--active-index", idx);
      const onEnd = () => { requestAnimationFrame(() => { sliderRef.current?.classList.remove("animating"); }); };
      sliderRef.current.addEventListener("transitionend", onEnd, { once: true });
    }
  };

  // Position slider when activeTab changes (initial load, programmatic switches)
  useEffect(() => {
    if (!sliderRef.current) return;
    const trackEnabled = false; // DISABLED: habits/track tab
    const tabs = ["feed", "explore", "shelf"]; // reordered: feed, communities, my mantl
    const idx = tabs.indexOf(activeTab);
    if (!sliderRef.current.classList.contains("animating")) {
      sliderRef.current.style.transform = `translateX(-${idx * 100}%)`;
      sliderRef.current.style.setProperty("--active-index", idx);
    }
  }, [activeTab]); // track tab disabled, profile moved to overlay

  const showToast = (msg, duration = 2200) => {
    clearTimeout(toastTimer.current);
    setToastExiting(false);
    setToast(msg);
    setToastDuration(duration);
    notifySuccess();
    toastTimer.current = setTimeout(() => {
      setToastExiting(true);
      setTimeout(() => { setToast(null); setToastExiting(false); }, 300);
    }, duration);
  };

  // ── CHECK FOR PUBLIC PROFILE URL ──

  // ── AUTH ──

  useEffect(() => {
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
  }, []);

  const signIn = async () => {
    await sb(supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
      }), showToast, "Couldn't save");

  };

  const signOut = async () => {
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
      // Delete user data from all tables
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
      // Sign out
      await supabase.auth.signOut();
      setSession(null);
      setScreen("landing");
      setProfile({ name: "", username: "", avatar: "", bio: "", avatarUrl: "" });
      setShelves({ books: [], movies: [], shows: [], games: [], totalItems: 0 });
      setShelvesLoaded(false);
      setActiveTab("feed");
    } catch (err) {
      console.error("Delete account error:", err);
    }
  };

  // ── LOAD USER DATA ──

  const loadUserData = async (user) => {
    try {
      // Load or create profile
      let { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!prof) {
        // New user — create profile (may be coming from FiveSeven with existing profile)
        const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
        const avatarUrl = user.user_metadata?.avatar_url || null;
        const { data: newProf } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            name,
            avatar_url: avatarUrl,
            avatar_emoji: "👤",
          })
          .select()
          .single();
        prof = newProf;
      }

      if (prof) {
        // Check if they need username setup
        if (!prof.username) {
          setProfile({
            name: prof.name || "",
            username: "",
            avatar: prof.avatar_emoji || "👤",
            bio: prof.bio || "",
            avatarUrl: prof.avatar_url || "",
          });
          setAuthLoading(false);
          setScreen("setup");
          return;
        }

        setProfile({
          name: prof.name || "",
          username: prof.username || "",
          avatar: prof.avatar_emoji || "👤",
          bio: prof.bio || "",
          avatarUrl: prof.avatar_url || "",
          letterboxd_username: prof.letterboxd_username || null,
          goodreads_user_id: prof.goodreads_user_id || null,
          steam_id: prof.steam_id || null,
          enabledShelves: { ...DEFAULT_ENABLED_SHELVES, ...(prof.enabled_shelves || {}) },
          shelfOrder: prof.shelf_order || [...DEFAULT_SHELF_ORDER],
          nextUpBook: prof.next_up_book || null,
        });
      }

      // Load shelf data
      await loadShelves(user.id);

      // Sync integrations (non-blocking, once per session — dedup prevents duplicates)
      if (!hasSyncedThisSession.current) {
        if (prof.letterboxd_username) {
          syncLetterboxd(prof.letterboxd_username, user.id);
        }
        if (prof.goodreads_user_id) {
          syncGoodreads(prof.goodreads_user_id, user.id);
        }
        if (prof.steam_id) {
          syncSteam(prof.steam_id, user.id);
        }
        hasSyncedThisSession.current = true;
      }

      // If we're on a public profile URL, check if it's ours
      const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
      if (path && path !== "" && path !== "index.html" && !path.includes("/")) {
        window.history.replaceState(null, "", "/");
      }
      setAuthLoading(false);
      setScreen("app");
    } catch (err) {
      console.error("Load user error:", err);
      setAuthLoading(false);
      setScreen("landing");
    }
  };

  // ── LOAD SHELVES ──

  const loadShelves = async (userId) => {
    // Run ALL queries in parallel
    const [
      { data: allBooks },
      { data: activeBooks },
      { data: allMovies },
      { data: allShows },
      { data: allGames },
      { data: allCountries },
    ] = await Promise.all([
      supabase.from("user_books_v").select("id, title, author, cover_url, rating, notes, finished_at, source")
        .eq("user_id", userId).eq("status", "finished").order("finished_at", { ascending: false, nullsFirst: false }),
      supabase.from("user_books_v").select("id, title, author, cover_url, notes, source")
        .eq("user_id", userId).eq("status", "watching"),
      supabase.from("user_films_v").select("id, title, poster_url, rating, year, director, notes, watched_at")
        .eq("user_id", userId).order("watched_at", { ascending: false, nullsFirst: false }),
      supabase.from("user_shows_v").select("id, title, poster_url, tmdb_id, show_status, rating, notes, created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("user_games_v").select("id, title, cover_url, genre, game_status, rating, notes, source, external_id, steam_app_id, extra_data, created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("countries").select("id, country_code, country_name, status, visit_month, visit_year, trip_month, trip_year, notes, photo_url")
        .eq("user_id", userId).order("created_at", { ascending: false }),
    ]);

    const books = (allBooks || []).map((b) => ({
      id: b.id, title: b.title, author: b.author, cover: b.cover_url,
      rating: b.rating, notes: b.notes,
      finishedAt: b.finished_at, source: b.source || "mantl",
    }));

    const currentBooks = (activeBooks || []).map((b) => ({
      id: b.id, title: b.title, author: b.author, cover: b.cover_url,
      notes: b.notes, isReading: true, source: b.source || "mantl",
    }));

    const allBooksCombined = [...currentBooks, ...books];

    const movies = (allMovies || []).map((m) => ({
      id: m.id, title: m.title, cover: m.poster_url, rating: m.rating,
      year: m.year, director: m.director, notes: m.notes, watchedAt: m.watched_at,
    }));

    const shows = (allShows || [])
      .sort((a, b) => (a.show_status === "watching" ? -1 : 1) - (b.show_status === "watching" ? -1 : 1))
      .map((s) => ({
        id: s.id, title: s.title, cover: s.poster_url, tmdbId: s.tmdb_id,
        status: s.show_status, isWatching: s.show_status === "watching",
        rating: s.rating, notes: s.notes,
      }));

    const games = (allGames || [])
      .sort((a, b) => (a.game_status === "playing" ? -1 : 1) - (b.game_status === "playing" ? -1 : 1))
      .map((g) => ({
        id: g.id, title: g.title, cover: g.cover_url, platform: g.extra_data?.platform || null,
        genre: g.genre, status: g.game_status, isPlaying: g.game_status === "playing", isBeat: g.game_status === "beat",
        rating: g.rating, notes: g.notes, source: g.source || null,
        externalId: g.external_id || null, steamAppId: g.steam_app_id || null,
      }));

    const countries = (allCountries || []).map(c => ({
      id: c.id, countryCode: c.country_code, countryName: c.country_name,
      flag: "🏳️", status: c.status,
      visitMonth: c.visit_month, visitYear: c.visit_year,
      tripMonth: c.trip_month, tripYear: c.trip_year,
      notes: c.notes, photoUrl: c.photo_url,
    }));

    const totalItems = books.length + movies.length + shows.length + games.length;

    setShelves({
      books: allBooksCombined, currentBooks, movies, shows, games, countries,
      totalItems,
    });
    setShelvesLoaded(true);
  };

  // ── Letterboxd Integration ──

  // Auto-log synced Letterboxd films into community progress + show badge toasts on Feed
  const autoLogAndCheckBadges = async (syncedFilms, uid) => {
    try {
      if (!syncedFilms.length) return;
      const tmdbIds = syncedFilms.map(f => f.tmdbId);
      const ratingMap = {}; // tmdbId → { rating, watchedDate }
      syncedFilms.forEach(f => { ratingMap[f.tmdbId] = f; });

      // ── 1. Match synced tmdb_ids to community_items (Query 1) ──
      const { data: matchedItems } = await supabase
        .from("community_items")
        .select("id, tmdb_id, miniseries_id, media_type")
        .in("tmdb_id", tmdbIds);

      if (!matchedItems?.length) return;
      const matchedItemIds = matchedItems.map(i => i.id);

      // ── 2. Check existing progress to avoid overwriting (Query 2) ──
      const { data: existingProgress } = await supabase
        .from("community_user_progress")
        .select("item_id, status")
        .eq("user_id", uid)
        .in("item_id", matchedItemIds);

      const existingSet = new Set((existingProgress || []).filter(p => p.status !== "skipped").map(p => p.item_id));

      // ── 3. Upsert new progress rows for items not already logged (Query 3) ──
      const newRows = matchedItems
        .filter(item => !existingSet.has(item.id))
        .map(item => {
          const filmData = ratingMap[item.tmdb_id] || {};
          return {
            user_id: uid,
            item_id: item.id,
            status: "completed",
            rating: filmData.rating ? Math.round(filmData.rating) : null,
            completed_at: filmData.watchedDate ? toLogTimestamp(filmData.watchedDate) : new Date().toISOString(),
            listened_with_commentary: false,
            brown_arrow: false,
            updated_at: new Date().toISOString(),
          };
        });

      if (newRows.length > 0) {
        const { error: upsertErr } = await supabase
          .from("community_user_progress")
          .upsert(newRows, { onConflict: "user_id,item_id" });
        if (upsertErr) console.error("[AutoLog] Community progress upsert error:", upsertErr);
        else console.log(`[AutoLog] Logged ${newRows.length} film(s) into community progress`);

        // ── Comedy Points check — DISABLED for launch ──────
        // Re-enable post-launch: checks if newly logged BC items are comedies,
        // rolls random 1-1000 points, persists to localStorage, shows toast.
      }

      // ── 4. Badge progress check (Queries 4-7) ──
      const miniseriesIds = [...new Set(matchedItems.map(i => i.miniseries_id).filter(Boolean))];
      if (!miniseriesIds.length) return;

      const { data: badges } = await supabase
        .from("badges")
        .select("id, name, image_url, accent_color, miniseries_id, media_type_filter, community_id")
        .in("miniseries_id", miniseriesIds)
        .eq("is_active", true);

      if (!badges?.length) return;

      // Exclude already-earned badges
      const { data: earned } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", uid)
        .in("badge_id", badges.map(b => b.id));
      const earnedSet = new Set((earned || []).map(r => r.badge_id));

      const unearned = badges.filter(b => !earnedSet.has(b.id));
      if (!unearned.length) return;

      // Fetch community slugs for navigation
      const communityIds = [...new Set(unearned.map(b => b.community_id).filter(Boolean))];
      const { data: communityPages } = await supabase
        .from("community_pages")
        .select("id, slug")
        .in("id", communityIds);
      const slugMap = {};
      (communityPages || []).forEach(c => { slugMap[c.id] = c.slug; });

      // Get all items + progress for affected miniseries
      const { data: allItems } = await supabase
        .from("community_items")
        .select("id, miniseries_id, media_type")
        .in("miniseries_id", unearned.map(b => b.miniseries_id));

      const { data: progress } = await supabase
        .from("community_user_progress")
        .select("item_id")
        .eq("user_id", uid)
        .in("item_id", (allItems || []).map(i => i.id))
        .neq("status", "skipped");

      const progressSet = new Set((progress || []).map(p => p.item_id));

      // Build toast data — sorted by completion (completed first, then highest %)
      const toasts = unearned.map(badge => {
        const items = (allItems || []).filter(i => {
          if (i.miniseries_id !== badge.miniseries_id) return false;
          if (badge.media_type_filter && i.media_type !== badge.media_type_filter) return false;
          return true;
        });
        const total = items.length;
        const current = items.filter(i => progressSet.has(i.id)).length;
        const isComplete = current === total && total > 0;
        const slug = slugMap[badge.community_id] || null;
        return { badge, current, total, isComplete, slug };
      }).filter(t => t.current > 0)
        .sort((a, b) => {
          // Completed badges first, then by completion %
          if (a.isComplete !== b.isComplete) return b.isComplete ? 1 : -1;
          return (b.current / b.total) - (a.current / a.total);
        })
        .slice(0, 3); // max 3 stacked toasts

      if (!toasts.length) return;

      // ── 5. Show stacked toasts with staggered entrances ──
      syncBadgeTimers.current.forEach(t => clearTimeout(t));
      syncBadgeTimers.current = [];

      setSyncBadgeToasts(toasts.map(t => ({ ...t, visible: false })));

      toasts.forEach((_, i) => {
        const tid = setTimeout(() => {
          setSyncBadgeToasts(prev => prev.map((t, j) => j === i ? { ...t, visible: true } : t));
        }, i * 350);
        syncBadgeTimers.current.push(tid);
      });

      toasts.forEach((_, i) => {
        const tid = setTimeout(() => {
          setSyncBadgeToasts(prev => prev.map((t, j) => j === i ? { ...t, visible: false } : t));
        }, 4000 + i * 250);
        syncBadgeTimers.current.push(tid);
      });

      const tidClear = setTimeout(() => setSyncBadgeToasts([]), 4000 + toasts.length * 250 + 600);
      syncBadgeTimers.current.push(tidClear);
    } catch (e) {
      console.warn("[AutoLog] Auto-log + badge check failed:", e);
    }
  };

  const parseLetterboxdRating = (ratingStr) => {
    if (!ratingStr) return null;
    const full = (ratingStr.match(/★/g) || []).length;
    const half = ratingStr.includes("½") ? 0.5 : 0;
    return full + half || null;
  };

  const syncLetterboxd = async (username, userId, manual = false) => {
    if (!username || !userId || letterboxdLock.current) return;
    letterboxdLock.current = true;
    setLetterboxdSyncing(true);

    try {
      // Fetch RSS via Supabase Edge Function (server-side, no CORS issues)
      const edgeUrl = `https://api.mymantl.app/functions/v1/letterboxd-rss?username=${encodeURIComponent(username)}${manual ? `&t=${Date.now()}` : ""}`;
      const res = await fetch(edgeUrl);
      const data = await res.json();

      if (!res.ok || data.error) {
        console.error("[Letterboxd] Edge function error:", data.error || res.status);
        showToast(data.error || "Couldn't reach Letterboxd");
        letterboxdLock.current = false;
        setLetterboxdSyncing(false);
        return;
      }

      const rssText = data.contents;
      if (!rssText) {
        showToast("No RSS content — check username");
        letterboxdLock.current = false;
        setLetterboxdSyncing(false);
        return;
      }


      // Parse XML
      const parser = new DOMParser();
      const xml = parser.parseFromString(rssText, "text/xml");
      const items = xml.querySelectorAll("item");

      console.log(`[Letterboxd] RSS returned ${items.length} items`);

      if (items.length === 0) {
        showToast("No entries found — check your Letterboxd username is correct and profile is public");
        letterboxdLock.current = false;
        setLetterboxdSyncing(false);
        return;
      }

      // Get existing movies with watch data (for rewatch detection)
      const { data: existingMovies } = await supabase.from("user_films_v")
        .select("title, year, tmdb_id, watch_dates").eq("user_id", userId);
      const existingSet = new Set((existingMovies || []).map(m => `${m.title}::${m.year}`));
      const existingMap = new Map((existingMovies || []).map(m => [`${m.title}::${m.year}`, m]));

      // Get existing feed entries — check both title and item_title for cross-source dedup
      const { data: existingFeed } = await supabase.from("feed_activity")
        .select("title, item_title").eq("user_id", userId).eq("activity_type", "movie");
      const feedSet = new Set((existingFeed || []).flatMap(f => [f.title, f.item_title].filter(Boolean)));

      let synced = 0;
      const maxSync = 50; // RSS feed returns ~50 entries max
      const BATCH_SIZE = 4; // Process 4 movies concurrently (safe for TMDB 40 req/10s limit)

      // Helper: get text from namespaced or plain element
      const getTagText = (el, tagName) => {
        // Try getElementsByTagName with namespace prefix
        let nodes = el.getElementsByTagName(`letterboxd:${tagName}`);
        if (nodes.length > 0) return nodes[0].textContent;
        // Try getElementsByTagNameNS (Letterboxd namespace)
        try {
          nodes = el.getElementsByTagNameNS("https://letterboxd.com", tagName);
          if (nodes.length > 0) return nodes[0].textContent;
        } catch (e) { /* NS not supported */ }
        // Try plain tag name
        nodes = el.getElementsByTagName(tagName);
        if (nodes.length > 0) return nodes[0].textContent;
        return null;
      };

      // Pre-parse all items into a work queue (XML parsing is sync and fast)
      const workQueue = [];
      const rewatchQueue = []; // existing movies with new watch dates
      for (const item of items) {
        if (workQueue.length >= maxSync) break;

        const filmTitle = getTagText(item, "filmTitle");
        if (!filmTitle) continue;
        const title = filmTitle.trim();
        if (!title) continue;

        const yearStr = getTagText(item, "filmYear");
        const year = yearStr ? parseInt(yearStr) : null;
        const ratingStr = getTagText(item, "memberRating");
        const rating = ratingStr ? parseFloat(ratingStr) : null;
        const watchedDate = getTagText(item, "watchedDate");
        const titleText = getTagText(item, "title") || "";
        const ratingFromTitle = rating || parseLetterboxdRating(titleText.match(/★[★½]*/)?.[0]);

        const dedupKey = `${title}::${year}`;

        // Get TMDB ID from RSS if available
        const rssTmdbId = (() => {
          let nodes = item.getElementsByTagName("tmdb:movieId");
          if (nodes.length > 0) return nodes[0].textContent;
          try { nodes = item.getElementsByTagNameNS("https://themoviedb.org", "movieId"); if (nodes.length > 0) return nodes[0].textContent; } catch (e) {}
          return null;
        })();

        // Check if this is a rewatch of an existing movie
        if (existingSet.has(dedupKey)) {
          const existing = existingMap.get(dedupKey);
          if (existing && watchedDate) {
            const dateStr = new Date(watchedDate).toISOString().slice(0, 10);
            const knownDates = (existing.watch_dates || []).map(d => String(d).slice(0, 10));
            if (!knownDates.includes(dateStr)) {
              // New watch date — queue a rewatch update
              rewatchQueue.push({
                tmdb_id: existing.tmdb_id,
                title,
                year,
                newDate: dateStr,
                currentDates: existing.watch_dates || [],
                rating: ratingFromTitle || null,
              });
              // Update local map so subsequent RSS entries don't double-count
              existing.watch_dates = [...(existing.watch_dates || []), dateStr].sort();
            }
          }
          continue;
        }

        existingSet.add(dedupKey); // Mark early to prevent intra-batch dupes
        workQueue.push({ title, year, rating, ratingFromTitle, watchedDate, dedupKey, rssTmdbId: rssTmdbId ? parseInt(rssTmdbId) : null });
      }

      console.log(`[Letterboxd] ${workQueue.length} new films to sync`);

      // Process a single movie (used inside Promise.all batches)
      const processMovie = async ({ title, year, ratingFromTitle, watchedDate, rssTmdbId }) => {
        let tmdbId = rssTmdbId;
        let poster = null, backdrop = null, director = null, genre = null, runtime = null, genreIds = [];

        // If RSS didn't have a TMDB ID, search by title
if (!tmdbId) {
          try {
            const results = await searchTMDBRaw(title, year);
            const match = results[0];
            if (match) tmdbId = match.id;
          } catch (e) { /* ignore search errors */ }
        }

        // Fetch poster, director, genre from TMDB details
        if (tmdbId) {
          try {
            const detail = await fetchTMDBRaw(tmdbId, "movie", "credits");
            if (detail && !detail.error) {
              poster = detail.poster_path ? `${TMDB_IMG}/w342${detail.poster_path}` : null;
              backdrop = detail.backdrop_path ? `${TMDB_IMG}/w780${detail.backdrop_path}` : null;
              director = detail.credits?.crew?.find(c => c.job === "Director")?.name || null;
              genre = (detail.genres || []).slice(0, 2).map(g => g.name).join(", ") || null;
              genreIds = (detail.genres || []).map(g => g.id);
              runtime = detail.runtime || null;
            }
          } catch (e) { console.warn(`[Letterboxd] Detail fetch failed for tmdbId ${tmdbId}:`, e); }
        }

        if (!tmdbId) {
          console.warn(`[Letterboxd] No TMDB match for "${title}" (${year}) — skipping`);
          return null;
        }

        // Upsert movie
        const watchDateStr = watchedDate ? new Date(watchedDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        // Write to media + user_media_logs (unified) — also handles feed + wishlist
        const mediaId = await upsertMediaLog(userId, {
          mediaType: "film",
          tmdbId: tmdbId,
          title, year,
          creator: director,
          posterPath: poster ? toPosterPath(poster) : null,
          backdropPath: backdrop ? toPosterPath(backdrop) : null,
          runtime, genre,
          rating: ratingFromTitle || null,
          watchedAt: watchedDate ? toLogTimestamp(watchedDate) : new Date().toISOString(),
          watchedDate: watchDateStr,  // timezone-safe display date
          source: "letterboxd",
          watchCount: 1,
          watchDates: [watchDateStr],
        });
        if (!mediaId) console.error("[Letterboxd] upsert_media_log failed for", title);

        return { title, tmdbId, rating: ratingFromTitle || null, watchedDate, genreIds };
      };

      // Process in parallel batches
      const syncedFilms = []; // { tmdbId, rating, watchedDate, genreIds }
      for (let i = 0; i < workQueue.length; i += BATCH_SIZE) {
        const batch = workQueue.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(processMovie));
        const successful = results.filter(Boolean);
        synced += successful.length;
        successful.forEach(r => { if (r.tmdbId) syncedFilms.push(r); });
        // Brief pause between batches to stay within TMDB rate limits
        if (i + BATCH_SIZE < workQueue.length) await new Promise(r => setTimeout(r, 250));
      }

      // Process rewatch updates (existing movies with new watch dates)
      let rewatchCount = 0;
      for (const rw of rewatchQueue) {
        const newDates = [...(rw.currentDates || []), rw.newDate].sort();
        const newCount = newDates.length;
        const rewatchDatesOnly = newDates.slice(1); // all dates after the first watch

        // 1. Update movies table (source of truth) — bump watched_at so feed shows it
        const { error: rwErr } = await supabase.rpc("update_rewatch_data", {
          p_user_id: userId,
          p_tmdb_id: rw.tmdb_id,
          p_watch_dates: newDates,
          p_watched_at: new Date(new Date(toLogTimestamp(rw.newDate)).getTime()).toISOString(),
        });

        if (rwErr) {
          console.warn(`[Letterboxd] Rewatch update failed for "${rw.title}":`, rwErr.message);
          continue;
        }

        rewatchCount++;

        // 2. Propagate to community_user_progress for all communities that have this film
        try {
          const { data: communityItems } = await supabase
            .from("community_items")
            .select("id")
            .eq("tmdb_id", rw.tmdb_id);

          if (communityItems && communityItems.length > 0) {
            const itemIds = communityItems.map(ci => ci.id);

            // Only update rows that already exist (user has logged it in that community)
            const { data: existingProgress } = await supabase
              .from("community_user_progress")
              .select("item_id")
              .eq("user_id", userId)
              .in("item_id", itemIds);

            if (existingProgress && existingProgress.length > 0) {
              const progressItemIds = existingProgress.map(p => p.item_id);
              // FIX: Also update completed_at so the rewatch floats to the top
              // of the feed (feed_user_logs sorts by COALESCE(completed_at, created_at))
              // Clamp to now — noon UTC on the same day can be hours in the future
              const rewatchTimestamp = new Date(
                new Date(toLogTimestamp(rw.newDate)).getTime()
              ).toISOString();
              await supabase
                .from("community_user_progress")
                .update({
                  rewatch_count: newCount - 1, // rewatch_count = total watches minus the first
                  rewatch_dates: rewatchDatesOnly,
                  completed_at: rewatchTimestamp,
                  updated_at: rewatchTimestamp,
                })
                .eq("user_id", userId)
                .in("item_id", progressItemIds);

              console.log(`[Letterboxd] Updated rewatch in ${progressItemIds.length} community(ies) for "${rw.title}"`);
            }
          }
        } catch (e) {
          console.warn(`[Letterboxd] Community rewatch propagation failed for "${rw.title}":`, e.message);
        }
      }
      if (rewatchCount > 0) {
        console.log(`[Letterboxd] Updated ${rewatchCount} rewatch(es)`);
      }

      setLetterboxdLastSync(new Date());
      if (synced > 0 || rewatchCount > 0) {
        const parts = [];
        if (synced > 0) parts.push(`${synced} new film${synced !== 1 ? "s" : ""}`);
        if (rewatchCount > 0) parts.push(`${rewatchCount} rewatch${rewatchCount !== 1 ? "es" : ""}`);
        setLetterboxdToast({ synced, rewatches: rewatchCount });
        setLetterboxdSyncSignal(Date.now()); // notify community screens to re-check badges
        await loadShelves(userId);
        // Auto-log into communities + show badge progress toasts after sync toast has its moment
        if (syncedFilms.length > 0) {
          setTimeout(async () => {
            await autoLogAndCheckBadges(syncedFilms, userId);
            setAutoLogCompleteSignal(Date.now());
          }, 2800);
        } else {
          // Rewatches only — refresh feed after toast
          setTimeout(async () => {
            setAutoLogCompleteSignal(Date.now());
          }, 3200);
        }
      } else if (manual) {
        showToast("Letterboxd up to date ✓");
      }
    } catch (e) {
      console.error("[Letterboxd] Sync error:", e);
      if (manual) showToast("Letterboxd sync failed — check username");
    }
    letterboxdLock.current = false;
    setLetterboxdSyncing(false);
  };

  const connectLetterboxd = async (username) => {
    if (!username || !session) return;
    const clean = username.trim().toLowerCase();
    const { error } = await supabase.from("profiles").update({ letterboxd_username: clean }).eq("id", session.user.id);
    if (error) { showToast("Couldn't save username"); return; }
    setProfile(prev => ({ ...prev, letterboxd_username: clean }));
    showToast("Letterboxd connected! Syncing...");
    syncLetterboxd(clean, session.user.id, true);
  };

  const disconnectLetterboxd = async () => {
    if (!session) return;
    await supabase.from("profiles").update({ letterboxd_username: null }).eq("id", session.user.id);
    setProfile(prev => ({ ...prev, letterboxd_username: null }));
    setLetterboxdLastSync(null);
    showToast("Letterboxd disconnected");
  };

  // ── Goodreads Integration ──
  const syncGoodreads = async (grUserId, userId, manual = false) => {
    if (!grUserId || !userId || goodreadsLock.current) return;
    goodreadsLock.current = true;
    setGoodreadsSyncing(true);

    try {
      const edgeUrl = `https://api.mymantl.app/functions/v1/goodreads-rss?user_id=${encodeURIComponent(grUserId)}&shelf=read${manual ? `&t=${Date.now()}` : ""}`;
      const res = await fetch(edgeUrl);
      const data = await res.json();

      if (!res.ok || data.error) {
        console.error("[Goodreads] Edge function error:", data.error || res.status);
        showToast(data.error || "Couldn't reach Goodreads");
        goodreadsLock.current = false;
        setGoodreadsSyncing(false);
        return;
      }

      const rssText = data.contents;
      if (!rssText) {
        showToast("No RSS content — check user ID");
        goodreadsLock.current = false;
        setGoodreadsSyncing(false);
        return;
      }

      const parser = new DOMParser();
      const xml = parser.parseFromString(rssText, "text/xml");
      const items = xml.querySelectorAll("item");

      console.log(`[Goodreads] RSS returned ${items.length} items`);

      if (items.length === 0) {
        showToast("No entries found — check your Goodreads user ID and that your profile is public");
        goodreadsLock.current = false;
        setGoodreadsSyncing(false);
        return;
      }

      // Get existing books to avoid duplicates (by title+author)
      const { data: existingBooks } = await supabase.from("user_books_v")
        .select("title, author").eq("user_id", userId);
      const existingTitleSet = new Set((existingBooks || []).map(b => `${b.title}::${b.author}`));

      const getTagText = (el, tagName) => {
        const nodes = el.getElementsByTagName(tagName);
        return nodes.length > 0 ? nodes[0].textContent?.trim() || null : null;
      };

      // Pre-parse all items into a work queue
      const workQueue = [];
      const maxSync = 100;

      for (const item of items) {
        if (workQueue.length >= maxSync) break;

        const title = getTagText(item, "title");
        if (!title) continue;

        const authorName = getTagText(item, "author_name")?.trim() || null;
        const bookId = getTagText(item, "book_id");
        const userRating = getTagText(item, "user_rating");
        const rating = userRating ? parseInt(userRating) : null;
        const numPages = getTagText(item, "num_pages");
        const totalPages = numPages ? parseInt(numPages) : null;
        const userReadAt = getTagText(item, "user_read_at");
        const coverUrl = getTagText(item, "book_large_image_url") || getTagText(item, "book_medium_image_url") || getTagText(item, "book_image_url");
        const isbn = getTagText(item, "isbn");

        // Skip if already exists (by title+author)
        const dedupKey = `${title}::${authorName}`;
        if (existingTitleSet.has(dedupKey)) {
          if (manual) console.log(`[Goodreads] Skipping (exists by title+author): ${title}`);
          continue;
        }

        existingTitleSet.add(dedupKey);
        workQueue.push({ title, author: authorName, bookId, rating: rating || null, totalPages, userReadAt, coverUrl, isbn });
      }

      console.log(`[Goodreads] ${workQueue.length} new books to sync`);

      let synced = 0;
      const BATCH_SIZE = 6; // No external API calls per book, so we can batch more aggressively

      const processBook = async ({ title, author, bookId, rating, totalPages, userReadAt, coverUrl, isbn }) => {
        // Parse finished date
        let finishedAt = null;
        if (userReadAt) {
          try { finishedAt = new Date(userReadAt).toISOString(); } catch (e) { /* */ }
        }

        const cleanCover = coverUrl && !coverUrl.includes("nophoto") ? coverUrl : null;

        // Write to media + user_media_logs (unified) — also handles feed + wishlist
        const mediaId = await upsertMediaLog(userId, {
          mediaType: "book",
          isbn: isbn || null,
          title,
          creator: author,
          posterPath: cleanCover,
          rating: rating || null,
          watchedAt: finishedAt || new Date().toISOString(),
          source: "goodreads",
          status: "finished",
        });

        if (!mediaId) {
          console.error("[Goodreads] upsert_media_log failed for", title);
          return null;
        }

        return title;
      };

      // Process in parallel batches (no TMDB calls so we can go faster)
      for (let i = 0; i < workQueue.length; i += BATCH_SIZE) {
        const batch = workQueue.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(processBook));
        synced += results.filter(Boolean).length;
      }

      setGoodreadsLastSync(new Date());
      if (synced > 0) {
        showToast(`Synced ${synced} book${synced !== 1 ? "s" : ""} from Goodreads`);
        await loadShelves(userId);
      } else if (manual) {
        showToast("Goodreads up to date ✓");
      }
    } catch (e) {
      console.error("[Goodreads] Sync error:", e);
      if (manual) showToast("Goodreads sync failed — check user ID");
    }
    goodreadsLock.current = false;
    setGoodreadsSyncing(false);
  };

  const connectGoodreads = async (grUserId) => {
    if (!grUserId || !session) return;
    const clean = grUserId.trim();
    const { error } = await supabase.from("profiles").update({ goodreads_user_id: clean }).eq("id", session.user.id);
    if (error) { showToast("Couldn't save user ID"); return; }
    setProfile(prev => ({ ...prev, goodreads_user_id: clean }));
    showToast("Goodreads connected! Syncing...");
    syncGoodreads(clean, session.user.id, true);
  };

  const disconnectGoodreads = async () => {
    if (!session) return;
    await supabase.from("profiles").update({ goodreads_user_id: null }).eq("id", session.user.id);
    setProfile(prev => ({ ...prev, goodreads_user_id: null }));
    setGoodreadsLastSync(null);
    showToast("Goodreads disconnected");
  };

  // ── Steam Integration ──
  const STEAM_EDGE = "https://api.mymantl.app/functions/v1/steam";

  const syncSteam = async (steamId, userId, manual = false) => {
    if (!steamId || !userId || steamLock.current) return;
    steamLock.current = true;
    setSteamSyncing(true);

    // Auth header for edge function (verify_jwt: true)
    const steamHeaders = {};
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.access_token) steamHeaders["Authorization"] = `Bearer ${s.access_token}`;
    } catch {}

    try {
      // Fetch both recent and owned in parallel
      const [recentRes, ownedRes] = await Promise.all([
        fetch(`${STEAM_EDGE}?action=recent&steam_id=${steamId}`, { headers: steamHeaders }),
        fetch(`${STEAM_EDGE}?action=owned&steam_id=${steamId}`, { headers: steamHeaders }),
      ]);
      const recentData = await recentRes.json();
      const ownedData = await ownedRes.json();

      if (recentData.error && ownedData.error) {
        console.error("[Steam] API error:", recentData.error || ownedData.error);
        if (manual) showToast("Steam sync failed — check your profile is public");
        steamLock.current = false;
        setSteamSyncing(false);
        return;
      }

      // Build set of recently played app IDs (last 2 weeks)
      const recentGames = recentData.games || [];
      const recentIds = new Set(recentGames.map(g => String(g.appid)));
      const recentMap = {};
      recentGames.forEach(g => { recentMap[String(g.appid)] = g; });

      // Filter owned games: 5+ hours played, sorted by playtime descending
      const MIN_HOURS = 5;
      const allOwned = (ownedData.games || [])
        .filter(g => (g.playtime_forever || 0) >= MIN_HOURS * 60)
        .sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0));


      if (allOwned.length === 0 && recentGames.length === 0) {
        if (manual) showToast("No Steam games found — is your profile public?");
        steamLock.current = false;
        setSteamSyncing(false);
        return;
      }

      // Get existing games for dedup (from unified view)
      const { data: existingGames } = await supabase.from("user_games_v")
        .select("steam_app_id, game_status").eq("user_id", userId).not("steam_app_id", "is", null);
      const existingMap = {};
      (existingGames || []).forEach(g => { existingMap[String(g.steam_app_id)] = g.game_status; });

      // Get existing feed entries for dedup
      const { data: existingFeed } = await supabase.from("feed_activity")
        .select("title, item_title").eq("user_id", userId).eq("activity_type", "game");
      const feedSet = new Set((existingFeed || []).flatMap(f => [f.title, f.item_title].filter(Boolean)));

      let synced = 0;
      const maxSync = manual ? 50 : 10; // More on manual, less on auto

      for (const game of allOwned) {
        if (synced >= maxSync) break;

        const appId = String(game.appid);
        const title = game.name;
        const playtimeHours = Math.round((game.playtime_forever || 0) / 60 * 10) / 10;
        const isRecentlyPlayed = recentIds.has(appId);
        const playtime2Weeks = isRecentlyPlayed
          ? Math.round((recentMap[appId]?.playtime_2weeks || 0) / 60 * 10) / 10
          : 0;

        // Steam cover images
        const coverUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`;
        const headerUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;

        // Fetch achievements for this game
        let achievementsEarned = null, achievementsTotal = null;
        try {
          const achRes = await fetch(`${STEAM_EDGE}?action=achievements&steam_id=${steamId}&app_id=${appId}`, { headers: steamHeaders });
          const achData = await achRes.json();
          if (achData.achievements) {
            achievementsTotal = achData.achievements.length;
            achievementsEarned = achData.achievements.filter(a => a.achieved === 1).length;
          }
        } catch (e) { /* Some games don't have achievements */ }

        // Build notes with playtime + achievements
        let noteParts = [];
        if (playtimeHours > 0) noteParts.push(`${playtimeHours}h`);
        if (achievementsTotal > 0) noteParts.push(`${achievementsEarned}/${achievementsTotal} 🏆`);
        const notesStr = noteParts.length > 0 ? noteParts.join(" · ") : null;

        // Determine display status: beat > playing > backlog
        const isBeat = achievementsTotal > 0 && achievementsEarned === achievementsTotal;
        let status = isRecentlyPlayed ? "playing" : "backlog";
        if (isBeat) status = "beat";

        // Don't downgrade: if already "beat", skip unless this is also beat
        const existingStatus = existingMap[appId];
        if (existingStatus === "beat" && !isBeat) continue;
        // If existing and no meaningful status change, skip
        if (existingStatus && existingStatus === status) continue;

        // Log via unified media path
        await logGame(userId,
          { title, steam_app_id: parseInt(appId) },
          coverUrl,
          { status, platform: "PC", steamAppId: parseInt(appId), notes: notesStr }
        );

        existingMap[appId] = status;

        // Post to feed only for recently played games (not entire library)
        if (isRecentlyPlayed && playtime2Weeks > 0) {
          const feedKey = `steam_${appId}_active`;
          if (!feedSet.has(feedKey) && !feedSet.has(title)) {
            const feedRow = {
              user_id: userId, activity_type: "game", action: "playing",
              title: feedKey, item_title: title, item_cover: headerUrl,
              metadata: {
                source: "steam", steam_app_id: appId,
                playtime_total: playtimeHours, playtime_2weeks: playtime2Weeks,
                achievements_earned: achievementsEarned, achievements_total: achievementsTotal,
              },
            };
            const { error: feedErr } = await supabase.from("feed_activity").insert(feedRow);
            if (feedErr) console.error("[Steam] Feed insert error:", feedErr.message);
            feedSet.add(feedKey);
            feedSet.add(title);
          }
        }

        synced++;
        // Throttle every 5 games
        if (synced % 5 === 0) await new Promise(r => setTimeout(r, 300));
      }

      if (synced > 0) {
        if (manual) showToast(`Synced ${synced} game${synced !== 1 ? "s" : ""} from Steam`);
        await loadShelves(userId);
      } else if (manual) {
        showToast("Steam up to date ✓");
      }
    } catch (e) {
      console.error("[Steam] Sync error:", e);
      if (manual) showToast("Steam sync failed");
    }
    steamLock.current = false;
    setSteamSyncing(false);
  };

  const connectSteam = async (input) => {
    if (!input || !session) return;
    const clean = input.trim();
    setSteamSyncing(true);

    // Check if it's a vanity URL or a Steam ID (numeric)
    let steamId = clean;
    if (!/^\d+$/.test(clean)) {
      // Resolve vanity URL
      // Auth header for edge function
      const headers = {};
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
      } catch {}
      try {
        const res = await fetch(`${STEAM_EDGE}?action=resolve&vanity=${encodeURIComponent(clean)}`, { headers });
        const data = await res.json();
        if (data.success === 1 && data.steamid) {
          steamId = data.steamid;
        } else {
          showToast("Couldn't find that Steam profile — try your Steam ID number");
          setSteamSyncing(false);
          return;
        }
      } catch (e) {
        showToast("Couldn't reach Steam");
        setSteamSyncing(false);
        return;
      }
    }

    const { error } = await supabase.from("profiles").update({ steam_id: steamId }).eq("id", session.user.id);
    if (error) { showToast("Couldn't save"); setSteamSyncing(false); return; }
    setProfile(prev => ({ ...prev, steam_id: steamId }));
    showToast("Steam connected! Syncing...");
    setSteamSyncing(false);
    syncSteam(steamId, session.user.id, true);
  };

  const disconnectSteam = async () => {
    if (!session) return;
    await supabase.from("profiles").update({ steam_id: null }).eq("id", session.user.id);
    setProfile(prev => ({ ...prev, steam_id: null }));
    showToast("Steam disconnected");
  };

  // ── USERNAME SETUP COMPLETE ──

  const handleUsernameComplete = async (username, enabledShelves, communityIds) => {
    if (!session) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        username,
        enabled_shelves: enabledShelves,
      })
      .eq("id", session.user.id);

    if (error) {
      console.error("Username save error:", error);
      return;
    }

    // Seed community subscriptions from onboarding
    if (communityIds && communityIds.length > 0) {
      await seedSubscriptions(communityIds);
    }

    setProfile((prev) => ({ ...prev, username, enabledShelves }));
    await loadShelves(session.user.id);

    setScreen("app");
    showToast(`Welcome to Mantl, @${username}`);
  };

  // ── SHELF IT ──

  const openShelfIt = (category) => {
    setShelfItCategory(category || null);
    setShowShelfIt(true);
    pushNav("shelfIt", () => setShowShelfIt(false));
  };

  // ── RENDER ──

  return (
    <AudioPlayerProvider session={session}>

      <div className="mantl-app">

        {easterEggGame && <FlappyMantl onClose={() => setEasterEggGame(false)} />}
        {/* DISABLED for launch — Comedy Points
        {showComedyPoints && <ComedyPointsReveal userId={session?.user?.id} onClose={() => setShowComedyPoints(false)} />}
        {syncComedyToast && (
          <ComedyPointsToast
            points={syncComedyToast.points}
            visible={syncComedyToast.visible}
            onDone={() => setSyncComedyToast(null)}
          />
        )}
        */}
        {letterboxdToast && (
          <LetterboxdSyncToast
            synced={letterboxdToast.synced}
            rewatches={letterboxdToast.rewatches}
            duration={3600}
            onDone={() => setLetterboxdToast(null)}
          />
        )}
        {toast && (() => {
          const msg = typeof toast === "string" ? toast : "";
          const isError = /couldn't|failed|error|check/i.test(msg);
          const isInfo  = /up to date|syncing|connected|disconnected|welcome/i.test(msg);
          const stripeColor = isError ? "#f87171" : isInfo ? "#EF9F27" : "#34d399";
          // Strip emoji for Permanent Marker rendering — they look off in that font
          const clean = msg.replace(/[\u{1F300}-\u{1FFFF}]/gu, "").replace(/[🎬🎮📚🔁🎧🌍✓]/g, "").trim();
          return (
            <div className={`toast${toastExiting ? " toast-exit" : ""}`}>
              <div style={{ height: 5, background: stripeColor }} />
              <div className="toast-inner">
                <div className="toast-msg">{clean}</div>
              </div>
              <div className="toast-countdown">
                <div className="toast-countdown-bar" style={{ animationDuration: `${toastDuration}ms` }} />
              </div>
            </div>
          );
        })()}
        <style>{`
          @keyframes toast-countdown {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>

        {/* Loading — HTML splash screen covers this period visually */}
        {screen === "loading" && (
          <div className="loading-screen" />
        )}

        {/* Landing */}
        {screen === "landing" && (
          <LandingScreen onSignIn={signIn} />
        )}


        {/* Username Setup */}
        {screen === "setup" && (
          <UsernameSetup
            name={profile.name}
            session={session}
            onComplete={handleUsernameComplete}
          />
        )}

        {/* Main App */}
        {screen === "app" && (
          <div className="screen-fade">
            <div className="header">
              <div
                onClick={() => {
                  tapLight();
                  setShowTripleFeature(true);
                  pushNav("tripleFeature", () => setShowTripleFeature(false));
                }}
                style={{
                  width: 32, height: 32, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                }}
              >
                {tfUnplayed ? (
                  <svg width="20" height="22" viewBox="0 0 22 22" fill="none" style={{ transform: "rotate(-12deg)", transition: "transform 0.3s ease" }}>
                    <rect x="3" y="1" width="16" height="20" rx="2" stroke="#d4af37" strokeWidth="1" fill="none"/>
                    <rect x="6" y="3.5" width="10" height="5.5" rx="1" fill="#d4af37" opacity="0.12"/>
                    <rect x="6" y="13" width="10" height="5.5" rx="1" fill="#d4af37" opacity="0.12"/>
                    <line x1="6" y1="11" x2="16" y2="11" stroke="#d4af37" strokeWidth="0.5" opacity="0.4"/>
                    <circle cx="4.5" cy="4" r="0.7" fill="#d4af37" opacity="0.6"/><circle cx="4.5" cy="7.5" r="0.7" fill="#d4af37" opacity="0.6"/><circle cx="4.5" cy="11" r="0.7" fill="#d4af37" opacity="0.6"/><circle cx="4.5" cy="14.5" r="0.7" fill="#d4af37" opacity="0.6"/><circle cx="4.5" cy="18" r="0.7" fill="#d4af37" opacity="0.6"/>
                    <circle cx="17.5" cy="4" r="0.7" fill="#d4af37" opacity="0.6"/><circle cx="17.5" cy="7.5" r="0.7" fill="#d4af37" opacity="0.6"/><circle cx="17.5" cy="11" r="0.7" fill="#d4af37" opacity="0.6"/><circle cx="17.5" cy="14.5" r="0.7" fill="#d4af37" opacity="0.6"/><circle cx="17.5" cy="18" r="0.7" fill="#d4af37" opacity="0.6"/>
                  </svg>
                ) : (
                  <svg width="18" height="20" viewBox="0 0 18 22" fill="none" style={{ transition: "transform 0.3s ease" }}>
                    <rect x="1" y="1" width="16" height="20" rx="2" stroke="#9a8ec2" strokeWidth="1" fill="none"/>
                    <rect x="4.5" y="3.5" width="9" height="5" rx="1" fill="#9a8ec2" opacity="0.15"/>
                    <rect x="4.5" y="13.5" width="9" height="5" rx="1" fill="#9a8ec2" opacity="0.15"/>
                    <line x1="4.5" y1="11" x2="13.5" y2="11" stroke="#9a8ec2" strokeWidth="0.5" opacity="0.3"/>
                    <circle cx="2.5" cy="3.5" r="0.7" fill="#9a8ec2" opacity="0.5"/><circle cx="2.5" cy="7" r="0.7" fill="#9a8ec2" opacity="0.5"/><circle cx="2.5" cy="10.5" r="0.7" fill="#9a8ec2" opacity="0.5"/><circle cx="2.5" cy="14" r="0.7" fill="#9a8ec2" opacity="0.5"/><circle cx="2.5" cy="17.5" r="0.7" fill="#9a8ec2" opacity="0.5"/>
                    <circle cx="15.5" cy="3.5" r="0.7" fill="#9a8ec2" opacity="0.5"/><circle cx="15.5" cy="7" r="0.7" fill="#9a8ec2" opacity="0.5"/><circle cx="15.5" cy="10.5" r="0.7" fill="#9a8ec2" opacity="0.5"/><circle cx="15.5" cy="14" r="0.7" fill="#9a8ec2" opacity="0.5"/><circle cx="15.5" cy="17.5" r="0.7" fill="#9a8ec2" opacity="0.5"/>
                  </svg>
                )}
              </div>
              <div onClick={() => { removeNav("tab"); animateSlider("feed"); setActiveTab("feed"); }} style={{ cursor: "pointer", flex: 1, minWidth: 0, textAlign: "center" }}>
                <div className="header-brand">
                  M<span className="header-play-btn"><span className="header-play-bg" /><span className="header-play-tri" /></span>NTL
                  <span className="header-brand-line" />
                </div>
                <div className="header-tagline">press play</div>
              </div>
              <div className="header-avatar-wrap" onClick={() => { tapLight(); setShowProfile(true); pushNav("profile", () => setShowProfile(false)); }}>
                <div className="header-profile">
                  {profile.avatarUrl
                    ? <img src={profile.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                    : <InitialAvatar username={profile.username} size={32} />}
                </div>
              </div>
            </div>

            <div className="main"
              style={{ touchAction: "pan-y" }}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                let el = e.target;
                while (el && el !== e.currentTarget) {
                  if (el.scrollWidth > el.clientWidth + 2) {
                    const style = window.getComputedStyle(el);
                    const ox = style.overflowX;
                    if (ox === "auto" || ox === "scroll") {
                      tabSwipeStart.current = null;
                      return;
                    }
                  }
                  el = el.parentElement;
                }
                tabSwipeStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now(), locked: false };
                tabSwipeDelta.current = 0;
                if (sliderRef.current) {
                  sliderRef.current.classList.remove("animating");
                  sliderRef.current.classList.add("swiping");
                }
              }}
              onTouchMove={(e) => {
                if (!tabSwipeStart.current) return;
                const dx = e.touches[0].clientX - tabSwipeStart.current.x;
                const dy = e.touches[0].clientY - tabSwipeStart.current.y;
                if (!tabSwipeStart.current.locked && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
                  if (sliderRef.current) sliderRef.current.classList.remove("swiping");
                  tabSwipeStart.current = null;
                  return;
                }
                if (Math.abs(dx) > 10) {
                  tabSwipeStart.current.locked = true;
                  tabSwipeDelta.current = dx;
                  const trackEnabled = false; // DISABLED: habits/track tab
                  const tabs = ["feed", "explore", "shelf"]; // reordered: feed, communities, my mantl
                  const idx = tabs.indexOf(activeTab);
                  const screenW = window.innerWidth;
                  // Preload adjacent tab
                  const targetIdx = dx < 0 ? Math.min(idx + 1, tabs.length - 1) : Math.max(idx - 1, 0);
                  const target = tabs[targetIdx];
                  if (target !== activeTab && target !== preloadTab) setPreloadTab(target);
                  // Edge resistance
                  const atLeft = idx === 0 && dx > 0;
                  const atRight = idx === tabs.length - 1 && dx < 0;
                  const resist = atLeft || atRight ? 0.15 : 1;
                  const offset = dx * resist;
                  // Move slider directly (no React re-render)
                  if (sliderRef.current) {
                    sliderRef.current.style.transform = `translateX(calc(-${idx * 100}% + ${offset}px))`;
                  }
                  // Update indicator bar
                  setTabSwipeOffset((dx / screenW) * resist);
                }
              }}
              onTouchEnd={() => {
                if (!tabSwipeStart.current) return;
                const dx = tabSwipeDelta.current;
                // Tap (no swipe movement) — bail without state changes so click fires
                if (Math.abs(dx) < 5) {
                  if (sliderRef.current) sliderRef.current.classList.remove("swiping");
                  tabSwipeStart.current = null;
                  tabSwipeDelta.current = 0;
                  return;
                }
                const dt = Date.now() - tabSwipeStart.current.time;
                const velocity = Math.abs(dx) / dt;
                const threshold = velocity > 0.5 ? 50 : 120;
                const trackEnabled = false; // DISABLED: habits/track tab
                const tabs = ["feed", "explore", "shelf"]; // reordered: feed, communities, my mantl
                const idx = tabs.indexOf(activeTab);
                let nextIdx = idx;
                if (dx < -threshold && idx < tabs.length - 1) {
                  nextIdx = idx + 1;
                  const next = tabs[nextIdx];
                  if (activeTab !== next) pushNav("tab", () => { setActiveTab("feed"); });
                  setActiveTab(next);
                } else if (dx > threshold && idx > 0) {
                  nextIdx = idx - 1;
                  const prev = tabs[nextIdx];
                  if (prev === "feed") removeNav("tab");
                  else pushNav("tab", () => { setActiveTab("feed"); });
                  setActiveTab(prev);
                }
                // Animate to final position
                if (nextIdx !== idx) tapLight(); // haptic on successful swipe
                if (sliderRef.current) {
                  sliderRef.current.classList.remove("swiping");
                  sliderRef.current.classList.add("animating");
                  sliderRef.current.style.transform = `translateX(-${nextIdx * 100}%)`;
                  sliderRef.current.style.setProperty("--active-index", nextIdx);
                  const onEnd = () => { requestAnimationFrame(() => { sliderRef.current?.classList.remove("animating"); }); };
                  sliderRef.current.addEventListener("transitionend", onEnd, { once: true });
                }
                tabSwipeStart.current = null;
                tabSwipeDelta.current = 0;
                setTabSwipeOffset(0);
                setPreloadTab(null);
              }}
            >
              <div
                className="tab-slider"
                ref={sliderRef}
              >
              {/* Feed Tab */}
              <div className="tab-pane" key="feed-tab">
                <FeedScreen
                  session={session}
                  profile={profile}
                  onToast={showToast}
                  isActive={activeTab === "feed"}
                  onNavigateCommunity={(slug, tmdbId) => { tapLight(); setScrollToTmdbId(tmdbId || null); setActiveCommunitySlug(slug); }}
                  letterboxdSyncSignal={letterboxdSyncSignal}
                  autoLogCompleteSignal={autoLogCompleteSignal}
                  communitySubscriptions={communitySubscriptions}
                />
              </div>

              {/* Communities Tab */}
              <div className="tab-pane" key="explore-tab">
                {visitedTabs.has("explore") && <ExploreScreen
                  session={session}
                  onOpenCommunity={(slug) => { setScrollToTmdbId(null); setActiveCommunitySlug(slug); }}
                  isActive={activeTab === "explore"}
                  communitySubscriptions={communitySubscriptions}
                  onSubscribe={handleSubscribeCommunity}
                  onUnsubscribe={unsubscribeCommunity}
                  subscriptionsLoaded={subscriptionsLoaded}
                />}
              </div>

              {/* My Mantl Tab */}
              <div className="tab-pane" key="shelf-tab">
                {visitedTabs.has("shelf") && <ShelfHome
                  profile={profile}
                  shelves={shelves}
                  shelvesLoaded={shelvesLoaded}
                  onShelfIt={openShelfIt}
                  session={session}
                  pushNav={pushNav}
                  removeNav={removeNav}
                  onRefresh={async () => { if (session) await loadShelves(session.user.id); }}
                  onUpdateProfile={(updates) => setProfile(prev => ({ ...prev, ...updates }))}
                  onToast={showToast}
                  letterboxdSyncing={letterboxdSyncing}
                  goodreadsSyncing={goodreadsSyncing}
                  steamSyncing={steamSyncing}
                  isActive={activeTab === "shelf"}
                />}
              </div>

              </div>{/* end tab-slider */}
            </div>
          </div>
        )}

        {/* Community Dashboard (public) */}
        {communityDashboard && (
          <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "#1a1a1a", overflow: "auto", WebkitOverflowScrolling: "touch" }}>
            {communityDashboard === "blankcheck"
              ? <BlankCheckDashboard session={session} />
              : <NPPDashboard session={session} />
            }
          </div>
        )}

        {/* Triple Feature Game */}
        {showTripleFeature && (
          <div className="overlay-slide-up" style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "#0a0a0f", overflow: "auto",
            WebkitOverflowScrolling: "touch",
          }}>
            <TripleFeature
              session={session}
              onBack={() => {
                removeNav("tripleFeature");
                setShowTripleFeature(false);
              }}
              onToast={showToast}
            />
          </div>
        )}

        {/* Community View */}
        {activeCommunitySlug && (
          <div className="overlay-fade-in" style={{ position: "fixed", inset: 0, zIndex: 200, background: "#0f0f1a", overflow: "hidden", WebkitOverflowScrolling: "touch" }}>
            {/* Instant loading skeleton — visible behind CommunityRouter while it fetches */}
            <CommunityLoadingSkeleton />
            <div style={{ position: "relative", zIndex: 1, width: "100%", minHeight: "100%" }}>
              <CommunityRouter
                slug={activeCommunitySlug}
                session={session}
                onBack={() => { removeNav("community"); setScrollToTmdbId(null); setActiveCommunitySlug(null); }}
                onToast={showToast}
                onShelvesChanged={() => { if (session) loadShelves(session.user.id); }}
                communitySubscriptions={communitySubscriptions}
                onOpenCommunity={(slug, tmdbId) => { setScrollToTmdbId(tmdbId || null); setActiveCommunitySlug(slug); }}
                scrollToTmdbId={scrollToTmdbId}
                letterboxdSyncSignal={letterboxdSyncSignal}
                pushNav={pushNav}
                removeNav={removeNav}
              />
            </div>
          </div>
        )}

        {/* Profile Overlay */}
        {showProfile && (
          <div className="overlay-slide-up" style={{ position: "fixed", inset: 0, zIndex: 200, background: "var(--bg-primary)", overflow: "auto", WebkitOverflowScrolling: "touch" }}>
            <ProfileScreen
              profile={profile}
              shelves={shelves}
              session={session}
              initialView={profileInitView}
              pushNav={pushNav}
              removeNav={removeNav}
              onBack={() => { removeNav("profile"); setShowProfile(false); setProfileInitView(null); }}
              onSignOut={signOut}
              onDeleteAccount={deleteAccount}
              onUpdateAvatar={(url) => setProfile(prev => ({ ...prev, avatarUrl: url }))}
              onUpdateProfile={(updates) => setProfile(prev => ({ ...prev, ...updates }))}
              onToast={showToast}
              onLetterboxdConnect={connectLetterboxd}
              onLetterboxdDisconnect={disconnectLetterboxd}
              onLetterboxdSync={() => { if (session && profile.letterboxd_username) syncLetterboxd(profile.letterboxd_username, session.user.id, true); }}
              letterboxdSyncing={letterboxdSyncing}
              onGoodreadsConnect={connectGoodreads}
              onGoodreadsDisconnect={disconnectGoodreads}
              onGoodreadsSync={() => { if (session && profile.goodreads_user_id) syncGoodreads(profile.goodreads_user_id, session.user.id, true); }}
              goodreadsSyncing={goodreadsSyncing}
              onSteamConnect={connectSteam}
              onSteamDisconnect={disconnectSteam}
              onSteamSync={() => { if (session && profile.steam_id) syncSteam(profile.steam_id, session.user.id, true); }}
              steamSyncing={steamSyncing}
              onImportComplete={() => { if (session) loadShelves(session.user.id); }}
            />
          </div>
        )}

        {/* Bottom Nav */}
        {screen === "app" && (
          <div className="nav-bar">
            {/* Sliding indicator bar */}
            {(() => {
              const trackEnabled = false; // DISABLED: habits/track tab
              const tabs = ["feed", "explore", "shelf"]; // reordered: feed, communities, my mantl
              const idx = tabs.indexOf(activeTab);
              const tabCount = tabs.length;
              // space-around centers: each tab center is at (2i+1)/(2n) * 100%
              const centerPct = (2 * idx + 1) / (2 * tabCount) * 100;
              const swipeCenterPct = centerPct - (tabSwipeOffset * (100 / tabCount));
              const minCenter = (1 / (2 * tabCount)) * 100;
              const maxCenter = ((2 * (tabCount - 1) + 1) / (2 * tabCount)) * 100;
              const clampedCenter = Math.max(minCenter, Math.min(maxCenter, swipeCenterPct));
              const barBase = 56;
              const barStretch = barBase + Math.abs(tabSwipeOffset) * 24;
              const swiping = tabSwipeOffset !== 0;
              return (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  pointerEvents: "none",
                }}>
                  <div style={{
                    position: "absolute", top: 0, height: 3,
                    width: swiping ? barStretch : barBase, borderRadius: 2,
                    background: "var(--accent-green)",
                    left: `${clampedCenter}%`,
                    transform: "translateX(-50%)",
                    transition: swiping ? "none" : "left 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  }} />
                </div>
              );
            })()}
            <button
              className={`nav-item${activeTab === "feed" ? " active" : ""}`}
              onTouchStart={() => { if (activeTab !== "feed") setPreloadTab("feed"); }}
              onClick={() => {
                tapLight(); removeNav("tab"); animateSlider("feed"); setActiveTab("feed"); setPreloadTab(null);
                // Comedy Points easter egg — DISABLED for launch
                // feedTapCount.current++;
                // clearTimeout(feedTapTimer.current);
                // feedTapTimer.current = setTimeout(() => { feedTapCount.current = 0; }, 2000);
                // if (feedTapCount.current >= 5) { feedTapCount.current = 0; setShowComedyPoints(true); }
              }}
            >
              <div className="nav-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
              <div className="nav-label">Feed</div>
            </button>

            <button
              className={`nav-item${activeTab === "explore" ? " active" : ""}`}
              onTouchStart={() => { if (activeTab !== "explore") setPreloadTab("explore"); }}
              onClick={() => {
                tapLight();
                if (activeTab !== "explore") pushNav("tab", () => { animateSlider("feed"); setActiveTab("feed"); });
                animateSlider("explore");
                setActiveTab("explore");
                setPreloadTab(null);
              }}
            >
              <div className="nav-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg></div>
              <div className="nav-label">Communities</div>
            </button>

            <button
              className={`nav-item${activeTab === "shelf" ? " active" : ""}`}
              onTouchStart={() => { if (activeTab !== "shelf") setPreloadTab("shelf"); }}
              onClick={() => {
                tapLight();
                if (activeTab !== "shelf") pushNav("tab", () => { animateSlider("feed"); setActiveTab("feed"); });
                animateSlider("shelf");
                setActiveTab("shelf");
                setPreloadTab(null);
                navTapCount.current++;
                clearTimeout(navTapTimer.current);
                navTapTimer.current = setTimeout(() => { navTapCount.current = 0; }, 2000);
                if (navTapCount.current >= 10) {
                  navTapCount.current = 0;
                  setEasterEggGame(true);
                }
              }}
            >
              <div className="nav-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div>
              <div className="nav-label">My Mantl</div>
            </button>

            {false && ( // DISABLED: habits/track tab
            <button
              className={`nav-item${activeTab === "track" ? " active" : ""}`}
              onTouchStart={() => { if (activeTab !== "track") setPreloadTab("track"); }}
              onClick={() => { if (activeTab !== "track") pushNav("tab", () => { animateSlider("feed"); setActiveTab("feed"); }); animateSlider("track"); setActiveTab("track"); setPreloadTab(null); }}
            >
              <div className="nav-icon">📊</div>
              <div className="nav-label">Track</div>
            </button>
            )}

          </div>
        )}


        {/* Shelf It Modal (triggered from ShelfHome's + Add buttons) */}
        {showShelfIt && (
          <ShelfItModal
            initialCategory={shelfItCategory}
            onClose={() => { removeNav("shelfIt"); setShowShelfIt(false); }}
            session={session}
            onToast={showToast}
            onSaved={async (type, status) => {
              if (session) {
                await loadShelves(session.user.id);
                const msg = (type === "book" && status === "reading") ? "Reading!" :
                  (type === "tv" && status === "watching") ? "Watching!" :
                  (type === "game" && status === "playing") ? "Playing!" : "Logged!";
                showToast(msg);
              }
            }}
          />
        )}

        {/* Stacked badge progress toasts (from Letterboxd sync) */}
        {syncBadgeToasts.map((t, i) => (
          <BadgeProgressToast
            key={`sync-badge-${i}`}
            badge={t.badge}
            current={t.current}
            total={t.total}
            isComplete={t.isComplete || false}
            visible={t.visible}
            bottomOffset={24 + i * 82}
            onTap={t.slug ? () => {
              // Clear toasts and navigate to community
              syncBadgeTimers.current.forEach(tid => clearTimeout(tid));
              syncBadgeTimers.current = [];
              setSyncBadgeToasts([]);
              setActiveCommunitySlug(t.slug);
            } : undefined}
          />
        ))}

      </div>
    </AudioPlayerProvider>
  );
}
