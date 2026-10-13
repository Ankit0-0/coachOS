import type { ExerciseHistory, SetLog } from '@/lib/api';

export type StrengthRow = {
  name: string;
  /** The heaviest set in the range. */
  best: (SetLog & { date: string }) | null;
  /** The top set of the latest session. */
  latest: SetLog | null;
  latestDate: string;
  sessions: number;
  /**
   * Latest top weight minus the first session's, in kg; null when either has
   * no weight (bodyweight work) or there is only one session to compare.
   */
  changeKg: number | null;
};

/** One row per exercise for the coach's strength card, in the order the API sends (most recent first). */
export function strengthRows(history: readonly ExerciseHistory[]): StrengthRow[] {
  return history.flatMap((exercise) => {
    const first = exercise.sessions[0];
    const last = exercise.sessions[exercise.sessions.length - 1];
    if (!first || !last) return [];
    const from = first.topSet?.weightKg ?? null;
    const to = last.topSet?.weightKg ?? null;
    return [
      {
        name: exercise.name,
        best: exercise.best,
        latest: last.topSet,
        latestDate: last.date,
        sessions: exercise.sessions.length,
        changeKg: exercise.sessions.length > 1 && from !== null && to !== null ? Math.round((to - from) * 10) / 10 : null,
      },
    ];
  });
}

/** "62.5 kg × 6", "× 12" for bodyweight, "40 kg" without reps. */
export function formatLift(log: SetLog | null | undefined): string {
  if (!log) return '—';
  if (log.weightKg !== null && log.reps !== null) return `${log.weightKg} kg × ${log.reps}`;
  if (log.weightKg !== null) return `${log.weightKg} kg`;
  return log.reps !== null ? `× ${log.reps}` : '—';
}

/** "+5 kg", "−2.5 kg", "No change"; null when there is nothing to compare. */
export function changeLabel(changeKg: number | null): string | null {
  if (changeKg === null) return null;
  if (changeKg === 0) return 'No change';
  return changeKg > 0 ? `+${changeKg} kg` : `−${Math.abs(changeKg)} kg`;
}
