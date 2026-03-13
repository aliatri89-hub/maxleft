// ── Haptic feedback utility ──
// Uses navigator.vibrate() — works on Android and PWA.
// When you add Capacitor later, swap these for Haptics.impact() calls.

const vibrate = (ms) => {
  try { navigator?.vibrate?.(ms); } catch {}
};

/** Light tap — nav switches, toggles, selections */
export const tapLight = () => vibrate(8);

/** Medium tap — shelf actions, pin, rate */
export const tapMedium = () => vibrate(18);

/** Heavy tap — delete, sign out, important actions */
export const tapHeavy = () => vibrate(30);

/** Success — toast confirmations, completed actions */
export const notifySuccess = () => vibrate(12);

/** Selection change — scrolling through options */
export const selectionTick = () => vibrate(5);
