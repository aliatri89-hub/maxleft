import { useEffect } from "react";

/**
 * useBackGesture — wire a modal/overlay to Android back gesture
 *
 * When `isOpen` is truthy, pushes a history entry so back-gesture closes it.
 * When `isOpen` is falsy (or on unmount), removes the handler cleanly.
 *
 * @param {string} key      — unique key for the nav stack (e.g. "communityLogModal")
 * @param {boolean} isOpen  — whether the modal/overlay is currently visible
 * @param {Function} closeFn — function to close the modal
 * @param {Function} pushNav — from App.jsx
 * @param {Function} removeNav — from App.jsx
 */
export function useBackGesture(key, isOpen, closeFn, pushNav, removeNav) {
  useEffect(() => {
    if (!pushNav || !removeNav) return;
    if (isOpen) {
      pushNav(key, closeFn);
    } else {
      removeNav(key);
    }
    // Cleanup on unmount (e.g. navigating away from community)
    return () => removeNav(key);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
}
