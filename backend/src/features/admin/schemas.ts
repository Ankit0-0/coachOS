import { z } from "zod";

// Content shapes are owned by the plan feature. Redefining them here would let
// admin-authored defaults drift away from what coaches and the mobile apps
// already read, so they are imported rather than restated.
import { dietContentSchema, workoutContentSchema } from "../plan/schemas.js";

export const listCoachesQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

export const listDefaultPlansQuerySchema = z.object({
  type: z.enum(["WORKOUT", "DIET"]),
});

export const createDefaultPlanSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("WORKOUT"),
    title: z.string().min(1).max(150),
    description: z.string().max(500).optional(),
    content: workoutContentSchema,
  }),
  z.object({
    type: z.literal("DIET"),
    title: z.string().min(1).max(150),
    description: z.string().max(500).optional(),
    content: dietContentSchema,
  }),
]);

export const updateDefaultPlanSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  description: z.string().max(500).optional(),
  content: z.union([workoutContentSchema, dietContentSchema]).optional(),
});
