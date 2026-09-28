import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Callout, Checkbox, SegmentedControl } from '@coachos/theme';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Section } from '@/components/ui/section';
import { Spacing } from '@/constants/theme';
import { ensureNotificationPermission, notificationsAllowed } from '@/lib/push-notifications';
import { REMINDERS, type ReminderId } from '@/lib/reminder-definitions';
import {
  applyReminderSchedule,
  formatReminderTime,
  loadReminderSettings,
  remindersSupported,
  saveReminderSettings,
  type ReminderSettings,
} from '@/lib/reminders';

function timeKey(hour: number, minute: number): string {
  return `${hour}:${minute}`;
}

/**
 * Profile → Reminders: turn each reminder on or off and pick its time.
 * Scheduled on the phone, so they fire even offline. Turning one on is what
 * asks for notification permission if it hasn't been given yet.
 */
export function RemindersSection() {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [loaded, permitted] = await Promise.all([loadReminderSettings(), notificationsAllowed()]);
      if (!active) return;
      setSettings(loaded);
      setAllowed(permitted);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!remindersSupported || !settings) return null;

  const update = async (id: ReminderId, change: Partial<ReminderSettings[ReminderId]>) => {
    if (change.enabled) {
      const permitted = await ensureNotificationPermission();
      setAllowed(permitted);
      if (!permitted) return;
    }
    const next = { ...settings, [id]: { ...settings[id], ...change } };
    setSettings(next);
    await saveReminderSettings(next);
    await applyReminderSchedule(next);
  };

  return (
    <Section title="Reminders">
      <Card style={styles.card}>
        {!allowed ? (
          <View style={styles.blocked}>
            <Callout>Notifications are off for this app. Turn them on in Settings to get reminders.</Callout>
            <Button label="Open Settings" variant="secondary" size="sm" onPress={() => void Linking.openSettings()} />
          </View>
        ) : null}

        {REMINDERS.map((reminder, index) => {
          const setting = settings[reminder.id];
          const isOn = setting.enabled && allowed;
          return (
            <View key={reminder.id} style={[styles.reminder, index > 0 && styles.spaced]}>
              <View style={styles.header}>
                <View style={styles.copy}>
                  <ThemedText type="smallBold">{reminder.label}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {reminder.description}
                  </ThemedText>
                </View>
                <Checkbox
                  checked={isOn}
                  accessibilityLabel={`${reminder.label} reminder`}
                  onPress={() => void update(reminder.id, { enabled: !isOn })}
                />
              </View>
              {isOn ? (
                <SegmentedControl
                  accessibilityLabel={`${reminder.label} time`}
                  options={reminder.times.map((time) => ({
                    value: timeKey(time.hour, time.minute),
                    label: formatReminderTime(time),
                  }))}
                  value={timeKey(setting.hour, setting.minute)}
                  onChange={(value) => {
                    const [hour, minute] = value.split(':').map(Number);
                    void update(reminder.id, { hour: hour ?? setting.hour, minute: minute ?? setting.minute });
                  }}
                />
              ) : null}
            </View>
          );
        })}
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  blocked: {
    gap: Spacing.two,
  },
  reminder: {
    gap: Spacing.twoHalf,
  },
  spaced: {
    paddingTop: Spacing.one,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  copy: {
    flex: 1,
    gap: Spacing.half,
  },
});
