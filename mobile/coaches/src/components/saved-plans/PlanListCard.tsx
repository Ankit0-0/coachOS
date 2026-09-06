import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
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

type PlanListCardProps = {
  items: PlanListEntry[];
  showAllHref: Href;
  emptyLabel: string;
};

export function PlanListCard({ items, showAllHref, emptyLabel }: PlanListCardProps) {
  const theme = useTheme();
  const router = useRouter();

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
          <ThemedText type="smallBold" style={styles.title} numberOfLines={1}>
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

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(showAllHref)}
        style={({ pressed }) => [
          styles.showAll,
          { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
          pressed && styles.pressed,
        ]}>
        <ThemedText type="linkPrimary">Show all</ThemedText>
      </Pressable>
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
  showAll: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
});
