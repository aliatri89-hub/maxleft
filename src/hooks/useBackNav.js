import { useEffect, useRef, useCallback } from "react";

/**
 * useBackNav — Android back gesture / browser back button navigation.
 *
 * Components register close callbacks via pushNav; popstate fires the deepest one.
 * Falls back to navigating to feed tab if no registered overlays.
 */
export function useBackNav(activeTab, setActiveTab) {
  const backActions = useRef([]);

  const pushNav = useCallback((key, fn) => {
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
        setActiveTab("feed");
        window.scrollTo(0, 0);
      } else {
        window.history.pushState({ nav: 0 }, "");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [activeTab, setActiveTab]);

  return { pushNav, removeNav };
}
