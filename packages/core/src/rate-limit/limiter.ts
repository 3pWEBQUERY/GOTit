import { createRedisConnection } from "@app/jobs";
import type { Redis } from "ioredis";

export interface RateLimitRule {
  /** Höchstzahl Versuche je Fenster. */
  limit: number;
  windowSeconds: number;
}

/** Grenzen aus PRD 16.2. Anmeldung und Sitzungen begrenzt zusätzlich Better Auth. */
export const RATE_LIMITS = {
  registration: { limit: 3, windowSeconds: 3600 },
  passwordReset: { limit: 3, windowSeconds: 3600 },
  verificationResend: { limit: 3, windowSeconds: 900 },
  dataExport: { limit: 3, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitName = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

let client: Redis | null = null;

function redis(): Redis {
  client ??= createRedisConnection();
  return client;
}

/** Festes Zeitfenster pro Schlüssel. Der Schlüssel enthält nie Klartext-Adressen, nur einen Hash. */
export async function consumeRateLimit(name: RateLimitName, subject: string, store: Pick<Redis, "multi"> = redis()): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[name];
  const key = `ratelimit:${name}:${subject}`;
  const results = await store.multi().incr(key).expire(key, rule.windowSeconds, "NX").ttl(key).exec();
  const count = Number(results?.[0]?.[1] ?? 0);
  const ttl = Number(results?.[2]?.[1] ?? rule.windowSeconds);
  return { allowed: count <= rule.limit, retryAfterSeconds: count <= rule.limit ? 0 : Math.max(ttl, 1) };
}
