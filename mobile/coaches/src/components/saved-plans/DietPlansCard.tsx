import { PlanListCard } from '@/components/saved-plans/PlanListCard';
import { Section } from '@/components/ui/section';
import type { Plan } from '@/lib/api';
import { toPlanListEntry } from '@/lib/plan-format';

export function DietPlansCard({ plans }: { plans: Plan[] }) {
  return (
    <Section title="Your diet plans">
      <PlanListCard
        items={plans.map(toPlanListEntry)}
        showAllHref="/diet-plans"
        emptyLabel="No diet plans yet. Create one to assign it to a client."
      />
    </Section>
  );
}
