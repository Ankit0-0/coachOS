import type { Prisma, Subscription, SubscriptionStatus } from "@prisma/client";

import { getLogger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.config.js";
import { findAcceptedInvite } from "../../utils/coach-access.js";

/** Parses a YYYY-MM-DD string into the UTC midnight the @db.Date column stores. */
export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Today at UTC midnight, so comparisons against @db.Date columns line up. */
export function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Status as of right now.
 *
 * Expiry is derived at read time rather than written by a background job, so
 * a row whose endDate has passed reports EXPIRED even while it still says
 * ACTIVE in the database. CANCELLED is a deliberate act and outranks the
 * calendar, so it is never overwritten.
 */
export function effectiveStatus(subscription: Pick<Subscription, "status" | "endDate">): SubscriptionStatus {
  if (subscription.status === "CANCELLED") return "CANCELLED";
  return subscription.endDate < todayUtc() ? "EXPIRED" : subscription.status;
}

/** Whole days from today until endDate; 0 once the period has run out. */
function daysRemaining(endDate: Date): number {
  const millis = endDate.getTime() - todayUtc().getTime();
  return Math.max(0, Math.round(millis / 86_400_000));
}

function serialize(subscription: Subscription) {
  const status = effectiveStatus(subscription);
  return {
    id: subscription.id,
    coachId: subscription.coachId,
    clientId: subscription.clientId,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    status,
    /** What the row literally holds, kept visible so a correction is possible. */
    storedStatus: subscription.status,
    daysRemaining: status === "ACTIVE" ? daysRemaining(subscription.endDate) : 0,
    notes: subscription.notes,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  };
}

/**
 * The same gate every other /coach/clients/:clientId/* route uses. Subscription
 * is a record-keeping layer: it never grants or withdraws access on its own.
 */
async function assertAccess(coachId: string, clientId: string, action: string) {
  const invite = await findAcceptedInvite(coachId, clientId);
  if (!invite) {
    getLogger().warn({ coachId, clientId, action }, `${action}: rejected — no accepted invite between this coach and client`);
    throw new Error("NOT_YOUR_CLIENT");
  }
  return invite;
}

export async function listSubscriptions(coachId: string, clientId: string) {
  await assertAccess(coachId, clientId, "listSubscriptions");

  const rows = await prisma.subscription.findMany({
    where: { coachId, clientId },
    orderBy: { startDate: "desc" },
  });
  return rows.map(serialize);
}

export async function createSubscription(
  coachId: string,
  clientId: string,
  input: { startDate: string; endDate: string; notes?: string | undefined },
) {
  await assertAccess(coachId, clientId, "createSubscription");

  const startDate = parseDateOnly(input.startDate);
  const endDate = parseDateOnly(input.endDate);
  if (endDate <= startDate) {
    getLogger().debug({ coachId, clientId, startDate, endDate }, "createSubscription: rejected — endDate is not after startDate");
    throw new Error("INVALID_DATE_RANGE");
  }

  // A renewal supersedes whatever was running, so the pair never ends up with
  // two ACTIVE periods. Done in one transaction so a failure can't leave the
  // old one expired with no replacement.
  const [, created] = await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { coachId, clientId, status: "ACTIVE" },
      data: { status: "EXPIRED" },
    }),
    prisma.subscription.create({
      data: {
        coachId,
        clientId,
        startDate,
        endDate,
        status: "ACTIVE",
        notes: input.notes ?? null,
      },
    }),
  ]);

  getLogger().info({ coachId, clientId, subscriptionId: created.id }, "createSubscription: period created");
  return serialize(created);
}

export async function updateSubscription(
  coachId: string,
  clientId: string,
  subscriptionId: string,
  input: {
    startDate?: string | undefined;
    endDate?: string | undefined;
    status?: SubscriptionStatus | undefined;
    notes?: string | undefined;
  },
) {
  await assertAccess(coachId, clientId, "updateSubscription");

  const existing = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!existing || existing.coachId !== coachId || existing.clientId !== clientId) {
    getLogger().debug({ coachId, clientId, subscriptionId }, "updateSubscription: rejected — subscription not found for this pair");
    throw new Error("SUBSCRIPTION_NOT_FOUND");
  }

  // Whichever side is not being moved keeps its stored value, so shifting one
  // date alone still has to produce a valid range.
  const startDate = input.startDate ? parseDateOnly(input.startDate) : existing.startDate;
  const endDate = input.endDate ? parseDateOnly(input.endDate) : existing.endDate;
  if (endDate <= startDate) {
    getLogger().debug({ subscriptionId, startDate, endDate }, "updateSubscription: rejected — endDate is not after startDate");
    throw new Error("INVALID_DATE_RANGE");
  }

  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      startDate,
      endDate,
      ...(input.status === undefined ? {} : { status: input.status }),
      ...(input.notes === undefined ? {} : { notes: input.notes }),
    },
  });
  getLogger().info({ subscriptionId }, "updateSubscription: period updated");
  return serialize(updated);
}

/**
 * What the client app shows: the period they are on now, or the most recent
 * one if none is running. Null when the relationship is open-ended, which is
 * a normal state rather than an error.
 */
export async function getClientSubscription(clientId: string) {
  const rows = await prisma.subscription.findMany({
    where: { clientId },
    orderBy: { startDate: "desc" },
    include: { coach: { select: { id: true, name: true, email: true } } },
  });
  if (rows.length === 0) return null;

  const current = rows.find((row) => effectiveStatus(row) === "ACTIVE") ?? rows[0]!;
  return {
    ...serialize(current),
    coach: current.coach,
  };
}

export type SubscriptionPeriod = { startDate: Date; endDate: Date };

/** A period from YYYY-MM-DD strings, or null when neither was given. */
export function periodFromDates(start: string | undefined, end: string | undefined): SubscriptionPeriod | null {
  if (start === undefined || end === undefined) return null;
  return { startDate: parseDateOnly(start), endDate: parseDateOnly(end) };
}

/**
 * Legacy: the period an old months-only invite stands for, starting today.
 * setUTCMonth rolls the year over and clamps a short target month itself:
 * 31 Jan + 1 month lands in early March rather than throwing.
 */
export function periodFromMonths(durationMonths: number): SubscriptionPeriod {
  const startDate = todayUtc();
  const endDate = new Date(startDate);
  endDate.setUTCMonth(endDate.getUTCMonth() + durationMonths);
  return { startDate, endDate };
}

/** True once the whole period is in the past; the last day itself still counts. */
export function periodHasEnded(period: SubscriptionPeriod): boolean {
  return period.endDate < todayUtc();
}

/**
 * The first period of a new relationship, created exactly as the coach chose
 * it — never shifted to the acceptance date, since the coach may already have
 * been paid from the start date. Runs inside the acceptance transaction.
 */
export async function createFirstSubscription(
  tx: Prisma.TransactionClient,
  coachId: string,
  clientId: string,
  period: SubscriptionPeriod,
): Promise<void> {
  const created = await tx.subscription.create({
    data: { coachId, clientId, startDate: period.startDate, endDate: period.endDate, status: "ACTIVE" },
  });
  getLogger().info(
    { coachId, clientId, subscriptionId: created.id, startDate: period.startDate, endDate: period.endDate },
    "createFirstSubscription: first period created on acceptance",
  );
}
