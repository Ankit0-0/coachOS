import type { CoachProfile, CoachRequest, InviteStatus, User } from "@prisma/client";

import { logger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.config.js";
import { assertCoachApproved } from "../../utils/coach-approval.js";
import { normalizeEmail } from "../../utils/email.js";
import { getSignedReadUrl } from "../upload/service.js";

/**
 * Where the calling client stands with a coach, so the app can show the right
 * action without guessing — and so a 409 from a request only ever means "this
 * changed since you last looked", never something the app has to decode.
 *
 * - COACHING  an ACCEPTED relationship already exists
 * - INVITED   the coach has a pending invite out to this client (accept that instead)
 * - REQUESTED the client has a pending request with this coach
 * - NONE      nothing yet; the client can send a request
 */
export type ExploreRelationship = "COACHING" | "INVITED" | "REQUESTED" | "NONE";

/** Coaches a client may browse and request: opted in AND approved by an admin. */
const LISTED_COACH_WHERE = {
  role: "COACH",
  coachApprovalStatus: "APPROVED",
  coachProfile: { is: { listedInExplore: true } },
} as const;

type ListedCoach = User & { coachProfile: CoachProfile | null };

/**
 * Deliberately excludes email and phone: listing yourself in Explore makes your
 * profile browsable, not your contact details. A client reaches a coach by
 * sending a request.
 */
async function serializeDirectoryCoach(
  coach: ListedCoach,
  relationship: ExploreRelationship,
  pendingRequestId: string | null,
) {
  return {
    id: coach.id,
    name: coach.name,
    bio: coach.coachProfile?.bio ?? null,
    specialties: coach.coachProfile?.specialties ?? [],
    yearsExperience: coach.coachProfile?.yearsExperience ?? null,
    avatarUrl: await getSignedReadUrl(coach.coachProfile?.avatarKey ?? null),
    relationship,
    /** Set when relationship is REQUESTED, so the app can offer to cancel. */
    pendingRequestId,
  };
}

/** Relationship to each of `coachIds` for one client, in three queries total. */
async function relationshipsFor(client: { id: string; email: string }, coachIds: string[]) {
  const email = normalizeEmail(client.email);
  const [invites, requests] = await Promise.all([
    prisma.coachClientInvite.findMany({
      where: {
        coachId: { in: coachIds },
        status: { in: ["PENDING", "ACCEPTED"] },
        OR: [{ clientId: client.id }, { clientEmail: email }],
      },
      select: { coachId: true, status: true },
    }),
    prisma.coachRequest.findMany({
      where: { clientId: client.id, coachId: { in: coachIds }, status: "PENDING" },
      select: { id: true, coachId: true },
    }),
  ]);

  const result = new Map<string, { relationship: ExploreRelationship; pendingRequestId: string | null }>();
  for (const coachId of coachIds) {
    const coachInvites = invites.filter((invite) => invite.coachId === coachId);
    const pendingRequest = requests.find((request) => request.coachId === coachId);
    const relationship: ExploreRelationship = coachInvites.some((invite) => invite.status === "ACCEPTED")
      ? "COACHING"
      : coachInvites.some((invite) => invite.status === "PENDING")
        ? "INVITED"
        : pendingRequest
          ? "REQUESTED"
          : "NONE";
    result.set(coachId, {
      relationship,
      pendingRequestId: relationship === "REQUESTED" ? (pendingRequest?.id ?? null) : null,
    });
  }
  return result;
}

async function loadClient(clientId: string) {
  const client = await prisma.user.findUnique({ where: { id: clientId }, select: { id: true, email: true } });
  if (!client) throw new Error("USER_NOT_FOUND");
  return client;
}

export async function listDirectory(clientId: string) {
  const client = await loadClient(clientId);
  const coaches = await prisma.user.findMany({
    where: LISTED_COACH_WHERE,
    include: { coachProfile: true },
    orderBy: { name: "asc" },
  });
  const relationships = await relationshipsFor(client, coaches.map((coach) => coach.id));
  return Promise.all(
    coaches.map((coach) => {
      const status = relationships.get(coach.id)!;
      return serializeDirectoryCoach(coach, status.relationship, status.pendingRequestId);
    }),
  );
}

export async function getDirectoryCoach(clientId: string, coachId: string) {
  const client = await loadClient(clientId);
  const coach = await prisma.user.findFirst({
    where: { id: coachId, ...LISTED_COACH_WHERE },
    include: { coachProfile: true },
  });
  if (!coach) {
    // Unlisted, unapproved, not a coach, or no such user: all look the same.
    logger.debug({ clientId, coachId }, "getDirectoryCoach: rejected — coach not listed in Explore");
    throw new Error("COACH_NOT_FOUND");
  }
  const status = (await relationshipsFor(client, [coach.id])).get(coach.id)!;
  return serializeDirectoryCoach(coach, status.relationship, status.pendingRequestId);
}

type PersonSummary = { id: string; name: string; email: string };

function serializeRequest(
  row: CoachRequest & { coach?: Pick<User, "id" | "name"> | null; client?: PersonSummary | null },
) {
  return {
    id: row.id,
    coachId: row.coachId,
    clientId: row.clientId,
    /** Name only: a client's view of a request never exposes the coach's email. */
    coach: row.coach ?? undefined,
    client: row.client ?? undefined,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt,
    respondedAt: row.respondedAt,
  };
}

export async function createCoachRequest(clientId: string, coachId: string, message?: string | undefined) {
  const client = await loadClient(clientId);

  const coach = await prisma.user.findFirst({ where: { id: coachId, ...LISTED_COACH_WHERE }, select: { id: true } });
  if (!coach) {
    logger.debug({ clientId, coachId }, "createCoachRequest: rejected — coach not listed in Explore");
    throw new Error("COACH_NOT_FOUND");
  }

  const status = (await relationshipsFor(client, [coachId])).get(coachId)!;
  if (status.relationship !== "NONE") {
    logger.debug({ clientId, coachId, relationship: status.relationship }, "createCoachRequest: rejected — relationship already exists");
    throw new Error("RELATIONSHIP_EXISTS");
  }

  const request = await prisma.coachRequest.create({
    data: { clientId, coachId, message: message ? message : null },
    include: { coach: { select: { id: true, name: true } } },
  });
  logger.debug({ clientId, coachId, requestId: request.id }, "createCoachRequest: request created");
  return serializeRequest(request);
}

export async function listClientRequests(clientId: string, status?: InviteStatus) {
  const rows = await prisma.coachRequest.findMany({
    where: { clientId, ...(status ? { status } : {}) },
    include: { coach: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serializeRequest);
}

export async function cancelCoachRequest(clientId: string, requestId: string) {
  const request = await prisma.coachRequest.findUnique({ where: { id: requestId } });
  // Someone else's request reads as not found, so ids can't be probed.
  if (!request || request.clientId !== clientId) throw new Error("REQUEST_NOT_FOUND");
  if (request.status !== "PENDING") throw new Error("INVALID_STATUS");

  const updated = await prisma.coachRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED", respondedAt: new Date() },
    include: { coach: { select: { id: true, name: true } } },
  });
  return serializeRequest(updated);
}

export async function listCoachRequests(coachId: string, status: InviteStatus = "PENDING") {
  const rows = await prisma.coachRequest.findMany({
    where: { coachId, status },
    include: { client: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serializeRequest);
}

async function loadCoachRequest(coachId: string, requestId: string) {
  const request = await prisma.coachRequest.findUnique({
    where: { id: requestId },
    include: { client: { select: { id: true, name: true, email: true } } },
  });
  if (!request || request.coachId !== coachId) throw new Error("REQUEST_NOT_FOUND");
  if (request.status !== "PENDING") throw new Error("INVALID_STATUS");
  return request;
}

/**
 * Accepting forms the relationship exactly the way an accepted invite does —
 * by writing an ACCEPTED CoachClientInvite — so plans, tracking, subscriptions
 * and every coach-scoped access check work without knowing requests exist.
 */
export async function acceptCoachRequest(coachId: string, requestId: string) {
  await assertCoachApproved(coachId);
  const request = await loadCoachRequest(coachId, requestId);
  const clientId = request.clientId;
  const clientEmail = normalizeEmail(request.client.email);

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.coachClientInvite.findFirst({
      where: { coachId, clientId, status: "ACCEPTED" },
      select: { id: true },
    });
    if (!existing) {
      await tx.coachClientInvite.create({
        data: { coachId, clientId, clientEmail, status: "ACCEPTED", respondedAt: new Date() },
      });
    }
    // An invite the coach had also sent is now redundant; retire it so the
    // client isn't left with a stale "accept this invite" prompt.
    await tx.coachClientInvite.updateMany({
      where: { coachId, status: "PENDING", OR: [{ clientId }, { clientEmail }] },
      data: { status: "CANCELLED", respondedAt: new Date() },
    });
    return tx.coachRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED", respondedAt: new Date() },
      include: { client: { select: { id: true, name: true, email: true } } },
    });
  });

  logger.debug({ coachId, clientId, requestId }, "acceptCoachRequest: relationship formed");
  return serializeRequest(updated);
}

export async function declineCoachRequest(coachId: string, requestId: string) {
  await assertCoachApproved(coachId);
  await loadCoachRequest(coachId, requestId);
  const updated = await prisma.coachRequest.update({
    where: { id: requestId },
    data: { status: "DECLINED", respondedAt: new Date() },
    include: { client: { select: { id: true, name: true, email: true } } },
  });
  return serializeRequest(updated);
}
