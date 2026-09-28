import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { pushTokenApi } from '@/lib/api';
import { APP_KEY, CHANNELS } from '@/lib/reminder-definitions';

/*
  Push notifications from the backend (a new invite, a new plan …) arrive
  through Expo's push service. This registers the device's Expo push token
  with the backend after sign-in and removes it on sign-out.

  Android needs Firebase's google-services.json in the build (see
  app.config.ts) and the FCM key uploaded to EAS; iOS needs the APNs key EAS
  creates on the first build. Without them a token can't be issued, and
  everything here quietly does nothing.
*/

/** Shows a notification that arrives while the app is open, rather than dropping it. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const TOKEN_KEY = `coachos.${APP_KEY}.push_token`;

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNELS.updates.id, {
    name: CHANNELS.updates.name,
    importance: Notifications.AndroidImportance.HIGH,
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.reminders.id, {
    name: CHANNELS.reminders.name,
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Asks for permission if the person hasn't decided yet, and says whether
 * notifications are allowed. Never asks again after a refusal: iOS won't show
 * the prompt twice, so the Reminders section points to Settings instead.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  await ensureAndroidChannels();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function notificationsAllowed(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/**
 * Registers this device for pushes. Called after every sign-in and app start
 * while signed in: tokens can rotate, and registering is idempotent.
 */
export async function registerForPushNotifications(): Promise<void> {
  // Simulators and emulators can't receive remote pushes.
  if (!Device.isDevice) return;
  if (!(await ensureNotificationPermission())) return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await pushTokenApi.register(token, Platform.OS === 'ios' ? 'IOS' : 'ANDROID');
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    // Most often: Firebase isn't set up for this Android build yet.
    console.log('[push] could not register for push notifications', error);
  }
}

/** Sign-out: stop this device receiving the account's pushes. Needs the session, so call it first. */
export async function unregisterPushNotifications(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await pushTokenApi.unregister(token);
  } catch {
    // Offline or already gone: the backend drops dead tokens on its own.
  }
}

export const pushSupported = true;
