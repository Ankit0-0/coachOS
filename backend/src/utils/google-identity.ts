import { OAuth2Client } from "google-auth-library";

import { env } from "../config/env.js";

const googleClient = new OAuth2Client(env.googleClientId);

export type GoogleIdentity = { sub: string; email: string; emailVerified: boolean; name?: string };

/**
 * Verifies a Google id_token against every configured client ID (web, iOS,
 * Android each mint tokens for their own). Throws if the signature, issuer,
 * expiry or audience is wrong; returns null if the token lacks a subject or
 * an email. Its own module so tests can stand in for Google.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity | null> {
  const ticket = await googleClient.verifyIdToken({ idToken, audience: env.googleClientAudiences });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) return null;
  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === true,
    ...(payload.name ? { name: payload.name } : {}),
  };
}
