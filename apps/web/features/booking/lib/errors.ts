import type { BookingActionResult, BookingCreateResult } from "../actions/act";

/**
 * Jede Antwort des Kerns als klare Meldung am richtigen Ort (PRD 13,
 * Formulare): Zeitfragen an der Uhrzeit, eine ungültige Region an der Region,
 * alles andere oben im Formular. Eine Blockierung wird nie genannt.
 */
export type CreateFailure = Extract<
  BookingCreateResult,
  { ok: false }
>["reason"];
export type ActFailure = Extract<BookingActionResult, { ok: false }>["reason"];

export type FormField = "time" | "region" | "form";

export function createFailureField(
  reason: CreateFailure,
  regionChosen: boolean,
): FormField {
  switch (reason) {
    case "unavailable":
    case "too-soon":
    case "too-far":
      return "time";
    case "invalid":
      // Zeit und Dauer kommen aus der Auswahl; ungültig ist dann nur eine Region, die nicht mehr freigegeben ist.
      return regionChosen ? "region" : "form";
    default:
      return "form";
  }
}

/** Soll der Stand neu geladen werden, weil sich die freien Zeiten oder die Anfrage geändert haben? */
export function needsRefresh(reason: CreateFailure | ActFailure): boolean {
  return [
    "unavailable",
    "too-soon",
    "too-far",
    "stale",
    "conflict",
    "not-allowed",
    "duplicate",
  ].includes(reason);
}
