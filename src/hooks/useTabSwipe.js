import { useState, useRef, useCallback } from "react";
import { tapLight } from "../utils/haptics";

/**
 * useTabSwipe — Swipeable tab navigation with indicator bar animation.
 *
 * Handles touch start/move/end for swiping between tabs, slider animation,
 * preload tab tracking, and indicator bar offset calculation.
 */

const TABS = ["feed", "explore", "shelf"];

export function useTabSwipe(activeTab, setActiveTab, pushNav, removeNav) {
  const tabSwipeStart = useRef(null);
  const tabSwipeDelta = useRef(0);
  const sliderRef = useRef(null);
  const [tabSwipeOffset, setTabSwipeOffset] = useState(0);
  const [preloadTab, setPreloadTab] = useState(null);

  // Animate slider to a tab by name (for nav button taps)
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

  // Position slider when activeTab changes (initial load, programmatic switches)
  const syncSliderPosition = useCallback(() => {
    if (!sliderRef.current) return;
    const idx = TABS.indexOf(activeTab);
    if (!sliderRef.current.classList.contains("animating")) {
      sliderRef.current.style.transform = `translateX(-${idx * 100}%)`;
      sliderRef.current.style.setProperty("--active-index", idx);
    }
  }, [activeTab]);

  const onTouchStart = useCallback((e) => {
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
    if (sliderRef.current) {
      sliderRef.current.classList.remove("animating");
      sliderRef.current.classList.add("swiping");
    }
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!tabSwipeStart.current) return;
    const dx = e.touches[0].clientX - tabSwipeStart.current.x;
    const dy = e.touches[0].clientY - tabSwipeStart.current.y;

    // Lock to vertical scroll if vertical movement dominates
    if (!tabSwipeStart.current.locked && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      if (sliderRef.current) sliderRef.current.classList.remove("swiping");
      tabSwipeStart.current = null;
      return;
    }

    if (Math.abs(dx) > 10) {
      tabSwipeStart.current.locked = true;
      tabSwipeDelta.current = dx;
      const idx = TABS.indexOf(activeTab);
      const screenW = window.innerWidth;

      // Preload adjacent tab
      const targetIdx = dx < 0 ? Math.min(idx + 1, TABS.length - 1) : Math.max(idx - 1, 0);
      const target = TABS[targetIdx];
      if (target !== activeTab && target !== preloadTab) setPreloadTab(target);

      // Edge resistance
      const atLeft = idx === 0 && dx > 0;
      const atRight = idx === TABS.length - 1 && dx < 0;
      const resist = atLeft || atRight ? 0.15 : 1;
      const offset = dx * resist;

      // Move slider directly (no React re-render)
      if (sliderRef.current) {
        sliderRef.current.style.transform = `translateX(calc(-${idx * 100}% + ${offset}px))`;
      }
      setTabSwipeOffset((dx / screenW) * resist);
    }
  }, [activeTab, preloadTab]);

  const onTouchEnd = useCallback(() => {
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
    const idx = TABS.indexOf(activeTab);
    let nextIdx = idx;

    if (dx < -threshold && idx < TABS.length - 1) {
      nextIdx = idx + 1;
      const next = TABS[nextIdx];
      if (activeTab !== next) pushNav("tab", () => { setActiveTab("feed"); });
      setActiveTab(next);
    } else if (dx > threshold && idx > 0) {
      nextIdx = idx - 1;
      const prev = TABS[nextIdx];
      if (prev === "feed") removeNav("tab");
      else pushNav("tab", () => { setActiveTab("feed"); });
      setActiveTab(prev);
    }

    if (nextIdx !== idx) tapLight();
    if (sliderRef.current) {
      sliderRef.current.classList.remove("swiping");
      sliderRef.current.classList.add("animating");
      sliderRef.current.style.transform = `translateX(-${nextIdx * 100}%)`;
      sliderRef.current.style.setProperty("--active-index", nextIdx);
      const onEnd = () => {
        requestAnimationFrame(() => { sliderRef.current?.classList.remove("animating"); });
      };
      sliderRef.current.addEventListener("transitionend", onEnd, { once: true });
    }

    tabSwipeStart.current = null;
    tabSwipeDelta.current = 0;
    setTabSwipeOffset(0);
    setPreloadTab(null);
  }, [activeTab, setActiveTab, pushNav, removeNav]);

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
