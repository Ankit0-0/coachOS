import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

import {
  APP_KEY,
  CHANNELS,
  REMINDERS,
  type ReminderDefinition,
  type ReminderId,
  type ReminderTime,
} from '@/lib/reminder-definitions';

/*
  Reminders are local notifications, scheduled on the phone itself: they fire
  on time with no network and no server job. The choices are kept on the
  device, and the schedule is rebuilt from them on every sign-in and change.
*/

export type ReminderSetting = { enabled: boolean; hour: number; minute: number };
export type ReminderSettings = Record<ReminderId, ReminderSetting>;

const STORAGE_KEY = `coachos.${APP_KEY}.reminders`;

export function defaultReminderSettings(): ReminderSettings {
  const settings = {} as ReminderSettings;
  for (const reminder of REMINDERS) {
    const [first] = reminder.times;
    settings[reminder.id] = { enabled: reminder.enabledByDefault, hour: first?.hour ?? 9, minute: first?.minute ?? 0 };
  }
  return settings;
}

/** Stored choices over the defaults, so a reminder added in an update gets its default. */
export async function loadReminderSettings(): Promise<ReminderSettings> {
  const settings = defaultReminderSettings();
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return settings;
    const stored = JSON.parse(raw) as Partial<Record<string, Partial<ReminderSetting>>>;
    for (const reminder of REMINDERS) {
      const saved = stored[reminder.id];
      if (!saved) continue;
      settings[reminder.id] = {
        enabled: typeof saved.enabled === 'boolean' ? saved.enabled : settings[reminder.id].enabled,
        hour: typeof saved.hour === 'number' ? saved.hour : settings[reminder.id].hour,
        minute: typeof saved.minute === 'number' ? saved.minute : settings[reminder.id].minute,
      };
    }
  } catch {
    // Unreadable storage: the defaults stand.
  }
  return settings;
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Not persisted; the schedule still applies until the app is reinstalled.
  }
}

function trigger(reminder: ReminderDefinition, setting: ReminderSetting): Notifications.NotificationTriggerInput {
  if (reminder.weekday !== undefined) {
    return {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: reminder.weekday,
      hour: setting.hour,
      minute: setting.minute,
      channelId: CHANNELS.reminders.id,
    };
  }
  return {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour: setting.hour,
    minute: setting.minute,
    channelId: CHANNELS.reminders.id,
  };
}

/**
 * Replaces every scheduled reminder with the enabled ones. Does nothing (and
 * schedules nothing) unless notifications are allowed; asking is left to the
 * sign-in flow and the Reminders section.
 */
export async function applyReminderSchedule(settings: ReminderSettings): Promise<void> {
  await cancelAllReminders();
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;
  for (const reminder of REMINDERS) {
    const setting = settings[reminder.id];
    if (!setting.enabled) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `reminder-${reminder.id}`,
      content: { title: reminder.title, body: reminder.body, data: { url: reminder.url } },
      trigger: trigger(reminder, setting),
    });
  }
}

/** Sign-out: nobody's reminders should fire on a phone they have left. */
export async function cancelAllReminders(): Promise<void> {
  await Promise.all(
    REMINDERS.map((reminder) => Notifications.cancelScheduledNotificationAsync(`reminder-${reminder.id}`).catch(() => undefined)),
  );
}

export function formatReminderTime(time: ReminderTime): string {
  const suffix = time.hour < 12 ? 'am' : 'pm';
  const hour12 = time.hour % 12 === 0 ? 12 : time.hour % 12;
  return time.minute === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(time.minute).padStart(2, '0')} ${suffix}`;
}

export const remindersSupported = true;
