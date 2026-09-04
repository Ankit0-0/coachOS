import { PlanListCard } from '@/components/saved-plans/PlanListCard';
import { dummyWorkoutPlans } from '@/data/saved-plans-mock';

export function WorkoutPlansCard() {
  return (
    <PlanListCard
      eyebrow="Workout"
      showAllHref="/workout-plans"
      items={dummyWorkoutPlans.map((plan) => ({
        id: plan.id,
        title: plan.title,
        stats: `${plan.exercises} exercises • ${plan.minutes} min`,
      }))}
    />
  );
}
