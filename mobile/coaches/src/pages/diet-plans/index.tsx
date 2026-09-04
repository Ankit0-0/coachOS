import { DetailHeader } from '@/components/detail-header';
import { PlanList } from '@/components/saved-plans/PlanList';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { dummyDietPlans } from '@/data/saved-plans-mock';

export function DietPlansScreen() {
  return (
    <ScreenScaffold>
      <DetailHeader title="Diet Plans" subtitle="All of your saved diet plans." />
      <PlanList
        items={dummyDietPlans.map((plan) => ({
          id: plan.id,
          title: plan.title,
          stats: `${plan.meals} meals • ${plan.calories} kcal`,
        }))}
      />
    </ScreenScaffold>
  );
}
