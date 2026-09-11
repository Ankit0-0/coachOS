import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PlanRow, type PlanListEntry } from '@/components/saved-plans/PlanRow';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Re-exported so the several screens already importing the type from here
// keep working; it is defined alongside the row that consumes it.
export type { PlanListEntry };

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
        <PlanRow key={item.id} item={item} divider={index < items.length - 1} titleLines={1} />
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
  showAll: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
});
