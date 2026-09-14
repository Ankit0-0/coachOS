import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { env } from "../src/config/env.js";
import { api } from "./helpers.js";

describe("CORS", () => {
  const original = env.clientUrls;

  beforeAll(() => {
    env.clientUrls = ["https://admin.coachos.test", "https://app.coachos.test"];
  });

  afterAll(() => {
    env.clientUrls = original;
  });

  function preflight(origin: string) {
    return api
      .options("/v1/health")
      .set("Origin", origin)
      .set("Access-Control-Request-Method", "GET");
  }

  it.each(["https://admin.coachos.test", "https://app.coachos.test"])(
    "allows every configured origin (%s)",
    async (origin) => {
      const res = await preflight(origin);
      expect(res.headers["access-control-allow-origin"]).toBe(origin);
    },
  );

  it("does not allow an origin outside the list", async () => {
    const res = await preflight("https://evil.example");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("does not treat a prefix of a configured origin as a match", async () => {
    const res = await preflight("https://admin.coachos.test.evil.example");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("still serves requests with no Origin, as React Native sends", async () => {
    const res = await api.get("/v1/health");
    expect(res.status).toBe(200);
  });
});
