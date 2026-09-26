/** One past date of a client's plans, for the history calendar's day modal. Same file in both apps. */

type ScheduleLike = {
  assignmentId: string;
  type: 'WORKOUT' | 'DIET';
  title: string;
  dayIndex: number;
  cycleLengthDays: number;
  label: string;
  isRestDay: boolean;
  itemIds: string[];
  content: unknown;
};

type CheckInLike = {
  assignmentId: string;
  completedItemIds: string[];
  notes: string | null;
  photoUrls: Record<string, string> | null;
};

export type DayItem = {
  id: string;
  name: string;
  /** "3 sets · 8-10 reps"; null for a meal. */
  detail: string | null;
  done: number;
  total: number;
  photoUrl: string | null;
};

export type DaySection = {
  type: 'WORKOUT' | 'DIET';
  planTitle: string;
  /** "Day 6 of 7 · Conditioning". */
  cycleLabel: string;
  isRestDay: boolean;
  items: DayItem[];
  completed: number;
  total: number;
  /** 0–100, the same figure as the calendar ring. */
  percent: number;
  /** Whether a check-in exists for the day; nothing logged reads differently from a rest day. */
  logged: boolean;
  notes: string | null;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.map(record).filter((row): row is Record<string, unknown> => row !== null && typeof row.id === 'string')
    : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function cycleLabel(entry: ScheduleLike): string {
  const position = entry.cycleLengthDays > 1 ? `Day ${entry.dayIndex + 1} of ${entry.cycleLengthDays}` : '';
  return [position, entry.label].filter(Boolean).join(' · ') || 'Every day';
}

function itemsOf(entry: ScheduleLike, ticked: Set<string>, photoUrls: Record<string, string>): DayItem[] {
  const content = record(entry.content);
  if (entry.type === 'WORKOUT') {
    return list(content?.exercises).map((exercise) => {
      const id = exercise.id as string;
      // One id per set, as the check-in and the ring count them.
      const sets = Math.max(1, typeof exercise.sets === 'number' ? Math.floor(exercise.sets) : 1);
      const setIds = Array.from({ length: sets }, (_, index) => `${id}-set${index + 1}`);
      const reps = text(exercise.reps);
      return {
        id,
        name: text(exercise.name) || 'Exercise',
        detail: [`${sets} ${sets === 1 ? 'set' : 'sets'}`, reps ? `${reps} reps` : ''].filter(Boolean).join(' · '),
        done: setIds.filter((setId) => ticked.has(setId)).length,
        total: sets,
        photoUrl: null,
      };
    });
  }
  return list(content?.meals).map((meal) => {
    const id = meal.id as string;
    return {
      id,
      name: text(meal.label) || 'Meal',
      detail: null,
      done: ticked.has(id) ? 1 : 0,
      total: 1,
      photoUrl: photoUrls[id] ?? null,
    };
  });
}

/** Workout then diet, each scored against only what was scheduled that day. */
export function buildDaySections(entries: readonly ScheduleLike[], checkIns: readonly CheckInLike[]): DaySection[] {
  return (['WORKOUT', 'DIET'] as const).flatMap((type) => {
    const entry = entries.find((candidate) => candidate.type === type);
    if (!entry) return [];
    const checkIn = checkIns.find((candidate) => candidate.assignmentId === entry.assignmentId);
    const ticked = new Set(checkIn?.completedItemIds ?? []);
    const completed = entry.itemIds.filter((id) => ticked.has(id)).length;
    const total = entry.itemIds.length;
    return [
      {
        type,
        planTitle: entry.title,
        cycleLabel: cycleLabel(entry),
        isRestDay: entry.isRestDay,
        items: entry.isRestDay ? [] : itemsOf(entry, ticked, checkIn?.photoUrls ?? {}),
        completed,
        total,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
        logged: checkIn !== undefined,
        notes: checkIn?.notes?.trim() || null,
      },
    ];
  });
}
