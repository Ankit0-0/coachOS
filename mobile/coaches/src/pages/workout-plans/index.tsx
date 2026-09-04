import { DetailHeader } from '@/components/detail-header';
import { PlanList } from '@/components/saved-plans/PlanList';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { dummyWorkoutPlans } from '@/data/saved-plans-mock';

export function WorkoutPlansScreen() {
  return (
    <ScreenScaffold>
      <DetailHeader title="Workout Plans" subtitle="All of your saved workout plans." />
      <PlanList
        items={dummyWorkoutPlans.map((plan) => ({
          id: plan.id,
          title: plan.title,
          stats: `${plan.exercises} exercises • ${plan.minutes} min`,
        }))}
      />
    </ScreenScaffold>
  );
}
