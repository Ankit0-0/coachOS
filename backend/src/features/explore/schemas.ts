import { z } from "zod";

import { firstPeriodFields, isValidFirstPeriod } from "../subscription/schemas.js";

export const createCoachRequestSchema = z.object({
  coachId: z.string().min(1),
  /** Optional note to the coach, e.g. goals or availability. */
  message: z.string().trim().max(500).optional(),
});

export const listCoachRequestsQuerySchema = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "DECLINED", "CANCELLED", "ENDED"]).optional(),
});

/** The first subscription period the coach sets while accepting; none is open-ended. */
export const acceptCoachRequestSchema = z.object(firstPeriodFields).refine(isValidFirstPeriod, {
  message: "subscriptionStartDate and subscriptionEndDate come together, and the end must be after the start",
  path: ["subscriptionEndDate"],
});
