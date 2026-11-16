import { createHmac, timingSafeEqual } from "node:crypto";

/** Kurzlebiges Token, mit dem sich der Browser am Echtzeit-Dienst ausweist (PRD 14.1). */
export const REALTIME_TOKEN_TTL_MS = 60_000;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(`realtime:${payload}`).digest("base64url");
}

function requireSecret(secret: string | undefined): string {
  if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET fehlt oder ist kürzer als 32 Zeichen.");
  return secret;
}

export function createRealtimeToken(userId: string, secret: string | undefined, now = Date.now()): string {
  const payload = `${Buffer.from(userId).toString("base64url")}.${now + REALTIME_TOKEN_TTL_MS}`;
  return `${payload}.${sign(payload, requireSecret(secret))}`;
}

/** Gibt die Konto-ID zurück oder null, wenn das Token ungültig oder abgelaufen ist. */
export function verifyRealtimeToken(token: string | null, secret: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedUser, expires, signature] = parts as [string, string, string];
  const expected = Buffer.from(sign(`${encodedUser}.${expires}`, requireSecret(secret)));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (!/^\d+$/.test(expires) || Number(expires) < now) return null;
  return Buffer.from(encodedUser, "base64url").toString("utf8") || null;
}
