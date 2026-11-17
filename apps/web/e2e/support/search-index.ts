import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { query } from "../admin-fixtures";
import { expect } from "./test";

/**
 * Reiht Profile in die Queue `search-index` ein, wie es jede Änderung im
 * Betrieb tut, und wartet, bis der Worker die Zeilen geschrieben hat
 * (`present: false`: bis er sie entfernt hat).
 */
export async function indexProfiles(
  ids: readonly string[],
  present = true,
): Promise<void> {
  const connection = new Redis(
    process.env.REDIS_URL ?? "redis://localhost:6379",
    { maxRetriesPerRequest: null, family: 0 },
  );
  const queue = new Queue("search-index", { connection });
  try {
    await queue.addBulk(
      ids.map((providerProfileId) => ({
        name: "search-index",
        data: { providerProfileId },
        opts: { removeOnComplete: true, attempts: 3 },
      })),
    );
  } finally {
    await queue.close();
    connection.disconnect();
  }
  await expect
    .poll(
      async () =>
        (
          await query<{ count: string }>(
            `select count(*) from search_profile where "providerProfileId" = any($1)`,
            [ids],
          )
        )[0]?.count,
      { timeout: 30_000 },
    )
    .toBe(String(present ? ids.length : 0));
}
