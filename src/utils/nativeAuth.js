// ── Native Auth for Capacitor ──
// Handles Google OAuth on both web (redirect) and native (system browser + deep link)
//
// Web flow:  signInWithOAuth → browser redirect → Supabase detects token in URL
// Native flow: signInWithOAuth(skipBrowserRedirect) → open system browser → 
//              deep link back to app://  → parse tokens → setSession

import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { supabase } from '../supabase';

let _listenerCleanup = null;
let _nativeAuthPending = false;

/** Check if a native OAuth flow is currently in progress */
export function isNativeAuthPending() {
  return _nativeAuthPending;
}

/** Clear the native auth pending flag (call on timeout or success) */
export function clearNativeAuthPending() {
  _nativeAuthPending = false;
}

/**
 * Start listening for deep link callbacks (call once on app startup)
 * When the OAuth redirect comes back via app.maxleft://login-callback#access_token=...
 * we parse the tokens and set the Supabase session.
 */
export async function initDeepLinkListener() {
  if (!Capacitor.isNativePlatform()) return;

  // Clean up any existing listener
  if (_listenerCleanup) {
    _listenerCleanup.remove();
    _listenerCleanup = null;
  }

  _listenerCleanup = App.addListener('appUrlOpen', async ({ url }) => {
    // Only handle our auth callback
    if (!url.includes('login-callback')) return;

    // Close the system browser
    try {
      Browser.close();
    } catch (e) {
      // Browser might already be closed
    }

    // Re-probe safe area — Chrome Custom Tab closing returns focus to the
    // WebView but Android takes ~300ms to restore window insets. Probing here
    // (immediately post-Browser.close) is more reliable than appStateChange
    // which doesn't always fire a clean false→true cycle with Custom Tabs.
    setTimeout(() => {
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;left:0;width:0;visibility:hidden;pointer-events:none;height:env(safe-area-inset-top,0px)';
      document.body.appendChild(el);
      const top = el.getBoundingClientRect().height;
      el.remove();
      if (top > 0) document.documentElement.style.setProperty('--sat', `${top}px`);
    }, 350);

    // Extract tokens from the URL hash fragment
    // Format: app.maxleft://login-callback#access_token=xxx&refresh_token=yyy&...
    const hashPart = url.split('#')[1];
    if (!hashPart) return;

    const params = new URLSearchParams(hashPart);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      _nativeAuthPending = false; // tokens received, clear pending
      // Set the session — this triggers onAuthStateChange in App.jsx
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        console.error('Failed to set session from deep link:', error.message);
      }
    }
  });
}

/**
 * Sign in with Google — platform-aware
 * On web: standard redirect flow (existing behavior)
 * On native: opens system browser, redirects back via deep link
 */
export async function signInWithGoogle(showToast) {
  if (Capacitor.isNativePlatform()) {
    return signInNative(showToast);
  } else {
    return signInWeb(showToast);
  }
}

// ── Web flow (existing behavior) ──
async function signInWeb(showToast) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error && showToast) {
    showToast('Sign in failed — please try again');
  }
}

// ── Native flow (system browser + deep link) ──
async function signInNative(showToast) {
  try {
    _nativeAuthPending = true; // flag: don't flash landing when app resumes
    // Get the OAuth URL without redirecting
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'app.maxleft://login-callback',
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      _nativeAuthPending = false;
      if (showToast) showToast('Sign in failed — please try again');
      return;
    }

    // Open the OAuth URL in the system browser
    Browser.open({ url: data.url });
  } catch (e) {
    _nativeAuthPending = false;
    console.error('Native sign in error:', e);
    if (showToast) showToast('Sign in failed — please try again');
  }
}
