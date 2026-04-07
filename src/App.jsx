import { t } from "./theme";
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { App as CapApp } from "@capacitor/app";
import { supabase } from "./supabase";
import "./styles/App.css";

const FeedScreen    = lazy(() => import("./screens/FeedScreen"));
const ProfileScreen = lazy(() => import("./screens/ProfileScreen"));
const SearchScreen  = lazy(() => import("./screens/SearchScreen"));
const LandingScreen = lazy(() => import("./screens/LandingScreen"));
const UsernameSetup = lazy(() => import("./screens/UsernameSetup"));

import AudioPlayerProvider from "./components/community/shared/AudioPlayerProvider";
import NotificationBell   from "./components/NotificationBell";
import NotificationCenter from "./components/NotificationCenter";
import useNotifications   from "./hooks/useNotifications";
import { initPushNotifications, setupPushListeners } from "./utils/pushNotifications";
import { useToast } from "./hooks/useToast";

export const probeSafeArea = () => {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:0;width:0;visibility:hidden;pointer-events:none;";
  probe.style.height = "env(safe-area-inset-top, 0px)";
  document.body.appendChild(probe);
  const top = probe.getBoundingClientRect().height;
  probe.remove();
  probe.style.height = "env(safe-area-inset-bottom, 0px)";
  document.body.appendChild(probe);
  const bottom = probe.getBoundingClientRect().height;
  probe.remove();
  if (top > 0)    document.documentElement.style.setProperty("--sat", `${top}px`);
  if (bottom > 0) document.documentElement.style.setProperty("--sab", `${bottom}px`);
};

if (Capacitor.isNativePlatform()) {
  const FALLBACK = "48px";
  document.documentElement.style.setProperty("--sat", FALLBACK);
  (async () => {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setBackgroundColor({ color: t.bgPrimary });
    await StatusBar.setStyle({ style: Style.Dark });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      probeSafeArea();
      let r = 0;
      const retry = () => {
        if (r++ >= 8) return;
        const cur = getComputedStyle(document.documentElement).getPropertyValue("--sat").trim();
        if (!cur || cur === "0px" || cur === FALLBACK) setTimeout(() => { probeSafeArea(); retry(); }, 250);
      };
      retry();
    }));
  })();
  CapApp.addListener("appStateChange", ({ isActive }) => {
    if (isActive) {
      (async () => {
        try { await StatusBar.setOverlaysWebView({ overlay: true }); await StatusBar.setStyle({ style: Style.Dark }); } catch (_) {}
        setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(probeSafeArea)), 300);
      })();
    }
  });
}

export default function App() {
  const [session, setSession]           = useState(undefined);
  const [activeTab, setActiveTab]       = useState("feed");
  const [notifOpen, setNotifOpen]       = useState(false);
  const [needsUsername, setNeedsUsername] = useState(false);
  const { toast, showToast } = useToast();
  const { notifications, unreadCount, markAllSeen } = useNotifications(session);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    initPushNotifications(showToast);
    const cleanup = setupPushListeners(showToast, () => {});
    return cleanup;
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user) { setNeedsUsername(false); return; }
    supabase.from("profiles").select("username").eq("id", session.user.id).single()
      .then(({ data }) => setNeedsUsername(!data?.username));
  }, [session?.user?.id]);

  useEffect(() => {
    if (session === undefined) return;
    const el = document.getElementById("splash-screen");
    if (el) setTimeout(() => el.classList.add("hidden"), 300);
  }, [session]);

  if (session === undefined) return null;

  if (!session) return (
    <Suspense fallback={null}><LandingScreen onAuth={() => {}} /></Suspense>
  );

  if (needsUsername) return (
    <Suspense fallback={null}><UsernameSetup session={session} onComplete={() => setNeedsUsername(false)} /></Suspense>
  );

  return (
    <AudioPlayerProvider session={session}>
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: t.bgPrimary, overflow: "hidden" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "calc(var(--sat, 0px) + 10px) 16px 10px", background: t.bgPrimary, borderBottom: `0.5px solid ${t.border}`, flexShrink: 0, zIndex: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 22, color: t.textPrimary, letterSpacing: "-0.02em" }}>
            Max <span style={{ color: "#C4734F" }}>Left</span>
          </span>
          <NotificationBell unreadCount={unreadCount} onClick={() => { setNotifOpen(true); markAllSeen(); }} />
        </div>

        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <Suspense fallback={null}>
            {activeTab === "feed"    && <FeedScreen    session={session} isActive />}
            {activeTab === "search"  && <SearchScreen  session={session} isActive />}
            {activeTab === "profile" && <ProfileScreen session={session} isActive />}
          </Suspense>
        </div>

        <nav style={{ display: "flex", borderTop: `0.5px solid ${t.border}`, background: t.bgPrimary, paddingBottom: "var(--sab, 0px)", flexShrink: 0, zIndex: 10 }}>
          {[{ id: "feed", label: "Home" }, { id: "search", label: "Search" }, { id: "profile", label: "You" }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: "12px 0", border: "none", background: "none", color: activeTab === tab.id ? "#C4734F" : t.textTertiary, fontSize: 11, fontWeight: activeTab === tab.id ? 600 : 400, cursor: "pointer", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {tab.label}
            </button>
          ))}
        </nav>

        {notifOpen && <NotificationCenter notifications={notifications} onClose={() => setNotifOpen(false)} />}

        {toast && (
          <div style={{ position: "fixed", bottom: "calc(var(--sab, 0px) + 80px)", left: "50%", transform: "translateX(-50%)", background: t.bgCard, color: t.textPrimary, borderRadius: 12, padding: "10px 18px", fontSize: 14, zIndex: 9999, border: `0.5px solid ${t.border}` }}>
            {toast}
          </div>
        )}
      </div>
    </AudioPlayerProvider>
  );
}
