import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MonthNavigatorProps = {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  /** True on the current month, where there is no future data to page into. */
  isAtCurrentMonth: boolean;
};

/** Previous / next stepper over the month the activity calendar is showing. */
export function MonthNavigator({ label, onPrevious, onNext, isAtCurrentMonth }: MonthNavigatorProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        onPress={onPrevious}
        hitSlop={8}
        style={({ pressed }) => [styles.step, { borderColor: theme.border }, pressed && styles.pressed]}>
        <ThemedText type="smallBold">‹</ThemedText>
      </Pressable>

      <ThemedText type="smallBold">{label}</ThemedText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next month"
        onPress={onNext}
        disabled={isAtCurrentMonth}
        hitSlop={8}
        style={({ pressed }) => [
          styles.step,
          { borderColor: theme.border },
          // Kept in place rather than hidden so the label stays centred as
          // the user pages back and forth.
          isAtCurrentMonth && styles.disabled,
          pressed && !isAtCurrentMonth && styles.pressed,
        ]}>
        <ThemedText type="smallBold" themeColor={isAtCurrentMonth ? 'textMuted' : 'text'}>
          ›
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  step: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.sm,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.6,
  },
});
