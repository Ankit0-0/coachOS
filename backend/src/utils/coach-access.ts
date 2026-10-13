import type { Prisma } from "@prisma/client";

import { getLogger } from "../config/logger.js";
import { prisma } from "../config/prisma.config.js";

/**
 * The ACCEPTED CoachClientInvite linking this coach and client, or null.
 * This is the one gate every coach-scoped, client-targeted endpoint must
 * pass before touching that client's data. Both ways of forming a
 * relationship — an accepted invite and an accepted CoachRequest — write an
 * ACCEPTED invite, so this is the only "is this my client" check there is.
 */
export function findAcceptedInvite(coachId: string, clientId: string) {
  return prisma.coachClientInvite.findFirst({
    where: { coachId, clientId, status: "ACCEPTED" },
  });
}

export type CurrentCoach = { id: string; name: string; hasActivePlan: boolean };

/**
 * The coach this client is with right now, for the app's "you're currently
 * with …" warning before switching. Null when they have none.
 */
export async function findCurrentCoach(clientId: string): Promise<CurrentCoach | null> {
  const invite = await prisma.coachClientInvite.findFirst({
    where: { clientId, status: "ACCEPTED" },
    orderBy: { respondedAt: "desc" },
    include: { coach: { select: { id: true, name: true } } },
  });
  if (!invite) return null;
  const activePlans = await prisma.planAssignment.count({
    where: { clientId, coachId: invite.coachId, status: "ACTIVE" },
  });
  return { id: invite.coach.id, name: invite.coach.name, hasActivePlan: activePlans > 0 };
}

/**
 * A client has one coach at a time. Accepting a new one ends every other
 * relationship, so the previous coach loses access to everything at once.
 *
 * Must run inside the same transaction as the acceptance: half-applied, the
 * client would have two coaches, which is the state this prevents.
 */
export async function endPreviousCoaching(
  tx: Prisma.TransactionClient,
  clientId: string,
  newCoachId: string,
): Promise<void> {
  await endCoaching(tx, { clientId, coachId: { not: newCoachId } }, "endPreviousCoaching: previous coach's access and plans ended");
}

/** A coach removing a client: ends just the relationship between these two. */
export async function endCoachingBetween(tx: Prisma.TransactionClient, clientId: string, coachId: string): Promise<number> {
  return endCoaching(tx, { clientId, coachId }, "endCoachingBetween: coach removed the client");
}

/**
 * Ends every relationship in scope: the coach loses access, and the plans and
 * subscriptions between them stop. Status changes only — never a delete.
 * CheckIn cascades from PlanAssignment, so deleting an assignment would destroy
 * the client's logged history. Returns how many relationships ended.
 */
async function endCoaching(
  tx: Prisma.TransactionClient,
  scope: { clientId: string; coachId: string | { not: string } },
  logMessage: string,
): Promise<number> {
  const now = new Date();

  // Sequential: an interactive transaction runs on one connection.
  const invites = await tx.coachClientInvite.updateMany({
    where: { ...scope, status: "ACCEPTED" },
    data: { status: "ENDED" },
  });
  const requests = await tx.coachRequest.updateMany({
    where: { ...scope, status: "ACCEPTED" },
    data: { status: "ENDED" },
  });
  // PAUSED too: a plan from a coach the client has left must never resume.
  const assignments = await tx.planAssignment.updateMany({
    where: { ...scope, status: { in: ["ACTIVE", "PAUSED"] } },
    data: { status: "CANCELLED", endDate: now },
  });
  const subscriptions = await tx.subscription.updateMany({
    where: { ...scope, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  });

  if (invites.count + requests.count + assignments.count + subscriptions.count > 0) {
    getLogger().info(
      {
        clientId: scope.clientId,
        coachId: scope.coachId,
        endedInvites: invites.count,
        endedRequests: requests.count,
        cancelledAssignments: assignments.count,
        cancelledSubscriptions: subscriptions.count,
      },
      logMessage,
    );
  }
  return invites.count + requests.count;
}
