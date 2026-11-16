/** Art eines Kalendereintrags (PRD 11.5). Jede Art hat eine eigene Form und trägt ihren Status als Wort. */
export type CalendarEntryKind = "available" | "request" | "confirmed" | "blocker";

export const CALENDAR_ENTRY_KINDS: readonly CalendarEntryKind[] = ["available", "request", "confirmed", "blocker"];

/**
 * Ein Eintrag im Kalender. Zeiten sind lokale Zeiten des Anbieters als
 * `YYYY-MM-DDTHH:MM`; die Komponenten rechnen sie nie in eine andere Zone um.
 */
export interface CalendarEntry {
  id: string;
  /** Beginn als `YYYY-MM-DDTHH:MM`. */
  start: string;
  /** Ende als `YYYY-MM-DDTHH:MM`, nach `start`. */
  end: string;
  kind: CalendarEntryKind;
  /** Kurzer Text des Eintrags, zum Beispiel «Terminanfrage». */
  label: string;
  /** Status als Wort, zum Beispiel «Bestätigt». Steht sichtbar am Eintrag und im zugänglichen Namen. */
  statusLabel: string;
  /** Mit `href` wird der Eintrag zum Link, sonst zum Button. */
  href?: string;
}

export type CalendarView = "day" | "week" | "month";

/** Anzahl Einträge je Art an einem Tag. */
export type CalendarDayCounts = Record<CalendarEntryKind, number>;
