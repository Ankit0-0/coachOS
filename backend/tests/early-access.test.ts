import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../src/config/prisma.config.js";
import { createEarlyAccessRateLimit } from "../src/features/early-access/routes.js";
import { api, cleanupUser, createAdmin, registerUser, type TestUser } from "./helpers.js";

function auth(user: TestUser) {
  return { Authorization: `Bearer ${user.token}` };
}

const emails: string[] = [];

/** A fresh address per assertion: these tests share a real database. */
function signupEmail(prefix: string): string {
  const email = `${prefix}-${Date.now()}-${emails.length}@vitest.local`;
  emails.push(email);
  return email;
}

describe("early access", () => {
  afterAll(async () => {
    await prisma.earlyAccessSignup.deleteMany({ where: { email: { in: emails } } });
  });

  describe("POST /v1/early-access", () => {
    it("takes a signup with no auth header at all and stores it", async () => {
      const email = signupEmail("ea-new");
      const res = await api.post("/v1/early-access").send({ email, platform: "IOS" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ success: true });
      const stored = await prisma.earlyAccessSignup.findUnique({ where: { email } });
      expect(stored).toMatchObject({ email, platform: "IOS" });
    });

    it("normalizes the address, so the same person cannot be listed twice", async () => {
      const email = signupEmail("ea-case");
      const res = await api.post("/v1/early-access").send({ email: `  ${email.toUpperCase()} `, platform: "ANDROID" });

      expect(res.status).toBe(201);
      expect(await prisma.earlyAccessSignup.findUnique({ where: { email } })).toMatchObject({ platform: "ANDROID" });
    });

    it("answers a repeat signup exactly like the first, and keeps one row with the new platform", async () => {
      const email = signupEmail("ea-repeat");
      const first = await api.post("/v1/early-access").send({ email, platform: "IOS" });
      const second = await api.post("/v1/early-access").send({ email, platform: "ANDROID" });

      // Identical answers: a 409 here would reveal that the address is on the list.
      expect(second.status).toBe(first.status);
      expect(second.body).toEqual(first.body);
      expect(await prisma.earlyAccessSignup.count({ where: { email } })).toBe(1);
      expect(await prisma.earlyAccessSignup.findUnique({ where: { email } })).toMatchObject({ platform: "ANDROID" });
    });

    it("rejects an address that is not one, and a platform that is not a platform", async () => {
      for (const body of [
        { email: "not-an-email", platform: "IOS" },
        { email: signupEmail("ea-bad-platform"), platform: "WINDOWS" },
        { email: signupEmail("ea-missing"), platform: undefined },
        { platform: "IOS" },
      ]) {
        expect((await api.post("/v1/early-access").send(body)).status).toBe(400);
      }
      expect(await prisma.earlyAccessSignup.count({ where: { email: { in: emails } } })).toBeLessThanOrEqual(3);
    });

    it("stops answering an address that keeps posting", async () => {
      // The suite raises the app's own limit (it makes far more than five
      // requests from one address), so the limiter is exercised on its own.
      const limited = express();
      limited.use(express.json());
      limited.post("/", createEarlyAccessRateLimit(2), (_request, response) => response.sendStatus(201));

      const agent = request(limited);
      expect((await agent.post("/").send({})).status).toBe(201);
      expect((await agent.post("/").send({})).status).toBe(201);
      expect((await agent.post("/").send({})).status).toBe(429);
    });
  });

  describe("GET /v1/admin/early-access", () => {
    let admin: TestUser;
    let coach: TestUser;
    let client: TestUser;

    beforeAll(async () => {
      admin = await createAdmin("eaadmin");
      coach = await registerUser("COACH", "eacoach");
      client = await registerUser("CLIENT", "eaclient");
      await api.post("/v1/early-access").send({ email: signupEmail("ea-list"), platform: "IOS" });
    });

    afterAll(async () => {
      for (const user of [admin, coach, client]) await cleanupUser(user.id);
    });

    it("gives an admin the list newest first, with a count per platform", async () => {
      const res = await api.get("/v1/admin/early-access").set(auth(admin));

      expect(res.status).toBe(200);
      const signups = res.body.signups as { email: string; createdAt: string }[];
      expect(signups.length).toBeGreaterThan(0);
      const dates = signups.map((row) => row.createdAt);
      expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
      expect(res.body.countsByPlatform).toMatchObject({ IOS: expect.any(Number), ANDROID: expect.any(Number) });
      expect(res.body.total).toBe(signups.length);
    });

    it("is closed to a coach, a client, and anyone without a token", async () => {
      expect((await api.get("/v1/admin/early-access").set(auth(coach))).status).toBe(403);
      expect((await api.get("/v1/admin/early-access").set(auth(client))).status).toBe(403);
      expect((await api.get("/v1/admin/early-access")).status).toBe(401);
    });
  });
});
