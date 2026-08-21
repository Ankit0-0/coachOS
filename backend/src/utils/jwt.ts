import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";

import { env } from "../config/env.js";
import { JWT_ISSUER } from "../constants/auth.js";

type TokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: Role;
};

export function createAccessToken(user: TokenPayload): string {
  const options: jwt.SignOptions = {
    subject: user.sub,
    issuer: JWT_ISSUER,
    ...(env.jwtExpiresIn
      ? { expiresIn: env.jwtExpiresIn as Exclude<jwt.SignOptions["expiresIn"], undefined> }
      : {}),
  };
  return jwt.sign({ email: user.email, name: user.name, role: user.role }, env.jwtSecret, options);
}

export function verifyAccessToken(token: string): TokenPayload {
  const payload = jwt.verify(token, env.jwtSecret, { issuer: JWT_ISSUER });
  if (typeof payload === "string" || !payload.sub || typeof payload.email !== "string" || typeof payload.name !== "string") {
    throw new Error("Invalid access token");
  }
  return { sub: payload.sub, email: payload.email, name: payload.name, role: payload.role as Role };
}
