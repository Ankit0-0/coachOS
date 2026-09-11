import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  api,
  cleanupUser,
  createAdmin,
  registerPendingCoach,
  registerUser,
  VALID_WORKOUT_CONTENT,
  type TestUser,
} from "./helpers.js";

/** 423 Locked: the account is real, it just isn't cleared to act yet. */
const NOT_APPROVED = 423;

describe("coach approval gate", () => {
  let pendingCoach: TestUser;
  let approvedCoach: TestUser;
  let client: TestUser;

  beforeAll(async () => {
    pendingCoach = await registerPendingCoach("gatepending");
    approvedCoach = await registerUser("COACH", "gateapproved");
    client = await registerUser("CLIENT", "gateclient");
  });

  afterAll(async () => {
    await cleanupUser(pendingCoach.id);
    await cleanupUser(approvedCoach.id);
    await cleanupUser(client.id);
  });

  describe("registration", () => {
    it("puts a newly registered coach in PENDING", async () => {
      const res = await api
        .get("/v1/coach/profile")
        .set("Authorization", `Bearer ${pendingCoach.token}`);

      expect(res.status).toBe(200);
      expect(res.body.profile.approvalStatus).toBe("PENDING");
    });

    it("leaves a client with no approval status at all", async () => {
      const res = await api.get("/v1/client/profile").set("Authorization", `Bearer ${client.token}`);

      expect(res.status).toBe(200);
      // Approval is a coach concept; a client has nothing to be approved for.
      expect(res.body.profile.approvalStatus).toBeUndefined();
    });

    it("refuses to register an ADMIN through the public route", async () => {
      const res = await api.post("/v1/auth/register").send({
        email: `selfmadeadmin-${Date.now()}@vitest.local`,
        password: "password123",
        name: "Self Made Admin",
        role: "ADMIN",
      });

      // Admins exist only via scripts/create-admin.ts.
      expect(res.status).toBe(400);
    });
  });

  describe("what a pending coach still may do", () => {
    it("can log in", async () => {
      const res = await api
        .post("/v1/auth/login")
        .send({ email: pendingCoach.email, password: "password123" });

      expect(res.status).toBe(200);
    });

    it("can read their own profile, which is how the app explains the empty state", async () => {
      const res = await api.get("/v1/coach/profile").set("Authorization", `Bearer ${pendingCoach.token}`);
      expect(res.status).toBe(200);
    });

    it("can edit their own profile while they wait", async () => {
      const res = await api
        .patch("/v1/coach/profile")
        .set("Authorization", `Bearer ${pendingCoach.token}`)
        .send({ bio: "Getting set up." });

      expect(res.status).toBe(200);
    });

    it("can list their (empty) plans without being blocked", async () => {
      const res = await api
        .get("/v1/coach/plans")
        .query({ type: "WORKOUT" })
        .set("Authorization", `Bearer ${pendingCoach.token}`);

      // Reading is not acting — the gate is on creating.
      expect(res.status).toBe(200);
    });
  });

  describe("what a pending coach may not do", () => {
    it("cannot invite a client", async () => {
      const res = await api
        .post("/v1/coach/invites")
        .set("Authorization", `Bearer ${pendingCoach.token}`)
        .send({ clientEmail: client.email });

      expect(res.status).toBe(NOT_APPROVED);
    });

    it("cannot create a plan", async () => {
      const res = await api
        .post("/v1/coach/plans")
        .set("Authorization", `Bearer ${pendingCoach.token}`)
        .send({ type: "WORKOUT", title: "Too early", content: VALID_WORKOUT_CONTENT });

      expect(res.status).toBe(NOT_APPROVED);
    });

    it("answers with a status distinct from an ordinary permission failure", async () => {
      const notApproved = await api
        .post("/v1/coach/invites")
        .set("Authorization", `Bearer ${pendingCoach.token}`)
        .send({ clientEmail: client.email });

      // A client hitting a coach route is the generic 403 case. If these ever
      // collapse to the same code, the app can't tell "wait for approval"
      // apart from "you shouldn't be here at all".
      const wrongRole = await api
        .post("/v1/coach/invites")
        .set("Authorization", `Bearer ${client.token}`)
        .send({ clientEmail: "someone@example.com" });

      expect(wrongRole.status).toBe(403);
      expect(notApproved.status).not.toBe(wrongRole.status);
    });
  });

  describe("after an admin approves them", () => {
    it("lets the same coach do what it just refused", async () => {
      const beforeApproval = await api
        .post("/v1/coach/plans")
        .set("Authorization", `Bearer ${pendingCoach.token}`)
        .send({ type: "WORKOUT", title: "Before approval", content: VALID_WORKOUT_CONTENT });
      expect(beforeApproval.status).toBe(NOT_APPROVED);

      const admin = await createAdmin("gateadmin");
      try {
        const approved = await api
          .post(`/v1/admin/coaches/${pendingCoach.id}/approve`)
          .set("Authorization", `Bearer ${admin.token}`);
        expect(approved.status).toBe(200);

        // The same token as before: approval takes effect without re-login,
        // because the check reads the database rather than the JWT.
        const afterApproval = await api
          .post("/v1/coach/plans")
          .set("Authorization", `Bearer ${pendingCoach.token}`)
          .send({ type: "WORKOUT", title: "After approval", content: VALID_WORKOUT_CONTENT });

        expect(afterApproval.status).toBe(201);
      } finally {
        await cleanupUser(admin.id);
      }
    });

    it("blocks a coach an admin has rejected", async () => {
      const admin = await createAdmin("gateadmin2");
      try {
        await api
          .post(`/v1/admin/coaches/${approvedCoach.id}/reject`)
          .set("Authorization", `Bearer ${admin.token}`);

        const res = await api
          .post("/v1/coach/plans")
          .set("Authorization", `Bearer ${approvedCoach.token}`)
          .send({ type: "WORKOUT", title: "Rejected coach's plan", content: VALID_WORKOUT_CONTENT });

        expect(res.status).toBe(NOT_APPROVED);
      } finally {
        await cleanupUser(admin.id);
      }
    });
  });
});
