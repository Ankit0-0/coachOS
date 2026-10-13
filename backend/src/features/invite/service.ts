import type { CoachClientInvite, CoachProfile, InviteStatus } from "@prisma/client";

import { getLogger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.config.js";
import { dateKeyOf } from "../../utils/calendar.js";
import { endPreviousCoaching, findCurrentCoach, type CurrentCoach } from "../../utils/coach-access.js";
import { assertCoachApproved } from "../../utils/coach-approval.js";
import {
  createFirstSubscription,
  effectiveStatus,
  periodFromMonths,
  periodHasEnded,
  todayUtc,
  type SubscriptionPeriod,
} from "../subscription/service.js";
import { getSignedReadUrl } from "../upload/service.js";
import { normalizeEmail } from "../../utils/email.js";
import * as messages from "../notification/messages.js";
import { nameOf, notifyInBackground } from "../notification/service.js";

type PersonSummary = { id: string; name: string; email: string };

type InviteRow = CoachClientInvite & {
  coach?:
    | (PersonSummary & {
        phone?: string | null;
        avatarUrl?: string | null;
        bio?: string | null;
        specialties?: string[];
        yearsExperience?: number | null;
      })
    | null;
  client?: (PersonSummary & { avatarUrl?: string | null }) | null;
};

function serializeInvite(row: InviteRow) {
  return {
    id: row.id,
    coachId: row.coachId,
    coach: row.coach ?? undefined,
    clientEmail: row.clientEmail,
    clientId: row.clientId,
    client: row.client ?? undefined,
    status: row.status,
    durationMonths: row.durationMonths,
    /**
     * The first period the coach chose; null for an open-ended relationship.
     * Nested so it can't be confused with the roster's `subscriptionEndDate`,
     * which is the current subscription's end.
     */
    subscriptionPeriod:
      row.subscriptionStartDate && row.subscriptionEndDate
        ? { startDate: row.subscriptionStartDate, endDate: row.subscriptionEndDate }
        : null,
    createdAt: row.createdAt,
    respondedAt: row.respondedAt,
  };
}

/**
 * `period` is the first subscription, as the coach chose it; null for an
 * open-ended relationship.
 */
export async function createInvite(coachId: string, clientEmailInput: string, period: SubscriptionPeriod | null) {
  await assertCoachApproved(coachId);

  const clientEmail = normalizeEmail(clientEmailInput);

  if (period && periodHasEnded(period)) {
    getLogger().debug({ coachId, clientEmail, endDate: period.endDate }, "createInvite: rejected — subscription period already over");
    throw new Error("PERIOD_ENDED");
  }

  const existing = await prisma.coachClientInvite.findFirst({
    where: { coachId, clientEmail, status: { in: ["PENDING", "ACCEPTED"] } },
  });
  if (existing) {
    getLogger().debug({ coachId, clientEmail, existingInviteId: existing.id, existingStatus: existing.status }, "createInvite: rejected — active invite already exists");
    throw new Error("INVITE_ALREADY_EXISTS");
  }

  const matchedClient = await prisma.user.findUnique({ where: { email: clientEmail } });
  const clientId = matchedClient && matchedClient.role === "CLIENT" ? matchedClient.id : null;

  const invite = await prisma.coachClientInvite.create({
    data: {
      coachId,
      clientEmail,
      clientId,
      subscriptionStartDate: period?.startDate ?? null,
      subscriptionEndDate: period?.endDate ?? null,
    },
    include: { client: { select: { id: true, name: true, email: true } } },
  });
  getLogger().info({ coachId, clientEmail, inviteId: invite.id, autoMatchedClientId: clientId }, "createInvite: invite created");
  // Someone without an account yet has no device to tell; they see the
  // invite when they sign up with this address.
  if (clientId) {
    notifyInBackground(async () => ({ userIds: [clientId], notification: messages.inviteReceived(await nameOf(coachId)) }));
  }
  return serializeInvite(invite);
}

/**
 * The client's photo rides along only once they've accepted. Before that, the
 * coach has typed an email address, nothing more — and showing the photo of
 * whoever owns it would turn an invite into a way to look people up.
 */
async function withClientAvatar(
  row: CoachClientInvite & {
    client: (PersonSummary & { clientProfile: { avatarKey: string | null } | null }) | null;
  },
) {
  if (!row.client) return { ...row, client: null };
  const { clientProfile, ...client } = row.client;
  return {
    ...row,
    client:
      row.status === "ACCEPTED"
        ? { ...client, avatarUrl: await getSignedReadUrl(clientProfile?.avatarKey ?? null) }
        : client,
  };
}

export async function listCoachInvites(coachId: string, status?: InviteStatus) {
  const found = await prisma.coachClientInvite.findMany({
    where: { coachId, ...(status ? { status } : {}) },
    include: {
      client: { select: { id: true, name: true, email: true, clientProfile: { select: { avatarKey: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  const rows = await Promise.all(found.map(withClientAvatar));

  // The roster screen needs a lapsed marker per row. Fetching it here in one
  // query beats one request per client from the app, and this route is
  // coach-only so the extra field is never exposed to a client.
  const subscriptions = await prisma.subscription.findMany({
    where: { coachId, clientId: { in: rows.map((row) => row.clientId).filter((id): id is string => Boolean(id)) } },
    orderBy: { startDate: "desc" },
  });

  const latestByClient = new Map<string, (typeof subscriptions)[number]>();
  for (const subscription of subscriptions) {
    // Ordered newest first, so the first one seen for a client is the current one.
    if (!latestByClient.has(subscription.clientId)) latestByClient.set(subscription.clientId, subscription);
  }

  const activity = await rosterActivity(
    coachId,
    rows.flatMap((row) => (row.status === "ACCEPTED" && row.clientId ? [row.clientId] : [])),
  );

  return rows.map((row) => {
    const subscription = row.clientId ? latestByClient.get(row.clientId) : undefined;
    const subscriptionStatus = subscription ? effectiveStatus(subscription) : null;
    const clientActivity = row.status === "ACCEPTED" && row.clientId ? activity.get(row.clientId) : undefined;
    return {
      ...serializeInvite(row),
      /** Null when this client has no subscription record — an open-ended relationship. */
      subscriptionStatus,
      subscriptionEndDate: subscription?.endDate ?? null,
      /** The last day the client ticked anything off on this coach's plans; null if never. Clients only. */
      lastCheckInDate: clientActivity?.lastCheckInDate ? dateKeyOf(clientActivity.lastCheckInDate) : null,
      /** Why this client may need the coach today, most pressing first. Empty when all is well. */
      attention: clientActivity ? attentionFor(clientActivity, subscription ?? null, subscriptionStatus) : [],
    };
  });
}

/** Days without a logged check-in, on an active plan, before the roster flags a client. */
const QUIET_AFTER_DAYS = 3;
/** How close a subscription's end has to be before the roster flags the renewal. */
const RENEWAL_WITHIN_DAYS = 7;

export type AttentionReason = "EXPIRED" | "QUIET" | "NO_PLAN" | "RENEWAL_DUE";

type ClientActivity = {
  lastCheckInDate: Date | null;
  /** When the earliest active plan started counting; null with no active plan. */
  activeSince: Date | null;
};

/**
 * Per client: their last check-in with something ticked off, and whether they
 * have an active plan from this coach. Two queries for the whole roster.
 */
async function rosterActivity(coachId: string, clientIds: string[]): Promise<Map<string, ClientActivity>> {
  const activity = new Map<string, ClientActivity>(
    clientIds.map((clientId) => [clientId, { lastCheckInDate: null, activeSince: null }]),
  );
  if (clientIds.length === 0) return activity;

  const assignments = await prisma.planAssignment.findMany({
    where: { coachId, clientId: { in: clientIds } },
    select: { id: true, clientId: true, status: true, startDate: true, assignedAt: true },
  });
  const latest = await prisma.checkIn.groupBy({
    by: ["assignmentId"],
    where: { assignmentId: { in: assignments.map((assignment) => assignment.id) }, completedItemIds: { isEmpty: false } },
    _max: { date: true },
  });
  const latestByAssignment = new Map(latest.map((row) => [row.assignmentId, row._max.date]));

  for (const assignment of assignments) {
    const entry = activity.get(assignment.clientId);
    if (!entry) continue;
    const last = latestByAssignment.get(assignment.id) ?? null;
    if (last && (!entry.lastCheckInDate || last > entry.lastCheckInDate)) entry.lastCheckInDate = last;
    if (assignment.status === "ACTIVE") {
      const since = assignment.startDate ?? assignment.assignedAt;
      if (!entry.activeSince || since < entry.activeSince) entry.activeSince = since;
    }
  }
  return activity;
}

function wholeDaysSince(value: Date, today: Date): number {
  return Math.floor((today.getTime() - value.getTime()) / 86_400_000);
}

function attentionFor(
  activity: ClientActivity,
  subscription: { endDate: Date } | null,
  subscriptionStatus: string | null,
): AttentionReason[] {
  const today = todayUtc();
  const reasons: AttentionReason[] = [];
  if (subscriptionStatus === "EXPIRED") reasons.push("EXPIRED");
  if (activity.activeSince) {
    // Counted from the later of their last check-in and the plan's start, so a
    // plan assigned yesterday isn't already "quiet".
    const reference =
      activity.lastCheckInDate && activity.lastCheckInDate > activity.activeSince
        ? activity.lastCheckInDate
        : activity.activeSince;
    if (wholeDaysSince(reference, today) >= QUIET_AFTER_DAYS) reasons.push("QUIET");
  } else {
    reasons.push("NO_PLAN");
  }
  if (subscription && subscriptionStatus === "ACTIVE") {
    const daysLeft = -wholeDaysSince(subscription.endDate, today);
    if (daysLeft <= RENEWAL_WITHIN_DAYS) reasons.push("RENEWAL_DUE");
  }
  return reasons;
}

/**
 * The coach's phone, photo and profile ride along only on an ACCEPTED invite —
 * they are what the client's Home strip and Your Coach page show and call. A
 * pending or declined invite is not a relationship, so it gets name and email
 * only. Gated on each row's own status rather than the query filter, so a
 * change to the filter can't leak them.
 */
async function serializeClientInvite(
  row: CoachClientInvite & {
    coach: PersonSummary & {
      coachProfile: Pick<CoachProfile, "phone" | "avatarKey" | "bio" | "specialties" | "yearsExperience"> | null;
    };
  },
  currentCoach: CurrentCoach | null,
) {
  const { coachProfile, ...coach } = row.coach;
  const invite = serializeInvite({
    ...row,
    coach:
      row.status === "ACCEPTED"
        ? {
            ...coach,
            phone: coachProfile?.phone ?? null,
            avatarUrl: await getSignedReadUrl(coachProfile?.avatarKey ?? null),
            bio: coachProfile?.bio ?? null,
            specialties: coachProfile?.specialties ?? [],
            yearsExperience: coachProfile?.yearsExperience ?? null,
          }
        : coach,
  });
  return {
    ...invite,
    /**
     * Who accepting this invite would replace, so the app can warn by name
     * first. Null when the client has no coach, and on anything but a
     * pending invite.
     */
    currentCoach: row.status === "PENDING" && currentCoach && currentCoach.id !== row.coachId ? currentCoach : null,
  };
}

export async function listClientInvites(clientId: string, email: string, status: InviteStatus = "PENDING") {
  const clientEmail = normalizeEmail(email);
  const rows = await prisma.coachClientInvite.findMany({
    where: { status, OR: [{ clientId }, { clientEmail }] },
    include: {
      coach: {
        select: {
          id: true,
          name: true,
          email: true,
          coachProfile: {
            select: { phone: true, avatarKey: true, bio: true, specialties: true, yearsExperience: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const currentCoach = rows.some((row) => row.status === "PENDING") ? await findCurrentCoach(clientId) : null;
  return Promise.all(rows.map((row) => serializeClientInvite(row, currentCoach)));
}

/** The invite, checked to be pending and addressed to this user. */
async function loadPendingInvite(inviteId: string, userId: string, email: string) {
  const invite = await prisma.coachClientInvite.findUnique({ where: { id: inviteId } });
  if (!invite) {
    getLogger().debug({ inviteId, userId }, "respondToInvite: rejected — invite not found");
    throw new Error("INVITE_NOT_FOUND");
  }

  const normalizedEmail = normalizeEmail(email);
  const isRecipient = invite.clientId === userId || invite.clientEmail === normalizedEmail;
  if (!isRecipient) {
    getLogger().warn(
      { inviteId, userId, email: normalizedEmail, inviteClientId: invite.clientId, inviteClientEmail: invite.clientEmail },
      "respondToInvite: rejected — caller is not the invite recipient",
    );
    throw new Error("FORBIDDEN");
  }
  if (invite.status !== "PENDING") {
    getLogger().debug({ inviteId, userId, currentStatus: invite.status }, "respondToInvite: rejected — invite already responded to");
    throw new Error("INVALID_STATUS");
  }
  return invite;
}

/** The first period an invite carries: its dates, or a legacy length counted from today. */
function invitePeriod(invite: CoachClientInvite): SubscriptionPeriod | null {
  if (invite.subscriptionStartDate && invite.subscriptionEndDate) {
    return { startDate: invite.subscriptionStartDate, endDate: invite.subscriptionEndDate };
  }
  return invite.durationMonths ? periodFromMonths(invite.durationMonths) : null;
}

/**
 * Forms the relationship, and ends the client's current one if they have one
 * — all in one transaction, so there is never a moment with two coaches.
 *
 * The subscription keeps the coach's dates even when the client accepts after
 * the start date. Accepting after the end date is refused instead: that would
 * create a period that is over before it begins, so the coach has to re-invite.
 */
export async function acceptInvite(inviteId: string, userId: string, email: string) {
  const invite = await loadPendingInvite(inviteId, userId, email);

  const period = invitePeriod(invite);
  if (period && periodHasEnded(period)) {
    getLogger().debug({ inviteId, userId, endDate: period.endDate }, "acceptInvite: rejected — subscription period already over");
    throw new Error("INVITE_PERIOD_ENDED");
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Conditional on PENDING, so a double tap can't accept twice.
    const claimed = await tx.coachClientInvite.updateMany({
      where: { id: inviteId, status: "PENDING" },
      data: { status: "ACCEPTED", respondedAt: new Date(), clientId: userId },
    });
    if (claimed.count !== 1) throw new Error("INVALID_STATUS");

    await endPreviousCoaching(tx, userId, invite.coachId);
    if (period) await createFirstSubscription(tx, invite.coachId, userId, period);

    return tx.coachClientInvite.findUniqueOrThrow({
      where: { id: inviteId },
      include: { coach: { select: { id: true, name: true, email: true } } },
    });
  });
  getLogger().info({ inviteId, userId, coachId: invite.coachId }, "acceptInvite: relationship formed");
  notifyInBackground(async () => ({
    userIds: [invite.coachId],
    notification: messages.inviteAnswered(await nameOf(userId), true, userId),
  }));
  return serializeInvite(updated);
}

export async function declineInvite(inviteId: string, userId: string, email: string) {
  await loadPendingInvite(inviteId, userId, email);
  const updated = await prisma.coachClientInvite.update({
    where: { id: inviteId },
    data: { status: "DECLINED", respondedAt: new Date() },
    include: { coach: { select: { id: true, name: true, email: true } } },
  });
  getLogger().info({ inviteId, userId }, "declineInvite: invite declined");
  notifyInBackground(async () => ({
    userIds: [updated.coachId],
    notification: messages.inviteAnswered(await nameOf(userId), false, null),
  }));
  return serializeInvite(updated);
}

/** A coach withdrawing an invite the client hasn't answered yet. */
export async function cancelInvite(inviteId: string, coachId: string) {
  const invite = await prisma.coachClientInvite.findUnique({ where: { id: inviteId } });
  if (!invite) {
    getLogger().debug({ inviteId, coachId }, "cancelInvite: rejected — invite not found");
    throw new Error("INVITE_NOT_FOUND");
  }
  if (invite.coachId !== coachId) {
    getLogger().warn({ inviteId, coachId, ownerId: invite.coachId }, "cancelInvite: rejected — not this coach's invite");
    throw new Error("FORBIDDEN");
  }
  // Conditional on PENDING, so an acceptance landing at the same moment wins.
  const { count } = await prisma.coachClientInvite.updateMany({
    where: { id: inviteId, status: "PENDING" },
    data: { status: "CANCELLED", respondedAt: new Date() },
  });
  if (count !== 1) {
    getLogger().debug({ inviteId, coachId, currentStatus: invite.status }, "cancelInvite: rejected — no longer pending");
    throw new Error("INVALID_STATUS");
  }
  getLogger().info({ inviteId, coachId }, "cancelInvite: invite withdrawn");
  const updated = await prisma.coachClientInvite.findUniqueOrThrow({
    where: { id: inviteId },
    include: { client: { select: { id: true, name: true, email: true } } },
  });
  return serializeInvite(updated);
}
