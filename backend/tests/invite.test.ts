import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { api, cleanupUser, registerUser, type TestUser } from "./helpers.js";

describe("coach → client invites", () => {
  let coach: TestUser;
  let client: TestUser;
  let otherClient: TestUser;

  beforeAll(async () => {
    coach = await registerUser("COACH", "invcoach");
    client = await registerUser("CLIENT", "invclient");
    otherClient = await registerUser("CLIENT", "invother");
  });

  afterAll(async () => {
    await cleanupUser(coach.id);
    await cleanupUser(client.id);
    await cleanupUser(otherClient.id);
  });

  /** Invites `email` and returns the created invite. */
  async function invite(email: string) {
    return api
      .post("/v1/coach/invites")
      .set("Authorization", `Bearer ${coach.token}`)
      .send({ clientEmail: email });
  }

  async function coachInvites(status?: string) {
    const res = await api
      .get("/v1/coach/invites")
      .query(status ? { status } : {})
      .set("Authorization", `Bearer ${coach.token}`);
    return res.body.invites as { id: string; clientId: string | null; status: string; clientEmail: string }[];
  }

  async function clientInvites(user: TestUser, status?: string) {
    const res = await api
      .get("/v1/client/invites")
      .query(status ? { status } : {})
      .set("Authorization", `Bearer ${user.token}`);
    return res.body.invites as { id: string; status: string }[];
  }

  describe("creating an invite", () => {
    it("auto-matches an email that already belongs to a registered client", async () => {
      const res = await invite(client.email);
      expect(res.status).toBe(201);

      const invites = await coachInvites("PENDING");
      const created = invites.find((row) => row.id === res.body.invite.id);
      expect(created).toBeDefined();
      expect(created?.clientId).toBe(client.id);
      expect(created?.status).toBe("PENDING");
    });

    it("leaves clientId null for an email with no account yet", async () => {
      const unknown = `invnobody-${Date.now()}@vitest.local`;
      const res = await invite(unknown);

      expect(res.status).toBe(201);
      expect(res.body.invite.clientId).toBeNull();
      expect(res.body.invite.status).toBe("PENDING");
      expect(res.body.invite.clientEmail).toBe(unknown);
    });

    it("refuses a second invite to an email this coach has already invited", async () => {
      // The PENDING invite from the first test in this block is still open.
      const res = await invite(client.email);
      expect(res.status).toBe(409);
    });

    it("returns 403 to a client trying to send an invite", async () => {
      const res = await api
        .post("/v1/coach/invites")
        .set("Authorization", `Bearer ${client.token}`)
        .send({ clientEmail: otherClient.email });

      expect(res.status).toBe(403);
    });

    it("returns 401 without a token", async () => {
      const res = await api.post("/v1/coach/invites").send({ clientEmail: client.email });
      expect(res.status).toBe(401);
    });
  });

  describe("responding to an invite", () => {
    it("shows the invite to the client it was addressed to", async () => {
      const pending = await clientInvites(client, "PENDING");
      expect(pending.length).toBeGreaterThan(0);
    });

    it("does not show it to an unrelated client", async () => {
      const pending = await clientInvites(otherClient, "PENDING");
      expect(pending).toHaveLength(0);
    });

    it("returns 403 when a client tries to accept someone else's invite", async () => {
      const [pending] = await clientInvites(client, "PENDING");
      expect(pending).toBeDefined();

      const res = await api
        .post(`/v1/client/invites/${pending!.id}/accept`)
        .set("Authorization", `Bearer ${otherClient.token}`);

      expect(res.status).toBe(403);
    });

    it("returns 404 for an invite id that does not exist", async () => {
      const res = await api
        .post("/v1/client/invites/does-not-exist/accept")
        .set("Authorization", `Bearer ${client.token}`);

      expect(res.status).toBe(404);
    });

    it("moves the invite to ACCEPTED for both sides", async () => {
      const [pending] = await clientInvites(client, "PENDING");
      expect(pending).toBeDefined();

      const res = await api
        .post(`/v1/client/invites/${pending!.id}/accept`)
        .set("Authorization", `Bearer ${client.token}`);
      expect(res.status).toBe(200);
      expect(res.body.invite.status).toBe("ACCEPTED");

      const accepted = await coachInvites("ACCEPTED");
      expect(accepted.some((row) => row.id === pending!.id)).toBe(true);

      const stillPending = await clientInvites(client, "PENDING");
      expect(stillPending.some((row) => row.id === pending!.id)).toBe(false);
    });

    it("refuses to accept an invite that is no longer PENDING", async () => {
      const accepted = await coachInvites("ACCEPTED");
      const [already] = accepted;
      expect(already).toBeDefined();

      const res = await api
        .post(`/v1/client/invites/${already!.id}/accept`)
        .set("Authorization", `Bearer ${client.token}`);

      expect(res.status).toBe(409);
    });

    it("sets a declined invite to DECLINED and drops it from the client's pending list", async () => {
      // A fresh coach, since this coach already has an active invite to this client.
      const secondCoach = await registerUser("COACH", "invcoach2");
      try {
        const created = await api
          .post("/v1/coach/invites")
          .set("Authorization", `Bearer ${secondCoach.token}`)
          .send({ clientEmail: client.email });
        expect(created.status).toBe(201);
        const inviteId = created.body.invite.id as string;

        const res = await api
          .post(`/v1/client/invites/${inviteId}/decline`)
          .set("Authorization", `Bearer ${client.token}`);

        expect(res.status).toBe(200);
        expect(res.body.invite.status).toBe("DECLINED");

        const pending = await clientInvites(client, "PENDING");
        expect(pending.some((row) => row.id === inviteId)).toBe(false);

        const declined = await api
          .get("/v1/client/invites")
          .query({ status: "DECLINED" })
          .set("Authorization", `Bearer ${client.token}`);
        expect(declined.body.invites.some((row: { id: string }) => row.id === inviteId)).toBe(true);
      } finally {
        await cleanupUser(secondCoach.id);
      }
    });

    it("lets a coach re-invite an email whose earlier invite was declined", async () => {
      const thirdCoach = await registerUser("COACH", "invcoach3");
      try {
        const first = await api
          .post("/v1/coach/invites")
          .set("Authorization", `Bearer ${thirdCoach.token}`)
          .send({ clientEmail: client.email });
        await api
          .post(`/v1/client/invites/${first.body.invite.id}/decline`)
          .set("Authorization", `Bearer ${client.token}`);

        // Only PENDING and ACCEPTED invites block a new one, so a declined
        // invite must not lock the coach out of ever asking again.
        const second = await api
          .post("/v1/coach/invites")
          .set("Authorization", `Bearer ${thirdCoach.token}`)
          .send({ clientEmail: client.email });

        expect(second.status).toBe(201);
      } finally {
        await cleanupUser(thirdCoach.id);
      }
    });
  });
});
