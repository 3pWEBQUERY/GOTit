import { getReviewCase } from "@app/core/verification";
import { cache } from "react";

export type ReviewCase = NonNullable<Awaited<ReturnType<typeof getReviewCase>>>;

/** Ein Prüffall mit den Angaben des Profils; null für eine unbekannte ID. Einmal pro Anfrage geladen. */
export const getCase = cache(async (id: string): Promise<ReviewCase | null> => {
  if (id.length > 64) return null;
  return getReviewCase(id);
});
