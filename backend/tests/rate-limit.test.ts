import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApiRateLimit, createAuthRateLimit, createPasswordResetRateLimit } from "../src/middleware/rate-limit.js";
import { createAccessToken } from "../src/utils/jwt.js";

/** A throwaway app with one limited route, so the suite's raised limits don't apply. */
function appWith(limiter: express.RequestHandler) {
  const app = express();
  app.set("trust proxy", 1);
  app.post("/", limiter, (_request, response) => {
    response.json({ ok: true });
  });
  return app;
}

describe("rate limits", () => {
  for (const [name, create] of [
    ["auth", createAuthRateLimit],
    ["password reset", createPasswordResetRateLimit],
    ["api", createApiRateLimit],
  ] as const) {
    it(`${name}: answers 429 with no body once an address uses up its budget`, async () => {
      const app = appWith(create(2));
      expect((await request(app).post("/")).status).toBe(200);
      expect((await request(app).post("/")).status).toBe(200);

      const limited = await request(app).post("/");
      expect(limited.status).toBe(429);
      expect(limited.text).toBe("");
    });
  }

  it("counts each forwarded address separately, so one visitor cannot lock out everyone behind the proxy", async () => {
    const app = appWith(createAuthRateLimit(1));
    expect((await request(app).post("/").set("X-Forwarded-For", "203.0.113.1")).status).toBe(200);
    expect((await request(app).post("/").set("X-Forwarded-For", "203.0.113.1")).status).toBe(429);
    expect((await request(app).post("/").set("X-Forwarded-For", "203.0.113.2")).status).toBe(200);
  });

  it("api: counts signed-in users separately even when they share an address", async () => {
    const app = appWith(createApiRateLimit(1));
    const tokenFor = (id: string) =>
      `Bearer ${createAccessToken({ sub: id, email: `${id}@example.com`, name: id, role: "CLIENT" })}`;
    const send = (authorization?: string) => {
      const call = request(app).post("/").set("X-Forwarded-For", "203.0.113.9");
      return authorization ? call.set("Authorization", authorization) : call;
    };

    expect((await send(tokenFor("user-a"))).status).toBe(200);
    expect((await send(tokenFor("user-a"))).status).toBe(429);
    expect((await send(tokenFor("user-b"))).status).toBe(200);
    // Anonymous callers, and invalid tokens, fall back to the address.
    expect((await send()).status).toBe(200);
    expect((await send("Bearer not-a-token")).status).toBe(429);
  });
});
