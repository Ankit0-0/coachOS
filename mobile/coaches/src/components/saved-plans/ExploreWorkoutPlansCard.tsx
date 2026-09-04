import { PlanListCard } from '@/components/saved-plans/PlanListCard';
import { dummyExploreWorkoutPlans } from '@/data/saved-plans-mock';

export function ExploreWorkoutPlansCard() {
  return (
    <PlanListCard
      eyebrow="Workout"
      showAllHref="/explore-workout-plans"
      items={dummyExploreWorkoutPlans.map((plan) => ({
        id: plan.id,
        title: plan.title,
        stats: `${plan.exercises} exercises • ${plan.minutes} min`,
      }))}
    />
  );
}
