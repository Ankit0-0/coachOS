import type { Plan, PlanAssignment } from "@prisma/client";

import { prisma } from "../../config/prisma.config.js";
import { dateKeyOf, daysBetween, eachDate, parseDateKey, type DateKey } from "../../utils/calendar.js";
import {
  dayItemIds,
  isWorkoutContent,
  normalizePlanContent,
  type DietDay,
  type WorkoutDay,
} from "./content.js";

/** Long enough for a month's calendar with room to spare, short enough to bound the response. */
export const MAX_SCHEDULE_DAYS = 92;

/**
 * Which day of the cycle a date lands on.
 *
 * Counted from the assignment's start date, so a coach who wants "Monday is
 * legs" assigns starting on a Monday. Dates before the start wrap backwards
 * rather than erroring — a client looking at last week still sees what a day
 * would have been.
 */
export function resolveDayIndex(date: DateKey, startDate: DateKey, cycleLengthDays: number): number {
  const length = Math.max(1, cycleLengthDays);
  const offset = daysBetween(startDate, date);
  return ((offset % length) + length) % length;
}

/**
 * The date a cycle counts from. `startDate` is nullable, so the date part of
 * `assignedAt` stands in — the day the coach assigned the plan, which is the
 * only other date the row knows.
 */
export function cycleStartDate(assignment: Pick<PlanAssignment, "startDate" | "assignedAt">): DateKey {
  return dateKeyOf(assignment.startDate ?? assignment.assignedAt);
}

export type ScheduleEntry = {
  date: DateKey;
  assignmentId: string;
  planId: string;
  type: "WORKOUT" | "DIET";
  title: string;
  /** 0-based position in the cycle, and the cycle's length, so an app can say "Day 3 of 7". */
  dayIndex: number;
  cycleLengthDays: number;
  label: string;
  isRestDay: boolean;
  /** Sets for a workout day, meals for a diet day — the denominator for that date's progress. */
  itemCount: number;
  /** The ids a check-in for this date may contain, so a client screen knows what it is ticking. */
  itemIds: string[];
  /** That day of the plan, ready to render. */
  content: WorkoutDay | DietDay | null;
};

function entryFor(
  date: DateKey,
  assignment: PlanAssignment & { plan: Plan },
): ScheduleEntry {
  const content = normalizePlanContent(assignment.plan.type, assignment.plan.content);
  const cycleLengthDays = Math.max(1, content.days.length);
  const dayIndex = resolveDayIndex(date, cycleStartDate(assignment), cycleLengthDays);
  const day = content.days[dayIndex] ?? null;
  const isRestDay = day !== null && isWorkoutContent(content) ? (day as WorkoutDay).isRestDay : false;
  const itemIds = dayItemIds(assignment.plan.type, assignment.plan.content, dayIndex);

  return {
    date,
    assignmentId: assignment.id,
    planId: assignment.planId,
    type: assignment.plan.type,
    title: assignment.plan.title,
    dayIndex,
    cycleLengthDays,
    label: day?.label ?? "",
    isRestDay,
    itemCount: itemIds.length,
    itemIds,
    content: day,
  };
}

/**
 * Which assignment was running on a date: the most recently started one that
 * had begun by then and had not already ended. A date before any of them
 * started falls back to the current plan, so looking back at last week shows
 * the cycle rather than a blank.
 */
function assignmentOn(
  assignments: (PlanAssignment & { plan: Plan })[],
  date: DateKey,
): (PlanAssignment & { plan: Plan }) | null {
  const covering = assignments.filter((assignment) => {
    if (date < cycleStartDate(assignment)) return false;
    const end = assignment.endDate ? dateKeyOf(assignment.endDate) : null;
    return end === null || date <= end;
  });
  if (covering.length > 0) {
    return covering.reduce((latest, assignment) =>
      cycleStartDate(assignment) >= cycleStartDate(latest) ? assignment : latest,
    );
  }
  return assignments.find((assignment) => assignment.status === "ACTIVE") ?? null;
}

/**
 * What a client is scheduled to do on each date in a range: one entry per plan
 * type per date, resolved against whichever plan they were on then. The apps
 * never work the rotation out themselves; this is the one place that knows it.
 */
export async function getClientSchedule(clientId: string, range: { from: DateKey; to: DateKey }) {
  const dates = eachDate(range.from, range.to);
  if (dates.length === 0) return [];

  const assignments = await prisma.planAssignment.findMany({
    where: {
      clientId,
      // Current plans, plus any that were still running when the range starts —
      // a past date has to resolve against the plan that was assigned then.
      OR: [{ status: "ACTIVE" }, { endDate: { gte: parseDateKey(range.from) } }],
    },
    include: { plan: true },
    orderBy: { assignedAt: "asc" },
  });
  if (assignments.length === 0) return [];

  const types = ["WORKOUT", "DIET"] as const;
  return dates.flatMap((date) =>
    types.flatMap((type) => {
      const ofType = assignments.filter((assignment) => assignment.plan.type === type);
      const assignment = ofType.length > 0 ? assignmentOn(ofType, date) : null;
      return assignment ? [entryFor(date, assignment)] : [];
    }),
  );
}
