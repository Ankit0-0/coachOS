import type { CoachProfile, CoachRequest, InviteStatus, User } from "@prisma/client";

import { getLogger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.config.js";
import { endPreviousCoaching, findCurrentCoach } from "../../utils/coach-access.js";
import { assertCoachApproved } from "../../utils/coach-approval.js";
import { normalizeEmail } from "../../utils/email.js";
import {
  createFirstSubscription,
  effectiveStatus,
  periodHasEnded,
  type SubscriptionPeriod,
} from "../subscription/service.js";
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

type ClientCounts = { activeClientCount: number; totalClientCount: number };

/**
 * How many clients each coach has, in two queries whatever the number of coaches.
 *
 * - total:  every client this coach has ever had an ACCEPTED invite with,
 *   including relationships that have since ENDED.
 * - active: those whose relationship is still running — still ACCEPTED, and
 *   their latest subscription with this coach is ACTIVE (expiry derived as
 *   everywhere else) or absent, which is an open-ended relationship, not a lapse.
 *
 * Counted per distinct client, so a re-invite can't count someone twice.
 */
async function clientCountsFor(coachIds: string[]): Promise<Map<string, ClientCounts>> {
  const [accepted, subscriptions] = await Promise.all([
    prisma.coachClientInvite.findMany({
      where: { coachId: { in: coachIds }, status: { in: ["ACCEPTED", "ENDED"] }, clientId: { not: null } },
      select: { coachId: true, clientId: true, status: true },
    }),
    prisma.subscription.findMany({
      where: { coachId: { in: coachIds } },
      select: { coachId: true, clientId: true, status: true, endDate: true },
      orderBy: { startDate: "desc" },
    }),
  ]);

  // Ordered newest first, so the first period seen for a pair is its current one.
  const latestByPair = new Map<string, (typeof subscriptions)[number]>();
  for (const subscription of subscriptions) {
    const pair = `${subscription.coachId}:${subscription.clientId}`;
    if (!latestByPair.has(pair)) latestByPair.set(pair, subscription);
  }

  const counts = new Map<string, ClientCounts>(
    coachIds.map((id) => [id, { activeClientCount: 0, totalClientCount: 0 }]),
  );
  // Per distinct pair: a client who left and came back counts once, and is
  // active when any of their invites with this coach is still ACCEPTED.
  const current = new Map<string, boolean>();
  for (const { coachId, clientId, status } of accepted) {
    const pair = `${coachId}:${clientId}`;
    current.set(pair, current.get(pair) === true || status === "ACCEPTED");
  }
  for (const [pair, isCurrent] of current) {
    const count = counts.get(pair.split(":")[0]!)!;
    count.totalClientCount += 1;
    const latest = latestByPair.get(pair);
    if (isCurrent && (!latest || effectiveStatus(latest) === "ACTIVE")) count.activeClientCount += 1;
  }
  return counts;
}

/**
 * Deliberately excludes email and phone: listing yourself in Explore makes your
 * profile browsable, not your contact details. A client reaches a coach by
 * sending a request.
 *
 * CoachProfile has no headline, city or languages, so there are none to show.
 */
async function serializeDirectoryCoach(
  coach: ListedCoach,
  relationship: ExploreRelationship,
  pendingRequestId: string | null,
  counts: ClientCounts,
) {
  return {
    id: coach.id,
    name: coach.name,
    bio: coach.coachProfile?.bio ?? null,
    specialties: coach.coachProfile?.specialties ?? [],
    yearsExperience: coach.coachProfile?.yearsExperience ?? null,
    avatarUrl: await getSignedReadUrl(coach.coachProfile?.avatarKey ?? null),
    /**
     * Raw counts. The app decides how low is too low to show — a new coach's
     * "0 clients" reads worse than saying nothing.
     */
    activeClientCount: counts.activeClientCount,
    totalClientCount: counts.totalClientCount,
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
  const coachIds = coaches.map((coach) => coach.id);
  const [relationships, counts] = await Promise.all([relationshipsFor(client, coachIds), clientCountsFor(coachIds)]);
  return Promise.all(
    coaches.map((coach) => {
      const status = relationships.get(coach.id)!;
      return serializeDirectoryCoach(coach, status.relationship, status.pendingRequestId, counts.get(coach.id)!);
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
    getLogger().debug({ clientId, coachId }, "getDirectoryCoach: rejected — coach not listed in Explore");
    throw new Error("COACH_NOT_FOUND");
  }
  const [relationships, counts, currentCoach] = await Promise.all([
    relationshipsFor(client, [coach.id]),
    clientCountsFor([coach.id]),
    findCurrentCoach(clientId),
  ]);
  const status = relationships.get(coach.id)!;
  return {
    ...(await serializeDirectoryCoach(coach, status.relationship, status.pendingRequestId, counts.get(coach.id)!)),
    /**
     * Who this coach would replace if they accept a request, so the app can
     * warn by name before the client sends one. Null when there's no one.
     */
    currentCoach: currentCoach && currentCoach.id !== coach.id ? currentCoach : null,
  };
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
    getLogger().debug({ clientId, coachId }, "createCoachRequest: rejected — coach not listed in Explore");
    throw new Error("COACH_NOT_FOUND");
  }

  const status = (await relationshipsFor(client, [coachId])).get(coachId)!;
  if (status.relationship !== "NONE") {
    getLogger().debug({ clientId, coachId, relationship: status.relationship }, "createCoachRequest: rejected — relationship already exists");
    throw new Error("RELATIONSHIP_EXISTS");
  }

  const request = await prisma.coachRequest.create({
    data: { clientId, coachId, message: message ? message : null },
    include: { coach: { select: { id: true, name: true } } },
  });
  getLogger().info({ clientId, coachId, requestId: request.id }, "createCoachRequest: request created");
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
 * It also ends the client's current coach, in the same transaction, exactly
 * as accepting an invite does.
 *
 * `period` is the first subscription as the coach chose it; null for an
 * open-ended relationship.
 */
export async function acceptCoachRequest(coachId: string, requestId: string, period: SubscriptionPeriod | null) {
  await assertCoachApproved(coachId);
  const request = await loadCoachRequest(coachId, requestId);
  const clientId = request.clientId;
  const clientEmail = normalizeEmail(request.client.email);

  if (period && periodHasEnded(period)) {
    getLogger().debug({ coachId, requestId, endDate: period.endDate }, "acceptCoachRequest: rejected — subscription period already over");
    throw new Error("PERIOD_ENDED");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.coachClientInvite.findFirst({
      where: { coachId, clientId, status: "ACCEPTED" },
      select: { id: true },
    });
    if (!existing) {
      await tx.coachClientInvite.create({
        data: {
          coachId,
          clientId,
          clientEmail,
          status: "ACCEPTED",
          respondedAt: new Date(),
          subscriptionStartDate: period?.startDate ?? null,
          subscriptionEndDate: period?.endDate ?? null,
        },
      });
      await endPreviousCoaching(tx, clientId, coachId);
      if (period) await createFirstSubscription(tx, coachId, clientId, period);
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

  getLogger().info({ coachId, clientId, requestId }, "acceptCoachRequest: relationship formed");
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
