// ─── RevenueCat SDK Bridge ─────────────────────────────────────
//
// Wraps @revenuecat/purchases-capacitor for MANTL.
// Handles SDK init, user identification, entitlement checks,
// purchase flow, and paywall presentation.
//
// Entitlement ID: "mantl_pro"
// Product ID:     "mantl_monthly_pro" ($5/month)
//
// RevenueCat is native-only (Android/iOS). On web, all users
// are treated as free-tier so the app remains fully testable
// in the browser during development.
// ────────────────────────────────────────────────────────────────

import { Capacitor } from "@capacitor/core";

const isNative = Capacitor.isNativePlatform();

// Lazy-load the SDK modules only on native — avoids import
// errors on web where the native plugin isn't available.
let Purchases = null;
let LOG_LEVEL = null;
let RevenueCatUI = null;
let PAYWALL_RESULT = null;

const RC_API_KEY_GOOGLE = "goog_dhdAQjsUohpCwZwlqmxWVhGfryx";
// const RC_API_KEY_APPLE = ""; // Add when iOS is configured

const ENTITLEMENT_ID = "mantl_pro";

let _initialized = false;
let _customerInfoListenerRemove = null;

// ── Load SDK modules (native only) ─────────────────────────────
async function loadSDK() {
  if (!isNative) return false;
  if (Purchases) return true;
  try {
    const mod = await import("@revenuecat/purchases-capacitor");
    Purchases = mod.Purchases;
    LOG_LEVEL = mod.LOG_LEVEL;
    PAYWALL_RESULT = mod.PAYWALL_RESULT;
    try {
      const uiMod = await import("@revenuecat/purchases-capacitor-ui");
      RevenueCatUI = uiMod.RevenueCatUI;
    } catch (e) {
      console.warn("[RC] UI plugin not available:", e.message);
    }
    return true;
  } catch (e) {
    console.error("[RC] Failed to load SDK:", e);
    return false;
  }
}

// ── Initialize RevenueCat ──────────────────────────────────────
// Call once after Supabase auth resolves, passing the user's UUID.
// If called before auth (no userId), RC uses an anonymous ID —
// fine for browsing, but call identify() after login.
export async function initRevenueCat(userId) {
  if (_initialized || !isNative) return;
  const loaded = await loadSDK();
  if (!loaded) return;

  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    await Purchases.configure({
      apiKey: RC_API_KEY_GOOGLE,
      appUserID: userId || null,
    });
    _initialized = true;
    console.log("[RC] Configured", userId ? `for user ${userId}` : "anonymously");
  } catch (e) {
    console.error("[RC] Configure failed:", e);
  }
}

// ── Identify user (login) ──────────────────────────────────────
// If RC was initialized anonymously (e.g. app opened before login),
// call this after Supabase auth to link the RC customer to the
// Supabase user_id. This is idempotent — safe to call if already
// identified with the same ID.
export async function identifyUser(userId) {
  if (!isNative || !_initialized || !userId) return;
  try {
    await Purchases.logIn({ appUserID: userId });
    console.log("[RC] Identified user:", userId);
  } catch (e) {
    console.error("[RC] logIn failed:", e);
  }
}

// ── Logout (reset to anonymous) ────────────────────────────────
export async function logoutRevenueCat() {
  if (!isNative || !_initialized) return;
  try {
    await Purchases.logOut();
    console.log("[RC] Logged out");
  } catch (e) {
    console.error("[RC] logOut failed:", e);
  }
}

// ── Check subscription status ──────────────────────────────────
// Returns { isPro, customerInfo } — isPro is true if the user has
// an active "mantl_pro" entitlement.
export async function checkSubscription() {
  if (!isNative || !_initialized) {
    return { isPro: false, customerInfo: null };
  }
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    const isPro = !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
    return { isPro, customerInfo };
  } catch (e) {
    console.error("[RC] getCustomerInfo failed:", e);
    return { isPro: false, customerInfo: null };
  }
}

// ── Get offerings ──────────────────────────────────────────────
// Returns the current offering (packages to display on a custom paywall).
export async function getOfferings() {
  if (!isNative || !_initialized) return null;
  try {
    const { offerings } = await Purchases.getOfferings();
    return offerings?.current || null;
  } catch (e) {
    console.error("[RC] getOfferings failed:", e);
    return null;
  }
}

// ── Purchase a package ─────────────────────────────────────────
// For custom paywall: pass a package from getOfferings().
// Returns { success, customerInfo, error }.
export async function purchasePackage(pkg) {
  if (!isNative || !_initialized || !pkg) {
    return { success: false, customerInfo: null, error: "Not available" };
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    const isPro = !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
    return { success: isPro, customerInfo, error: null };
  } catch (e) {
    const userCancelled = e?.code === "1" || e?.message?.includes("cancelled");
    if (userCancelled) {
      return { success: false, customerInfo: null, error: "cancelled" };
    }
    console.error("[RC] Purchase failed:", e);
    return { success: false, customerInfo: null, error: e.message };
  }
}

// ── Present RevenueCat native paywall ──────────────────────────
// Uses the paywall you design in the RevenueCat dashboard.
// Returns the paywall result (PURCHASED, CANCELLED, RESTORED, ERROR).
export async function presentPaywall() {
  if (!isNative || !_initialized || !RevenueCatUI) {
    console.warn("[RC] Paywall not available (native only)");
    return null;
  }
  try {
    const { result } = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: ENTITLEMENT_ID,
      displayCloseButton: true,
    });
    console.log("[RC] Paywall result:", result);
    return result;
  } catch (e) {
    console.error("[RC] presentPaywall failed:", e);
    return null;
  }
}

// ── Present Customer Center ────────────────────────────────────
// For managing subscriptions (cancel, change plan, restore).
export async function presentCustomerCenter() {
  if (!isNative || !_initialized || !RevenueCatUI) {
    console.warn("[RC] Customer Center not available (native only)");
    return;
  }
  try {
    await RevenueCatUI.presentCustomerCenter();
  } catch (e) {
    console.error("[RC] Customer Center failed:", e);
  }
}

// ── Restore purchases ──────────────────────────────────────────
export async function restorePurchases() {
  if (!isNative || !_initialized) return { isPro: false };
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const isPro = !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
    return { isPro, customerInfo };
  } catch (e) {
    console.error("[RC] Restore failed:", e);
    return { isPro: false, customerInfo: null };
  }
}

// ── Listen for customer info updates ───────────────────────────
// Fires whenever subscription status changes (purchase, renewal,
// expiration, billing issue). Returns a cleanup function.
export async function onCustomerInfoUpdate(callback) {
  if (!isNative || !_initialized) return () => {};
  try {
    const listener = await Purchases.addCustomerInfoUpdateListener(
      (info) => {
        const isPro = !!info?.customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
        callback({ isPro, customerInfo: info.customerInfo });
      }
    );
    return () => listener?.remove?.();
  } catch (e) {
    console.error("[RC] addCustomerInfoUpdateListener failed:", e);
    return () => {};
  }
}

// ── Constants export ───────────────────────────────────────────
export { ENTITLEMENT_ID, isNative as isNativePlatform };
