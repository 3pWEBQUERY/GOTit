/**
 * Reine Zeitlogik der Kalenderansichten: Wochenraster mit Montag als Wochenbeginn,
 * Einträge pro Tag, Minuten als Position und Spalten für überlappende Einträge.
 * Gerechnet wird mit den übergebenen Ortszeiten; es gibt keine Umrechnung der Zeitzone.
 */
import { addDays, addMonths, monthGrid, parseIsoDate, startOfWeek } from "../input/date-parsing";
import { timeToMinutes } from "../input/time-parsing";
import type { CalendarDayCounts, CalendarEntry, CalendarView } from "./calendar-types";

const DAY_MINUTES = 1440;

/** Ausschnitt eines Eintrags an einem Tag, in Minuten seit Mitternacht. */
export interface DaySegment {
  entry: CalendarEntry;
  startMinutes: number;
  endMinutes: number;
  /** Der Eintrag beginnt vor diesem Tag. */
  continuesBefore: boolean;
  /** Der Eintrag endet nach diesem Tag. */
  continuesAfter: boolean;
}

/** Ein Ausschnitt mit seinem Platz im Raster. `top` und `height` sind Anteile von 0 bis 1 der sichtbaren Stunden. */
export interface PositionedSegment extends DaySegment {
  top: number;
  height: number;
  /** Spalte innerhalb einer Gruppe überlappender Einträge, ab 0. */
  column: number;
  /** Anzahl Spalten der Gruppe. */
  columns: number;
  /** Verfügbarkeit liegt als Fläche hinter Anfragen, Terminen und Blockern. */
  layer: "background" | "foreground";
}

export interface HourRange {
  startHour: number;
  endHour: number;
}

/** Datum eines Zeitpunkts `YYYY-MM-DDTHH:MM`. */
export function datePart(dateTime: string): string {
  return dateTime.slice(0, 10);
}

/** Uhrzeit `HH:MM` eines Zeitpunkts `YYYY-MM-DDTHH:MM`. */
export function timePart(dateTime: string): string {
  return dateTime.slice(11, 16);
}

/** Die sieben Tage der Woche von Montag bis Sonntag, in der `dateIso` liegt. */
export function weekDays(dateIso: string): string[] {
  const monday = startOfWeek(dateIso);
  return Array.from({ length: 7 }, (_, offset) => addDays(monday, offset));
}

/** Raster eines Monats `YYYY-MM`: ganze Wochen von Montag bis Sonntag, auch über den Jahreswechsel. */
export function monthWeeks(monthIso: string): string[][] {
  const parts = parseIsoDate(`${monthIso.slice(0, 7)}-01`);
  return parts ? monthGrid(parts.year, parts.month) : [];
}

/** Verschiebt das Datum um einen Schritt der Ansicht: einen Tag, eine Woche oder einen Monat. */
export function shiftCalendarDate(view: CalendarView, dateIso: string, direction: -1 | 1): string {
  if (view === "month") return addMonths(dateIso, direction);
  return addDays(dateIso, view === "week" ? direction * 7 : direction);
}

/** Einträge, die einen Tag berühren, auf diesen Tag zugeschnitten und nach Beginn sortiert. */
export function entriesForDay(entries: readonly CalendarEntry[], dateIso: string): DaySegment[] {
  const dayStart = `${dateIso}T00:00`;
  const dayEnd = `${addDays(dateIso, 1)}T00:00`;
  return entries
    .filter((entry) => entry.start < dayEnd && entry.end > dayStart && entry.end > entry.start)
    .map((entry) => {
      const continuesBefore = entry.start < dayStart;
      const continuesAfter = entry.end > dayEnd;
      return {
        entry,
        startMinutes: continuesBefore ? 0 : timeToMinutes(timePart(entry.start)),
        endMinutes: continuesAfter || entry.end === dayEnd ? DAY_MINUTES : timeToMinutes(timePart(entry.end)),
        continuesBefore,
        continuesAfter,
      };
    })
    .sort((a, b) => a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes || a.entry.id.localeCompare(b.entry.id));
}

/** Anteil (0 bis 1) der sichtbaren Stunden, an dem eine Minute des Tages liegt. Werte ausserhalb werden begrenzt. */
export function minutesToOffset(minutes: number, { startHour, endHour }: HourRange): number {
  const first = startHour * 60;
  const span = Math.max(1, endHour * 60 - first);
  return Math.min(1, Math.max(0, (minutes - first) / span));
}

/** Zwei Zeiträume überlappen, wenn sie mindestens eine Minute teilen. Aneinander grenzende überlappen nicht. */
export function segmentsOverlap(a: Pick<DaySegment, "startMinutes" | "endMinutes">, b: Pick<DaySegment, "startMinutes" | "endMinutes">): boolean {
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

/** Verteilt überlappende Ausschnitte auf Spalten. Erwartet die Reihenfolge von `entriesForDay`. */
function assignColumns(segments: readonly DaySegment[]): { segment: DaySegment; column: number; columns: number }[] {
  const placed: { segment: DaySegment; column: number; group: number }[] = [];
  const groupColumns: number[] = [];
  let group = -1;
  let groupEnd = -1;
  let columnEnds: number[] = [];
  for (const segment of segments) {
    if (segment.startMinutes >= groupEnd) {
      group += 1;
      columnEnds = [];
      groupEnd = -1;
    }
    const free = columnEnds.findIndex((end) => end <= segment.startMinutes);
    const column = free === -1 ? columnEnds.length : free;
    columnEnds[column] = segment.endMinutes;
    groupEnd = Math.max(groupEnd, segment.endMinutes);
    groupColumns[group] = columnEnds.length;
    placed.push({ segment, column, group });
  }
  return placed.map(({ segment, column, group: index }) => ({ segment, column, columns: groupColumns[index] ?? 1 }));
}

/**
 * Platziert die Einträge eines Tages im Raster der sichtbaren Stunden.
 * Einträge ganz ausserhalb der sichtbaren Stunden entfallen; Verfügbarkeit
 * bildet die hintere Ebene, alles andere teilt sich bei Überlappung die Breite.
 */
export function layoutDay(entries: readonly CalendarEntry[], dateIso: string, hours: HourRange): PositionedSegment[] {
  const visible = entriesForDay(entries, dateIso).filter((segment) => segment.endMinutes > hours.startHour * 60 && segment.startMinutes < hours.endHour * 60);
  const layers = [
    { layer: "background" as const, segments: visible.filter((segment) => segment.entry.kind === "available") },
    { layer: "foreground" as const, segments: visible.filter((segment) => segment.entry.kind !== "available") },
  ];
  return layers.flatMap(({ layer, segments }) =>
    assignColumns(segments).map(({ segment, column, columns }) => {
      const top = minutesToOffset(segment.startMinutes, hours);
      return { ...segment, top, height: minutesToOffset(segment.endMinutes, hours) - top, column, columns, layer };
    }),
  );
}

/** Zeitspanne eines Ausschnitts als `HH:MM–HH:MM` (24 Stunden). Ein Ende um Mitternacht steht als `24:00`. */
export function formatSegmentTime(segment: Pick<DaySegment, "startMinutes" | "endMinutes">): string {
  const format = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  return `${format(segment.startMinutes)}–${format(segment.endMinutes)}`;
}

/** Die vollen Stunden der Achse, zum Beispiel 8 bis 22 ergibt 8, 9, … 21. */
export function hourTicks({ startHour, endHour }: HourRange): number[] {
  return Array.from({ length: Math.max(0, endHour - startHour) }, (_, index) => startHour + index);
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function emptyCounts(): CalendarDayCounts {
  return { available: 0, request: 0, confirmed: 0, blocker: 0 };
}

/** Zählt die Einträge eines Tages je Art. Ein Eintrag über Mitternacht zählt an jedem berührten Tag. */
export function countEntriesForDay(entries: readonly CalendarEntry[], dateIso: string): CalendarDayCounts {
  const counts = emptyCounts();
  for (const { entry } of entriesForDay(entries, dateIso)) counts[entry.kind] += 1;
  return counts;
}
