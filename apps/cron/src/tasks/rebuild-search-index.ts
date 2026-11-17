import { createLogger } from "@app/core/observability";
import { rebuildSearchIndex } from "@app/core/search/indexer";

const logger = createLogger("cron");

/**
 * Baut den Suchindex vollständig neu auf (PRD v2 14.4). Fängt verpasste Jobs
 * auf und entfernt Profile, deren Identitätsprüfung inzwischen abgelaufen ist.
 */
export async function rebuildSearch(): Promise<void> {
  const result = await rebuildSearchIndex();
  logger.info("rebuild_search_index", { ...result });
}
