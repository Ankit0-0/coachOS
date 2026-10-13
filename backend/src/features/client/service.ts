import { getLogger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.config.js";
import { endCoachingBetween, findAcceptedInvite } from "../../utils/coach-access.js";
import * as messages from "../notification/messages.js";
import { nameOf, notifyInBackground } from "../notification/service.js";
import { getSignedReadUrl } from "../upload/service.js";
import { getClientSchedule } from "../plan/schedule.js";
import { buildExerciseHistory } from "../tracking/exercise-history.js";
import { parseDate, serializeCheckIn, serializeWeight } from "../tracking/service.js";

type DateString = string;

async function assertAccess(coachId: string, clientId: string, action: string) {
  const invite = await findAcceptedInvite(coachId, clientId);
  if (!invite) {
    getLogger().warn({ coachId, clientId, action }, `${action}: rejected — no accepted invite between this coach and client`);
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
      getLogger().debug(
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
  // Same serializer as the client's own view, so the coach sees signed photo
  // URLs on exactly the same terms — read-only, but not blank.
  return Promise.all(rows.map(serializeCheckIn));
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
  return Promise.all(rows.map(serializeWeight));
}

/** The client's schedule, for a coach who actually coaches them. */
export async function getClientScheduleForCoach(
  coachId: string,
  clientId: string,
  range: { from: string; to: string },
) {
  await assertAccess(coachId, clientId, "getClientSchedule");
  return getClientSchedule(clientId, range);
}

export async function getClientProfile(coachId: string, clientId: string) {
  const invite = await assertAccess(coachId, clientId, "getClientProfile");

  const [user, profile] = await Promise.all([
    prisma.user.findUnique({ where: { id: clientId } }),
    prisma.clientProfile.findUnique({ where: { userId: clientId } }),
  ]);
  if (!user) {
    getLogger().debug({ coachId, clientId }, "getClientProfile: rejected — client user record not found");
    throw new Error("CLIENT_NOT_FOUND");
  }

  return {
    name: user.name,
    email: user.email,
    avatarUrl: await getSignedReadUrl(profile?.avatarKey ?? null),
    heightCm: profile?.heightCm ?? null,
    weightKg: profile?.weightKg ?? null,
    goals: profile?.goals ?? null,
    dietPreference: profile?.dietPreference ?? null,
    // Safe here and nowhere looser: assertAccess above requires an accepted invite.
    phone: profile?.phone ?? null,
    onboardedAt: invite.respondedAt,
  };
}

/**
 * A coach removing a client from their roster. The relationship ends the same
 * way it does when the client switches coach: access goes, plans and the
 * subscription are cancelled, and everything the client logged is kept. The
 * client keeps their account and can find another coach, or be invited again.
 */
export async function endClientRelationship(coachId: string, clientId: string): Promise<void> {
  await assertAccess(coachId, clientId, "endClientRelationship");
  const ended = await prisma.$transaction((tx) => endCoachingBetween(tx, clientId, coachId));
  // Two taps at once: the second finds nothing left to end.
  if (ended === 0) throw new Error("NOT_YOUR_CLIENT");
  getLogger().info({ coachId, clientId }, "endClientRelationship: client removed from roster");
  notifyInBackground(async () => ({ userIds: [clientId], notification: messages.coachEndedCoaching(await nameOf(coachId)) }));
}

/** What the client lifted, per exercise, across every plan they've had — the coach's strength view. */
export async function getClientExerciseProgress(coachId: string, clientId: string, range: { from: DateString; to: DateString }) {
  await assertAccess(coachId, clientId, "getClientExerciseProgress");
  const assignments = await prisma.planAssignment.findMany({ where: { clientId }, select: { id: true } });
  return buildExerciseHistory(
    assignments.map((assignment) => assignment.id),
    range,
  );
}
