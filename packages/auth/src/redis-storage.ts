import { createRedisConnection } from "@app/jobs";
import type { Redis } from "ioredis";

let client: Redis | null = null;

/**
 * Zweitspeicher von Better Auth in Redis: Rate Limits gelten so über alle
 * Instanzen von `web` hinweg (PRD 16.2). Sitzungen bleiben zusätzlich in Postgres.
 */
export const redisSecondaryStorage = {
  async get(key: string) {
    client ??= createRedisConnection();
    return client.get(`auth:${key}`);
  },
  async set(key: string, value: string, ttl?: number) {
    client ??= createRedisConnection();
    if (ttl) await client.set(`auth:${key}`, value, "EX", ttl);
    else await client.set(`auth:${key}`, value);
  },
  /** Liest und löscht atomar (einmalige Token). */
  async getAndDelete(key: string) {
    client ??= createRedisConnection();
    return client.getdel(`auth:${key}`);
  },
  /** Zähler mit Ablauf; die Frist beginnt beim ersten Zählen (Rate Limits). */
  async increment(key: string, ttl: number) {
    client ??= createRedisConnection();
    const results = await client.multi().incr(`auth:${key}`).expire(`auth:${key}`, ttl, "NX").exec();
    return Number(results?.[0]?.[1] ?? 0);
  },
  async delete(key: string) {
    client ??= createRedisConnection();
    await client.del(`auth:${key}`);
  },
};
