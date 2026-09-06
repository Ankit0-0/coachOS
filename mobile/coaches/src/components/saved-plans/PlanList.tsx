import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PlanListEntry } from '@/components/saved-plans/PlanListCard';

export function PlanList({ items, emptyLabel }: { items: PlanListEntry[]; emptyLabel: string }) {
  const theme = useTheme();

  if (items.length === 0) {
    return (
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          {emptyLabel}
        </ThemedText>
      </Card>
    );
  }

  return (
    <Card padded={false}>
      {items.map((item, index) => (
        <View
          key={item.id}
          style={[
            styles.row,
            index < items.length - 1 && {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: theme.border,
            },
          ]}>
          <ThemedText type="smallBold" style={styles.title} numberOfLines={2}>
            {item.title}
          </ThemedText>
          <View style={styles.stats}>
            <ThemedText type="meta" themeColor="textSecondary">
              {item.primaryStat}
            </ThemedText>
            <ThemedText type="meta">{item.secondaryStat}</ThemedText>
          </View>
        </View>
      ))}
    </Card>
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
});
