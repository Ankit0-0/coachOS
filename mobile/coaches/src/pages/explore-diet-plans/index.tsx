import { DetailHeader } from '@/components/detail-header';
import { PlanList } from '@/components/saved-plans/PlanList';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { dummyExploreDietPlans } from '@/data/saved-plans-mock';

export function ExploreDietPlansScreen() {
  return (
    <ScreenScaffold>
      <DetailHeader title="Explore Diet Plans" subtitle="Prebuilt plans available to every coach." />
      <PlanList
        items={dummyExploreDietPlans.map((plan) => ({
          id: plan.id,
          title: plan.title,
          stats: `${plan.meals} meals • ${plan.calories} kcal`,
        }))}
      />
    </ScreenScaffold>
  );
}
