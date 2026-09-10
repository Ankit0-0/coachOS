import { z } from "zod";

export const updateCoachProfileSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    bio: z.string().max(1000).optional(),
    specialties: z.array(z.string().min(1).max(60)).max(12).optional(),
    yearsExperience: z.number().int().min(0).max(80).nullable().optional(),
    phone: z.string().max(40).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const updateClientProfileSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    heightCm: z.number().int().min(50).max(280).nullable().optional(),
    /**
     * Self-reported. Distinct from WeightEntry, which is the day-by-day
     * tracked history — this is a single value the client sets themselves.
     */
    weightKg: z.number().min(20).max(500).nullable().optional(),
    goals: z.string().max(1000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });
