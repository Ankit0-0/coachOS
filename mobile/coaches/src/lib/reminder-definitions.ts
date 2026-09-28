/**
 * This app's side of notifications: the reminders a coach can turn on, and
 * the Android channels notifications are filed under. The scheduling and
 * storage logic (lib/reminders.ts, lib/push-notifications.ts) is the same in
 * both apps; only this file differs.
 */

export const APP_KEY = 'coach';

export type ReminderId = 'daily-review' | 'weekly-planning';

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
    id: 'daily-review',
    label: 'Daily check-in review',
    description: 'A nudge to see who trained today and who needs a word.',
    title: 'Check in on your clients',
    body: 'See who ticked off today’s plan and who could use a nudge.',
    url: '/',
    times: [
      { hour: 18, minute: 0 },
      { hour: 20, minute: 0 },
      { hour: 21, minute: 0 },
      { hour: 12, minute: 0 },
    ],
    enabledByDefault: true,
  },
  {
    id: 'weekly-planning',
    label: 'Sunday planning',
    description: 'Once a week, a reminder to review progress and adjust plans.',
    title: 'Plan the week ahead',
    body: 'Review your clients’ week and adjust their plans for the next one.',
    url: '/',
    weekday: 1,
    times: [
      { hour: 17, minute: 0 },
      { hour: 10, minute: 0 },
      { hour: 19, minute: 0 },
      { hour: 21, minute: 0 },
    ],
    enabledByDefault: false,
  },
];

/** Android groups notifications into channels people can mute separately in system settings. */
export const CHANNELS = {
  updates: { id: 'updates', name: 'Client updates' },
  reminders: { id: 'reminders', name: 'Reminders' },
} as const;
