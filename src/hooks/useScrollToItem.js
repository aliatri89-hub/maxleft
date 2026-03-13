import { useEffect, useRef } from "react";

/**
 * useScrollToItem — scrolls to the shelf containing a specific tmdb_id.
 *
 * When scrollToTmdbId is set, finds which miniseries contains that item,
 * auto-switches to the correct tab if needed, then uses a MutationObserver
 * to wait for the shelf DOM element to appear before scrolling.
 *
 * Usage in any community screen:
 *   useScrollToItem(scrollToTmdbId, miniseries, accent);                    // no tabs
 *   useScrollToItem(scrollToTmdbId, miniseries, accent, setActiveTab);      // with tabs
 *
 * Requires shelves to have `data-shelf-id={series.id}` on their container element.
 *
 * @param {string|number} scrollToTmdbId  — target tmdb_id to find and scroll to
 * @param {Array}         miniseries      — ALL miniseries (not filtered by tab)
 * @param {string}        accent          — accent color for highlight flash
 * @param {Function}      [onSwitchTab]   — optional (tabKey) => void to auto-switch tabs
 * @param {string}        [defaultTabKey] — tab key for items with no tab_key (default: "filmography")
 */
export function useScrollToItem(scrollToTmdbId, miniseries, accent, onSwitchTab, defaultTabKey = "filmography") {
  const hasScrolled = useRef(false);
  const observerRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Cleanup any previous observer/timeout on re-run
    cleanup();

    if (!scrollToTmdbId || !miniseries?.length || hasScrolled.current) return;

    // Find which miniseries contains the target item
    const targetSeries = miniseries.find(s =>
      (s.items || []).some(i => String(i.tmdb_id) === String(scrollToTmdbId))
    );

    if (!targetSeries) return;

    // If there's a tab system, switch to the correct tab first
    const targetTab = targetSeries.tab_key || defaultTabKey;
    if (onSwitchTab) {
      onSwitchTab(targetTab);
    }

    const selector = `[data-shelf-id="${targetSeries.id}"]`;

    // Give a brief moment for tab switch to start rendering, then begin watching
    const startDelay = onSwitchTab ? 100 : 50;

    timeoutRef.current = setTimeout(() => {
      // Try immediately — element might already be in DOM
      const existing = document.querySelector(selector);
      if (existing) {
        scrollAndHighlight(existing, accent);
        hasScrolled.current = true;
        return;
      }

      // Not found yet — use MutationObserver to wait for it
      observerRef.current = new MutationObserver((mutations, obs) => {
        const el = document.querySelector(selector);
        if (el) {
          obs.disconnect();
          observerRef.current = null;
          // Wait one frame so layout is settled after DOM insertion
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              scrollAndHighlight(el, accent);
              hasScrolled.current = true;
            });
          });
        }
      });

      observerRef.current.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Safety timeout — stop watching after 8 seconds to avoid memory leaks
      // (covers very slow connections where data never loads)
      timeoutRef.current = setTimeout(() => {
        if (observerRef.current) {
          observerRef.current.disconnect();
          observerRef.current = null;
        }
        // One final check in case element appeared in a gap
        const lastTry = document.querySelector(selector);
        if (lastTry && !hasScrolled.current) {
          scrollAndHighlight(lastTry, accent);
          hasScrolled.current = true;
        }
      }, 8000);
    }, startDelay);

    return cleanup;
  }, [scrollToTmdbId, miniseries, accent, onSwitchTab, defaultTabKey]);

  function cleanup() {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }
}

/** Scroll element into view with a brief highlight flash */
function scrollAndHighlight(el, accent) {
  el.scrollIntoView({ behavior: "smooth", block: "center" });

  el.style.transition = "box-shadow 0.3s ease";
  el.style.boxShadow = `inset 0 0 0 2px ${accent || "#e94560"}44, 0 0 20px ${accent || "#e94560"}22`;
  setTimeout(() => {
    el.style.boxShadow = "none";
    setTimeout(() => { el.style.transition = ""; }, 300);
  }, 1500);
}
