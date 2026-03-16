import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";
import "./styles/App.css";

// Utils
import { DEFAULT_ENABLED_SHELVES, DEFAULT_SHELF_ORDER, GROUP_TYPE_CONFIG, HABITS, SPORT_ICONS, generateInviteCode } from "./utils/constants";
import { stravaApi, stravaAuth } from "./utils/strava";
import { TMDB_IMG, sb, fetchTMDBRaw, searchTMDBRaw } from "./utils/api";
import { tapLight, tapMedium, notifySuccess } from "./utils/haptics";

// Screens
import LandingScreen from "./screens/LandingScreen";
import UsernameSetup from "./screens/UsernameSetup";
import ShelfHome from "./screens/ShelfHome";
import FeedScreen from "./screens/FeedScreen";
import ProfileScreen from "./screens/ProfileScreen";
import TrackScreen from "./screens/TrackScreen";
import JoinGroupScreen from "./screens/JoinGroupScreen";
import GroupViewScreen from "./screens/GroupViewScreen";
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
import CreateGroupModal from "./components/CreateGroupModal";
import BadgeProgressToast from "./components/community/shared/BadgeProgressToast";
import InitialAvatar from "./components/InitialAvatar";
import AudioPlayerProvider from "./components/community/shared/AudioPlayerProvider";
import { toLogTimestamp } from "./utils/helpers";

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

  // Groups
  const [userGroups, setUserGroups] = useState([]); // [{id, name, emoji, type, invite_code, role, memberCount}]
  const [activeGroup, setActiveGroup] = useState(null); // full group data when viewing
  const [showGroupView, setShowGroupView] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

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

  const [trackRefreshKey, setTrackRefreshKey] = useState(0);

  // Mark tabs as visited when activated or preloaded (so component mounts)
  useEffect(() => {
    setVisitedTabs(prev => {
      const next = new Set(prev);
      if (activeTab) next.add(activeTab);
      if (preloadTab) next.add(preloadTab);
      return next.size !== prev.size ? next : prev;
    });
  }, [activeTab, preloadTab]);

  const [pendingJoinCode, setPendingJoinCode] = useState(() => {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
    if (path.startsWith("join/")) return path.replace("join/", "").toUpperCase();
    // Recover join code stashed before OAuth redirect
    const stored = sessionStorage.getItem("mantl_pending_join");
    if (stored) return stored;
    return null;
  });

  // User data
  const [profile, setProfile] = useState({
    name: "", username: "", avatar: "", bio: "", avatarUrl: "",
    enabledShelves: { ...DEFAULT_ENABLED_SHELVES },
    shelfOrder: [...DEFAULT_SHELF_ORDER],
  });

  // Shelf data
  const [shelves, setShelves] = useState({
    books: [], movies: [], shows: [], games: [], trophies: [], goals: [],
    totalItems: 0,
  });
  const [shelvesLoaded, setShelvesLoaded] = useState(false);

  // Strava
  const [stravaActivities, setStravaActivities] = useState([]);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [stravaLoading, setStravaLoading] = useState(false);
  const [stravaDismissed, setStravaDismissed] = useState(() => { try { return localStorage.getItem("mantl_strava_dismissed") === "1"; } catch { return false; } });

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
    if (session?.user?.id) {
      const backfilled = await reconcileShelfWithCommunities(session.user.id);
      if (backfilled > 0) setAutoLogCompleteSignal(Date.now());
    }
  };

  // Triple Feature — check if today's puzzle is unplayed (for gold dot)
  useEffect(() => {
    if (!session?.user?.id) return;
    hasPlayedToday(session.user.id).then((played) => setTfUnplayed(!played));
  }, [session?.user?.id, showTripleFeature]); // re-check when game closes

  // Challenge shelf data
  const [challengeShelf, setChallengeShelf] = useState(null); // { habits, stats, overallPct, tier, activeDays, targetPerHabit }

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
    // Preserve join code across OAuth redirect
    if (pendingJoinCode) {
      sessionStorage.setItem("mantl_pending_join", pendingJoinCode);
    }
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
    setShelves({ books: [], movies: [], shows: [], games: [], trophies: [], goals: [], totalItems: 0 });
    setShelvesLoaded(false);
    setStravaActivities([]);
    setStravaConnected(false);
    setChallengeShelf(null);
    setUserGroups([]);
    setActiveGroup(null);
    setShowGroupView(false);
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
      // Get challenge IDs to clean daily_logs
      const { data: challenges } = await supabase.from("monthly_challenges").select("id").eq("user_id", userId);
      if (challenges?.length > 0) {
        for (const c of challenges) {
          await supabase.from("daily_logs").delete().eq("challenge_id", c.id);
        }
      }
      await supabase.from("monthly_challenges").delete().eq("user_id", userId);
      // Get book IDs to clean reading_log
      const { data: userBooks } = await supabase.from("books").select("id").eq("user_id", userId);
      if (userBooks?.length > 0) {
        for (const b of userBooks) {
          await supabase.from("reading_log").delete().eq("book_id", b.id);
        }
      }
      // Get show IDs to clean season_ratings and watching_log
      const { data: userShows } = await supabase.from("shows").select("id").eq("user_id", userId);
      if (userShows?.length > 0) {
        for (const s of userShows) {
          await supabase.from("season_ratings").delete().eq("show_id", s.id);
          await supabase.from("watching_log").delete().eq("show_id", s.id);
        }
      }
      await supabase.from("books").delete().eq("user_id", userId);
      await supabase.from("movies").delete().eq("user_id", userId);
      await supabase.from("shows").delete().eq("user_id", userId);
      await supabase.from("games").delete().eq("user_id", userId);
      await supabase.from("workout_goals").delete().eq("user_id", userId);
      await supabase.from("countries").delete().eq("user_id", userId);
      await supabase.from("wishlist").delete().eq("user_id", userId);
      await supabase.from("strava_tokens").delete().eq("user_id", userId);
      await supabase.from("blocked_users").delete().eq("user_id", userId);
      await supabase.from("reports").delete().eq("reporter_id", userId);
      await supabase.from("friends").delete().or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);
      await supabase.from("profiles").delete().eq("id", userId);
      // Sign out
      await supabase.auth.signOut();
      setSession(null);
      setScreen("landing");
      setProfile({ name: "", username: "", avatar: "", bio: "", avatarUrl: "" });
      setShelves({ books: [], movies: [], shows: [], games: [], trophies: [], goals: [], totalItems: 0 });
      setShelvesLoaded(false);
      setStravaActivities([]);
      setStravaConnected(false);
      setChallengeShelf(null);
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

      // Load all shelf data + challenge shelf + groups in parallel
      const shelvesPromise = loadShelves(user.id);
      const challengePromise = loadChallengeShelf(user.id);
      const groupsPromise = loadUserGroups(user.id);

      // ── Strava: exchange first if needed, then load ──
      const stravaPromise = (async () => {
        const stravaCode = sessionStorage.getItem("strava_code");
        let exchangeOk = false;
        if (stravaCode) {
          sessionStorage.removeItem("strava_code");
          setStravaLoading(true);
          const exchangeResult = await stravaApi("exchange", null, { code: stravaCode });
          exchangeOk = !!exchangeResult?.success;
          if (!exchangeOk) console.error("[Strava] Exchange failed — code may be expired or already used");
          setStravaLoading(false);
        }
        const stravaResult = await loadStravaActivities();
        if (stravaCode && exchangeOk && stravaResult) {
          showToast("Strava connected! 🏃");
        }
      })();

      await Promise.all([shelvesPromise, challengePromise, stravaPromise, groupsPromise]);

      // Handle pending group join code (from /join/XXXXX URL)
      if (pendingJoinCode) {
        sessionStorage.removeItem("mantl_pending_join");
        const joined = await joinGroupByCode(pendingJoinCode, user.id);
        setPendingJoinCode(null);
        window.history.replaceState(null, "", "/");
        if (joined) {
          // Auto-enable relevant shelves
          const config = GROUP_TYPE_CONFIG[joined.type];
          if (config?.shelves) {
            const current = prof.enabled_shelves || {};
            const updated = { ...current };
            config.shelves.forEach(s => { updated[s] = true; });
            await supabase.from("profiles").update({ enabled_shelves: updated }).eq("id", user.id);
            setProfile(prev => ({ ...prev, enabledShelves: { ...DEFAULT_ENABLED_SHELVES, ...updated } }));
          }
        }
      }

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

  // ── GROUPS ──

  const loadUserGroups = async (userId) => {
    try {
      const { data: memberships } = await supabase
        .from("group_members").select("group_id, role")
        .eq("user_id", userId);
      if (!memberships || memberships.length === 0) { setUserGroups([]); return; }
      const groupIds = memberships.map(m => m.group_id);
      const { data: groups } = await supabase
        .from("groups").select("id, name, emoji, type, invite_code, description, settings, created_by")
        .in("id", groupIds);
      if (!groups) { setUserGroups([]); return; }
      // Get member counts
      const { data: allMembers } = await supabase
        .from("group_members").select("group_id")
        .in("group_id", groupIds);
      const counts = {};
      (allMembers || []).forEach(m => { counts[m.group_id] = (counts[m.group_id] || 0) + 1; });
      const enriched = groups.map(g => ({
        ...g,
        role: memberships.find(m => m.group_id === g.id)?.role || "member",
        memberCount: counts[g.id] || 0,
      }));
      setUserGroups(enriched);
    } catch (e) { console.error("Load groups error:", e); }
  };

  const joinGroupByCode = async (code, userId) => {
    try {
      const { data: group } = await supabase
        .from("groups").select("*")
        .eq("invite_code", code.toUpperCase()).maybeSingle();
      if (!group) { showToast("Invalid invite code"); return null; }
      // Check if already a member
      const { data: existing } = await supabase
        .from("group_members").select("id")
        .eq("group_id", group.id).eq("user_id", userId).maybeSingle();
      if (!existing) {
        await supabase.from("group_members").insert({
          group_id: group.id, user_id: userId, role: "member",
        });
      }
      await loadUserGroups(userId);
      showToast(`Joined ${group.name}! ${group.emoji}`);
      return group;
    } catch (e) { console.error("Join group error:", e); showToast("Couldn't join group"); return null; }
  };

  const createGroup = async (name, type, description) => {
    if (!session) return null;
    try {
      const code = generateInviteCode();
      const config = GROUP_TYPE_CONFIG[type] || GROUP_TYPE_CONFIG.training;
      const { data: group, error } = await supabase.from("groups").insert({
        name, type, description: description || null,
        emoji: config.emoji, invite_code: code,
        path: "friends",
        created_by: session.user.id,
        settings: {},
      }).select().single();
      if (error) throw error;
      // Add creator as admin
      await supabase.from("group_members").insert({
        group_id: group.id, user_id: session.user.id, role: "admin",
      });
      await loadUserGroups(session.user.id);
      showToast(`${config.emoji} ${name} created!`);
      return group;
    } catch (e) { console.error("Create group error:", e); showToast("Couldn't create group"); return null; }
  };

  const loadGroupView = async (groupId) => {
    try {
      const { data: group } = await supabase.from("groups").select("*").eq("id", groupId).single();
      const { data: members } = await supabase.from("group_members").select("user_id, role, joined_at").eq("group_id", groupId);
      if (!members || members.length === 0) { setActiveGroup({ ...group, members: [] }); setShowGroupView(true); return; }
      const memberIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, username, name, avatar_emoji, avatar_url").in("id", memberIds);
      const enrichedMembers = members.map(m => {
        const prof = (profiles || []).find(p => p.id === m.user_id) || {};
        return { ...m, username: prof.username, name: prof.name, avatar: prof.avatar_emoji || "👤", avatarUrl: prof.avatar_url };
      });
      setActiveGroup({ ...group, members: enrichedMembers });
      setShowGroupView(true);
    } catch (e) { console.error("Load group error:", e); }
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
      { data: allTrophies },
      { data: allGoals },
      { data: allCountries },
    ] = await Promise.all([
      supabase.from("books").select("id, title, author, cover_url, rating, total_pages, notes, finished_at, source, current_page")
        .eq("user_id", userId).eq("is_active", false).neq("habit_id", 7).order("finished_at", { ascending: false, nullsFirst: false }),
      supabase.from("books").select("id, title, author, cover_url, current_page, total_pages, notes, source")
        .eq("user_id", userId).eq("is_active", true).neq("habit_id", 7),
      supabase.from("movies").select("id, title, poster_url, rating, year, director, notes, watched_at")
        .eq("user_id", userId).order("watched_at", { ascending: false, nullsFirst: false }),
      supabase.from("shows").select("id, title, poster_url, tmdb_id, status, current_season, current_episode, episodes_watched, total_episodes, total_seasons, rating, notes, created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("games").select("id, title, cover_url, platform, genre, status, rating, notes, source, external_id, created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("workout_goals").select("id, name, emoji, result, completed_at, location, source, photo_url, distance, photo_position")
        .eq("user_id", userId).eq("is_active", false).gte("habit_id", 1).not("completed_at", "is", null).order("completed_at", { ascending: false }),
      supabase.from("workout_goals").select("id, name, emoji, target_date, location, goal_text, source, photo_url, distance, photo_position")
        .eq("user_id", userId).eq("is_active", true).gte("habit_id", 1).order("target_date", { ascending: true }),
      supabase.from("countries").select("id, country_code, country_name, status, visit_month, visit_year, trip_month, trip_year, notes, photo_url")
        .eq("user_id", userId).order("created_at", { ascending: false }),
    ]);

    const books = (allBooks || []).map((b) => ({
      id: b.id, title: b.title, author: b.author, cover: b.cover_url,
      rating: b.rating, pages: b.total_pages, notes: b.notes,
      finishedAt: b.finished_at, source: b.source || "fiveseven",
    }));

    const currentBooks = (activeBooks || []).map((b) => ({
      id: b.id, title: b.title, author: b.author, cover: b.cover_url,
      currentPage: b.current_page, totalPages: b.total_pages, notes: b.notes,
      isReading: true, source: b.source || "fiveseven",
    }));

    const allBooksCombined = [...currentBooks, ...books];

    const movies = (allMovies || []).map((m) => ({
      id: m.id, title: m.title, cover: m.poster_url, rating: m.rating,
      year: m.year, director: m.director, notes: m.notes, watchedAt: m.watched_at,
    }));

    const shows = (allShows || [])
      .sort((a, b) => (a.status === "watching" ? -1 : 1) - (b.status === "watching" ? -1 : 1))
      .map((s) => ({
        id: s.id, title: s.title, cover: s.poster_url, tmdbId: s.tmdb_id,
        status: s.status, isWatching: s.status === "watching",
        currentSeason: s.current_season, currentEpisode: s.current_episode,
        episodesWatched: s.episodes_watched, totalEpisodes: s.total_episodes,
        totalSeasons: s.total_seasons, rating: s.rating, notes: s.notes,
      }));

    const games = (allGames || [])
      .sort((a, b) => (a.status === "playing" ? -1 : 1) - (b.status === "playing" ? -1 : 1))
      .map((g) => ({
        id: g.id, title: g.title, cover: g.cover_url, platform: g.platform,
        genre: g.genre, status: g.status, isPlaying: g.status === "playing", isBeat: g.status === "beat",
        rating: g.rating, notes: g.notes, source: g.source || null, externalId: g.external_id || null,
      }));

    const trophies = (allTrophies || []).map((t) => ({
      id: t.id, title: t.name, emoji: t.emoji || "🏆", result: t.result,
      completedAt: t.completed_at, location: t.location, source: t.source || "fiveseven",
      photoUrl: t.photo_url || null, distance: t.distance || null, photoPosition: t.photo_position || "50 50",
    }));

    const goals = (allGoals || []).map((g) => ({
      id: g.id, title: g.name, emoji: g.emoji || "🎯", targetDate: g.target_date,
      location: g.location, goal: g.goal_text || "", source: g.source || "fiveseven",
      photoUrl: g.photo_url || null, distance: g.distance || null, photoPosition: g.photo_position || "50 50",
    }));

    const countries = (allCountries || []).map(c => ({
      id: c.id, countryCode: c.country_code, countryName: c.country_name,
      flag: "🏳️", status: c.status,
      visitMonth: c.visit_month, visitYear: c.visit_year,
      tripMonth: c.trip_month, tripYear: c.trip_year,
      notes: c.notes, photoUrl: c.photo_url,
    }));

    const totalItems = books.length + movies.length + shows.length + games.length + trophies.length;

    setShelves({
      books: allBooksCombined, currentBooks, movies, shows, games, trophies, goals, countries,
      totalItems,
    });
    setShelvesLoaded(true);
  };

  // ── STRAVA ──

  const loadStravaActivities = async () => {
    try {
      const result = await stravaApi("latest");
      if (result?.activities && Array.isArray(result.activities) && result.activities.length > 0) {
        setStravaActivities(result.activities);
        setStravaConnected(true);

        // Sync new activities to feed_activity (fire and forget)
        // Get fresh session directly since state may not be set yet
        const { data: { session: freshSession } } = await supabase.auth.getSession();
        syncStravaToFeed(result.activities, freshSession);

        return true;
      } else {
        setStravaConnected(false);
        return false;
      }
    } catch (e) {
      console.error("[Strava] loadStravaActivities error:", e);
      return false;
    }
  };

  // ── Auto-complete habit helper (used by shelf actions + Strava + backfill) ──
  const autoCompleteHabit = async (category, dateOverride = null, nameHint = null) => {
    if (!session) return;
    try {
      const d = dateOverride ? new Date(dateOverride) : new Date();
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      // Find active tracker (try challenges first, then monthly_challenges)
      let tracker = null;
      const { data: mc, error: mcErr } = await supabase.from("monthly_challenges")
        .select("id, habits").eq("user_id", session.user.id)
        .eq("month", d.getMonth() + 1).eq("year", d.getFullYear()).maybeSingle();
      if (mcErr) console.error("[AutoComplete] Tracker query error:", mcErr);
      if (mc) tracker = mc;

      if (!tracker?.habits) return;

      // Find matching habit — use nameHint for specificity (e.g. "film" vs "show")
      let habit;
      if (nameHint) {
        const hint = new RegExp(nameHint, "i");
        habit = tracker.habits.find(h => h.category === category && hint.test(h.name))
          || tracker.habits.find(h => h.category === category);
      } else {
        habit = tracker.habits.find(h => h.category === category);
      }
      if (!habit) return;

      const { error: upsertErr } = await supabase.from("daily_logs").upsert(
        { challenge_id: tracker.id, user_id: session.user.id, date: dateStr, habit_id: habit.id, status: "complete" },
        { onConflict: "challenge_id,date,habit_id" }
      );
      if (upsertErr) console.error("[AutoComplete] Upsert error:", upsertErr);
      else setTrackRefreshKey(k => k + 1);
    } catch (e) { console.error(`Auto-complete ${category} habit error:`, e); }
  };

  const syncStravaToFeed = async (activities, activeSession) => {
    const sess = activeSession || session;
    if (!sess) { return; }
    try {
      // Get existing Strava feed entries to avoid duplicates (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: existing, error: existErr } = await supabase
        .from("feed_activity")
        .select("title")
        .eq("user_id", sess.user.id)
        .eq("activity_type", "strava")
        .gte("created_at", thirtyDaysAgo);


      const existingKeys = new Set((existing || []).map(e => e.title));

      // Post new activities (last 5 max to avoid spam on first connect)
      const newActivities = activities
        .filter(act => !existingKeys.has(`strava_${act.strava_id || act.id}`))
        .slice(0, 5);

      if (newActivities.length > 0) {
      }

      for (const act of newActivities) {
        const icon = SPORT_ICONS[act.sport_type] || SPORT_ICONS[act.type] || "💪";
        const sportLabel = (act.sport_type || act.type || "Workout").replace(/([A-Z])/g, " $1").trim();
        const photoUrl = act.photos?.primary?.urls?.['600'] || act.photos?.primary?.urls?.['100'] || null;


        const { error: insertErr } = await supabase.from("feed_activity").insert({
          user_id: sess.user.id,
          activity_type: "strava",
          action: sportLabel.toLowerCase(),
          title: `strava_${act.strava_id || act.id}`,
          item_title: act.name || sportLabel,
          item_cover: photoUrl,
          metadata: {
            strava_id: act.strava_id || act.id,
            sport_type: act.sport_type || act.type,
            sport_icon: icon,
            distance: act.distance || 0,
            moving_time: act.moving_time || 0,
            elapsed_time: act.elapsed_time || 0,
            total_elevation_gain: act.total_elevation_gain || 0,
            average_speed: act.average_speed || 0,
            average_heartrate: act.average_heartrate || 0,
            max_heartrate: act.max_heartrate || 0,
            start_date: act.start_date,
            polyline: act.map?.summary_polyline || null,
            photo_url: photoUrl,
          },
          created_at: act.start_date || new Date().toISOString(),
        });

        if (insertErr) console.error("[Strava sync] Insert error:", insertErr.message, insertErr.code, insertErr.details);
      }

      // Auto-complete training habits for new Strava activities
      if (newActivities.length > 0) {
        const activityDates = new Set();
        for (const act of newActivities) {
          const d = act.start_date ? new Date(act.start_date) : new Date();
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          activityDates.add(dateStr);
        }
        for (const dateStr of activityDates) {
          autoCompleteHabit("training", dateStr);
        }
      }

    } catch (err) {
      console.error("[Strava sync] Exception:", err);
    }
  };

  const disconnectStrava = async () => {
    await stravaApi("disconnect", null, {});
    setStravaActivities([]);
    setStravaConnected(false);
    showToast("Strava disconnected");
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
            completed_at: filmData.watchedDate || null,
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
  // ── Reconcile: backfill shelf films → community_user_progress ──
  // Catches films logged BEFORE a community added them or before user subscribed
  const reconcileShelfWithCommunities = async (uid) => {
    try {
      const { data, error } = await supabase.rpc(
        "reconcile_shelf_community_progress",
        { p_user_id: uid }
      );
      if (error) {
        console.error("[Reconcile] Shelf→community reconciliation failed:", error);
      } else if (data > 0) {
        console.log(`[Reconcile] Backfilled ${data} community progress row(s) from shelf`);
      }
      return data || 0;
    } catch (e) {
      console.warn("[Reconcile] Shelf reconciliation error:", e);
      return 0;
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
      const { data: existingMovies } = await supabase.from("movies")
        .select("title, year, tmdb_id, watch_count, watch_dates").eq("user_id", userId);
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
                currentCount: existing.watch_count || 1,
                currentDates: existing.watch_dates || [],
                rating: ratingFromTitle || null,
              });
              // Update local map so subsequent RSS entries don't double-count
              existing.watch_count = (existing.watch_count || 1) + 1;
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
        const movieRow = {
          user_id: userId, title, year, rating: ratingFromTitle || null,
          director, poster_url: poster, backdrop_url: backdrop, genre, runtime, tmdb_id: tmdbId,
          watched_at: watchedDate ? toLogTimestamp(watchedDate) : new Date().toISOString(),
          source: "letterboxd",
          watch_count: 1,
          watch_dates: [watchDateStr],
        };
        const { error: movieErr } = await supabase.from("movies").upsert(movieRow, { onConflict: "user_id,tmdb_id" });
        if (movieErr) console.error("[Letterboxd] Movie insert error:", movieErr);

        // Insert feed_activity if recent
        const feedKey = `lb_${title}_${year}`;
        const maxAge = manual ? 90 * 24 * 60 * 60 * 1000 : 14 * 24 * 60 * 60 * 1000;
        const isRecent = watchedDate && (Date.now() - new Date(watchedDate).getTime()) < maxAge;
        if (!feedSet.has(feedKey) && !feedSet.has(title) && isRecent) {
          const feedRow = {
            user_id: userId, activity_type: "movie", action: "finished",
            title: feedKey, item_title: title, item_cover: poster,
            rating: ratingFromTitle || null,
            metadata: { source: "letterboxd", letterboxd_username: username, watched_date: watchedDate },
            created_at: watchedDate
              ? toLogTimestamp(watchedDate)
              : new Date().toISOString(),
          };
          if (year) feedRow.item_year = year;
          if (director) feedRow.item_author = director;
          const { error: feedInsertErr } = await supabase.from("feed_activity").insert(feedRow);
          if (feedInsertErr) console.error("[Letterboxd] Feed insert error:", feedInsertErr.message, feedInsertErr.code);
          feedSet.add(feedKey);
          feedSet.add(title);
        }

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
        const newCount = rw.currentCount + 1;
        const rewatchDatesOnly = newDates.slice(1); // all dates after the first watch

        // 1. Update movies table (source of truth) — bump watched_at so feed shows it
        const { error: rwErr } = await supabase.from("movies")
          .update({
            watch_count: newCount,
            watch_dates: newDates,
            watched_at: new Date(
              new Date(toLogTimestamp(rw.newDate)).getTime()
            ).toISOString(),
          })
          .eq("user_id", userId)
          .eq("tmdb_id", rw.tmdb_id);

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
        showToast(`🎬 Synced ${parts.join(" + ")} from Letterboxd`, 3200);
        setLetterboxdSyncSignal(Date.now()); // notify community screens to re-check badges
        await loadShelves(userId);
        // Auto-log into communities + show badge progress toasts after sync toast has its moment
        if (syncedFilms.length > 0) {
          setTimeout(async () => {
            await autoLogAndCheckBadges(syncedFilms, userId);
            await reconcileShelfWithCommunities(userId);
            setAutoLogCompleteSignal(Date.now()); // feed refresh — fires after progress rows are written
          }, 2800);
        } else {
          // Rewatches only or shelf-only — still reconcile + refresh feed after toast
          setTimeout(async () => {
            await reconcileShelfWithCommunities(userId);
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

      // Get existing books to avoid duplicates (by goodreads_id and title+author)
      const { data: existingBooks } = await supabase.from("books")
        .select("title, author, goodreads_id").eq("user_id", userId);
      const existingGrIds = new Set((existingBooks || []).map(b => b.goodreads_id).filter(Boolean));
      const existingTitleSet = new Set((existingBooks || []).map(b => `${b.title}::${b.author}`));

      // Get existing feed entries for dedup
      const { data: existingFeed } = await supabase.from("feed_activity")
        .select("title, item_title").eq("user_id", userId).eq("activity_type", "book");
      const feedSet = new Set((existingFeed || []).flatMap(f => [f.title, f.item_title].filter(Boolean)));

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

        // Skip if already exists (by goodreads_id or title+author)
        if (bookId && existingGrIds.has(bookId)) {
          if (manual) console.log(`[Goodreads] Skipping (exists by ID): ${title}`);
          continue;
        }
        const dedupKey = `${title}::${authorName}`;
        if (existingTitleSet.has(dedupKey)) {
          if (manual) console.log(`[Goodreads] Skipping (exists by title+author): ${title}`);
          continue;
        }

        existingGrIds.add(bookId);
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

        const bookRow = {
          user_id: userId,
          title,
          author,
          cover_url: coverUrl && !coverUrl.includes("nophoto") ? coverUrl : null,
          rating,
          total_pages: totalPages,
          finished_at: finishedAt || new Date().toISOString(),
          is_active: false,
          habit_id: 0,
          source: "goodreads",
          goodreads_id: bookId || null,
        };

        const { error: bookErr } = bookId
          ? await supabase.from("books").upsert(bookRow, { onConflict: "user_id,goodreads_id" })
          : await supabase.from("books").insert(bookRow);
        if (bookErr) {
          console.error("[Goodreads] Book insert error:", bookErr.message, bookErr.code);
          return null;
        }

        // Insert feed_activity if recent (14 days for auto, 90 for manual)
        const feedKey = `gr_${title}_${author}`;
        const maxAge = manual ? 90 * 24 * 60 * 60 * 1000 : 14 * 24 * 60 * 60 * 1000;
        const readDate = finishedAt ? new Date(finishedAt) : null;
        const isRecent = readDate && (Date.now() - readDate.getTime()) < maxAge;
        if (!feedSet.has(feedKey) && !feedSet.has(title) && isRecent) {
          const feedRow = {
            user_id: userId, activity_type: "book", action: "finished",
            title: feedKey, item_title: title, item_cover: coverUrl,
            rating,
            metadata: { source: "goodreads", goodreads_user_id: grUserId, read_at: userReadAt },
            created_at: finishedAt || new Date().toISOString(),
          };
          if (author) feedRow.item_author = author;
          const { error: feedInsertErr } = await supabase.from("feed_activity").insert(feedRow);
          if (feedInsertErr) console.error("[Goodreads] Feed insert error:", feedInsertErr.message, feedInsertErr.code);
          feedSet.add(feedKey);
          feedSet.add(title);
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
        showToast(`📚 Synced ${synced} book${synced !== 1 ? "s" : ""} from Goodreads`);
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

    try {
      // Fetch both recent and owned in parallel
      const [recentRes, ownedRes] = await Promise.all([
        fetch(`${STEAM_EDGE}?action=recent&steam_id=${steamId}`),
        fetch(`${STEAM_EDGE}?action=owned&steam_id=${steamId}`),
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

      // Get existing games for dedup
      const { data: existingGames } = await supabase.from("games")
        .select("external_id").eq("user_id", userId).eq("api_source", "steam");
      const existingSet = new Set((existingGames || []).map(g => String(g.external_id)));

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
          const achRes = await fetch(`${STEAM_EDGE}?action=achievements&steam_id=${steamId}&app_id=${appId}`);
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

        // Determine status:
        // - 100% achievements = "beat"
        // - Recently played = "playing"
        // - Otherwise = "completed" (in backlog)
        // Don't overwrite if user already marked as "beat"
        const isBeat = achievementsTotal > 0 && achievementsEarned === achievementsTotal;
        const existingStatus = existingSet.has(appId) ? "keep" : null;
        let status = isRecentlyPlayed ? "playing" : "completed";
        if (isBeat) status = "beat";

        // Upsert into games table
        const gameRow = {
          user_id: userId, external_id: appId, api_source: "steam",
          title, cover_url: coverUrl,
          platform: "PC", source: "steam",
          notes: notesStr,
        };
        // Only set status if it's a new game or auto-beat — don't downgrade "beat" to "playing"
        if (!existingSet.has(appId)) {
          gameRow.status = status;
        } else if (isBeat) {
          gameRow.status = "beat";
        } else if (isRecentlyPlayed) {
          gameRow.status = "playing";
        }
        const { error: gameErr } = await supabase.from("games").upsert(gameRow, { onConflict: "user_id,external_id,api_source" });
        if (gameErr) console.error("[Steam] Game upsert error:", gameErr.message);

        const isNew = !existingSet.has(appId);
        existingSet.add(appId);

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
        if (manual) showToast(`🎮 Synced ${synced} game${synced !== 1 ? "s" : ""} from Steam`);
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
      try {
        const res = await fetch(`${STEAM_EDGE}?action=resolve&vanity=${encodeURIComponent(clean)}`);
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

  const loadChallengeShelf = async (userId) => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const dayOfMonth = now.getDate();

    const { data: challenge } = await supabase
      .from("monthly_challenges")
      .select("id, habits, start_day")
      .eq("user_id", userId)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle();

    if (!challenge) { setChallengeShelf(null); return; }

    const isNewStyle = challenge.habits && typeof challenge.habits[0] === "object";

    const { data: logs } = await supabase
      .from("daily_logs")
      .select("date, habit_id, status")
      .eq("challenge_id", challenge.id);

    const startDay = challenge.start_day || 1;
    const activeDays = dayOfMonth - startDay + 1;

    // Build per-day history
    const hist = {};
    (logs || []).forEach(log => {
      const day = new Date(log.date + "T12:00:00").getDate();
      if (!hist[day]) hist[day] = { checked: [], rested: [], missed: [] };
      if (log.status === "complete") hist[day].checked.push(log.habit_id);
      else if (log.status === "rest") hist[day].rested.push(log.habit_id);
      else hist[day].missed.push(log.habit_id);
    });

    const habitList = isNewStyle ? challenge.habits : challenge.habits.map(hId => ({ id: hId, name: (HABITS.find(h => h.id === hId) || {}).name || "Habit", emoji: (HABITS.find(h => h.id === hId) || {}).icon || "📌" }));

    // Per-habit streaks and stats
    const habitStats = habitList.map(h => {
      const hId = h.id;
      let streak = 0;
      for (let d = dayOfMonth; d >= 1; d--) {
        const dd = hist[d] || { checked: [], rested: [], missed: [] };
        if (dd.checked.includes(hId) || dd.rested.includes(hId)) streak++;
        else break;
      }
      let totalCompleted = 0;
      for (let d = startDay; d <= dayOfMonth; d++) {
        const dd = hist[d] || { checked: [], rested: [], missed: [] };
        if (dd.checked.includes(hId)) totalCompleted++;
      }
      // Last 7 days dot status: "done" | "rest" | "missed" | "future"
      const weekDots = [];
      for (let i = 6; i >= 0; i--) {
        const d = dayOfMonth - i;
        if (d < 1 || d < startDay) { weekDots.push("future"); continue; }
        const dd = hist[d] || { checked: [], rested: [], missed: [] };
        if (dd.checked.includes(hId)) weekDots.push("done");
        else if (dd.rested.includes(hId)) weekDots.push("rest");
        else if (d === dayOfMonth) weekDots.push("today"); // not yet logged today
        else weekDots.push("missed");
      }
      return { ...h, streak, totalCompleted, weekDots };
    });

    // Today's status
    const todayData = hist[dayOfMonth] || { checked: [], rested: [], missed: [] };
    const todayDone = todayData.checked.length;
    const bestStreak = Math.max(0, ...habitStats.map(h => h.streak));

    setChallengeShelf({ habits: habitStats, todayDone, activeDays, startDay, bestStreak, isNewStyle });
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

    // Handle pending group join for new users
    if (pendingJoinCode) {
      sessionStorage.removeItem("mantl_pending_join");
      const joined = await joinGroupByCode(pendingJoinCode, session.user.id);
      setPendingJoinCode(null);
      window.history.replaceState(null, "", "/");
      if (joined) {
        const config = GROUP_TYPE_CONFIG[joined.type];
        if (config?.shelves) {
          const updated = { ...enabledShelves };
          config.shelves.forEach(s => { updated[s] = true; });
          await supabase.from("profiles").update({ enabled_shelves: updated }).eq("id", session.user.id);
          setProfile(prev => ({ ...prev, enabledShelves: { ...DEFAULT_ENABLED_SHELVES, ...updated } }));
        }
      }
    }

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
        {toast && (
          <div className={`toast${toastExiting ? " toast-exit" : ""}`} style={{ overflow: "hidden" }}>
            {toast}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
              background: "rgba(255,255,255,0.1)",
            }}>
              <div style={{
                height: "100%",
                background: "var(--accent-green, #34d399)",
                borderRadius: 2,
                animation: `toast-countdown ${toastDuration}ms linear forwards`,
              }} />
            </div>
          </div>
        )}
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
        {screen === "landing" && !pendingJoinCode && (
          <LandingScreen onSignIn={signIn} />
        )}

        {/* Join Group (unauthenticated) */}
        {screen === "landing" && pendingJoinCode && (
          <JoinGroupScreen code={pendingJoinCode} onSignIn={signIn} />
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
                <div className="header-tagline">Another reason to press play</div>
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
                  onRefresh={async () => { if (session) await Promise.all([loadShelves(session.user.id), loadChallengeShelf(session.user.id)]); }}
                  onUpdateProfile={(updates) => setProfile(prev => ({ ...prev, ...updates }))}
                  stravaActivities={stravaActivities}
                  stravaConnected={stravaConnected}
                  stravaLoading={stravaLoading}
                  stravaDismissed={stravaDismissed}
                  setStravaDismissed={setStravaDismissed}
                  onStravaConnect={stravaAuth}
                  onStravaDisconnect={disconnectStrava}
                  onToast={showToast}
                  /* challengeShelf + onOpenChallenge DISABLED — habits shelf removed */
                  letterboxdSyncing={letterboxdSyncing}
                  goodreadsSyncing={goodreadsSyncing}
                  steamSyncing={steamSyncing}
                  userGroups={userGroups}
                  onOpenGroup={(groupId) => loadGroupView(groupId)}
                  onAutoComplete={autoCompleteHabit}
                  isActive={activeTab === "shelf"}
                />}
              </div>

              {/* Track Tab */}
              {false && ( // DISABLED: habits/track tab
              <div className="tab-pane" key="track-tab">
                {visitedTabs.has("track") && <TrackScreen
                  session={session}
                  onToast={showToast}
                  onRefreshShelf={() => { if (session) loadChallengeShelf(session.user.id); }}
                  onAutoComplete={autoCompleteHabit}
                  refreshKey={trackRefreshKey}
                />}
              </div>
              )}

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
          <div className="overlay-slide-up" style={{ position: "fixed", inset: 0, zIndex: 200, background: "#0f0f1a", overflow: "auto", WebkitOverflowScrolling: "touch" }}>
            {/* Instant loading skeleton — visible behind CommunityRouter while it fetches */}
            <CommunityLoadingSkeleton />
            <div style={{ position: "relative", zIndex: 1, width: "100%", minHeight: "100%" }}>
              <CommunityRouter
                slug={activeCommunitySlug}
                session={session}
                onBack={() => { setScrollToTmdbId(null); setActiveCommunitySlug(null); }}
                onToast={showToast}
                onShelvesChanged={() => { if (session) loadShelves(session.user.id); }}
                communitySubscriptions={communitySubscriptions}
                onOpenCommunity={(slug, tmdbId) => { setScrollToTmdbId(tmdbId || null); setActiveCommunitySlug(slug); }}
                scrollToTmdbId={scrollToTmdbId}
                letterboxdSyncSignal={letterboxdSyncSignal}
              />
            </div>
          </div>
        )}

        {/* Group View */}
        {showGroupView && activeGroup && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "var(--bg-primary)" }}>
            <GroupViewScreen
              group={activeGroup}
              session={session}
              onBack={() => { setShowGroupView(false); setActiveGroup(null); }}
              onToast={showToast}
            />
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
              userGroups={userGroups}
              onOpenGroup={(id) => loadGroupView(id)}
              onCreateGroup={() => setShowCreateGroup(true)}
              onJoinCode={(code) => session ? joinGroupByCode(code, session.user.id) : null}
              onImportComplete={() => { if (session) loadShelves(session.user.id); }}
            />
          </div>
        )}

        {/* Create Group Modal */}
        {showCreateGroup && (
          <CreateGroupModal
            onClose={(group) => {
              setShowCreateGroup(false);
              if (group?.id) loadGroupView(group.id);
            }}
            onCreate={createGroup}
          />
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
                const emoji = type === "book" ? "📖" : type === "tv" ? "📺" : type === "game" ? "🎮" : "🎬";
                const msg = (type === "book" && status === "reading") ? `Reading! ${emoji}` :
                  (type === "tv" && status === "watching") ? `Watching! ${emoji}` :
                  (type === "game" && status === "playing") ? `Playing! ${emoji}` : `Shelf'd! ${emoji}`;
                showToast(msg);

                // Auto-complete watching habit when a movie is logged
                if (type === "movie") {
                  autoCompleteHabit("watching", null, "film");
                }
                // Auto-complete watching habit when a show is shelved as finished
                if (type === "tv") {
                  autoCompleteHabit("watching", null, "show");
                }
                // Auto-complete reading habit when a book is shelved as finished
                if (type === "book" && status === "finished") {
                  autoCompleteHabit("reading");
                }
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
