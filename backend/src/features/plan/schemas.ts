import { z } from "zod";

import { MAX_CYCLE_LENGTH_DAYS, MIN_CYCLE_LENGTH_DAYS } from "./content.js";
import { MAX_SCHEDULE_DAYS } from "./schedule.js";

export const exerciseSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  note: z.string().max(500).default(""),
  sets: z.number().int().min(1).max(20),
  /**
   * Free text rather than numbers: a coach writes "8-10", "AMRAP" or
   * "30s each side" as readily as a single figure, and `content` is Json so
   * there is nothing to migrate. Optional, so plans written before these
   * existed — including the seeded defaults — still validate.
   */
  reps: z.string().max(50).optional(),
  rest: z.string().max(50).optional(),
});

export const mealSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
});

/**
 * Duration and calories stay free text, per day. They were free text before
 * cycles and coaches write "45 min", "1 hr" or "1,950 kcal"; a number would
 * quietly drop what they typed.
 */
const workoutDaySchema = z.object({
  dayIndex: z.number().int().min(0).max(MAX_CYCLE_LENGTH_DAYS - 1),
  label: z.string().min(1).max(80),
  isRestDay: z.boolean().default(false),
  duration: z.string().max(50).default(""),
  exercises: z.array(exerciseSchema).max(30).default([]),
});

const dietDaySchema = z.object({
  dayIndex: z.number().int().min(0).max(MAX_CYCLE_LENGTH_DAYS - 1),
  label: z.string().min(1).max(80),
  calories: z.string().max(50).default(""),
  meals: z.array(mealSchema).max(30).default([]),
});

type DayShape = { dayIndex: number; label: string; isRestDay?: boolean };

/**
 * The rules that make a cycle usable: days numbered 0, 1, 2 … with none missing
 * or repeated, ids unique inside a day (they are what a check-in stores), a
 * rest day genuinely empty, and a working day not.
 */
function checkDays<T extends DayShape>(
  days: T[],
  itemsOf: (day: T) => { id: string }[],
  context: z.RefinementCtx,
): void {
  const indexes = days.map((day) => day.dayIndex).sort((a, b) => a - b);
  const contiguous = indexes.every((value, position) => value === position);
  if (!contiguous) {
    context.addIssue({
      code: "custom",
      path: ["days"],
      message: "dayIndex values must run from 0 with no gaps or duplicates",
    });
  }

  days.forEach((day, position) => {
    const items = itemsOf(day);
    const ids = items.map((item) => item.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["days", position],
        message: `Day ${day.dayIndex + 1} has two items with the same id`,
      });
    }
    if (day.isRestDay && items.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["days", position],
        message: `Day ${day.dayIndex + 1} is a rest day, so it cannot have items`,
      });
    }
    if (!day.isRestDay && items.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["days", position],
        message: `Day ${day.dayIndex + 1} has nothing in it — add an item or mark it a rest day`,
      });
    }
  });
}

export const workoutContentSchema = z
  .object({
    focus: z.string().min(1).max(300),
    summary: z.string().min(1).max(500),
    difficulty: z.string().min(1).max(50),
    days: z.array(workoutDaySchema).min(MIN_CYCLE_LENGTH_DAYS).max(MAX_CYCLE_LENGTH_DAYS),
  })
  .superRefine((content, context) => checkDays(content.days, (day) => day.exercises, context));

export const dietContentSchema = z
  .object({
    focus: z.string().min(1).max(300),
    summary: z.string().min(1).max(500),
    days: z.array(dietDaySchema).min(MIN_CYCLE_LENGTH_DAYS).max(MAX_CYCLE_LENGTH_DAYS),
  })
  // Diet days have no rest concept: a client eats every day.
  .superRefine((content, context) =>
    checkDays(
      content.days.map((day) => ({ ...day, isRestDay: false })),
      (day) => day.meals,
      context,
    ),
  );

export const cycleLengthSchema = z.number().int().min(MIN_CYCLE_LENGTH_DAYS).max(MAX_CYCLE_LENGTH_DAYS);

/** The column and the content have to agree, or "day 3 of 7" means nothing. */
function checkCycleLength(
  value: { cycleLengthDays: number; content: { days: unknown[] } },
  context: z.RefinementCtx,
): void {
  if (value.content.days.length !== value.cycleLengthDays) {
    context.addIssue({
      code: "custom",
      path: ["content", "days"],
      message: `A ${value.cycleLengthDays}-day cycle needs exactly ${value.cycleLengthDays} days, but ${value.content.days.length} were given`,
    });
  }
}

export const createPlanSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("WORKOUT"),
      title: z.string().min(1).max(150),
      description: z.string().max(500).optional(),
      cycleLengthDays: cycleLengthSchema.default(1),
      content: workoutContentSchema,
    }),
    z.object({
      type: z.literal("DIET"),
      title: z.string().min(1).max(150),
      description: z.string().max(500).optional(),
      cycleLengthDays: cycleLengthSchema.default(1),
      content: dietContentSchema,
    }),
  ])
  .superRefine(checkCycleLength);

export const updatePlanSchema = z
  .object({
    title: z.string().min(1).max(150).optional(),
    description: z.string().max(500).optional(),
    cycleLengthDays: cycleLengthSchema.optional(),
    content: z.union([workoutContentSchema, dietContentSchema]).optional(),
  })
  .superRefine((value, context) => {
    // Content and cycle length move together: changing one without the other
    // would leave the plan describing a cycle it doesn't have.
    if (value.content && value.cycleLengthDays === undefined) {
      context.addIssue({ code: "custom", path: ["cycleLengthDays"], message: "Send cycleLengthDays with new content" });
      return;
    }
    if (value.content && value.cycleLengthDays !== undefined) {
      checkCycleLength({ cycleLengthDays: value.cycleLengthDays, content: value.content }, context);
    }
  });

export const listPlansQuerySchema = z.object({
  type: z.enum(["WORKOUT", "DIET"]),
});

export const createAssignmentSchema = z.object({
  clientId: z.string().min(1),
  planId: z.string().min(1),
  /**
   * The calendar date the cycle starts from, which is what day 1 lands on. A
   * coach wanting "Monday is legs" assigns with a Monday here. Defaults to today.
   */
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be formatted YYYY-MM-DD").optional(),
});

export const listAssignmentsQuerySchema = z.object({
  clientId: z.string().min(1),
});

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be formatted YYYY-MM-DD");

/** A date range to resolve the cycle over, bounded so a response stays a response. */
export const scheduleQuerySchema = z
  .object({ from: dateKey, to: dateKey })
  .refine((value) => value.from <= value.to, { message: "from must not be after to", path: ["from"] })
  .refine(
    (value) => daysBetweenKeys(value.from, value.to) < MAX_SCHEDULE_DAYS,
    { message: `Range must cover fewer than ${MAX_SCHEDULE_DAYS} days`, path: ["to"] },
  );

/** Local to keep schemas free of a runtime import cycle with schedule.ts. */
function daysBetweenKeys(from: string, to: string): number {
  const day = (value: string) => Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)));
  return Math.round((day(to) - day(from)) / 86_400_000);
}
