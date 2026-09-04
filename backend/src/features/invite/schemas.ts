import { z } from "zod";

export const createInviteSchema = z.object({
  clientEmail: z.string().trim().min(1).max(254).email(),
});

export const listInvitesQuerySchema = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "DECLINED", "CANCELLED"]).optional(),
});
