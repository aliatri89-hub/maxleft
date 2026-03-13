import { useCallback } from "react";

/**
 * useMediaFilter — manages the solo/hide/all media filter cycle.
 *
 * Filter string format: "solo:film" | "hide:book" | "solo:game" | "hide:listened" | null
 * null = show everything
 *
 * Cycle on click: null → solo:type → hide:type → null
 * If a different type is already solo'd: jump straight to solo:type
 *
 * Returns:
 *   cycleMedia(type)  — call on CyclePill click
 *   mediaState(type)  — returns "all" | "solo" | "hide" | "dimmed" for a given type
 */
export function useMediaFilter(mediaFilter, onMediaFilterChange) {
  const cycleMedia = useCallback((type) => {
    if (!onMediaFilterChange) return;
    if (!mediaFilter) onMediaFilterChange(`solo:${type}`);
    else if (mediaFilter === `solo:${type}`) onMediaFilterChange(`hide:${type}`);
    else if (mediaFilter === `hide:${type}`) onMediaFilterChange(null);
    else onMediaFilterChange(`solo:${type}`);
  }, [mediaFilter, onMediaFilterChange]);

  const mediaState = useCallback((type) => {
    if (!mediaFilter) return "all";
    if (mediaFilter === `solo:${type}`) return "solo";
    if (mediaFilter === `hide:${type}`) return "hide";
    const [mode] = mediaFilter.split(":");
    if (mode === "solo") return "dimmed";
    return "all";
  }, [mediaFilter]);

  return { cycleMedia, mediaState };
}
