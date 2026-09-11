import { afterAll, describe, expect, it } from "vitest";

import { api, cleanupUser, registerUser, type TestUser } from "./helpers.js";

const PASSWORD = "password123";

/**
 * The layer every other test file leans on through `registerUser`, but which
 * nothing verified directly until now.
 */
describe("auth: register and login", () => {
  const createdUserIds: string[] = [];

  /** Registers through the route under test so the response can be asserted on. */
  async function register(role: "COACH" | "CLIENT", email: string, name: string) {
    const res = await api.post("/v1/auth/register").send({ email, password: PASSWORD, name, role });
    if (res.status === 201) createdUserIds.push(res.body.user.id as string);
    return res;
  }

  function uniqueEmail(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@vitest.local`;
  }

  afterAll(async () => {
    for (const id of createdUserIds) {
      await cleanupUser(id);
    }
  });

  describe("POST /v1/auth/register", () => {
    it("creates a coach and returns the user with an access token", async () => {
      const email = uniqueEmail("authcoach");
      const res = await register("COACH", email, "Auth Coach");

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe(email);
      expect(res.body.user.name).toBe("Auth Coach");
      expect(res.body.user.role).toBe("COACH");
      expect(typeof res.body.accessToken).toBe("string");
      expect(res.body.accessToken.length).toBeGreaterThan(0);
    });

    it("creates a client with the CLIENT role it was asked for", async () => {
      const res = await register("CLIENT", uniqueEmail("authclient"), "Auth Client");

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe("CLIENT");
    });

    it("never returns the password, hashed or otherwise", async () => {
      const res = await register("CLIENT", uniqueEmail("authnopw"), "No Password Echo");

      expect(res.status).toBe(201);
      expect(res.body.user.password).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain(PASSWORD);
    });

    it("rejects a second registration for the same email", async () => {
      const email = uniqueEmail("authdupe");
      const first = await register("CLIENT", email, "First Claim");
      expect(first.status).toBe(201);

      // Being specific is fine here: the caller is claiming an address they
      // are actively typing in, so this leaks nothing they don't already know.
      const second = await register("CLIENT", email, "Second Claim");
      expect(second.status).toBe(409);
    });

    it("rejects a password under the 8-character minimum", async () => {
      const res = await api
        .post("/v1/auth/register")
        .send({ email: uniqueEmail("authshort"), password: "short", name: "Short", role: "CLIENT" });

      expect(res.status).toBe(400);
    });

    it("rejects a malformed email", async () => {
      const res = await api
        .post("/v1/auth/register")
        .send({ email: "not-an-email", password: PASSWORD, name: "Bad Email", role: "CLIENT" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /v1/auth/login", () => {
    it("returns a token that actually authorises a request", async () => {
      const client: TestUser = await registerUser("CLIENT", "authlogin");
      createdUserIds.push(client.id);

      const res = await api.post("/v1/auth/login").send({ email: client.email, password: PASSWORD });
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(client.email);
      expect(typeof res.body.accessToken).toBe("string");

      // A token is only proof of anything if a guarded endpoint accepts it.
      const authorised = await api
        .get("/v1/client/profile")
        .set("Authorization", `Bearer ${res.body.accessToken}`);
      expect(authorised.status).toBe(200);
      expect(authorised.body.profile.email).toBe(client.email);
    });

    it("issues a coach a token that opens the coach-scoped endpoint", async () => {
      const coach: TestUser = await registerUser("COACH", "authlogincoach");
      createdUserIds.push(coach.id);

      const res = await api.post("/v1/auth/login").send({ email: coach.email, password: PASSWORD });
      expect(res.status).toBe(200);

      const authorised = await api
        .get("/v1/coach/profile")
        .set("Authorization", `Bearer ${res.body.accessToken}`);
      expect(authorised.status).toBe(200);
      expect(authorised.body.profile.role).toBe("COACH");
    });

    it("rejects the right email with the wrong password", async () => {
      const client = await registerUser("CLIENT", "authwrongpw");
      createdUserIds.push(client.id);

      const res = await api
        .post("/v1/auth/login")
        .send({ email: client.email, password: "definitely-not-the-password" });

      expect(res.status).toBe(401);
    });

    it("rejects an email that was never registered", async () => {
      const res = await api
        .post("/v1/auth/login")
        .send({ email: uniqueEmail("authnobody"), password: PASSWORD });

      expect(res.status).toBe(401);
    });

    it("answers identically whether the password was wrong or the account does not exist", async () => {
      const client = await registerUser("CLIENT", "authprobe");
      createdUserIds.push(client.id);

      const wrongPassword = await api
        .post("/v1/auth/login")
        .send({ email: client.email, password: "wrong-password-entirely" });
      const unknownEmail = await api
        .post("/v1/auth/login")
        .send({ email: uniqueEmail("authunknown"), password: PASSWORD });

      // If these ever diverge, login becomes an oracle for which addresses
      // have accounts — the same reason forgot-password is deliberately vague.
      expect(wrongPassword.status).toBe(unknownEmail.status);
      expect(wrongPassword.body).toEqual(unknownEmail.body);
    });

    it("returns no token on a failed login", async () => {
      const client = await registerUser("CLIENT", "authnotoken");
      createdUserIds.push(client.id);

      const res = await api.post("/v1/auth/login").send({ email: client.email, password: "nope-nope-nope" });

      expect(res.body.accessToken).toBeUndefined();
    });
  });
});
