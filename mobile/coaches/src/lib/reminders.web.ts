import { REMINDERS, type ReminderId, type ReminderTime } from '@/lib/reminder-definitions';

/*
  The web build has no scheduled notifications: a browser tab can't wake
  itself at 8 pm. Same exports as reminders.ts so callers need no platform checks.
*/

export type ReminderSetting = { enabled: boolean; hour: number; minute: number };
export type ReminderSettings = Record<ReminderId, ReminderSetting>;

export function defaultReminderSettings(): ReminderSettings {
  const settings = {} as ReminderSettings;
  for (const reminder of REMINDERS) {
    const [first] = reminder.times;
    settings[reminder.id] = { enabled: false, hour: first?.hour ?? 9, minute: first?.minute ?? 0 };
  }
  return settings;
}

export async function loadReminderSettings(): Promise<ReminderSettings> {
  return defaultReminderSettings();
}

export async function saveReminderSettings(_settings: ReminderSettings): Promise<void> {}

export async function applyReminderSchedule(_settings: ReminderSettings): Promise<void> {}

export async function cancelAllReminders(): Promise<void> {}

export function formatReminderTime(time: ReminderTime): string {
  const suffix = time.hour < 12 ? 'am' : 'pm';
  const hour12 = time.hour % 12 === 0 ? 12 : time.hour % 12;
  return time.minute === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(time.minute).padStart(2, '0')} ${suffix}`;
}

export const remindersSupported = false;
