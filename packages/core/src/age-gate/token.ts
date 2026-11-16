import { createHmac, timingSafeEqual } from "node:crypto";

/** Eine Bestätigung gilt für eine Browser-Sitzung, höchstens aber 24 Stunden. */
export const AGE_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const AGE_COOKIE_NAME = "age_ok";

function sign(issuedAt: string, secret: string): string {
  return createHmac("sha256", secret).update(`age:${issuedAt}`).digest("base64url");
}

function requireSecret(secret: string | undefined): string {
  if (!secret || secret.length < 32) throw new Error("AGE_GATE_SECRET fehlt oder ist kürzer als 32 Zeichen.");
  return secret;
}

export function createAgeToken(secret: string | undefined, now = Date.now()): string {
  const issuedAt = String(now);
  return `${issuedAt}.${sign(issuedAt, requireSecret(secret))}`;
}

export function verifyAgeToken(token: string | undefined, secret: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [issuedAt, signature, ...rest] = token.split(".");
  if (!issuedAt || !signature || rest.length > 0 || !/^\d+$/.test(issuedAt)) return false;
  const expected = Buffer.from(sign(issuedAt, requireSecret(secret)));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  const age = now - Number(issuedAt);
  return age >= 0 && age <= AGE_TOKEN_MAX_AGE_MS;
}
