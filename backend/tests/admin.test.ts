import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../src/config/prisma.config.js";
import {
  api,
  cleanupUser,
  createAcceptedInvite,
  createAdmin,
  registerPendingCoach,
  registerUser,
  VALID_DIET_CONTENT,
  VALID_WORKOUT_CONTENT,
  type TestUser,
} from "./helpers.js";

describe("admin endpoints", () => {
  let admin: TestUser;
  let coach: TestUser;
  let pendingCoach: TestUser;
  let client: TestUser;
  const createdPlanIds: string[] = [];

  beforeAll(async () => {
    admin = await createAdmin("adm");
    coach = await registerUser("COACH", "admcoach");
    pendingCoach = await registerPendingCoach("admpending");
    client = await registerUser("CLIENT", "admclient");
    await createAcceptedInvite(coach, client);
  });

  afterAll(async () => {
    // Straight through Prisma rather than the admin route: a library plan with
    // an active assignment answers 409 by design, and `cleanupUser` only
    // reclaims plans with an owner — defaults have none — so going through the
    // API here would leave rows behind in the dev database.
    for (const id of createdPlanIds) {
      const assignments = await prisma.planAssignment.findMany({ where: { planId: id }, select: { id: true } });
      await prisma.checkIn.deleteMany({ where: { assignmentId: { in: assignments.map((a) => a.id) } } });
      await prisma.planAssignment.deleteMany({ where: { planId: id } });
      await prisma.plan.deleteMany({ where: { id } });
    }
    await cleanupUser(admin.id);
    await cleanupUser(coach.id);
    await cleanupUser(pendingCoach.id);
    await cleanupUser(client.id);
  });

  async function createDefaultPlan(type: "WORKOUT" | "DIET", title: string) {
    const res = await api
      .post("/v1/admin/plans")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ type, title, content: type === "WORKOUT" ? VALID_WORKOUT_CONTENT : VALID_DIET_CONTENT });
    if (res.status === 201) createdPlanIds.push(res.body.plan.id as string);
    return res;
  }

  describe("authorisation", () => {
    it("returns 403 to a coach", async () => {
      const res = await api.get("/v1/admin/coaches").set("Authorization", `Bearer ${coach.token}`);
      expect(res.status).toBe(403);
    });

    it("returns 403 to a client", async () => {
      const res = await api.get("/v1/admin/coaches").set("Authorization", `Bearer ${client.token}`);
      expect(res.status).toBe(403);
    });

    it("returns 401 without a token", async () => {
      const res = await api.get("/v1/admin/coaches");
      expect(res.status).toBe(401);
    });

    it("returns 403 to a coach trying to write a library plan", async () => {
      const res = await api
        .post("/v1/admin/plans")
        .set("Authorization", `Bearer ${coach.token}`)
        .send({ type: "WORKOUT", title: "Coach-authored default", content: VALID_WORKOUT_CONTENT });

      expect(res.status).toBe(403);
    });
  });

  describe("GET /v1/admin/coaches", () => {
    it("lists coaches with their approval status and client count", async () => {
      const res = await api.get("/v1/admin/coaches").set("Authorization", `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      const listed = res.body.coaches.find((row: { id: string }) => row.id === coach.id);
      expect(listed).toBeDefined();
      expect(listed.approvalStatus).toBe("APPROVED");
      expect(listed.email).toBe(coach.email);
      expect(listed.clientCount).toBe(1);
    });

    it("counts only accepted invites as clients", async () => {
      // A pending invite is not a client yet.
      const bystander = await registerUser("CLIENT", "admbystander");
      try {
        await api
          .post("/v1/coach/invites")
          .set("Authorization", `Bearer ${coach.token}`)
          .send({ clientEmail: bystander.email });

        const res = await api.get("/v1/admin/coaches").set("Authorization", `Bearer ${admin.token}`);
        const listed = res.body.coaches.find((row: { id: string }) => row.id === coach.id);
        expect(listed.clientCount).toBe(1);
      } finally {
        await cleanupUser(bystander.id);
      }
    });

    it("filters by status", async () => {
      const res = await api
        .get("/v1/admin/coaches")
        .query({ status: "PENDING" })
        .set("Authorization", `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.coaches.length).toBeGreaterThan(0);
      expect(
        res.body.coaches.every((row: { approvalStatus: string }) => row.approvalStatus === "PENDING"),
      ).toBe(true);
      expect(res.body.coaches.some((row: { id: string }) => row.id === pendingCoach.id)).toBe(true);
      expect(res.body.coaches.some((row: { id: string }) => row.id === coach.id)).toBe(false);
    });

    it("never lists clients or admins as coaches", async () => {
      const res = await api.get("/v1/admin/coaches").set("Authorization", `Bearer ${admin.token}`);
      const ids = res.body.coaches.map((row: { id: string }) => row.id);

      expect(ids).not.toContain(client.id);
      expect(ids).not.toContain(admin.id);
    });

    it("rejects an unrecognised status filter", async () => {
      const res = await api
        .get("/v1/admin/coaches")
        .query({ status: "MAYBE" })
        .set("Authorization", `Bearer ${admin.token}`);

      expect(res.status).toBe(400);
    });
  });

  describe("GET /v1/admin/coaches/:id", () => {
    it("returns the coach with their client roster", async () => {
      const res = await api
        .get(`/v1/admin/coaches/${coach.id}`)
        .set("Authorization", `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.coach.email).toBe(coach.email);
      expect(res.body.coach.clientCount).toBe(1);
      expect(res.body.coach.clients).toHaveLength(1);
      expect(res.body.coach.clients[0].email).toBe(client.email);
      expect(res.body.coach.clients[0].id).toBe(client.id);
    });

    it("returns 404 for an id that isn't a coach", async () => {
      const res = await api
        .get(`/v1/admin/coaches/${client.id}`)
        .set("Authorization", `Bearer ${admin.token}`);

      expect(res.status).toBe(404);
    });

    it("returns 404 for an id that does not exist", async () => {
      const res = await api.get("/v1/admin/coaches/nobody").set("Authorization", `Bearer ${admin.token}`);
      expect(res.status).toBe(404);
    });
  });

  describe("approve and reject", () => {
    it("approves a pending coach", async () => {
      const res = await api
        .post(`/v1/admin/coaches/${pendingCoach.id}/approve`)
        .set("Authorization", `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.coach.approvalStatus).toBe("APPROVED");
    });

    it("rejects a coach", async () => {
      const res = await api
        .post(`/v1/admin/coaches/${pendingCoach.id}/reject`)
        .set("Authorization", `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.coach.approvalStatus).toBe("REJECTED");
    });

    it("can approve again after a rejection", async () => {
      const res = await api
        .post(`/v1/admin/coaches/${pendingCoach.id}/approve`)
        .set("Authorization", `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.coach.approvalStatus).toBe("APPROVED");
    });

    it("returns 404 when approving something that isn't a coach", async () => {
      const res = await api
        .post(`/v1/admin/coaches/${client.id}/approve`)
        .set("Authorization", `Bearer ${admin.token}`);

      expect(res.status).toBe(404);
    });
  });

  describe("default plan management", () => {
    it("creates a plan that is a shared default owned by nobody", async () => {
      const res = await createDefaultPlan("WORKOUT", "Admin library workout");

      expect(res.status).toBe(201);
      expect(res.body.plan.isDefault).toBe(true);
      // Unowned on purpose: the library belongs to the platform, not to the
      // admin who typed it in.
      expect(res.body.plan.createdById).toBeNull();
    });

    it("is not bound by the coaches' 10-per-type cap", async () => {
      for (let i = 0; i < 11; i += 1) {
        const res = await createDefaultPlan("DIET", `Library diet ${i + 1}`);
        expect(res.status).toBe(201);
      }
    });

    it("lists defaults of the requested type only", async () => {
      const res = await api
        .get("/v1/admin/plans")
        .query({ type: "WORKOUT" })
        .set("Authorization", `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.plans.length).toBeGreaterThan(0);
      expect(res.body.plans.every((plan: { type: string }) => plan.type === "WORKOUT")).toBe(true);
      expect(res.body.plans.every((plan: { isDefault: boolean }) => plan.isDefault)).toBe(true);
    });

    it("edits a default plan", async () => {
      const created = await createDefaultPlan("WORKOUT", "Before admin edit");
      const planId = created.body.plan.id as string;

      const res = await api
        .patch(`/v1/admin/plans/${planId}`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ title: "After admin edit" });

      expect(res.status).toBe(200);
      expect(res.body.plan.title).toBe("After admin edit");
    });

    it("refuses content that doesn't match the plan's type", async () => {
      const created = await createDefaultPlan("WORKOUT", "Type guard");
      const planId = created.body.plan.id as string;

      const res = await api
        .patch(`/v1/admin/plans/${planId}`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ content: VALID_DIET_CONTENT });

      expect(res.status).toBe(400);
    });

    it("deletes an unassigned default plan", async () => {
      const created = await createDefaultPlan("DIET", "Disposable library plan");
      const planId = created.body.plan.id as string;

      const res = await api
        .delete(`/v1/admin/plans/${planId}`)
        .set("Authorization", `Bearer ${admin.token}`);

      expect(res.status).toBe(204);
    });

    it("refuses to delete a default plan a client is actively on", async () => {
      const created = await createDefaultPlan("WORKOUT", "Library plan in use");
      const planId = created.body.plan.id as string;

      const assigned = await api
        .post("/v1/coach/assignments")
        .set("Authorization", `Bearer ${coach.token}`)
        .send({ clientId: client.id, planId });
      expect(assigned.status).toBe(201);

      const res = await api
        .delete(`/v1/admin/plans/${planId}`)
        .set("Authorization", `Bearer ${admin.token}`);

      // Defaults get assigned like any other plan, so they need the same guard.
      expect(res.status).toBe(409);
    });

    it("returns 404 when editing a coach's own plan through the admin route", async () => {
      const coachPlan = await api
        .post("/v1/coach/plans")
        .set("Authorization", `Bearer ${coach.token}`)
        .send({ type: "WORKOUT", title: "A coach's private plan", content: VALID_WORKOUT_CONTENT });

      const res = await api
        .patch(`/v1/admin/plans/${coachPlan.body.plan.id}`)
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ title: "Admin reaching too far" });

      // The admin plan routes are for the shared library only.
      expect(res.status).toBe(404);
    });
  });

  describe("what a coach sees of the library", () => {
    it("surfaces an admin-created default in the coach's own plan list", async () => {
      const created = await createDefaultPlan("WORKOUT", "Shows up for coaches");
      const planId = created.body.plan.id as string;

      const res = await api
        .get("/v1/coach/plans")
        .query({ type: "WORKOUT" })
        .set("Authorization", `Bearer ${coach.token}`);

      // This is what the Explore Plans screens read, with no change needed
      // there: they already list every isDefault plan.
      expect(res.body.defaults.some((plan: { id: string }) => plan.id === planId)).toBe(true);
      expect(res.body.own.some((plan: { id: string }) => plan.id === planId)).toBe(false);
    });
  });
});
