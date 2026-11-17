import { createRedisConnection } from "@app/jobs";
import type { Redis } from "ioredis";
import { createLogger } from "../observability";

const logger = createLogger("account");
let client: Redis | null = null;

/** So lange wie die längste Sitzung (30 Tage, `packages/auth/src/server.ts`), mit einem Tag Reserve. */
const REVOKED_TTL_SECONDS = 31 * 24 * 3600;

/**
 * Sitzungen aus dem Zweitspeicher von Better Auth entfernen (Schlüssel wie
 * `packages/auth/src/redis-storage.ts`). Better Auth liest Sitzungen zuerst
 * aus Redis; das Löschen der Zeilen in Postgres allein beendet sie nicht.
 * «revoked-sessions-before» verwirft zusätzlich jede ältere Sitzung, auch
 * eine, deren Token hier nicht bekannt war.
 */
export async function revokeCachedSessions(userId: string, tokens: readonly string[], now = Date.now()): Promise<void> {
  try {
    client ??= createRedisConnection();
    const pipeline = client.multi().set(`auth:revoked-sessions-before-${userId}`, String(now), "EX", REVOKED_TTL_SECONDS).del(`auth:active-sessions-${userId}`);
    for (const token of tokens) pipeline.del(`auth:${token}`);
    await pipeline.exec();
  } catch (error) {
    logger.error("revoke_cached_sessions_failed", { error: error instanceof Error ? error.name : "unknown" });
    throw error;
  }
}
