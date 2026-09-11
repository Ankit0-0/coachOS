import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PlanListEntry = {
  id: string;
  title: string;
  /** Short figure, e.g. "5 exercises". */
  primaryStat: string;
  /** Supporting figure, e.g. "45 min". */
  secondaryStat: string;
};

type PlanRowProps = {
  item: PlanListEntry;
  /** Draws the hairline separating this row from the next one. */
  divider: boolean;
  titleLines?: number;
};

/**
 * One tappable plan row.
 *
 * Lives here rather than in each list component because `PlanList` and
 * `PlanListCard` previously carried their own copy of this markup, and the
 * copies drifted — neither was tappable, and wiring only one would have left
 * half the plan screens dead.
 *
 * Opens the plan editor, which decides on its own whether the plan is
 * editable or read-only; a row has no business knowing that.
 */
export function PlanRow({ item, divider, titleLines = 2 }: PlanRowProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}`}
      onPress={() => router.push({ pathname: '/create-plan', params: { planId: item.id } })}
      style={({ pressed }) => [
        styles.row,
        divider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" style={styles.title} numberOfLines={titleLines}>
        {item.title}
      </ThemedText>
      <View style={styles.stats}>
        <ThemedText type="meta" themeColor="textSecondary">
          {item.primaryStat}
        </ThemedText>
        <ThemedText type="meta">{item.secondaryStat}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  title: {
    flex: 1,
  },
  stats: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.6,
  },
});
