import { createHmac, timingSafeEqual } from "node:crypto";
import { BUCKETS, type BucketName } from "./types";

/**
 * Kurzlebiges, HMAC-signiertes Token für den Treiber fs (nur Entwicklung und
 * Tests). Es ersetzt die Signatur einer presigned URL: Es nennt Bucket,
 * Schlüssel, Inhaltstyp, Obergrenze und Ablauf. Das Präfix trennt es von
 * anderen Tokens mit demselben Geheimnis (wie realtime-token.ts).
 */
export type StorageTokenPurpose = "upload" | "download";

export interface StorageTokenClaims {
  purpose: StorageTokenPurpose;
  bucket: BucketName;
  key: string;
  /** Nur bei `upload`. */
  contentType?: string;
  maxBytes?: number;
  /** Ablauf in Millisekunden seit Epoch. */
  expiresAt: number;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(`storage:${payload}`).digest("base64url");
}

function requireSecret(secret: string | undefined): string {
  if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET fehlt oder ist kürzer als 32 Zeichen.");
  return secret;
}

export function createStorageToken(claims: StorageTokenClaims, secret: string | undefined): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${sign(payload, requireSecret(secret))}`;
}

function isClaims(value: unknown): value is StorageTokenClaims {
  if (typeof value !== "object" || value === null) return false;
  const claims = value as Record<string, unknown>;
  return (
    (claims.purpose === "upload" || claims.purpose === "download") &&
    typeof claims.bucket === "string" &&
    (BUCKETS as readonly string[]).includes(claims.bucket) &&
    typeof claims.key === "string" &&
    claims.key.length > 0 &&
    typeof claims.expiresAt === "number" &&
    (claims.contentType === undefined || typeof claims.contentType === "string") &&
    (claims.maxBytes === undefined || (typeof claims.maxBytes === "number" && claims.maxBytes > 0))
  );
}

/** Gibt die Angaben zurück oder null, wenn das Token ungültig, abgelaufen oder für einen anderen Zweck ist. */
export function verifyStorageToken(token: string | null | undefined, purpose: StorageTokenPurpose, secret: string | undefined, now = Date.now()): StorageTokenClaims | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts as [string, string];
  const expected = Buffer.from(sign(payload, requireSecret(secret)));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!isClaims(claims) || claims.purpose !== purpose || claims.expiresAt < now) return null;
  return claims;
}
