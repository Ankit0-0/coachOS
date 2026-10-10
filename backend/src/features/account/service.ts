import { getLogger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.config.js";
import * as messages from "../notification/messages.js";
import { notifyUsers } from "../notification/service.js";
import { deleteUserObjects } from "../upload/service.js";

/**
 * Deletes a coach's or client's account and everything that is theirs: plans
 * they wrote, plan assignments and check-ins on either side, weigh-ins,
 * profiles, invites, requests, subscriptions, linked Google/Apple sign-ins,
 * push tokens, and their uploaded images. Required by both app stores.
 *
 * Admins are refused: they are created by hand and removed the same way.
 */
export async function deleteAccount(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, role: true } });
  if (!user) {
    getLogger().warn({ userId }, "deleteAccount: rejected — no such user (already deleted?)");
    throw new Error("USER_NOT_FOUND");
  }
  if (user.role === "ADMIN") {
    getLogger().warn({ userId }, "deleteAccount: rejected — admin accounts are not self-deletable");
    throw new Error("ADMIN_ACCOUNT");
  }

  // A coach's current clients are told afterwards; collected first, while the rows exist.
  const clientIds =
    user.role === "COACH"
      ? (
          await prisma.coachClientInvite.findMany({
            where: { coachId: userId, status: "ACCEPTED", clientId: { not: null } },
            select: { clientId: true },
          })
        ).flatMap((invite) => (invite.clientId ? [invite.clientId] : []))
      : [];

  // Also collected first: once the rows are gone, these keys are only findable by listing the bucket.
  const imageKeys = await collectImageKeys(userId);

  await prisma.$transaction(async (tx) => {
    // PlanAssignment's coach and client relations have no cascade, so they go
    // first (their check-ins cascade with them). Plans the user wrote go too;
    // shared default plans (no author) stay.
    await tx.planAssignment.deleteMany({ where: { OR: [{ coachId: userId }, { clientId: userId }] } });
    await tx.plan.deleteMany({ where: { createdById: userId } });
    // Invites that name them by id or by address: the address is theirs too.
    await tx.coachClientInvite.deleteMany({ where: { OR: [{ clientId: userId }, { clientEmail: user.email }] } });
    await tx.earlyAccessSignup.deleteMany({ where: { email: user.email } });
    // Everything else cascades from the user row: profiles, weigh-ins,
    // subscriptions, requests, sent invites, accounts, reset codes, push tokens.
    await tx.user.delete({ where: { id: userId } });
  });
  getLogger().info({ userId, role: user.role }, "deleteAccount: account and its data deleted");

  // After the commit, and never fatal: the account is gone either way, and a
  // leftover image under a deleted user's prefix is unreachable through the API.
  try {
    const removed = await deleteUserObjects(userId, imageKeys);
    getLogger().info({ userId, removed }, "deleteAccount: uploaded images deleted");
  } catch (error) {
    getLogger().error({ err: error, userId }, "deleteAccount: could not delete uploaded images — remove users/<id>/ by hand");
  }

  if (clientIds.length > 0) void notifyUsers(clientIds, messages.coachLeft(user.name));
}

/**
 * Every S3 key the database holds for images this user uploaded: avatars,
 * progress photos, meal photos on their check-ins, and images on their own
 * library entries.
 */
async function collectImageKeys(userId: string): Promise<string[]> {
  const [coachProfile, clientProfile, weights, checkIns, exercises, dietItems] = await Promise.all([
    prisma.coachProfile.findUnique({ where: { userId }, select: { avatarKey: true } }),
    prisma.clientProfile.findUnique({ where: { userId }, select: { avatarKey: true } }),
    prisma.weightEntry.findMany({ where: { clientId: userId, photoKey: { not: null } }, select: { photoKey: true } }),
    prisma.checkIn.findMany({ where: { assignment: { clientId: userId } }, select: { photoKeys: true } }),
    prisma.exercise.findMany({ where: { createdById: userId, imageKey: { not: null } }, select: { imageKey: true } }),
    prisma.dietItem.findMany({ where: { createdById: userId, imageKey: { not: null } }, select: { imageKey: true } }),
  ]);

  const checkInKeys = checkIns.flatMap(({ photoKeys }) =>
    photoKeys && typeof photoKeys === "object" && !Array.isArray(photoKeys)
      ? Object.values(photoKeys).filter((value): value is string => typeof value === "string")
      : [],
  );
  return [
    coachProfile?.avatarKey,
    clientProfile?.avatarKey,
    ...weights.map((entry) => entry.photoKey),
    ...checkInKeys,
    ...exercises.map((exercise) => exercise.imageKey),
    ...dietItems.map((item) => item.imageKey),
  ].filter((key): key is string => typeof key === "string" && key.length > 0);
}

/**
 * The signed-in user as the database has them now. A token outlives the
 * account it was issued for (deleted accounts, for one), so /me checks the row
 * rather than echoing the token — the apps call it on start to restore a session.
 */
export async function getCurrentUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, role: true } });
}
