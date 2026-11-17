import { addDays, zonedDay, zonedToUtc } from "@app/core/booking";
import type { CalendarEntry as CoreEntry } from "@app/core/booking";
import type { CalendarEntry, CalendarView } from "@app/ui";

/**
 * Vom Kern zum Raster (PRD 11.5): Zeitpunkte in UTC werden zu Ortszeiten des
 * Anbieters `YYYY-MM-DDTHH:MM`, denn die Kalender des Designsystems rechnen
 * nie selbst um. Wochen beginnen am Montag.
 */
const pad = (value: number) => String(value).padStart(2, "0");

/** Ortszeit des Anbieters als `YYYY-MM-DDTHH:MM`. */
export function localStamp(date: Date, timeZone: string): string {
  const { day, minute } = zonedDay(date, timeZone);
  return `${day}T${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;
}

/** Heutiger Tag in der Zone des Anbieters. */
export function todayIn(timeZone: string, now = new Date()): string {
  return zonedDay(now, timeZone).day;
}

/** Montag der Woche eines Tages. */
export function mondayOf(day: string): string {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addDays(day, weekday === 0 ? -6 : 1 - weekday);
}

/** Erster und letzter Tag (inklusive), die eine Ansicht zeigt; der Monat in ganzen Wochen. */
export function visibleDays(
  view: CalendarView,
  day: string,
): { first: string; last: string } {
  if (view !== "month") {
    const first = mondayOf(day);
    return { first, last: addDays(first, 6) };
  }
  const monthStart = `${day.slice(0, 7)}-01`;
  const nextMonth = new Date(`${monthStart}T00:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const monthEnd = addDays(nextMonth.toISOString().slice(0, 10), -1);
  return { first: mondayOf(monthStart), last: addDays(mondayOf(monthEnd), 6) };
}

/** Zeitraum in UTC von Mitternacht des ersten bis Mitternacht nach dem letzten Tag, in der Zone des Anbieters. */
export function utcRange(
  first: string,
  last: string,
  timeZone: string,
): { from: Date; to: Date } {
  return {
    from: zonedToUtc(first, 0, timeZone),
    to: zonedToUtc(addDays(last, 1), 0, timeZone),
  };
}

/** Ortszeit (Tag und `HH:MM`) des Anbieters als UTC-Zeitpunkt; `null` bei ungültiger Uhrzeit. */
export function localToUtc(
  day: string,
  time: string,
  timeZone: string,
): Date | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const minute = Number(match[1]) * 60 + Number(match[2]);
  if (minute >= 24 * 60 || Number(match[2]) >= 60) return null;
  return zonedToUtc(day, minute, timeZone);
}

export interface EntryWords {
  available: string;
  availableStatus: string;
  blocker: string;
  blockerStatus: string;
  absence: string;
  absenceStatus: string;
  /** Name der Gegenseite oder «Terminanfrage». */
  request: (name: string | null) => string;
  status: (status: NonNullable<CoreEntry["status"]>) => string;
}

/**
 * Einträge für das Raster. Abwesenheiten erscheinen als Blocker (schraffiert)
 * mit eigenem Wort; jeder Eintrag trägt seinen Status als Wort.
 */
export function toGridEntries(
  entries: readonly (CoreEntry & { counterpartName?: string | null })[],
  timeZone: string,
  words: EntryWords,
): CalendarEntry[] {
  return entries.map((entry) => {
    const start = localStamp(entry.start, timeZone);
    const end = localStamp(entry.end, timeZone);
    switch (entry.kind) {
      case "available":
        return {
          id: `a:${start}|${end}`,
          start,
          end,
          kind: "available",
          label: words.available,
          statusLabel: words.availableStatus,
        };
      case "absence":
      case "blocker":
        return {
          id: `b:${entry.id}`,
          start,
          end,
          kind: "blocker",
          label:
            entry.kind === "absence"
              ? words.absence
              : entry.note?.trim() || words.blocker,
          statusLabel:
            entry.kind === "absence"
              ? words.absenceStatus
              : words.blockerStatus,
        };
      default:
        return {
          id: `r:${entry.id}`,
          start,
          end,
          kind: entry.kind,
          label: words.request(entry.counterpartName ?? null),
          statusLabel: entry.status ? words.status(entry.status) : "",
        };
    }
  });
}

/**
 * Sichtbare Stunden: alles mit Einträgen, mindestens acht Stunden, sonst
 * 8 bis 20 Uhr. Einträge über Mitternacht zählen bis 24 Uhr.
 */
export function hourRange(
  entries: readonly CalendarEntry[],
  days: { first: string; last: string },
): { startHour: number; endHour: number } {
  let start = 24;
  let end = 0;
  const minutes = (stamp: string) =>
    Number(stamp.slice(11, 13)) * 60 + Number(stamp.slice(14, 16));
  for (const entry of entries) {
    const startDay = entry.start.slice(0, 10);
    const endDay = entry.end.slice(0, 10);
    if (entry.end <= `${days.first}T00:00` || startDay > days.last) continue;
    const startHour = Math.floor(minutes(entry.start) / 60);
    if (startDay === endDay) {
      start = Math.min(start, startHour);
      end = Math.max(end, Math.ceil(minutes(entry.end) / 60));
      continue;
    }
    // Über Mitternacht: am ersten Tag bis 24 Uhr, am letzten ab 0 Uhr.
    const endsInside = endDay <= days.last && minutes(entry.end) > 0;
    start = Math.min(
      start,
      startDay < days.first || endsInside ? 0 : startHour,
    );
    end = 24;
  }
  if (start >= end) return { startHour: 8, endHour: 20 };
  const span = end - start;
  if (span >= 8) return { startHour: start, endHour: end };
  const missing = 8 - span;
  const startHour = Math.max(0, start - Math.floor(missing / 2));
  return { startHour, endHour: Math.min(24, startHour + 8) };
}
