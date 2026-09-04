import { PlanListCard } from '@/components/saved-plans/PlanListCard';
import { dummyDietPlans } from '@/data/saved-plans-mock';

export function DietPlansCard() {
  return (
    <PlanListCard
      eyebrow="Diet"
      showAllHref="/diet-plans"
      items={dummyDietPlans.map((plan) => ({
        id: plan.id,
        title: plan.title,
        stats: `${plan.meals} meals • ${plan.calories} kcal`,
      }))}
    />
  );
}
