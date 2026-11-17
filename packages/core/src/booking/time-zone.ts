/**
 * Umrechnung zwischen Ortszeit einer Zeitzone und UTC, ohne Bibliothek.
 * Termine werden als UTC gespeichert und in der Zeitzone des Anbieters
 * angezeigt (PRD v2 11.5). Sommerzeit-Lücken (02:00 bis 03:00 im März) gelten
 * als nicht vorhanden; doppelte Stunden im Oktober nehmen die erste.
 */
export const DEFAULT_TIME_ZONE = "Europe/Zurich";

function offsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );
  return Math.round((asUtc - date.getTime()) / 60_000);
}

/** UTC-Zeitpunkt für «Tag `day` (YYYY-MM-DD), Minute `minute` des Tages» in `timeZone`. */
export function zonedToUtc(
  day: string,
  minute: number,
  timeZone: string,
): Date {
  const [year, month, date] = day.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const guess = Date.UTC(year, month - 1, date, 0, minute);
  const first = offsetMinutes(new Date(guess), timeZone);
  const candidate = guess - first * 60_000;
  const second = offsetMinutes(new Date(candidate), timeZone);
  return new Date(first === second ? candidate : guess - second * 60_000);
}

/** Kalendertag (YYYY-MM-DD) und Wochentag (0 = Sonntag) eines Zeitpunkts in `timeZone`. */
export function zonedDay(
  date: Date,
  timeZone: string,
): { day: string; weekday: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    day: `${value("year")}-${value("month")}-${value("day")}`,
    weekday: weekdays.indexOf(value("weekday")),
    minute: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

/** Nächster Kalendertag (YYYY-MM-DD). */
export function addDays(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(Date.UTC(year, month - 1, date + days))
    .toISOString()
    .slice(0, 10);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}
