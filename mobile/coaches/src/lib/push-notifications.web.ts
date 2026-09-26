/*
  The web build doesn't receive push notifications. Same exports as
  push-notifications.ts so callers need no platform checks.
*/

export async function ensureNotificationPermission(): Promise<boolean> {
  return false;
}

export async function notificationsAllowed(): Promise<boolean> {
  return false;
}

export async function registerForPushNotifications(): Promise<void> {}

export async function unregisterPushNotifications(): Promise<void> {}

export const pushSupported = false;
