import { DURATIONS } from "@app/core/booking/schemas";
import type { ClientSlot } from "./types";

/**
 * Auswahl im Anfrageformular aus den freien Zeiten (v2 10.2, Entscheid 0016):
 * nur Tage mit Verfügbarkeit, Uhrzeiten im Raster von 30 Minuten und nur
 * Dauern, die vollständig in die freie Zeit passen. Alles in der Zeitzone
 * des Anbieters; gerechnet wird mit UTC, angezeigt mit `Intl`.
 */
export const STEP_MINUTES = 30;
const STEP_MS = STEP_MINUTES * 60_000;

export interface StartOption {
  /** Uhrzeit in der Zone des Anbieters, `HH:MM`. */
  time: string;
  startsAt: string;
  /** Wie lange ab hier frei ist. */
  maxMinutes: number;
}

export interface DayOption {
  /** Kalendertag in der Zone des Anbieters, `YYYY-MM-DD`. */
  day: string;
  times: StartOption[];
}

function zonedParts(timeZone: string) {
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (date: Date) => {
    const parts = format.formatToParts(date);
    const value = (type: string) =>
      parts.find((part) => part.type === type)?.value ?? "";
    return {
      day: `${value("year")}-${value("month")}-${value("day")}`,
      time: `${value("hour")}:${value("minute")}`,
    };
  };
}

const shortest = DURATIONS[0];

/** Tage mit mindestens einer Startzeit, an der die kürzeste Dauer passt. */
export function slotDays(
  slots: readonly ClientSlot[],
  timeZone: string,
): DayOption[] {
  const parts = zonedParts(timeZone);
  const days = new Map<string, StartOption[]>();
  const sorted = [...slots].sort(
    (a, b) => Date.parse(a.start) - Date.parse(b.start),
  );
  for (const slot of sorted) {
    const end = Date.parse(slot.end);
    for (
      let start = Math.ceil(Date.parse(slot.start) / STEP_MS) * STEP_MS;
      start + shortest * 60_000 <= end;
      start += STEP_MS
    ) {
      const { day, time } = parts(new Date(start));
      const list = days.get(day) ?? [];
      if (!list.some((entry) => entry.time === time))
        list.push({
          time,
          startsAt: new Date(start).toISOString(),
          maxMinutes: Math.floor((end - start) / 60_000),
        });
      days.set(day, list);
    }
  }
  return [...days.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, times]) => ({ day, times }));
}

/** Dauern, die ab der gewählten Zeit vollständig frei sind. */
export function fittingDurations(option: StartOption | undefined): number[] {
  if (!option) return [];
  return DURATIONS.filter((minutes) => minutes <= option.maxMinutes);
}

/** Behält die gewählte Dauer, wenn sie passt; sonst 60 Minuten oder die längste passende. */
export function keepDuration(
  current: number | null,
  fitting: readonly number[],
): number | null {
  if (current !== null && fitting.includes(current)) return current;
  if (fitting.includes(60)) return 60;
  return fitting.at(-1) ?? null;
}

/** Findet die Startzeit zu Tag und Uhrzeit, zum Beispiel aus einem Entwurf. */
export function findStart(
  days: readonly DayOption[],
  day: string | null,
  time: string | null,
): StartOption | undefined {
  if (!day || !time) return undefined;
  return days
    .find((entry) => entry.day === day)
    ?.times.find((entry) => entry.time === time);
}
