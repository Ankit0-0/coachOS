import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { HitTarget, Radii, Spacing } from '@/constants/theme';
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
  const step = (pressed: boolean) => [
    styles.step,
    { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceInset : theme.surface },
  ];

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        onPress={onPrevious}
        style={({ pressed }) => step(pressed)}>
        <SymbolView
          name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
          size={16}
          tintColor={theme.textPrimary}
        />
      </Pressable>

      <ThemedText type="heading">{label}</ThemedText>

      {/* Kept in place when disabled so the label stays centred. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next month"
        aria-disabled={isAtCurrentMonth}
        onPress={onNext}
        disabled={isAtCurrentMonth}
        style={({ pressed }) => [...step(pressed && !isAtCurrentMonth), isAtCurrentMonth && styles.disabled]}>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={16}
          tintColor={theme.textPrimary}
        />
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
    alignSelf: 'stretch',
  },
  step: {
    width: HitTarget,
    height: HitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radii.pill,
  },
  disabled: {
    opacity: 0.4,
  },
});
