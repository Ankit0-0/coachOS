import { logger } from "../config/logger.js";
import { prisma } from "../config/prisma.config.js";

/**
 * A coach whose account an admin has not approved yet can sign in and read or
 * edit their own profile — they need to see *why* the app is empty — but they
 * cannot act on anyone else: no invites, no plans, no assignments.
 *
 * Throws COACH_NOT_APPROVED, which routes map to 423 rather than 403. Error
 * responses here carry no body, so the status code is the only thing the app
 * can branch on, and "pending approval" needs a different message from an
 * ordinary permission failure.
 */
export async function assertCoachApproved(coachId: string): Promise<void> {
  const coach = await prisma.user.findUnique({
    where: { id: coachId },
    select: { coachApprovalStatus: true },
  });

  if (coach?.coachApprovalStatus === "APPROVED") return;

  logger.debug(
    { coachId, status: coach?.coachApprovalStatus ?? null },
    "assertCoachApproved: rejected — coach is not approved",
  );
  throw new Error("COACH_NOT_APPROVED");
}

/**
 * 423 Locked. The account exists and the credentials are good; it just isn't
 * cleared to do this yet. Kept in one place so every feature answers a
 * pending coach identically.
 */
export const COACH_NOT_APPROVED_STATUS = 423;
