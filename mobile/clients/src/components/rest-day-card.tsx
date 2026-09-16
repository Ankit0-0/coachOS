import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type RestDayCardProps = {
  /** "Day 3 of 7 · Active recovery" — carries the coach's label, so the heading need not repeat it. */
  cycleLabel?: string;
};

/**
 * A rest day is a scheduled part of the plan, not a day the client failed to
 * train — so it gets its own state rather than an empty list or a 0% ring.
 */
export function RestDayCard({ cycleLabel }: RestDayCardProps) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.copy}>
        {cycleLabel ? <ThemedText type="meta">{cycleLabel}</ThemedText> : null}
        <ThemedText type="heading">Rest day</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Nothing scheduled today. Recovery is part of the plan — eat well, sleep, and come back tomorrow.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
  },
  copy: {
    gap: Spacing.one,
  },
});
