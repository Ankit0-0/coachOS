import { createHash, randomInt } from "node:crypto";

/**
 * Excludes characters people misread when copying a code by hand:
 * 0/O and 1/I/L. 29 symbols over 8 characters is ~1.7e11 combinations,
 * and the attempt limit on each token is what actually stops guessing.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const RESET_CODE_LENGTH = 8;

export function generateResetCode(): string {
  let code = "";
  for (let index = 0; index < RESET_CODE_LENGTH; index += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

/**
 * Plain SHA-256 rather than the scrypt in utils/password.ts. Scrypt is
 * deliberately slow to make low-entropy human passwords expensive to attack;
 * a random code from this alphabet has no such weakness, so the cost would
 * buy nothing and just add latency to every verification.
 */
export function hashResetCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}
