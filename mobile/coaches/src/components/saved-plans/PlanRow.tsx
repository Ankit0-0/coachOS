import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';

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
  titleLines?: number;
};

/**
 * One tappable plan row, shared by `PlanList` and `PlanListCard` so the two
 * can't drift. Opens the plan editor, which decides on its own whether the
 * plan is editable or read-only.
 */
export function PlanRow({ item, titleLines = 2 }: PlanRowProps) {
  const router = useRouter();

  return (
    <Row
      accessibilityLabel={`Open ${item.title}`}
      onPress={() => router.push({ pathname: '/create-plan', params: { planId: item.id } })}>
      <View style={styles.copy}>
        <ThemedText type="smallBold" numberOfLines={titleLines}>
          {item.title}
        </ThemedText>
        <ThemedText type="meta">{[item.primaryStat, item.secondaryStat].filter(Boolean).join(' · ')}</ThemedText>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: Spacing.half,
  },
});
