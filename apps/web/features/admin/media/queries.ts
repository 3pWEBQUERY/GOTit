import { getMediaCase, listMediaQueue } from "@app/core/media";
import { getDb } from "@app/db";
import { cache } from "react";

export type MediaCase = NonNullable<Awaited<ReturnType<typeof getMediaCase>>>;

/** Medien in Prüfung; der Kern prüft die Rolle der Person selbst. */
export async function getMediaQueue(actorId: string) {
  return listMediaQueue(actorId);
}

/** Ein Medium für den Einzelfall; null für unbekannte IDs. Einmal pro Anfrage geladen. */
export const getMediaCaseFor = cache(async (actorId: string, id: string): Promise<MediaCase | null> => getMediaCase(actorId, id));

/** Zähler für die Seitenleiste; nur für Personen mit Prüfrolle aufgerufen. */
export async function countMediaInReview(): Promise<number> {
  return getDb().mediaAsset.count({ where: { status: "IN_REVIEW", deletedAt: null } });
}
