import request from "supertest";

import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.config.js";

export const api = request(app);

let counter = 0;
function uniqueEmail(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@vitest.local`;
}

export type TestUser = { id: string; email: string; token: string };

export async function registerUser(role: "COACH" | "CLIENT", prefix: string): Promise<TestUser> {
  const email = uniqueEmail(prefix);
  const res = await api.post("/v1/auth/register").send({
    email,
    password: "password123",
    name: `${prefix} Test`,
    role,
  });
  if (res.status !== 201) {
    throw new Error(`Failed to register ${prefix}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { id: res.body.user.id as string, email, token: res.body.accessToken as string };
}

/** Coach invites the client and the client accepts. Returns the invite id. */
export async function createAcceptedInvite(coach: TestUser, client: TestUser): Promise<string> {
  const inviteRes = await api
    .post("/v1/coach/invites")
    .set("Authorization", `Bearer ${coach.token}`)
    .send({ clientEmail: client.email });
  if (inviteRes.status !== 201) {
    throw new Error(`Failed to create invite: ${inviteRes.status} ${JSON.stringify(inviteRes.body)}`);
  }
  const inviteId = inviteRes.body.invite.id as string;

  const acceptRes = await api
    .post(`/v1/client/invites/${inviteId}/accept`)
    .set("Authorization", `Bearer ${client.token}`);
  if (acceptRes.status !== 200) {
    throw new Error(`Failed to accept invite: ${acceptRes.status} ${JSON.stringify(acceptRes.body)}`);
  }
  return inviteId;
}

export const VALID_WORKOUT_CONTENT = {
  duration: "30 min",
  focus: "Full body strength",
  summary: "A short full body session.",
  difficulty: "Beginner",
  exercises: [{ id: "push-up", name: "Push Up", note: "Go slow", sets: 3 }],
};

export const VALID_DIET_CONTENT = {
  calories: "2,000 kcal",
  focus: "Balanced macros",
  summary: "An everyday maintenance split.",
  meals: [{ id: "breakfast", label: "Breakfast: eggs, toast, fruit" }],
};

/** Deletes a test user and everything that references it, in FK-safe order. */
export async function cleanupUser(userId: string): Promise<void> {
  const assignments = await prisma.planAssignment.findMany({
    where: { OR: [{ coachId: userId }, { clientId: userId }] },
    select: { id: true },
  });
  const assignmentIds = assignments.map((a) => a.id);
  if (assignmentIds.length > 0) {
    await prisma.checkIn.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
    await prisma.planAssignment.deleteMany({ where: { id: { in: assignmentIds } } });
  }
  await prisma.weightEntry.deleteMany({ where: { clientId: userId } });
  await prisma.plan.deleteMany({ where: { createdById: userId } });
  await prisma.coachClientInvite.deleteMany({ where: { OR: [{ coachId: userId }, { clientId: userId }] } });
  await prisma.clientProfile.deleteMany({ where: { userId } });
  await prisma.coachProfile.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}
