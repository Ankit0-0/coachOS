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
