import { z } from "zod";

export const createInviteSchema = z.object({
  clientEmail: z.string().trim().min(1).max(254).email(),
  /**
   * Optional. Omitting it means an open-ended relationship with no
   * subscription record, which is what every invite sent before this existed
   * amounts to.
   */
  durationMonths: z.number().int().min(1).max(24).optional(),
});

export const listInvitesQuerySchema = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "DECLINED", "CANCELLED"]).optional(),
});
