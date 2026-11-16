import { Redis } from "ioredis";

/** Verbindung für BullMQ und Pub/Sub. BullMQ verlangt `maxRetriesPerRequest: null`. */
export function createRedisConnection(url = process.env.REDIS_URL): Redis {
  if (!url) throw new Error("REDIS_URL ist nicht gesetzt.");
  return new Redis(url, { maxRetriesPerRequest: null, family: 0 });
}
