import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TextField } from '@coachos/theme';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const MIN_CYCLE_LENGTH_DAYS = 1;
export const MAX_CYCLE_LENGTH_DAYS = 31;

/** The lengths a coach actually writes plans in: a week and its multiples. */
const PRESETS = [7, 14, 21, 28];

type CycleLengthPickerProps = {
  length: number;
  onChange: (length: number) => void;
  disabled?: boolean;
};

/**
 * Presets for the usual week-shaped cycles, with a free field for everything
 * else — including the single-day plan, which is what a plan was before cycles
 * existed and still the right answer for "same thing every day".
 */
export function CycleLengthPicker({ length, onChange, disabled = false }: CycleLengthPickerProps) {
  const theme = useTheme();
  // Held as text so the field can be empty mid-edit without snapping back to 1.
  const [customText, setCustomText] = useState(String(length));

  const commit = (value: number) => {
    setCustomText(String(value));
    onChange(value);
  };

  const handleCustomChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    setCustomText(digits);
    const parsed = Number.parseInt(digits, 10);
    if (Number.isFinite(parsed) && parsed >= MIN_CYCLE_LENGTH_DAYS && parsed <= MAX_CYCLE_LENGTH_DAYS) {
      onChange(parsed);
    }
  };

  // A field left empty or out of range keeps the cycle it had, rather than
  // silently resizing it to something the coach never chose.
  const handleCustomBlur = () => setCustomText(String(length));

  return (
    <View style={styles.wrap}>
      <ThemedText type="label" themeColor="textSecondary">
        Cycle length
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {length === 1
          ? 'One day, repeated every day.'
          : `${length} days, then back to day 1.`}
      </ThemedText>

      <View style={styles.presets}>
        {PRESETS.map((preset) => {
          const isSelected = preset === length;
          return (
            <Pressable
              key={preset}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled }}
              accessibilityLabel={`${preset}-day cycle`}
              disabled={disabled}
              onPress={() => commit(preset)}
              style={[
                styles.preset,
                { borderColor: theme.border },
                isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
                disabled && styles.disabled,
              ]}>
              <ThemedText type="smallBold" themeColor={isSelected ? 'onPrimary' : 'textPrimary'}>
                {preset}
              </ThemedText>
            </Pressable>
          );
        })}

        <View style={styles.customField}>
          <TextField
            style={styles.customInput}
            inputStyle={styles.customInputText}
            keyboardType="number-pad"
            value={customText}
            onChangeText={handleCustomChange}
            onBlur={handleCustomBlur}
            editable={!disabled}
            accessibilityLabel={`Cycle length in days, 1 to ${MAX_CYCLE_LENGTH_DAYS}`}
          />
          <ThemedText type="meta" themeColor="textSecondary">
            days
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  preset: {
    minWidth: 52,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  customInput: {
    width: 72,
  },
  customInputText: {
    paddingHorizontal: Spacing.two,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
