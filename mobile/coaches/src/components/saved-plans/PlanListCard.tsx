import { useRouter, type Href } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PlanRow, type PlanListEntry } from '@/components/saved-plans/PlanRow';
import { Button } from '@/components/ui/button';
import { Card, InsetPanel } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';

// Re-exported so the several screens already importing the type from here
// keep working; it is defined alongside the row that consumes it.
export type { PlanListEntry };

type PlanListCardProps = {
  items: PlanListEntry[];
  showAllHref: Href;
  emptyLabel: string;
};

export function PlanListCard({ items, showAllHref, emptyLabel }: PlanListCardProps) {
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
    <Card style={styles.card}>
      <InsetPanel>
        {items.map((item) => (
          <PlanRow key={item.id} item={item} titleLines={1} />
        ))}
      </InsetPanel>
      <Button label="Show all" variant="ghost" onPress={() => router.push(showAllHref)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.twoHalf,
    gap: Spacing.one,
  },
});
