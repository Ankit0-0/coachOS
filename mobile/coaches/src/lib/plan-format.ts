import type { DietContent, Plan, WorkoutContent } from '@/lib/api';
import { formatCalories, formatDuration } from '@/lib/plan-units';

export type PlanStats = {
  /** What the plan contains, e.g. "5 exercises". */
  primary: string;
  /** What it costs the client, e.g. "45 min" or "1,950 kcal". */
  secondary: string;
};

/** The two figures a coach scans a plan by, kept separate so they can be laid out rather than joined into one string. */
export function planStats(plan: Plan): PlanStats {
  if (plan.type === 'WORKOUT') {
    const content = plan.content as WorkoutContent;
    const count = content.exercises.length;
    return {
      primary: `${count} ${count === 1 ? 'exercise' : 'exercises'}`,
      secondary: formatDuration(content.duration),
    };
  }

  const content = plan.content as DietContent;
  const count = content.meals.length;
  return {
    primary: `${count} ${count === 1 ? 'meal' : 'meals'}`,
    secondary: formatCalories(content.calories),
  };
}

/** The plan's one-line summary, e.g. "Pressing strength with controlled rows." */
export function planSummary(plan: Plan): string {
  return (plan.content as WorkoutContent | DietContent).summary;
}

/** Maps a plan into the shape the shared plan list components render. */
export function toPlanListEntry(plan: Plan) {
  const stats = planStats(plan);
  return { id: plan.id, title: plan.title, primaryStat: stats.primary, secondaryStat: stats.secondary };
}
