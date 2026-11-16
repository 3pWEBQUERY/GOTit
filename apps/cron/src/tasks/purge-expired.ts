import { createLogger } from "@app/core/observability";
import { purgeExpiredData } from "@app/core/retention";

const logger = createLogger("cron");

/** Setzt die Aufbewahrungsfristen durch (PRD 16.2): Konten nach Löschfrist, Protokolle, Ausgang, Token. */
export async function purgeExpired(): Promise<void> {
  const result = await purgeExpiredData();
  logger.info("purge_expired", { ...result });
}
