import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  api,
  cleanupUser,
  createAcceptedInvite,
  registerUser,
  VALID_WORKOUT_CONTENT,
  type TestUser,
} from "./helpers.js";

describe("coach-scoped client read endpoints", () => {
  let coachA: TestUser;
  let coachB: TestUser;
  let client: TestUser;
  let assignmentId: string;
  const today = new Date().toISOString().slice(0, 10);

  beforeAll(async () => {
    coachA = await registerUser("COACH", "coacha");
    coachB = await registerUser("COACH", "coachb");
    client = await registerUser("CLIENT", "client");
    await createAcceptedInvite(coachA, client);

    const planRes = await api
      .post("/v1/coach/plans")
      .set("Authorization", `Bearer ${coachA.token}`)
      .send({ type: "WORKOUT", title: "Test plan", content: VALID_WORKOUT_CONTENT });
    const planId = planRes.body.plan.id as string;

    const assignRes = await api
      .post("/v1/coach/assignments")
      .set("Authorization", `Bearer ${coachA.token}`)
      .send({ clientId: client.id, planId });
    assignmentId = assignRes.body.assignment.id as string;

    // The client logs their own progress — coaches only ever read it back.
    await api
      .post("/v1/tracking/checkin")
      .set("Authorization", `Bearer ${client.token}`)
      .send({ assignmentId, date: today, completedItemIds: ["push-up-set1"], notes: "felt great" });

    await api
      .post("/v1/tracking/weight")
      .set("Authorization", `Bearer ${client.token}`)
      .send({ date: today, weightKg: 72.5 });
  });

  afterAll(async () => {
    await cleanupUser(coachA.id);
    await cleanupUser(coachB.id);
    await cleanupUser(client.id);
  });

  describe("GET /v1/coach/clients/:clientId/checkins", () => {
    it("returns the client's check-ins to a coach with an accepted invite", async () => {
      const res = await api
        .get(`/v1/coach/clients/${client.id}/checkins`)
        .query({ assignmentId, from: today, to: today })
        .set("Authorization", `Bearer ${coachA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.checkIns).toHaveLength(1);
      expect(res.body.checkIns[0].notes).toBe("felt great");
      expect(res.body.checkIns[0].completedItemIds).toEqual(["push-up-set1"]);
    });

    it("returns 403 to a coach with no accepted invite for that client", async () => {
      const res = await api
        .get(`/v1/coach/clients/${client.id}/checkins`)
        .query({ assignmentId, from: today, to: today })
        .set("Authorization", `Bearer ${coachB.token}`);

      expect(res.status).toBe(403);
    });

    it("handles a nonexistent clientId without a 500", async () => {
      const res = await api
        .get("/v1/coach/clients/does-not-exist/checkins")
        .query({ assignmentId, from: today, to: today })
        .set("Authorization", `Bearer ${coachA.token}`);

      expect(res.status).toBe(403);
    });
  });

  describe("GET /v1/coach/clients/:clientId/weight", () => {
    it("returns the client's weight entries to a coach with an accepted invite", async () => {
      const res = await api
        .get(`/v1/coach/clients/${client.id}/weight`)
        .query({ from: today, to: today })
        .set("Authorization", `Bearer ${coachA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.weightEntries).toHaveLength(1);
      expect(res.body.weightEntries[0].weightKg).toBe(72.5);
    });

    it("returns 403 to a coach with no accepted invite for that client", async () => {
      const res = await api
        .get(`/v1/coach/clients/${client.id}/weight`)
        .query({ from: today, to: today })
        .set("Authorization", `Bearer ${coachB.token}`);

      expect(res.status).toBe(403);
    });

    it("handles a nonexistent clientId without a 500", async () => {
      const res = await api
        .get("/v1/coach/clients/does-not-exist/weight")
        .query({ from: today, to: today })
        .set("Authorization", `Bearer ${coachA.token}`);

      expect(res.status).toBe(403);
    });
  });

  describe("GET /v1/coach/clients/:clientId/profile", () => {
    it("returns the client's profile to a coach with an accepted invite", async () => {
      const res = await api
        .get(`/v1/coach/clients/${client.id}/profile`)
        .set("Authorization", `Bearer ${coachA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.profile.email).toBe(client.email);
      expect(res.body.profile.name).toBe("client Test");
      // onboardedAt comes from the accepted invite's respondedAt.
      expect(res.body.profile.onboardedAt).toBeTruthy();
      // No ClientProfile row exists yet — these must come back null, not error.
      expect(res.body.profile.heightCm).toBeNull();
      expect(res.body.profile.weightKg).toBeNull();
      expect(res.body.profile.goals).toBeNull();
    });

    it("returns 403 to a coach with no accepted invite for that client", async () => {
      const res = await api
        .get(`/v1/coach/clients/${client.id}/profile`)
        .set("Authorization", `Bearer ${coachB.token}`);

      expect(res.status).toBe(403);
    });

    it("handles a nonexistent clientId without a 500", async () => {
      const res = await api
        .get("/v1/coach/clients/does-not-exist/profile")
        .set("Authorization", `Bearer ${coachA.token}`);

      expect(res.status).toBe(403);
    });
  });
});
