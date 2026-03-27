import { useState, useRef, useCallback } from "react";
import { tapLight } from "../utils/haptics";

/**
 * useTabSwipe — Navigation with two layers:
 *
 * TOP (swipe):   New Releases ↔ Streaming ↔ Activity  (feed sub-modes)
 * BOTTOM (tap):  Communities | Games | Search | My MANTL  (main tabs)
 *
 * Feed is position 0 in the slider. Bottom nav items are positions 1-3.
 * Swiping only works within the feed sub-tabs. Bottom nav is tap-only.
 * MANTL logo in header returns to feed.
 */

const TABS = ["feed", "communities", "games", "search", "mantl"];
const FEED_MODES = ["releases", "podcast", "activity"];

export function useTabSwipe(activeTab, setActiveTab, pushNav, removeNav, feedMode, setFeedMode) {
  const tabSwipeStart = useRef(null);
  const tabSwipeDelta = useRef(0);
  const sliderRef = useRef(null);
  const [tabSwipeOffset, setTabSwipeOffset] = useState(0);
  const [preloadTab, setPreloadTab] = useState(null);

  // Animate slider to a tab by name
  const animateSlider = useCallback((tabName) => {
    if (!sliderRef.current) return;
    const idx = TABS.indexOf(tabName);
    sliderRef.current.classList.add("animating");
    sliderRef.current.style.transform = `translateX(-${idx * 100}%)`;
    sliderRef.current.style.setProperty("--active-index", idx);
    const onEnd = () => {
      requestAnimationFrame(() => { sliderRef.current?.classList.remove("animating"); });
    };
    sliderRef.current.addEventListener("transitionend", onEnd, { once: true });
  }, []);

  // Position slider when activeTab changes
  const syncSliderPosition = useCallback(() => {
    if (!sliderRef.current) return;
    const idx = TABS.indexOf(activeTab);
    if (!sliderRef.current.classList.contains("animating")) {
      sliderRef.current.style.transform = `translateX(-${idx * 100}%)`;
      sliderRef.current.style.setProperty("--active-index", idx);
    }
  }, [activeTab]);

  const onTouchStart = useCallback((e) => {
    // Only allow swiping on the feed tab (sub-mode swipes)
    if (activeTab !== "feed") return;

    const touch = e.touches[0];
    // Check if touch target has horizontal scroll
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
  }, [activeTab]);

  const onTouchMove = useCallback((e) => {
    if (!tabSwipeStart.current || activeTab !== "feed") return;
    const dx = e.touches[0].clientX - tabSwipeStart.current.x;
    const dy = e.touches[0].clientY - tabSwipeStart.current.y;

    // Lock to vertical scroll if vertical movement dominates
    if (!tabSwipeStart.current.locked && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      tabSwipeStart.current = null;
      return;
    }

    if (Math.abs(dx) > 10) {
      tabSwipeStart.current.locked = true;
      tabSwipeDelta.current = dx;

      // Edge resistance at boundaries of feed sub-modes
      const modeIdx = FEED_MODES.indexOf(feedMode);
      const atLeftEdge = modeIdx === 0 && dx > 0;
      const atRightEdge = modeIdx === FEED_MODES.length - 1 && dx < 0;
      const resist = (atLeftEdge || atRightEdge) ? 0.15 : 0.3;

      setTabSwipeOffset((dx / window.innerWidth) * resist);
    }
  }, [activeTab, feedMode]);

  const onTouchEnd = useCallback(() => {
    if (!tabSwipeStart.current || activeTab !== "feed") return;
    const dx = tabSwipeDelta.current;

    // Tap (no swipe movement)
    if (Math.abs(dx) < 5) {
      tabSwipeStart.current = null;
      tabSwipeDelta.current = 0;
      return;
    }

    const dt = Date.now() - tabSwipeStart.current.time;
    const velocity = Math.abs(dx) / dt;
    const threshold = velocity > 0.5 ? 50 : 120;
    const modeIdx = FEED_MODES.indexOf(feedMode);

    // Swipe between feed sub-modes
    if (dx < -threshold && modeIdx < FEED_MODES.length - 1) {
      setFeedMode(FEED_MODES[modeIdx + 1]);
      tapLight();
    } else if (dx > threshold && modeIdx > 0) {
      setFeedMode(FEED_MODES[modeIdx - 1]);
      tapLight();
    }

    tabSwipeStart.current = null;
    tabSwipeDelta.current = 0;
    setTabSwipeOffset(0);
  }, [activeTab, feedMode, setFeedMode]);

  return {
    sliderRef,
    tabSwipeOffset,
    preloadTab,
    setPreloadTab,
    animateSlider,
    syncSliderPosition,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    TABS,
  };
}
