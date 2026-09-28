import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "../src/config/prisma.config.js";
import {
  api,
  cleanupUser,
  createAcceptedInvite,
  createAdmin,
  registerUser,
  VALID_WORKOUT_CONTENT,
  type TestUser,
} from "./helpers.js";

function auth(user: TestUser) {
  return { Authorization: `Bearer ${user.token}` };
}

const leftovers: string[] = [];

/** A coach and client with a plan, an assignment, a check-in and a weigh-in between them. */
async function coachingPair(prefix: string) {
  const coach = await registerUser("COACH", `${prefix}-coach`);
  const client = await registerUser("CLIENT", `${prefix}-client`);
  leftovers.push(coach.id, client.id);
  await createAcceptedInvite(coach, client);

  const plan = await api.post("/v1/coach/plans").set(auth(coach)).send({ type: "WORKOUT", title: "Deletable", content: VALID_WORKOUT_CONTENT });
  const assignment = await api.post("/v1/coach/assignments").set(auth(coach)).send({ clientId: client.id, planId: plan.body.plan.id });
  expect(assignment.status).toBe(201);
  const today = new Date().toISOString().slice(0, 10);
  const checkIn = await api
    .post("/v1/tracking/checkin")
    .set(auth(client))
    .send({ assignmentId: assignment.body.assignment.id, date: today, completedItemIds: [] });
  expect(checkIn.status).toBeLessThan(300);
  expect((await api.post("/v1/tracking/weight").set(auth(client)).send({ date: today, weightKg: 70 })).status).toBeLessThan(300);

  return { coach, client, planId: plan.body.plan.id as string, assignmentId: assignment.body.assignment.id as string };
}

describe("DELETE /v1/account", () => {
  afterAll(async () => {
    for (const id of leftovers) await cleanupUser(id);
  });

  it("deletes a client and everything of theirs, and leaves their coach and the coach's plan alone", async () => {
    const { coach, client, planId, assignmentId } = await coachingPair("del-c");

    const res = await api.delete("/v1/account").set(auth(client));

    expect(res.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: client.id } })).toBeNull();
    expect(await prisma.planAssignment.findUnique({ where: { id: assignmentId } })).toBeNull();
    expect(await prisma.checkIn.count({ where: { assignmentId } })).toBe(0);
    expect(await prisma.weightEntry.count({ where: { clientId: client.id } })).toBe(0);
    expect(await prisma.coachClientInvite.count({ where: { clientEmail: client.email } })).toBe(0);
    expect(await prisma.user.findUnique({ where: { id: coach.id } })).not.toBeNull();
    expect(await prisma.plan.findUnique({ where: { id: planId } })).not.toBeNull();
  });

  it("deletes a coach with the plans they wrote and their clients' assignments, and leaves the client's account", async () => {
    const { coach, client, planId, assignmentId } = await coachingPair("del-k");

    const res = await api.delete("/v1/account").set(auth(coach));

    expect(res.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: coach.id } })).toBeNull();
    expect(await prisma.plan.findUnique({ where: { id: planId } })).toBeNull();
    expect(await prisma.planAssignment.findUnique({ where: { id: assignmentId } })).toBeNull();
    expect(await prisma.user.findUnique({ where: { id: client.id } })).not.toBeNull();
  });

  it("stops the deleted user's still-unexpired token from restoring a session", async () => {
    const client = await registerUser("CLIENT", "del-me");
    leftovers.push(client.id);
    expect((await api.get("/v1/me").set(auth(client))).status).toBe(200);

    expect((await api.delete("/v1/account").set(auth(client))).status).toBe(200);

    expect((await api.get("/v1/me").set(auth(client))).status).toBe(401);
    expect((await api.delete("/v1/account").set(auth(client))).status).toBe(404);
  });

  it("refuses admins and anonymous callers", async () => {
    const admin = await createAdmin("del-admin");
    leftovers.push(admin.id);
    expect((await api.delete("/v1/account").set(auth(admin))).status).toBe(403);
    expect((await api.delete("/v1/account")).status).toBe(401);
  });
});
