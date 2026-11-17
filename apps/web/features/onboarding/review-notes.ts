import { z } from "zod";
import { NOTE_STEPS, type NoteStep } from "./steps";

const fieldNotesSchema = z.partialRecord(z.enum(NOTE_STEPS), z.string());

export interface LatestReview {
  decision: string | null;
  fieldNotes: unknown;
}

/**
 * Grund pro Feld aus der letzten Prüfung, nur solange das Profil in Korrektur
 * ist. Unbekannte Schlüssel und kaputte Daten fallen weg, statt die Seite zu brechen.
 */
export function reviewNotes(status: string, review: LatestReview | null): Partial<Record<NoteStep, string>> {
  if (status !== "CHANGES_REQUESTED" || review?.decision !== "CHANGES_REQUESTED") return {};
  const source = typeof review.fieldNotes === "object" && review.fieldNotes !== null ? review.fieldNotes : {};
  const known = Object.fromEntries(Object.entries(source).filter(([key]) => (NOTE_STEPS as readonly string[]).includes(key)));
  const parsed = fieldNotesSchema.safeParse(known);
  return parsed.success ? parsed.data : {};
}
