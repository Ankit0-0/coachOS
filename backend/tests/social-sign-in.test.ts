import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "../src/config/prisma.config.js";
import { verifyAppleIdentityToken } from "../src/utils/apple-identity.js";
import { verifyGoogleIdToken } from "../src/utils/google-identity.js";
import { api, cleanupUser, registerUser } from "./helpers.js";

// Google and Apple are stood in for: these tests are about what the backend
// does with a verified identity, not about the providers' signatures.
vi.mock("../src/utils/google-identity.js", () => ({ verifyGoogleIdToken: vi.fn() }));
vi.mock("../src/utils/apple-identity.js", () => ({ verifyAppleIdentityToken: vi.fn() }));

const google = vi.mocked(verifyGoogleIdToken);
const apple = vi.mocked(verifyAppleIdentityToken);

const userIds: string[] = [];
let counter = 0;

function identity(prefix: string) {
  counter += 1;
  return { sub: `${prefix}-sub-${Date.now()}-${counter}`, email: `${prefix}-${Date.now()}-${counter}@vitest.local` };
}

function remember(body: { user?: { id?: string } }) {
  if (body.user?.id) userIds.push(body.user.id);
}

describe("sign in with Google and Apple", () => {
  beforeEach(() => {
    google.mockReset();
    apple.mockReset();
  });

  afterAll(async () => {
    for (const id of userIds) await cleanupUser(id);
  });

  describe("POST /v1/auth/google", () => {
    it("creates a new coach as PENDING, so the admin sees them in the approval queue", async () => {
      const who = identity("g-coach");
      google.mockResolvedValue({ ...who, emailVerified: true, name: "Gia Coach" });

      const res = await api.post("/v1/auth/google").send({ idToken: "token", role: "COACH" });

      expect(res.status).toBe(200);
      remember(res.body);
      expect(res.body.user).toMatchObject({ email: who.email, name: "Gia Coach", role: "COACH" });
      const stored = await prisma.user.findUnique({ where: { id: res.body.user.id } });
      expect(stored?.coachApprovalStatus).toBe("PENDING");
    });

    it("creates a client with no approval status, and signs the same person in again by Google's id", async () => {
      const who = identity("g-client");
      google.mockResolvedValue({ ...who, emailVerified: true });

      const first = await api.post("/v1/auth/google").send({ idToken: "token" });
      expect(first.status).toBe(200);
      remember(first.body);
      expect(first.body.user.role).toBe("CLIENT");
      expect((await prisma.user.findUnique({ where: { id: first.body.user.id } }))?.coachApprovalStatus).toBeNull();

      const again = await api.post("/v1/auth/google").send({ idToken: "token" });
      expect(again.status).toBe(200);
      expect(again.body.user.id).toBe(first.body.user.id);
      expect(await prisma.account.count({ where: { userId: first.body.user.id } })).toBe(1);
    });

    it("links Google to an existing password account with the same address instead of making a second user", async () => {
      const existing = await registerUser("CLIENT", "g-link");
      userIds.push(existing.id);
      google.mockResolvedValue({ sub: `g-link-${Date.now()}`, email: existing.email, emailVerified: true });

      const res = await api.post("/v1/auth/google").send({ idToken: "token" });

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(existing.id);
    });

    it("refuses an unverified email and a token Google rejects, with 401 either way", async () => {
      google.mockResolvedValueOnce({ ...identity("g-unverified"), emailVerified: false });
      expect((await api.post("/v1/auth/google").send({ idToken: "token" })).status).toBe(401);

      google.mockRejectedValueOnce(new Error("Wrong recipient, payload audience != requiredAudience"));
      expect((await api.post("/v1/auth/google").send({ idToken: "token" })).status).toBe(401);
    });

    it("never creates an admin, whatever the body asks for", async () => {
      google.mockResolvedValue({ ...identity("g-admin"), emailVerified: true });
      const res = await api.post("/v1/auth/google").send({ idToken: "token", role: "ADMIN" });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /v1/auth/apple", () => {
    it("creates the user on first sign-in with the name the app passes, then finds them by Apple's id without an email", async () => {
      const who = identity("a-client");
      apple.mockResolvedValueOnce({ ...who, emailVerified: true });

      const first = await api.post("/v1/auth/apple").send({ identityToken: "token", name: "Ana Apple" });
      expect(first.status).toBe(200);
      remember(first.body);
      expect(first.body.user).toMatchObject({ email: who.email, name: "Ana Apple", role: "CLIENT" });

      // Apple leaves the email out of every token after the first.
      apple.mockResolvedValueOnce({ sub: who.sub, emailVerified: false });
      const again = await api.post("/v1/auth/apple").send({ identityToken: "token" });
      expect(again.status).toBe(200);
      expect(again.body.user.id).toBe(first.body.user.id);
    });

    it("creates a coach as PENDING", async () => {
      apple.mockResolvedValue({ ...identity("a-coach"), emailVerified: true });
      const res = await api.post("/v1/auth/apple").send({ identityToken: "token", role: "COACH" });
      expect(res.status).toBe(200);
      remember(res.body);
      expect((await prisma.user.findUnique({ where: { id: res.body.user.id } }))?.coachApprovalStatus).toBe("PENDING");
    });

    it("refuses a first sign-in that carries no email, and a token Apple's check rejects", async () => {
      apple.mockResolvedValueOnce({ sub: `a-unknown-${Date.now()}`, emailVerified: false });
      expect((await api.post("/v1/auth/apple").send({ identityToken: "token" })).status).toBe(401);

      apple.mockRejectedValueOnce(new Error("jwt audience invalid"));
      expect((await api.post("/v1/auth/apple").send({ identityToken: "token" })).status).toBe(401);
    });

    it("rejects a body without a token", async () => {
      expect((await api.post("/v1/auth/apple").send({})).status).toBe(400);
    });
  });
});
