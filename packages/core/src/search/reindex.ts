import { getDb } from "@app/db";
import { enqueue, searchIndexJob } from "@app/jobs";
import { createLogger } from "../observability";

const logger = createLogger("search");

/**
 * Stösst die Aktualisierung des Suchindex an (Queue `search-index`). Ein
 * Fehler beim Einreihen bricht die Aktion des Anbieters nicht ab: Die Suche
 * prüft Status und Identität bei jeder Abfrage selbst, und der Cron-Dienst baut
 * den Index nachts neu auf.
 */
export async function requestSearchReindex(
  providerProfileId: string,
): Promise<void> {
  try {
    await enqueue(searchIndexJob, { providerProfileId });
  } catch (error) {
    logger.error("reindex_enqueue_failed", {
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}

/** Wie `requestSearchReindex`, für alle Profile eines Kontos (Deaktivierung, Löschantrag, Identitätsprüfung). */
export async function requestSearchReindexForUser(
  userId: string,
): Promise<void> {
  const profile = await getDb().providerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (profile) await requestSearchReindex(profile.id);
}
