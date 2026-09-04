import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PlanListEntry } from '@/components/saved-plans/PlanListCard';

export function PlanList({ items }: { items: PlanListEntry[] }) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
      {items.map((item, index) => (
        <View key={item.id}>
          <View style={styles.row}>
            <ThemedText type="small" style={styles.name}>
              {item.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.stats}
            </ThemedText>
          </View>
          {index < items.length - 1 ? (
            <View style={[styles.separator, { backgroundColor: theme.border }]} />
          ) : null}
        </View>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  name: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
