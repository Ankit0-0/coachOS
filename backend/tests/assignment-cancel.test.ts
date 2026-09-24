import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../src/config/prisma.config.js";
import {
  api,
  cleanupUser,
  createAcceptedInvite,
  registerUser,
  VALID_WORKOUT_CONTENT,
  type TestUser,
} from "./helpers.js";

function auth(user: TestUser) {
  return { Authorization: `Bearer ${user.token}` };
}

describe("removing a plan from a client", () => {
  let coach: TestUser;
  let otherCoach: TestUser;
  let client: TestUser;
  let planId: string;

  async function assign(): Promise<string> {
    const res = await api
      .post("/v1/coach/assignments")
      .set(auth(coach))
      .send({ clientId: client.id, planId, startDate: "2026-09-07" });
    expect(res.status).toBe(201);
    return res.body.assignment.id as string;
  }

  beforeAll(async () => {
    coach = await registerUser("COACH", "cancelcoach");
    otherCoach = await registerUser("COACH", "cancelother");
    client = await registerUser("CLIENT", "cancelclient");
    await createAcceptedInvite(coach, client);

    const plan = await api
      .post("/v1/coach/plans")
      .set(auth(coach))
      .send({ type: "WORKOUT", title: "Cancellable", cycleLengthDays: 1, content: VALID_WORKOUT_CONTENT });
    planId = plan.body.plan.id;
  });

  afterAll(async () => {
    for (const user of [coach, otherCoach, client]) await cleanupUser(user.id);
  });

  it("cancels the assignment and keeps every check-in the client logged", async () => {
    const assignmentId = await assign();
    const saved = await api
      .post("/v1/tracking/checkin")
      .set(auth(client))
      .send({ assignmentId, date: "2026-09-10", completedItemIds: ["pushup-set1"], notes: "done" });
    expect(saved.status).toBe(200);

    const res = await api.delete(`/v1/coach/assignments/${assignmentId}`).set(auth(coach));
    expect(res.status).toBe(200);
    expect(res.body.assignment).toMatchObject({ status: "CANCELLED" });

    // The row and its history survive — only the status moved.
    expect(await prisma.planAssignment.count({ where: { id: assignmentId } })).toBe(1);
    const checkIns = await prisma.checkIn.findMany({ where: { assignmentId } });
    expect(checkIns).toHaveLength(1);
    expect(checkIns[0]).toMatchObject({ notes: "done" });

    // And the coach can still read it back.
    const history = await api
      .get(`/v1/coach/clients/${client.id}/checkins`)
      .query({ from: "2026-09-01", to: "2026-09-30" })
      .set(auth(coach));
    expect(history.body.checkIns).toHaveLength(1);
  });

  it("leaves the client with no active plan, and no schedule entry for today", async () => {
    const assignmentId = await assign();
    await api.delete(`/v1/coach/assignments/${assignmentId}`).set(auth(coach));

    const assignments = await api.get("/v1/tracking/assignments").set(auth(client));
    expect(assignments.body.assignments).toHaveLength(0);

    const today = new Date().toISOString().slice(0, 10);
    const schedule = await api.get("/v1/client/schedule").query({ from: today, to: today }).set(auth(client));
    expect(schedule.body.schedule).toEqual([]);
  });

  it("refuses a second cancellation, another coach, and an assignment that isn't there", async () => {
    const assignmentId = await assign();
    expect((await api.delete(`/v1/coach/assignments/${assignmentId}`).set(auth(coach))).status).toBe(200);
    expect((await api.delete(`/v1/coach/assignments/${assignmentId}`).set(auth(coach))).status).toBe(409);

    const fresh = await assign();
    expect((await api.delete(`/v1/coach/assignments/${fresh}`).set(auth(otherCoach))).status).toBe(403);
    expect((await api.delete(`/v1/coach/assignments/${fresh}`).set(auth(client))).status).toBe(403);
    expect((await api.delete("/v1/coach/assignments/does-not-exist").set(auth(coach))).status).toBe(404);
    expect((await api.delete(`/v1/coach/assignments/${fresh}`)).status).toBe(401);
  });
});
