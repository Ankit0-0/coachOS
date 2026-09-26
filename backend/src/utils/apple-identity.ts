import { createPublicKey, type JsonWebKeyInput, type KeyObject } from "node:crypto";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys";
/** Apple rotates its signing keys rarely; an hour keeps a rotation from locking anyone out for long. */
const KEYS_TTL_MS = 60 * 60 * 1000;

type AppleJwk = JsonWebKeyInput["key"] & { kid: string };

let cachedKeys: { keys: Map<string, KeyObject>; fetchedAt: number } | null = null;

async function fetchKeys(): Promise<Map<string, KeyObject>> {
  const response = await fetch(APPLE_KEYS_URL);
  if (!response.ok) throw new Error(`APPLE_KEYS_UNAVAILABLE_${response.status}`);
  const body = (await response.json()) as { keys?: AppleJwk[] };
  const keys = new Map<string, KeyObject>();
  for (const jwk of body.keys ?? []) {
    keys.set(jwk.kid, createPublicKey({ key: jwk, format: "jwk" }));
  }
  cachedKeys = { keys, fetchedAt: Date.now() };
  return keys;
}

/** The key Apple signed with; refetches once when the kid is new (a rotation). */
async function keyFor(kid: string): Promise<KeyObject> {
  const fresh = cachedKeys && Date.now() - cachedKeys.fetchedAt < KEYS_TTL_MS;
  const keys = fresh && cachedKeys ? cachedKeys.keys : await fetchKeys();
  const key = keys.get(kid) ?? (fresh ? (await fetchKeys()).get(kid) : undefined);
  if (!key) throw new Error("APPLE_KEY_NOT_FOUND");
  return key;
}

export type AppleIdentity = { sub: string; email?: string; emailVerified: boolean };

/**
 * Verifies a Sign in with Apple identity token: Apple's signature, issuer,
 * expiry, and an audience that is one of our bundle IDs. Apple includes the
 * email only on the first sign-in (possibly a private relay address), so it
 * is optional here. Throws on any failure.
 */
export async function verifyAppleIdentityToken(identityToken: string): Promise<AppleIdentity> {
  const decoded = jwt.decode(identityToken, { complete: true });
  const kid = decoded && typeof decoded === "object" ? decoded.header.kid : undefined;
  if (!kid) throw new Error("APPLE_TOKEN_MALFORMED");

  const audience = env.appleBundleIds as [string, ...string[]];
  const payload = jwt.verify(identityToken, await keyFor(kid), {
    algorithms: ["RS256"],
    issuer: APPLE_ISSUER,
    audience,
  });
  if (typeof payload === "string" || !payload.sub) throw new Error("APPLE_TOKEN_MALFORMED");

  const email = typeof payload.email === "string" ? payload.email : undefined;
  // Apple sends email_verified as the string "true" in some tokens and a boolean in others.
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  return { sub: payload.sub, emailVerified, ...(email ? { email } : {}) };
}
