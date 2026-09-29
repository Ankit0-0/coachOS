import { Equipment, MealType, MuscleGroup, TrainingDay } from "@prisma/client";
import { z } from "zod";

/**
 * A filter left blank in a form arrives as `?trainingDay=`. That means "no
 * filter", not an invalid value, so it is dropped before the enum check.
 */
function optionalFilter<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === "" ? undefined : value), schema.optional());
}

/** Free-text search. Blank means "everything". */
const searchQuery = optionalFilter(z.string().trim().max(100));

const page = z.coerce.number().int().min(1).max(10_000).default(1);

export const exerciseQuerySchema = z.object({
  q: searchQuery,
  muscleGroup: optionalFilter(z.enum(MuscleGroup)),
  trainingDay: optionalFilter(z.enum(TrainingDay)),
});

export const adminExerciseQuerySchema = exerciseQuerySchema.extend({ page });

export const dietItemQuerySchema = z.object({
  q: searchQuery,
  mealType: optionalFilter(z.enum(MealType)),
});

export const adminDietItemQuerySchema = dietItemQuerySchema.extend({ page });

/** The same ceiling as an exercise name or meal label inside plan content. */
const name = z.string().trim().min(1).max(200);

/** Order kept, repeats dropped: ["CHEST", "CHEST"] is just ["CHEST"]. */
const muscles = z
  .array(z.enum(MuscleGroup))
  .max(16)
  .transform((values) => [...new Set(values)]);

/** A link and nothing more — no provider is special-cased, nothing is embedded. */
const videoUrl = z.url({ protocol: /^https?$/ }).max(2048);

/** An S3 key from POST /uploads/presign; ownership is checked in the service. */
const imageKey = z.string().min(1).max(512);

const exerciseFields = {
  name,
  primaryMuscles: muscles.default([]),
  secondaryMuscles: muscles.default([]),
  trainingDay: z.enum(TrainingDay).nullable().optional(),
  equipment: z.enum(Equipment).nullable().optional(),
  instructions: z.string().trim().max(2000).nullable().optional(),
  videoUrl: videoUrl.nullable().optional(),
};

/**
 * A coach adding to their own list. No image: coaches save what they typed so
 * it turns up next time, and there is nowhere in the app to upload one.
 */
export const coachCreateExerciseSchema = z.object(exerciseFields);

export const adminCreateExerciseSchema = z.object({
  ...exerciseFields,
  imageKey: imageKey.nullable().optional(),
});

/** Every field optional and nothing defaulted, so an omitted field is left alone. */
export const adminUpdateExerciseSchema = z.object({
  name: name.optional(),
  primaryMuscles: muscles.optional(),
  secondaryMuscles: muscles.optional(),
  trainingDay: exerciseFields.trainingDay,
  equipment: exerciseFields.equipment,
  instructions: exerciseFields.instructions,
  videoUrl: exerciseFields.videoUrl,
  /** null removes the image; a new key replaces it. Either way the old object is deleted. */
  imageKey: imageKey.nullable().optional(),
});

const dietItemFields = {
  name,
  mealType: z.enum(MealType).nullable().optional(),
  calories: z.number().int().min(0).max(5000).nullable().optional(),
  proteinG: z.number().int().min(0).max(500).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
};

export const coachCreateDietItemSchema = z.object(dietItemFields);

export const adminCreateDietItemSchema = z.object({
  ...dietItemFields,
  imageKey: imageKey.nullable().optional(),
});

export const adminUpdateDietItemSchema = z.object({
  name: name.optional(),
  mealType: dietItemFields.mealType,
  calories: dietItemFields.calories,
  proteinG: dietItemFields.proteinG,
  notes: dietItemFields.notes,
  imageKey: imageKey.nullable().optional(),
});

export type ExerciseQuery = z.infer<typeof exerciseQuerySchema>;
export type DietItemQuery = z.infer<typeof dietItemQuerySchema>;
export type CoachCreateExerciseInput = z.infer<typeof coachCreateExerciseSchema>;
export type AdminCreateExerciseInput = z.infer<typeof adminCreateExerciseSchema>;
export type AdminUpdateExerciseInput = z.infer<typeof adminUpdateExerciseSchema>;
export type CoachCreateDietItemInput = z.infer<typeof coachCreateDietItemSchema>;
export type AdminCreateDietItemInput = z.infer<typeof adminCreateDietItemSchema>;
export type AdminUpdateDietItemInput = z.infer<typeof adminUpdateDietItemSchema>;
