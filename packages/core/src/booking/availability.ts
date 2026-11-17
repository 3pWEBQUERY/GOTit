import { addDays, zonedDay, zonedToUtc } from "./time-zone";

/**
 * Verfügbarkeit (PRD v1 FR-BOOKING-001, Abnahme 20.5 «Verfügbarkeiten sind
 * korrekt»): wiederkehrende Wochenfenster in der Zeitzone des Anbieters,
 * abzüglich Abwesenheiten, Blockern und – mit Puffer – bestätigter Termine.
 */
export interface WeeklyWindow {
  /** 0 = Sonntag … 6 = Samstag. */
  weekday: number;
  /** Minuten seit Mitternacht in der Zeitzone des Anbieters. */
  startMinute: number;
  endMinute: number;
}

export interface Interval {
  start: Date;
  end: Date;
}

export interface AvailabilityInput {
  timeZone: string;
  windows: readonly WeeklyWindow[];
  /** Abwesenheiten und manuelle Blocker. */
  blocks: readonly Interval[];
  /** Bestätigte Termine; der Puffer gilt davor und danach. */
  bookings: readonly Interval[];
  bufferMinutes: number;
}

function subtract(free: Interval[], taken: Interval): Interval[] {
  return free.flatMap((slot) => {
    if (taken.end <= slot.start || taken.start >= slot.end) return [slot];
    const parts: Interval[] = [];
    if (taken.start > slot.start)
      parts.push({ start: slot.start, end: taken.start });
    if (taken.end < slot.end) parts.push({ start: taken.end, end: slot.end });
    return parts;
  });
}

/** Freie Zeiten zwischen `from` und `to` (Tage in der Zeitzone des Anbieters, inklusive). */
export function freeIntervals(
  input: AvailabilityInput,
  fromDay: string,
  toDay: string,
): Interval[] {
  let free: Interval[] = [];
  for (let day = fromDay; day <= toDay; day = addDays(day, 1)) {
    const weekday = zonedDay(
      zonedToUtc(day, 12 * 60, input.timeZone),
      input.timeZone,
    ).weekday;
    for (const window of input.windows.filter(
      (entry) => entry.weekday === weekday,
    )) {
      free.push({
        start: zonedToUtc(day, window.startMinute, input.timeZone),
        end: zonedToUtc(day, window.endMinute, input.timeZone),
      });
    }
  }
  free.sort((a, b) => a.start.getTime() - b.start.getTime());
  const buffer = input.bufferMinutes * 60_000;
  for (const block of input.blocks) free = subtract(free, block);
  for (const booking of input.bookings)
    free = subtract(free, {
      start: new Date(booking.start.getTime() - buffer),
      end: new Date(booking.end.getTime() + buffer),
    });
  return free.filter((slot) => slot.end > slot.start);
}

/** Liegt der Zeitraum vollständig in einer freien Zeit? */
export function fitsAvailability(
  input: AvailabilityInput,
  requested: Interval,
): boolean {
  const from = zonedDay(requested.start, input.timeZone).day;
  const to = zonedDay(requested.end, input.timeZone).day;
  return freeIntervals(input, addDays(from, -1), to).some(
    (slot) => slot.start <= requested.start && slot.end >= requested.end,
  );
}

/** Überschneidet der Zeitraum einen bestätigten Termin samt Puffer? Grundlage der Exklusivbelegung. */
export function overlapsBooking(
  bookings: readonly Interval[],
  requested: Interval,
  bufferMinutes: number,
): boolean {
  const buffer = bufferMinutes * 60_000;
  return bookings.some(
    (booking) =>
      requested.start.getTime() < booking.end.getTime() + buffer &&
      requested.end.getTime() > booking.start.getTime() - buffer,
  );
}
