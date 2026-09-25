import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { addMonths, isDateKey } from '@/lib/dates';
import { defaultPeriod, periodError, presetOf, type PeriodDraft, type PeriodPreset } from '@/lib/subscription-period';
import { SegmentedControl, TextField } from '@coachos/theme';

type Choice = `${PeriodPreset}` | 'open';

/** Short labels so five segments fit a phone; the full wording is read out. */
const CHOICES: { value: Choice; label: string; accessibilityLabel: string }[] = [
  { value: '1', label: '1 mo', accessibilityLabel: '1 month' },
  { value: '3', label: '3 mo', accessibilityLabel: '3 months' },
  { value: '6', label: '6 mo', accessibilityLabel: '6 months' },
  { value: '12', label: '12 mo', accessibilityLabel: '12 months' },
  { value: 'open', label: 'Ongoing', accessibilityLabel: 'No fixed period' },
];

type SubscriptionPeriodPickerProps = {
  value: PeriodDraft;
  onChange: (value: PeriodDraft) => void;
  disabled?: boolean;
};

/**
 * The first subscription period, when inviting or accepting a request.
 * Prefilled (today, three months out), so the common case is untouched; a
 * length sets the end from the start, and either date can be typed.
 */
export function SubscriptionPeriodPicker({ value, onChange, disabled }: SubscriptionPeriodPickerProps) {
  const preset = presetOf(value);
  const error = periodError(value);

  const choose = (choice: Choice) => {
    if (choice === 'open') return onChange(null);
    const start = value && isDateKey(value.start) ? value.start : defaultPeriod().start;
    onChange({ start, end: addMonths(start, Number(choice)) });
  };

  // Moving the start keeps a chosen length; with custom dates the end stays put.
  const setStart = (start: string) => {
    if (!value) return;
    const keepLength = typeof preset === 'number' && isDateKey(start);
    onChange({ start, end: keepLength ? addMonths(start, preset) : value.end });
  };

  return (
    <View style={styles.block}>
      <ThemedText type="label" themeColor="textSecondary">
        Subscription
      </ThemedText>
      <SegmentedControl
        options={CHOICES}
        value={preset === null ? null : preset === 'open' ? 'open' : `${preset}`}
        onChange={choose}
        disabled={disabled}
        accessibilityLabel="Subscription length"
      />
      {value ? (
        <View style={styles.dates}>
          <View style={styles.date}>
            <ThemedText type="meta">Starts</ThemedText>
            <TextField
              value={value.start}
              onChangeText={setStart}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!disabled}
              accessibilityLabel="Subscription start date, YYYY-MM-DD"
            />
          </View>
          <View style={styles.date}>
            <ThemedText type="meta">Ends</ThemedText>
            <TextField
              value={value.end}
              onChangeText={(end) => onChange({ start: value.start, end })}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!disabled}
              invalid={error !== null}
              accessibilityLabel="Subscription end date, YYYY-MM-DD"
            />
          </View>
        </View>
      ) : (
        <ThemedText type="meta">No end date. You can add a period later from the client&apos;s page.</ThemedText>
      )}
      {error ? (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.two,
  },
  dates: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  date: {
    flex: 1,
    gap: Spacing.one,
  },
});
