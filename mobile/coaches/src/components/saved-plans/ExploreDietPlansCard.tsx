import { PlanListCard } from '@/components/saved-plans/PlanListCard';
import type { Plan } from '@/lib/api';
import { planStatsLabel } from '@/lib/plan-format';

export function ExploreDietPlansCard({ plans }: { plans: Plan[] }) {
  return (
    <PlanListCard
      eyebrow="Diet"
      showAllHref="/explore-diet-plans"
      items={plans.map((plan) => ({ id: plan.id, title: plan.title, stats: planStatsLabel(plan) }))}
    />
  );
}
