import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";

/**
 * CommunityTabSlider — smooth horizontal tab slider for community screens.
 *
 * Mirrors the App.jsx swipe pattern: all tab panes are rendered side-by-side,
 * direct DOM transforms during swipe (no React re-renders), CSS transitions
 * for snap-to animations, edge resistance, and lazy mounting via visitedTabs.
 *
 * Props:
 *   tabs        – [{ key, label, icon }]
 *   activeTab   – current tab key (controlled)
 *   onTabChange – (key) => void — called on swipe completion
 *   children    – render prop: (tabKey, isActive) => ReactNode
 *   bottomPad   – px of bottom padding per pane (default 80, for bottom nav)
 *
 * Ref exposes:
 *   animateToTab(key) – smooth CSS transition to a tab (for bottom nav taps)
 */
const CommunityTabSlider = forwardRef(function CommunityTabSlider(
  { tabs, activeTab, onTabChange, children, bottomPad = 80 },
  ref
) {
  const sliderRef = useRef(null);
  const touchRef = useRef(null);
  const deltaRef = useRef(0);
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([activeTab]));
  const [preloadTab, setPreloadTab] = useState(null);

  // ── Track visited tabs (lazy mount) ─────────────────────
  useEffect(() => {
    setVisitedTabs((prev) => {
      const next = new Set(prev);
      if (activeTab) next.add(activeTab);
      if (preloadTab) next.add(preloadTab);
      return next.size !== prev.size ? next : prev;
    });
  }, [activeTab, preloadTab]);

  // ── Position slider when activeTab changes (non-animated) ─
  useEffect(() => {
    if (!sliderRef.current) return;
    const idx = tabs.findIndex((t) => t.key === activeTab);
    if (idx < 0) return;
    // Don't stomp an in-progress animation
    if (!sliderRef.current.classList.contains("csl-animating")) {
      sliderRef.current.style.transform = `translateX(-${idx * 100}%)`;
    }
  }, [activeTab, tabs]);

  // ── Imperative: animated slide to tab (for bottom nav taps) ─
  const animateToTab = useCallback(
    (tabKey) => {
      if (!sliderRef.current) return;
      const idx = tabs.findIndex((t) => t.key === tabKey);
      if (idx < 0) return;
      // Pre-mount the target pane
      setVisitedTabs((prev) => {
        const next = new Set(prev);
        next.add(tabKey);
        return next.size !== prev.size ? next : prev;
      });
      sliderRef.current.classList.remove("csl-swiping");
      sliderRef.current.classList.add("csl-animating");
      sliderRef.current.style.transform = `translateX(-${idx * 100}%)`;
      const onEnd = () => {
        requestAnimationFrame(() => {
          sliderRef.current?.classList.remove("csl-animating");
        });
      };
      sliderRef.current.addEventListener("transitionend", onEnd, { once: true });
    },
    [tabs]
  );

  useImperativeHandle(ref, () => ({ animateToTab }), [animateToTab]);

  // ── Touch: start ────────────────────────────────────────
  const handleTouchStart = useCallback((e) => {
    // Skip if touching a horizontally scrollable child (shelf scrollers, etc.)
    let el = e.target;
    while (el && el !== e.currentTarget) {
      if (el.scrollWidth > el.clientWidth + 4) {
        const style = window.getComputedStyle(el);
        const ox = style.overflowX;
        if (ox === "auto" || ox === "scroll") {
          touchRef.current = null;
          return;
        }
      }
      el = el.parentElement;
    }
    const touch = e.touches[0];
    touchRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      locked: false,
    };
    deltaRef.current = 0;
    if (sliderRef.current) {
      sliderRef.current.classList.remove("csl-animating");
      sliderRef.current.classList.add("csl-swiping");
    }
  }, []);

  // ── Touch: move ─────────────────────────────────────────
  const handleTouchMove = useCallback(
    (e) => {
      if (!touchRef.current) return;
      const dx = e.touches[0].clientX - touchRef.current.x;
      const dy = e.touches[0].clientY - touchRef.current.y;

      // Vertical scroll detected — cancel horizontal swipe
      if (
        !touchRef.current.locked &&
        Math.abs(dy) > Math.abs(dx) &&
        Math.abs(dy) > 10
      ) {
        if (sliderRef.current) sliderRef.current.classList.remove("csl-swiping");
        touchRef.current = null;
        return;
      }

      if (Math.abs(dx) > 10) {
        touchRef.current.locked = true;
        deltaRef.current = dx;

        const idx = tabs.findIndex((t) => t.key === activeTab);

        // Preload adjacent tab so it's mounted before we get there
        const targetIdx =
          dx < 0
            ? Math.min(idx + 1, tabs.length - 1)
            : Math.max(idx - 1, 0);
        const target = tabs[targetIdx]?.key;
        if (target && target !== activeTab && target !== preloadTab) {
          setPreloadTab(target);
        }

        // Edge resistance at first/last tab
        const atLeft = idx === 0 && dx > 0;
        const atRight = idx === tabs.length - 1 && dx < 0;
        const resist = atLeft || atRight ? 0.15 : 1;
        const offset = dx * resist;

        // Direct DOM manipulation — zero React re-renders
        if (sliderRef.current) {
          sliderRef.current.style.transform = `translateX(calc(-${idx * 100}% + ${offset}px))`;
        }
      }
    },
    [tabs, activeTab, preloadTab]
  );

  // ── Touch: end ──────────────────────────────────────────
  const handleTouchEnd = useCallback(() => {
    if (!touchRef.current) return;
    const dx = deltaRef.current;

    // Tap (no real swipe) — bail cleanly so onClick can fire
    if (Math.abs(dx) < 5) {
      if (sliderRef.current) sliderRef.current.classList.remove("csl-swiping");
      touchRef.current = null;
      deltaRef.current = 0;
      return;
    }

    const dt = Date.now() - touchRef.current.time;
    const velocity = Math.abs(dx) / dt;
    const threshold = velocity > 0.5 ? 50 : 120;
    const idx = tabs.findIndex((t) => t.key === activeTab);
    let nextIdx = idx;

    if (dx < -threshold && idx < tabs.length - 1) {
      nextIdx = idx + 1;
    } else if (dx > threshold && idx > 0) {
      nextIdx = idx - 1;
    }

    // Notify parent of tab change
    if (nextIdx !== idx) {
      onTabChange(tabs[nextIdx].key);
    }

    // Animate to final position (snap)
    if (sliderRef.current) {
      sliderRef.current.classList.remove("csl-swiping");
      sliderRef.current.classList.add("csl-animating");
      sliderRef.current.style.transform = `translateX(-${nextIdx * 100}%)`;
      const onEnd = () => {
        requestAnimationFrame(() => {
          sliderRef.current?.classList.remove("csl-animating");
        });
      };
      sliderRef.current.addEventListener("transitionend", onEnd, {
        once: true,
      });
    }

    touchRef.current = null;
    deltaRef.current = 0;
    setPreloadTab(null);
  }, [tabs, activeTab, onTabChange]);

  // ── Render ──────────────────────────────────────────────
  return (
    <>
      <style>{`
        .csl-slider {
          display: flex;
          height: 100%;
          position: relative;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .csl-slider.csl-swiping,
        .csl-slider.csl-animating {
          will-change: transform;
        }
        .csl-slider.csl-animating {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .csl-pane {
          width: 100%;
          min-width: 100%;
          flex-shrink: 0;
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
          touchAction: "pan-y",
        }}
        onTouchStart={tabs.length > 1 ? handleTouchStart : undefined}
        onTouchMove={tabs.length > 1 ? handleTouchMove : undefined}
        onTouchEnd={tabs.length > 1 ? handleTouchEnd : undefined}
      >
        <div className="csl-slider" ref={sliderRef}>
          {tabs.map((tab) => (
            <div
              className="csl-pane"
              key={tab.key}
              style={{ paddingBottom: bottomPad }}
            >
              {visitedTabs.has(tab.key)
                ? children(tab.key, tab.key === activeTab)
                : null}
            </div>
          ))}
        </div>
      </div>
    </>
  );
});

export default CommunityTabSlider;
