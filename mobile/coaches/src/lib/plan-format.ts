import type { DietContent, Plan, WorkoutContent } from '@/lib/api';
import { formatCalories, formatDuration } from '@/lib/plan-units';

export type PlanStats = {
  /** What the plan contains, e.g. "5 exercises" — or "7-day cycle" once it rotates. */
  primary: string;
  /** What it costs the client, e.g. "45 min" or "1,950 kcal". */
  secondary: string;
};

function plural(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

/**
 * The two figures a coach scans a plan by, kept separate so they can be laid
 * out rather than joined into one string. A rotating plan leads with its cycle
 * length — which day a client is on is the backend's answer, not a list row's,
 * so the row says what the plan is rather than what today happens to be.
 */
export function planStats(plan: Plan): PlanStats {
  if (plan.type === 'WORKOUT') {
    const content = plan.content as WorkoutContent;
    const days = content.days ?? [];
    if (days.length > 1) {
      const training = days.filter((day) => !day.isRestDay).length;
      return { primary: `${days.length}-day cycle`, secondary: `${training} training` };
    }
    const day = days[0];
    return {
      primary: plural(day?.exercises.length ?? 0, 'exercise'),
      secondary: formatDuration(day?.duration ?? ''),
    };
  }

  const content = plan.content as DietContent;
  const days = content.days ?? [];
  if (days.length > 1) {
    const meals = days.reduce((total, day) => total + day.meals.length, 0);
    return { primary: `${days.length}-day cycle`, secondary: plural(meals, 'meal') };
  }
  const day = days[0];
  return {
    primary: plural(day?.meals.length ?? 0, 'meal'),
    secondary: formatCalories(day?.calories ?? ''),
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
