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
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.log('Push permission not granted');
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
      console.log('Push token received:', token.value);
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
      console.log('Push received in foreground:', notification);
      if (showToast && notification.body) {
        showToast(notification.title || 'MANTL', notification.body);
      }
    })
  );

  listeners.push(
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push tapped:', action);
      const data = action.notification.data;
      // Switch to feed tab on coverage notification tap
      if (data?.type === 'new_coverage' && navigate) {
        navigate('feed');
      } else if (data?.route && navigate) {
        navigate(data.route);
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
    else console.log('Device token saved');
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
