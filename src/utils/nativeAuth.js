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

/**
 * Start listening for deep link callbacks (call once on app startup)
 * When the OAuth redirect comes back via app.mymantl://login-callback#access_token=...
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

    // Extract tokens from the URL hash fragment
    // Format: app.mymantl://login-callback#access_token=xxx&refresh_token=yyy&...
    const hashPart = url.split('#')[1];
    if (!hashPart) return;

    const params = new URLSearchParams(hashPart);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
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
    // Get the OAuth URL without redirecting
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'app.mymantl://login-callback',
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      if (showToast) showToast('Sign in failed — please try again');
      return;
    }

    // Open the OAuth URL in the system browser
    Browser.open({ url: data.url });
  } catch (e) {
    console.error('Native sign in error:', e);
    if (showToast) showToast('Sign in failed — please try again');
  }
}
