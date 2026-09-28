import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/contexts/auth';
import { registerForPushNotifications } from '@/lib/push-notifications';
import { applyReminderSchedule, loadReminderSettings } from '@/lib/reminders';

/**
 * Mounted once in the root layout. While someone is signed in it keeps this
 * device registered for pushes and their reminders scheduled, and opens the
 * screen a notification points at when it is tapped — including the tap that
 * launched the app.
 */
export function NotificationsBridge() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const lastResponse = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    void (async () => {
      await registerForPushNotifications();
      await applyReminderSchedule(await loadReminderSettings());
    })();
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || !lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const url = lastResponse.notification.request.content.data?.url;
    // Only the app's own routes; a notification is not a way to open anything else.
    if (typeof url === 'string' && url.startsWith('/')) router.push(url as Href);
  }, [isSignedIn, lastResponse, router]);

  return null;
}
