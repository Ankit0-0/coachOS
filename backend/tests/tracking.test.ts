import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  api,
  cleanupUser,
  createAcceptedInvite,
  registerUser,
  VALID_WORKOUT_CONTENT,
  type TestUser,
} from "./helpers.js";

/** Days relative to today, as YYYY-MM-DD. */
function day(offset: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

describe("tracking: check-ins and weight entries", () => {
  let coach: TestUser;
  let client: TestUser;
  let assignmentId: string;

  const inRange = day(-3);
  const alsoInRange = day(-2);
  const outOfRange = day(-30);

  beforeAll(async () => {
    coach = await registerUser("COACH", "trkcoach");
    client = await registerUser("CLIENT", "trkclient");
    await createAcceptedInvite(coach, client);

    const planRes = await api
      .post("/v1/coach/plans")
      .set("Authorization", `Bearer ${coach.token}`)
      .send({ type: "WORKOUT", title: "Tracking plan", content: VALID_WORKOUT_CONTENT });

    const assignRes = await api
      .post("/v1/coach/assignments")
      .set("Authorization", `Bearer ${coach.token}`)
      .send({ clientId: client.id, planId: planRes.body.plan.id });
    assignmentId = assignRes.body.assignment.id as string;
  });

  afterAll(async () => {
    await cleanupUser(coach.id);
    await cleanupUser(client.id);
  });

  function saveCheckIn(body: Record<string, unknown>) {
    return api
      .post("/v1/tracking/checkin")
      .set("Authorization", `Bearer ${client.token}`)
      .send({ assignmentId, ...body });
  }

  function listCheckIns(from: string, to: string) {
    return api
      .get("/v1/tracking/checkin")
      .query({ assignmentId, from, to })
      .set("Authorization", `Bearer ${client.token}`);
  }

  function saveWeight(body: Record<string, unknown>) {
    return api.post("/v1/tracking/weight").set("Authorization", `Bearer ${client.token}`).send(body);
  }

  function listWeights(from: string, to: string) {
    return api
      .get("/v1/tracking/weight")
      .query({ from, to })
      .set("Authorization", `Bearer ${client.token}`);
  }

  describe("check-ins", () => {
    it("reads back exactly what was submitted", async () => {
      const saved = await saveCheckIn({
        date: inRange,
        completedItemIds: ["push-up"],
        notes: "felt strong today",
      });
      expect(saved.status).toBe(200);

      const res = await listCheckIns(inRange, inRange);
      expect(res.status).toBe(200);
      expect(res.body.checkIns).toHaveLength(1);
      expect(res.body.checkIns[0].completedItemIds).toEqual(["push-up"]);
      expect(res.body.checkIns[0].notes).toBe("felt strong today");
      expect(res.body.checkIns[0].assignmentId).toBe(assignmentId);
    });

    it("overwrites rather than duplicating a second check-in for the same date", async () => {
      const second = await saveCheckIn({
        date: inRange,
        completedItemIds: ["push-up", "plank"],
        notes: "came back and finished the rest",
      });
      expect(second.status).toBe(200);

      const res = await listCheckIns(inRange, inRange);
      // One row per assignment+date, so a re-submission is a correction, not
      // a second day's worth of history.
      expect(res.body.checkIns).toHaveLength(1);
      expect(res.body.checkIns[0].completedItemIds).toEqual(["push-up", "plank"]);
      expect(res.body.checkIns[0].notes).toBe("came back and finished the rest");
    });

    it("keeps a different date as its own entry", async () => {
      await saveCheckIn({ date: alsoInRange, completedItemIds: ["plank"] });

      const res = await listCheckIns(inRange, alsoInRange);
      expect(res.body.checkIns).toHaveLength(2);
    });

    it("excludes entries outside the requested range", async () => {
      await saveCheckIn({ date: outOfRange, completedItemIds: ["push-up"] });

      const res = await listCheckIns(inRange, alsoInRange);
      const dates = res.body.checkIns.map((row: { date: string }) => row.date.slice(0, 10));
      expect(dates).not.toContain(outOfRange);
      expect(res.body.checkIns).toHaveLength(2);

      // Widening the window brings it back, proving it was stored all along.
      const wider = await listCheckIns(outOfRange, alsoInRange);
      expect(wider.body.checkIns).toHaveLength(3);
    });

    it("rejects a date that isn't YYYY-MM-DD", async () => {
      const res = await saveCheckIn({ date: "03/09/2026", completedItemIds: [] });
      expect(res.status).toBe(400);
    });

    it("returns 404 for an assignment that does not exist", async () => {
      const res = await api
        .post("/v1/tracking/checkin")
        .set("Authorization", `Bearer ${client.token}`)
        .send({ assignmentId: "no-such-assignment", date: inRange, completedItemIds: [] });

      expect(res.status).toBe(404);
    });

    it("returns 403 when checking in against someone else's assignment", async () => {
      const stranger = await registerUser("CLIENT", "trkstranger");
      try {
        const res = await api
          .post("/v1/tracking/checkin")
          .set("Authorization", `Bearer ${stranger.token}`)
          .send({ assignmentId, date: inRange, completedItemIds: ["push-up"] });

        expect(res.status).toBe(403);
      } finally {
        await cleanupUser(stranger.id);
      }
    });

    it("returns 401 without a token", async () => {
      const res = await api
        .post("/v1/tracking/checkin")
        .send({ assignmentId, date: inRange, completedItemIds: [] });

      expect(res.status).toBe(401);
    });
  });

  describe("weight entries", () => {
    it("reads back exactly what was submitted", async () => {
      const saved = await saveWeight({ date: inRange, weightKg: 80.5 });
      expect(saved.status).toBe(200);

      const res = await listWeights(inRange, inRange);
      expect(res.status).toBe(200);
      expect(res.body.weightEntries).toHaveLength(1);
      expect(res.body.weightEntries[0].weightKg).toBe(80.5);
      expect(res.body.weightEntries[0].clientId).toBe(client.id);
    });

    it("overwrites rather than duplicating a second weigh-in for the same date", async () => {
      const second = await saveWeight({ date: inRange, weightKg: 79.2 });
      expect(second.status).toBe(200);

      const res = await listWeights(inRange, inRange);
      expect(res.body.weightEntries).toHaveLength(1);
      expect(res.body.weightEntries[0].weightKg).toBe(79.2);
    });

    it("keeps a different date as its own entry", async () => {
      await saveWeight({ date: alsoInRange, weightKg: 79 });

      const res = await listWeights(inRange, alsoInRange);
      expect(res.body.weightEntries).toHaveLength(2);
    });

    it("excludes entries outside the requested range", async () => {
      await saveWeight({ date: outOfRange, weightKg: 85 });

      const res = await listWeights(inRange, alsoInRange);
      const dates = res.body.weightEntries.map((row: { date: string }) => row.date.slice(0, 10));
      expect(dates).not.toContain(outOfRange);
      expect(res.body.weightEntries).toHaveLength(2);

      const wider = await listWeights(outOfRange, alsoInRange);
      expect(wider.body.weightEntries).toHaveLength(3);
    });

    it("rejects a non-positive weight", async () => {
      const res = await saveWeight({ date: inRange, weightKg: 0 });
      expect(res.status).toBe(400);
    });

    it("returns 401 without a token", async () => {
      const res = await api.post("/v1/tracking/weight").send({ date: inRange, weightKg: 75 });
      expect(res.status).toBe(401);
    });
  });
});
