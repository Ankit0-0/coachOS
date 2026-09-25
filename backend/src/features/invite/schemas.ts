import { z } from "zod";

import { firstPeriodFields, isValidFirstPeriod } from "../subscription/schemas.js";

export const createInviteSchema = z
  .object({
    clientEmail: z.string().trim().min(1).max(254).email(),
    /**
     * The first subscription period, as dates. Omitting both means an
     * open-ended relationship with no subscription record.
     */
    ...firstPeriodFields,
    /** Legacy: app versions from before explicit dates send a length instead. */
    durationMonths: z.number().int().min(1).max(24).optional(),
  })
  .refine(isValidFirstPeriod, {
    message: "subscriptionStartDate and subscriptionEndDate come together, and the end must be after the start",
    path: ["subscriptionEndDate"],
  })
  .refine((value) => value.durationMonths === undefined || value.subscriptionStartDate === undefined, {
    message: "send subscription dates or durationMonths, not both",
    path: ["durationMonths"],
  });

export const listInvitesQuerySchema = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "DECLINED", "CANCELLED", "ENDED"]).optional(),
});
