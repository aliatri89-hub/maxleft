// ── Push Notifications for Capacitor ──
// Handles registration, token storage, foreground toasts, and background tap navigation.
// All functions are no-ops on web — gated by Capacitor.isNativePlatform().

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../supabase';

/**
 * Initialize push notifications on native platforms.
 * Call once after the user is authenticated.
 */
export async function initPushNotifications(showToast) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Create the notification channel with IMPORTANCE_HIGH before registering.
    // Must be done before any notifications arrive — Android ignores importance
    // changes to existing channels, so we use a new channel ID (mantl_alerts)
    // to guarantee the correct importance level on all installs.
    if (Capacitor.getPlatform() === 'android') {
      await PushNotifications.createChannel({
        id: 'mantl_alerts',
        name: 'Max Left Notifications',
        description: 'Coverage alerts, badge updates, and activity from Max Left',
        importance: 4,   // IMPORTANCE_HIGH — shows in Alerting, not Silent/Promotions
        visibility: 1,   // VISIBILITY_PUBLIC
        sound: 'default',
        vibration: true,
        lights: true,
      });
    }

    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      return;
    }

    await PushNotifications.register();
  } catch (err) {
    console.error('Push notification init failed:', err);
  }
}

/**
 * Set up all push notification listeners.
 * Call once on app mount (inside useEffect in App.jsx).
 * Returns a cleanup function to remove listeners.
 *
 * IMPORTANT: Uses synchronous addListener so listeners are attached
 * before the native registration event fires.
 */
export function setupPushListeners(showToast, navigate) {
  if (!Capacitor.isNativePlatform()) return () => {};

  const listeners = [];

  listeners.push(
    PushNotifications.addListener('registration', async (token) => {
      await upsertDeviceToken(token.value);
    })
  );

  listeners.push(
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    })
  );

  listeners.push(
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      if (showToast && notification.body) {
        showToast(notification.title || 'Max Left', notification.body);
      }
    })
  );

  listeners.push(
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data;
      if (navigate) {
        navigate(data);
      }
    })
  );

  return () => {
    listeners.forEach((listener) => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    });
  };
}

/**
 * Upsert the device's push token into Supabase.
 */
async function upsertDeviceToken(token) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('device_tokens').upsert(
      {
        user_id: user.id,
        token,
        platform: Capacitor.getPlatform(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    );

    if (error) console.error('Failed to save device token:', error);
  } catch (err) {
    console.error('upsertDeviceToken error:', err);
  }
}

/**
 * Remove the current device's token from Supabase.
 * Call on sign-out.
 */
export async function removeDeviceToken() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('device_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', Capacitor.getPlatform());

    if (error) console.error('Failed to remove device token:', error);
  } catch (err) {
    console.error('removeDeviceToken error:', err);
  }
}
