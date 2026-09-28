/**
 * This app's side of notifications: the reminders a client can turn on, and
 * the Android channels notifications are filed under. The scheduling and
 * storage logic (lib/reminders.ts, lib/push-notifications.ts) is the same in
 * both apps; only this file differs.
 */

export const APP_KEY = 'client';

export type ReminderId = 'morning-plan' | 'evening-check-in' | 'weekly-weigh-in';

export type ReminderTime = { hour: number; minute: number };

export type ReminderDefinition = {
  id: ReminderId;
  label: string;
  description: string;
  title: string;
  body: string;
  /** Where tapping the notification goes. */
  url: string;
  /** 1 = Sunday … 7 = Saturday, as expo-notifications counts; unset means every day. */
  weekday?: number;
  /** The times offered in the picker; the first is the default. */
  times: readonly ReminderTime[];
  /** On for a new install once notifications are allowed. */
  enabledByDefault: boolean;
};

export const REMINDERS: readonly ReminderDefinition[] = [
  {
    id: 'morning-plan',
    label: 'Morning plan',
    description: 'A nudge to look at today’s workout and meals.',
    title: 'Today’s plan is ready',
    body: 'See what your coach has lined up for today.',
    url: '/',
    times: [
      { hour: 7, minute: 0 },
      { hour: 8, minute: 0 },
      { hour: 9, minute: 0 },
      { hour: 6, minute: 0 },
    ],
    enabledByDefault: false,
  },
  {
    id: 'evening-check-in',
    label: 'Evening check-in',
    description: 'A reminder to tick off the sets and meals you did.',
    title: 'Tick off today',
    body: 'Mark the sets and meals you did, so your coach sees your day.',
    url: '/',
    times: [
      { hour: 20, minute: 0 },
      { hour: 21, minute: 0 },
      { hour: 19, minute: 0 },
      { hour: 22, minute: 0 },
    ],
    enabledByDefault: true,
  },
  {
    id: 'weekly-weigh-in',
    label: 'Monday weigh-in',
    description: 'Once a week, a reminder to log your weight and a photo.',
    title: 'Weigh-in day',
    body: 'Log your weight and a progress photo for your coach.',
    url: '/',
    weekday: 2,
    times: [
      { hour: 8, minute: 0 },
      { hour: 7, minute: 0 },
      { hour: 9, minute: 0 },
      { hour: 18, minute: 0 },
    ],
    enabledByDefault: false,
  },
];

/** Android groups notifications into channels people can mute separately in system settings. */
export const CHANNELS = {
  updates: { id: 'updates', name: 'Updates from your coach' },
  reminders: { id: 'reminders', name: 'Reminders' },
} as const;
