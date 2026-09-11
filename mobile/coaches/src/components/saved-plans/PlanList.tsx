import { ThemedText } from '@/components/themed-text';
import { PlanRow, type PlanListEntry } from '@/components/saved-plans/PlanRow';
import { Card } from '@/components/ui/card';

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
    <Card padded={false}>
      {items.map((item, index) => (
        <PlanRow key={item.id} item={item} divider={index < items.length - 1} />
      ))}
    </Card>
  );
}
