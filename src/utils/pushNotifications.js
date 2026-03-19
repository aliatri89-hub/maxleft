// ── Push Notifications for Capacitor ──
// Handles registration, token storage, foreground toasts, and background tap navigation.
// All functions are no-ops on web — safe to import everywhere.

import { Capacitor } from '@capacitor/core';
import { supabase } from '../supabase';

let _pushModule = null;

// Lazy-load the plugin only on native (avoids web bundling issues)
async function getPush() {
  if (!_pushModule) {
    _pushModule = await import('@capacitor/push-notifications');
  }
  return _pushModule.PushNotifications;
}

/**
 * Initialize push notifications on native platforms.
 * Call once after the user is authenticated.
 *
 * Flow:
 * 1. Request permission
 * 2. Register with OS (APNs on iOS, FCM on Android)
 * 3. On success, upsert the device token to Supabase (via listener)
 */
export async function initPushNotifications(showToast) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const PushNotifications = await getPush();

    // Check current permission state
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.log('Push permission not granted');
      return;
    }

    // Register with the OS push service
    await PushNotifications.register();
  } catch (err) {
    console.error('Push notification init failed:', err);
  }
}

/**
 * Set up all push notification listeners.
 * Call once on app mount (inside useEffect in App.jsx).
 * Returns a cleanup function to remove listeners.
 */
export function setupPushListeners(showToast, navigate) {
  if (!Capacitor.isNativePlatform()) return () => {};

  let listeners = [];
  let mounted = true;

  (async () => {
    const PushNotifications = await getPush();

    if (!mounted) return;

    // Fired when registration with the OS succeeds — save the token
    listeners.push(
      await PushNotifications.addListener('registration', async (token) => {
        console.log('Push token received:', token.value);
        await upsertDeviceToken(token.value);
      })
    );

    // Fired when registration fails
    listeners.push(
      await PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
      })
    );

    // Fired when a push arrives while the app is in the foreground
    listeners.push(
      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received in foreground:', notification);
        if (showToast && notification.body) {
          showToast(notification.title || 'MANTL', notification.body);
        }
      })
    );

    // Fired when the user taps a push notification (app was in background/killed)
    listeners.push(
      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('Push tapped:', action);
        const data = action.notification.data;
        if (data?.route && navigate) {
          navigate(data.route);
        }
      })
    );
  })();

  // Return cleanup function
  return () => {
    mounted = false;
    listeners.forEach((listener) => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    });
  };
}

/**
 * Upsert the device's push token into Supabase.
 * Called automatically after successful registration.
 */
async function upsertDeviceToken(token) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('Cannot save push token — no authenticated user');
      return;
    }

    const { error } = await supabase.from('device_tokens').upsert(
      {
        user_id: user.id,
        token,
        platform: Capacitor.getPlatform(), // 'ios' or 'android'
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    );

    if (error) {
      console.error('Failed to save device token:', error);
    } else {
      console.log('Device token saved');
    }
  } catch (err) {
    console.error('upsertDeviceToken error:', err);
  }
}

/**
 * Remove the current device's token from Supabase.
 * Call on sign-out so the device stops receiving notifications.
 */
export async function removeDeviceToken() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const platform = Capacitor.getPlatform();

    const { error } = await supabase
      .from('device_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', platform);

    if (error) {
      console.error('Failed to remove device token:', error);
    }
  } catch (err) {
    console.error('removeDeviceToken error:', err);
  }
}
