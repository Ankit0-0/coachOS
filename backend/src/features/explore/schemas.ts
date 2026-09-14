import { z } from "zod";

export const createCoachRequestSchema = z.object({
  coachId: z.string().min(1),
  /** Optional note to the coach, e.g. goals or availability. */
  message: z.string().trim().max(500).optional(),
});

export const listCoachRequestsQuerySchema = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "DECLINED", "CANCELLED"]).optional(),
});
