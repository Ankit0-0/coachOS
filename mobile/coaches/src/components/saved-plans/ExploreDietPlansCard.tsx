import { PlanListCard } from '@/components/saved-plans/PlanListCard';
import { Section } from '@/components/ui/section';
import type { Plan } from '@/lib/api';
import { toPlanListEntry } from '@/lib/plan-format';

export function ExploreDietPlansCard({ plans }: { plans: Plan[] }) {
  return (
    <Section title="Shared diet plans">
      <PlanListCard
        items={plans.map(toPlanListEntry)}
        showAllHref="/explore-diet-plans"
        emptyLabel="No shared diet plans are available yet."
      />
    </Section>
  );
}
