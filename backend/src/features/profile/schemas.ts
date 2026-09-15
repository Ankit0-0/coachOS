import { z } from "zod";

import { MAX_WEIGHT_KG } from "../../utils/weight.js";

/** An S3 object key from POST /uploads/presign. Null removes the avatar. */
const avatarKeySchema = z.string().min(1).max(512).nullable();

export const updateCoachProfileSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    bio: z.string().max(1000).optional(),
    specialties: z.array(z.string().min(1).max(60)).max(12).optional(),
    yearsExperience: z.number().int().min(0).max(80).nullable().optional(),
    phone: z.string().max(40).optional(),
    avatarKey: avatarKeySchema.optional(),
    /** Opt in to (or out of) being browsable by clients in Explore. */
    listedInExplore: z.boolean().optional(),
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
    weightKg: z.number().min(20).max(MAX_WEIGHT_KG).nullable().optional(),
    goals: z.string().max(1000).optional(),
    phone: z.string().max(40).optional(),
    avatarKey: avatarKeySchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });
