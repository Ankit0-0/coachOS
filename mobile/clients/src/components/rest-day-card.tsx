import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/pill';
import { Spacing } from '@/constants/theme';

type RestDayCardProps = {
  /** "Day 3 of 7 · Active recovery" — carries the coach's label, so the heading need not repeat it. */
  cycleLabel?: string;
};

/**
 * A rest day is a scheduled part of the plan, not a day the client failed to
 * train — so it gets its own state rather than an empty list or a 0% ring.
 */
export function RestDayCard({ cycleLabel }: RestDayCardProps) {
  return (
    <Card>
      <View style={styles.copy}>
        {cycleLabel ? <Chip label={cycleLabel} tone="neutral" /> : null}
        <ThemedText type="heading">Rest day</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Nothing scheduled today. Recovery is part of the plan — eat well, sleep, and come back tomorrow.
        </ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  copy: {
    gap: Spacing.two,
  },
});
