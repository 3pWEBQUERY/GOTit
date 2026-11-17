import { createLogger } from "@app/core/observability";
import { aggregatePendingDays } from "@app/core/stats";

const logger = createLogger("cron");

/** Nächtlich (v2 14.5 `StatDaily`): abgeschlossene Tage aggregieren, alte Rohereignisse löschen. */
export async function aggregateStats(): Promise<void> {
  const result = await aggregatePendingDays();
  logger.info("aggregate_stats", { days: result.days.length, deleted: result.deleted });
}
