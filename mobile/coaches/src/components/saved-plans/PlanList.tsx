import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PlanRow, type PlanListEntry } from '@/components/saved-plans/PlanRow';
import { Card, InsetPanel } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';

export function PlanList({ items, emptyLabel }: { items: PlanListEntry[]; emptyLabel: string }) {
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
    <Card style={styles.card}>
      <InsetPanel>
        {items.map((item) => (
          <PlanRow key={item.id} item={item} />
        ))}
      </InsetPanel>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.twoHalf,
  },
});
