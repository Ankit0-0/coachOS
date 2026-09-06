import { logger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.config.js";
import { findAcceptedInvite } from "../../utils/coach-access.js";
import { parseDate, serializeCheckIn, serializeWeight } from "../tracking/service.js";

type DateString = string;

async function assertAccess(coachId: string, clientId: string, action: string) {
  const invite = await findAcceptedInvite(coachId, clientId);
  if (!invite) {
    logger.debug({ coachId, clientId, action }, `${action}: rejected — no accepted invite between this coach and client`);
    throw new Error("NOT_YOUR_CLIENT");
  }
  return invite;
}

export async function listClientCheckIns(
  coachId: string,
  clientId: string,
  input: { assignmentId?: string | undefined; from: DateString; to: DateString },
) {
  await assertAccess(coachId, clientId, "listClientCheckIns");

  let assignmentIds: string[];
  if (input.assignmentId) {
    const assignment = await prisma.planAssignment.findUnique({ where: { id: input.assignmentId } });
    if (!assignment || assignment.clientId !== clientId) {
      logger.debug(
        { coachId, clientId, assignmentId: input.assignmentId },
        "listClientCheckIns: rejected — assignment not found or does not belong to this client",
      );
      throw new Error("ASSIGNMENT_NOT_FOUND");
    }
    assignmentIds = [assignment.id];
  } else {
    // Every assignment this client has ever had, so history survives a plan change.
    const assignments = await prisma.planAssignment.findMany({
      where: { clientId },
      select: { id: true },
    });
    assignmentIds = assignments.map((assignment) => assignment.id);
  }

  const rows = await prisma.checkIn.findMany({
    where: {
      assignmentId: { in: assignmentIds },
      date: { gte: parseDate(input.from), lte: parseDate(input.to) },
    },
    orderBy: { date: "asc" },
  });
  return rows.map(serializeCheckIn);
}

export async function listClientWeights(coachId: string, clientId: string, input: { from: DateString; to: DateString }) {
  await assertAccess(coachId, clientId, "listClientWeights");

  const rows = await prisma.weightEntry.findMany({
    where: {
      clientId,
      date: { gte: parseDate(input.from), lte: parseDate(input.to) },
    },
    orderBy: { date: "asc" },
  });
  return rows.map(serializeWeight);
}

export async function getClientProfile(coachId: string, clientId: string) {
  const invite = await assertAccess(coachId, clientId, "getClientProfile");

  const [user, profile] = await Promise.all([
    prisma.user.findUnique({ where: { id: clientId } }),
    prisma.clientProfile.findUnique({ where: { userId: clientId } }),
  ]);
  if (!user) {
    logger.debug({ coachId, clientId }, "getClientProfile: rejected — client user record not found");
    throw new Error("CLIENT_NOT_FOUND");
  }

  return {
    name: user.name,
    email: user.email,
    heightCm: profile?.heightCm ?? null,
    weightKg: profile?.weightKg ?? null,
    goals: profile?.goals ?? null,
    onboardedAt: invite.respondedAt,
  };
}
