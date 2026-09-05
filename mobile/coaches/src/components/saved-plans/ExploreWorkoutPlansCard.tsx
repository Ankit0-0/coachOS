import { PlanListCard } from '@/components/saved-plans/PlanListCard';
import type { Plan } from '@/lib/api';
import { planStatsLabel } from '@/lib/plan-format';

export function ExploreWorkoutPlansCard({ plans }: { plans: Plan[] }) {
  return (
    <PlanListCard
      eyebrow="Workout"
      showAllHref="/explore-workout-plans"
      items={plans.map((plan) => ({ id: plan.id, title: plan.title, stats: planStatsLabel(plan) }))}
    />
  );
}
