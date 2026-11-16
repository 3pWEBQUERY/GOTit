/** Reine Prüflogik für `AvailabilityEditor`: Arbeitszeiten je Wochentag als Zeitfenster `HH:MM` bis `HH:MM`. */
import { parseTime, timeToMinutes } from "../input/time-parsing";

/** Wochentage in Schweizer Reihenfolge, Montag zuerst. */
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** Ein Zeitfenster. Ein leerer Text steht für eine noch fehlende oder ungültige Zeit. */
export interface AvailabilityWindow {
  from: string;
  to: string;
}

/** Arbeitszeiten der Woche. Ein Tag ohne Zeitfenster ist nicht verfügbar. */
export type AvailabilityValue = Record<Weekday, AvailabilityWindow[]>;

/**
 * Was an einem Zeitfenster nicht stimmt: `incomplete` (eine Zeit fehlt),
 * `endBeforeStart` (bis ist nicht später als von), `overlap` (schneidet ein früheres Fenster des Tages).
 */
export type AvailabilityIssue = "incomplete" | "endBeforeStart" | "overlap";

function isComplete(window: AvailabilityWindow): boolean {
  return parseTime(window.from) === window.from && parseTime(window.to) === window.to;
}

function isOrdered(window: AvailabilityWindow): boolean {
  return timeToMinutes(window.to) > timeToMinutes(window.from);
}

/** Zwei gültige Fenster überlappen, wenn sie mindestens eine Minute teilen. 09:00–12:00 und 12:00–14:00 überlappen nicht. */
export function windowsOverlap(a: AvailabilityWindow, b: AvailabilityWindow): boolean {
  return timeToMinutes(a.from) < timeToMinutes(b.to) && timeToMinutes(b.from) < timeToMinutes(a.to);
}

/** Prüft die Fenster eines Tages. Das Ergebnis hat je Fenster einen Befund oder `null`. Bei Überlappung trägt das spätere Fenster der Liste den Befund. */
export function validateWindows(windows: readonly AvailabilityWindow[]): (AvailabilityIssue | null)[] {
  return windows.map((window, index) => {
    if (!isComplete(window)) return "incomplete";
    if (!isOrdered(window)) return "endBeforeStart";
    const earlier = windows.slice(0, index).filter((other) => isComplete(other) && isOrdered(other));
    return earlier.some((other) => windowsOverlap(window, other)) ? "overlap" : null;
  });
}

export function validateAvailability(value: AvailabilityValue): Record<Weekday, (AvailabilityIssue | null)[]> {
  return Object.fromEntries(WEEKDAYS.map((day) => [day, validateWindows(value[day])])) as Record<Weekday, (AvailabilityIssue | null)[]>;
}

export function isAvailabilityValid(value: AvailabilityValue): boolean {
  return WEEKDAYS.every((day) => validateWindows(value[day]).every((issue) => issue === null));
}

function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Vorschlag für ein weiteres Fenster: eine Stunde nach dem spätesten Ende des Tages,
 * zwei Stunden lang. Passt das nicht mehr in den Tag, bleibt das Fenster leer.
 */
export function suggestWindow(windows: readonly AvailabilityWindow[], fallback: AvailabilityWindow): AvailabilityWindow {
  const ends = windows.filter(isComplete).map((window) => timeToMinutes(window.to));
  if (ends.length === 0) return windows.length === 0 ? fallback : { from: "", to: "" };
  const from = Math.max(...ends) + 60;
  const to = Math.min(from + 120, 23 * 60 + 59);
  return to > from ? { from: minutesToTime(from), to: minutesToTime(to) } : { from: "", to: "" };
}

/** Leere Woche: kein Tag verfügbar. */
export function emptyAvailability(): AvailabilityValue {
  return { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
}
