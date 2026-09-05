import { prisma } from "../config/prisma.config.js";

/**
 * The ACCEPTED CoachClientInvite linking this coach and client, or null.
 * This is the one gate every coach-scoped, client-targeted endpoint must
 * pass before touching that client's data.
 */
export function findAcceptedInvite(coachId: string, clientId: string) {
  return prisma.coachClientInvite.findFirst({
    where: { coachId, clientId, status: "ACCEPTED" },
  });
}
