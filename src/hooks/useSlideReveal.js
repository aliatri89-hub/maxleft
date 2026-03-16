import { useState, useEffect, useRef } from "react";

/**
 * useSlideReveal — hides until value loads, then triggers a one-time reveal.
 *
 * Used by hero stat counters so the "0" state is never visible — the number
 * appears with a slide-up animation once it has a real value.
 *
 * @param {number} value — the stat to watch (e.g. watched count)
 * @returns {boolean} revealed — true once value > 0 (stays true permanently)
 */
export function useSlideReveal(value) {
  const [revealed, setRevealed] = useState(false);
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (!hasTriggered.current && value > 0) {
      hasTriggered.current = true;
      const t = setTimeout(() => setRevealed(true), 50);
      return () => clearTimeout(t);
    }
  }, [value]);

  return revealed;
}
