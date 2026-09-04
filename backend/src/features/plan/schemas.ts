import { z } from "zod";

export const exerciseSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  note: z.string().max(500).default(""),
  sets: z.number().int().min(1).max(20),
});

export const workoutContentSchema = z.object({
  duration: z.string().min(1).max(50),
  focus: z.string().min(1).max(300),
  summary: z.string().min(1).max(500),
  difficulty: z.string().min(1).max(50),
  exercises: z.array(exerciseSchema).min(1).max(30),
});

export const mealSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
});

export const dietContentSchema = z.object({
  calories: z.string().min(1).max(50),
  focus: z.string().min(1).max(300),
  summary: z.string().min(1).max(500),
  meals: z.array(mealSchema).min(1).max(30),
});

export const createPlanSchema = z.discriminatedUnion("type", [
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

export const updatePlanSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  description: z.string().max(500).optional(),
  content: z.union([workoutContentSchema, dietContentSchema]).optional(),
});

export const listPlansQuerySchema = z.object({
  type: z.enum(["WORKOUT", "DIET"]),
});

export const createAssignmentSchema = z.object({
  clientId: z.string().min(1),
  planId: z.string().min(1),
});

export const listAssignmentsQuerySchema = z.object({
  clientId: z.string().min(1),
});
