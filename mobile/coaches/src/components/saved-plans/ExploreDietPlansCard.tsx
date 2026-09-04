import { PlanListCard } from '@/components/saved-plans/PlanListCard';
import { dummyExploreDietPlans } from '@/data/saved-plans-mock';

export function ExploreDietPlansCard() {
  return (
    <PlanListCard
      eyebrow="Diet"
      showAllHref="/explore-diet-plans"
      items={dummyExploreDietPlans.map((plan) => ({
        id: plan.id,
        title: plan.title,
        stats: `${plan.meals} meals • ${plan.calories} kcal`,
      }))}
    />
  );
}
