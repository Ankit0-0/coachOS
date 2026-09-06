import { PlanListCard } from '@/components/saved-plans/PlanListCard';
import { Section } from '@/components/ui/section';
import type { Plan } from '@/lib/api';
import { toPlanListEntry } from '@/lib/plan-format';

export function ExploreWorkoutPlansCard({ plans }: { plans: Plan[] }) {
  return (
    <Section title="Shared workout plans">
      <PlanListCard
        items={plans.map(toPlanListEntry)}
        showAllHref="/explore-workout-plans"
        emptyLabel="No shared workout plans are available yet."
      />
    </Section>
  );
}
