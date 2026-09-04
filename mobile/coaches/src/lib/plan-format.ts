import type { DietContent, Plan, WorkoutContent } from '@/lib/api';

/** One-line stats summary for a plan, e.g. "5 exercises • 45 min" or "4 meals • 2400 kcal". */
export function planStatsLabel(plan: Plan): string {
  if (plan.type === 'WORKOUT') {
    const content = plan.content as WorkoutContent;
    return `${content.exercises.length} exercises • ${content.duration}`;
  }
  const content = plan.content as DietContent;
  return `${content.meals.length} meals • ${content.calories}`;
}
