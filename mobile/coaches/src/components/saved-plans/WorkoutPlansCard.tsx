import { PlanListCard } from '@/components/saved-plans/PlanListCard';
import { Section } from '@/components/ui/section';
import type { Plan } from '@/lib/api';
import { toPlanListEntry } from '@/lib/plan-format';

export function WorkoutPlansCard({ plans }: { plans: Plan[] }) {
  return (
    <Section title="Your workout plans">
      <PlanListCard
        items={plans.map(toPlanListEntry)}
        showAllHref="/workout-plans"
        emptyLabel="No workout plans yet. Create one to assign it to a client."
      />
    </Section>
  );
}
