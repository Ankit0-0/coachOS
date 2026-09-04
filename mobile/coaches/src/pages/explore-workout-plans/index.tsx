import { DetailHeader } from '@/components/detail-header';
import { PlanList } from '@/components/saved-plans/PlanList';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { dummyExploreWorkoutPlans } from '@/data/saved-plans-mock';

export function ExploreWorkoutPlansScreen() {
  return (
    <ScreenScaffold>
      <DetailHeader title="Explore Workout Plans" subtitle="Prebuilt plans available to every coach." />
      <PlanList
        items={dummyExploreWorkoutPlans.map((plan) => ({
          id: plan.id,
          title: plan.title,
          stats: `${plan.exercises} exercises • ${plan.minutes} min`,
        }))}
      />
    </ScreenScaffold>
  );
}
