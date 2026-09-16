import { z } from "zod";

// Content shapes are owned by the plan feature. Redefining them here would let
// admin-authored defaults drift away from what coaches and the mobile apps
// already read, so they are imported rather than restated.
import { cycleLengthSchema, dietContentSchema, workoutContentSchema } from "../plan/schemas.js";

export const listCoachesQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

export const listDefaultPlansQuerySchema = z.object({
  type: z.enum(["WORKOUT", "DIET"]),
});

/** The column and the content have to agree — the same rule the coach side applies. */
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

export const createDefaultPlanSchema = z
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

export const updateDefaultPlanSchema = z
  .object({
    title: z.string().min(1).max(150).optional(),
    description: z.string().max(500).optional(),
    cycleLengthDays: cycleLengthSchema.optional(),
    content: z.union([workoutContentSchema, dietContentSchema]).optional(),
  })
  .superRefine((value, context) => {
    if (value.content && value.cycleLengthDays === undefined) {
      context.addIssue({ code: "custom", path: ["cycleLengthDays"], message: "Send cycleLengthDays with new content" });
      return;
    }
    if (value.content && value.cycleLengthDays !== undefined) {
      checkCycleLength({ cycleLengthDays: value.cycleLengthDays, content: value.content }, context);
    }
  });
