import { useEffect, useRef, useCallback } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

/**
 * useBackNav — Android back gesture / browser back button navigation.
 *
 * On native Android: uses Capacitor App.addListener('backButton').
 * On web: falls back to popstate.
 * Falls back to navigating to feed tab if no registered overlays.
 */
export function useBackNav(activeTab, setActiveTab) {
  const backActions = useRef([]);

  const pushNav = useCallback((key, fn) => {
    backActions.current = backActions.current.filter(a => a.key !== key);
    backActions.current.push({ key, fn });
    if (!Capacitor.isNativePlatform()) {
      window.history.pushState({ nav: key }, "");
    }
  }, []);

  const removeNav = useCallback((key) => {
    backActions.current = backActions.current.filter(a => a.key !== key);
  }, []);

  useEffect(() => {
    const handleBack = () => {
      if (backActions.current.length > 0) {
        const action = backActions.current.pop();
        action.fn();
      } else if (activeTab !== "feed") {
        setActiveTab("feed");
        window.scrollTo(0, 0);
      }
      // On native, do nothing if already at root (prevents app exit on Android)
    };

    if (Capacitor.isNativePlatform()) {
      // Native Android — use Capacitor back button, canGoBack=false prevents app exit
      const listener = App.addListener("backButton", ({ canGoBack }) => {
        handleBack();
      });
      return () => { listener.then(l => l.remove()); };
    } else {
      // Web fallback — popstate
      window.history.replaceState({ nav: 0 }, "");
      const onPop = () => handleBack();
      window.addEventListener("popstate", onPop);
      return () => window.removeEventListener("popstate", onPop);
    }
  }, [activeTab, setActiveTab]);

  const dismissOverlays = useCallback(() => {
    const remaining = [];
    backActions.current.forEach(a => {
      if (a.key === "tab") {
        remaining.push(a);
      } else {
        a.fn();
      }
    });
    backActions.current = remaining;
  }, []);

  return { pushNav, removeNav, dismissOverlays };
}
