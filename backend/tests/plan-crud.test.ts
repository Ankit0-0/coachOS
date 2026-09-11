import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../src/config/prisma.config.js";
import {
  api,
  cleanupUser,
  createAcceptedInvite,
  registerUser,
  VALID_DIET_CONTENT,
  VALID_WORKOUT_CONTENT,
  type TestUser,
} from "./helpers.js";

const PLAN_LIMIT_PER_TYPE = 10;

describe("plan CRUD", () => {
  let coach: TestUser;
  let otherCoach: TestUser;
  let client: TestUser;
  /** A shared-library plan. Owned by `coach` only so cleanupUser reclaims it. */
  let defaultPlanId: string;

  beforeAll(async () => {
    coach = await registerUser("COACH", "crudcoach");
    otherCoach = await registerUser("COACH", "crudother");
    client = await registerUser("CLIENT", "crudclient");
    await createAcceptedInvite(coach, client);

    const defaultPlan = await prisma.plan.create({
      data: {
        type: "WORKOUT",
        title: "Shared library plan",
        content: VALID_WORKOUT_CONTENT,
        isDefault: true,
        createdById: coach.id,
      },
    });
    defaultPlanId = defaultPlan.id;
  });

  afterAll(async () => {
    await cleanupUser(coach.id);
    await cleanupUser(otherCoach.id);
    await cleanupUser(client.id);
  });

  function createPlan(user: TestUser, type: "WORKOUT" | "DIET", title: string) {
    return api
      .post("/v1/coach/plans")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        type,
        title,
        content: type === "WORKOUT" ? VALID_WORKOUT_CONTENT : VALID_DIET_CONTENT,
      });
  }

  describe("the per-type plan limit", () => {
    it(`allows ${PLAN_LIMIT_PER_TYPE} workout plans and refuses the next one`, async () => {
      for (let i = 0; i < PLAN_LIMIT_PER_TYPE; i += 1) {
        const res = await createPlan(coach, "WORKOUT", `Workout ${i + 1}`);
        expect(res.status).toBe(201);
      }

      const overflow = await createPlan(coach, "WORKOUT", "Workout 11");
      expect(overflow.status).toBe(409);
    });

    it("counts each type separately, so diet plans are still available at the workout cap", async () => {
      const res = await createPlan(coach, "DIET", "Diet 1");
      expect(res.status).toBe(201);
    });

    it("applies the limit per coach, not globally", async () => {
      const res = await createPlan(otherCoach, "WORKOUT", "Other coach's first workout");
      expect(res.status).toBe(201);
    });

    it("rejects content that doesn't match the declared type", async () => {
      const res = await api
        .post("/v1/coach/plans")
        .set("Authorization", `Bearer ${otherCoach.token}`)
        .send({ type: "DIET", title: "Mismatched", content: VALID_WORKOUT_CONTENT });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /v1/coach/plans", () => {
    it("splits a coach's own plans from the shared defaults", async () => {
      const res = await api
        .get("/v1/coach/plans")
        .query({ type: "WORKOUT" })
        .set("Authorization", `Bearer ${coach.token}`);

      expect(res.status).toBe(200);
      expect(res.body.own.length).toBe(PLAN_LIMIT_PER_TYPE);
      expect(res.body.own.every((plan: { isDefault: boolean }) => plan.isDefault === false)).toBe(true);
      expect(res.body.defaults.every((plan: { isDefault: boolean }) => plan.isDefault === true)).toBe(true);
      expect(res.body.defaults.some((plan: { id: string }) => plan.id === defaultPlanId)).toBe(true);
      // A default is shared, so it must never be counted as this coach's own.
      expect(res.body.own.some((plan: { id: string }) => plan.id === defaultPlanId)).toBe(false);
    });

    it("keeps another coach's plans out of both lists", async () => {
      const theirs = await createPlan(otherCoach, "DIET", "Other coach's diet plan");
      const theirPlanId = theirs.body.plan.id as string;

      const res = await api
        .get("/v1/coach/plans")
        .query({ type: "DIET" })
        .set("Authorization", `Bearer ${coach.token}`);

      expect(res.body.own.some((plan: { id: string }) => plan.id === theirPlanId)).toBe(false);
      expect(res.body.defaults.some((plan: { id: string }) => plan.id === theirPlanId)).toBe(false);
    });

    it("returns only the requested type", async () => {
      const res = await api
        .get("/v1/coach/plans")
        .query({ type: "DIET" })
        .set("Authorization", `Bearer ${coach.token}`);

      // Guarded, because `every` on an empty array would pass regardless.
      expect(res.body.own.length).toBeGreaterThan(0);
      expect(res.body.own.every((plan: { type: string }) => plan.type === "DIET")).toBe(true);
    });

    it("rejects a request with no type", async () => {
      const res = await api.get("/v1/coach/plans").set("Authorization", `Bearer ${coach.token}`);
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /v1/coach/plans/:id", () => {
    it("updates a coach's own plan and persists the change", async () => {
      const created = await createPlan(otherCoach, "WORKOUT", "Before rename");
      const planId = created.body.plan.id as string;

      const res = await api
        .patch(`/v1/coach/plans/${planId}`)
        .set("Authorization", `Bearer ${otherCoach.token}`)
        .send({ title: "After rename", description: "Now with a description" });

      expect(res.status).toBe(200);
      expect(res.body.plan.title).toBe("After rename");

      const readBack = await api
        .get(`/v1/coach/plans/${planId}`)
        .set("Authorization", `Bearer ${otherCoach.token}`);
      expect(readBack.body.plan.title).toBe("After rename");
      expect(readBack.body.plan.description).toBe("Now with a description");
    });

    it("returns 403 when editing another coach's plan", async () => {
      const created = await createPlan(otherCoach, "WORKOUT", "Not yours");
      const planId = created.body.plan.id as string;

      const res = await api
        .patch(`/v1/coach/plans/${planId}`)
        .set("Authorization", `Bearer ${coach.token}`)
        .send({ title: "Hijacked" });

      expect(res.status).toBe(403);
    });

    it("returns 403 when editing a shared default, even to the coach who owns other plans", async () => {
      const res = await api
        .patch(`/v1/coach/plans/${defaultPlanId}`)
        .set("Authorization", `Bearer ${coach.token}`)
        .send({ title: "Rewriting the library" });

      expect(res.status).toBe(403);
    });

    it("returns 404 for a plan id that does not exist", async () => {
      const res = await api
        .patch("/v1/coach/plans/no-such-plan")
        .set("Authorization", `Bearer ${coach.token}`)
        .send({ title: "Ghost" });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /v1/coach/plans/:id", () => {
    it("deletes an own plan that has no assignments", async () => {
      const created = await createPlan(otherCoach, "DIET", "Disposable");
      const planId = created.body.plan.id as string;

      const res = await api
        .delete(`/v1/coach/plans/${planId}`)
        .set("Authorization", `Bearer ${otherCoach.token}`);
      expect(res.status).toBe(204);

      const readBack = await api
        .get(`/v1/coach/plans/${planId}`)
        .set("Authorization", `Bearer ${otherCoach.token}`);
      expect(readBack.status).toBe(404);
    });

    it("refuses to delete a plan a client is actively assigned to", async () => {
      const created = await createPlan(coach, "DIET", "Currently in use");
      const planId = created.body.plan.id as string;

      const assigned = await api
        .post("/v1/coach/assignments")
        .set("Authorization", `Bearer ${coach.token}`)
        .send({ clientId: client.id, planId });
      expect(assigned.status).toBe(201);

      const res = await api
        .delete(`/v1/coach/plans/${planId}`)
        .set("Authorization", `Bearer ${coach.token}`);

      // PLAN_IN_USE — deleting it would strand the client mid-plan.
      expect(res.status).toBe(409);

      // And it is genuinely still there afterwards.
      const readBack = await api.get(`/v1/coach/plans/${planId}`).set("Authorization", `Bearer ${coach.token}`);
      expect(readBack.status).toBe(200);
    });

    it("returns 403 when deleting another coach's plan", async () => {
      const created = await createPlan(otherCoach, "WORKOUT", "Someone else's");
      const planId = created.body.plan.id as string;

      const res = await api
        .delete(`/v1/coach/plans/${planId}`)
        .set("Authorization", `Bearer ${coach.token}`);

      expect(res.status).toBe(403);
    });

    it("returns 403 when deleting a shared default", async () => {
      const res = await api
        .delete(`/v1/coach/plans/${defaultPlanId}`)
        .set("Authorization", `Bearer ${coach.token}`);

      expect(res.status).toBe(403);
    });
  });
});
