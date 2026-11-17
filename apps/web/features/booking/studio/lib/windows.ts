import type { AvailabilityValue, Weekday } from "@app/ui";

/**
 * Wochenfenster zwischen Kern und `AvailabilityEditor`. Der Kern zählt
 * Wochentage ab Sonntag (0) und Minuten bis 1440; der Editor kennt `mon` bis
 * `sun` und `HH:MM`. Ein Ende um Mitternacht (1440) erscheint als 23:59, und
 * 23:59 wird beim Speichern wieder Mitternacht (Entscheid 0016, Oberfläche Studio).
 */
export interface CoreWindow {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

const WEEKDAY_NUMBER: Record<Weekday, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 0,
};
const DAY_END = 24 * 60;
const LAST_MINUTE = DAY_END - 1;

const pad = (value: number) => String(value).padStart(2, "0");

function toTime(minute: number): string {
  const value = Math.min(minute, LAST_MINUTE);
  return `${pad(Math.floor(value / 60))}:${pad(value % 60)}`;
}

function toMinute(time: string): number {
  const [hours, minutes] = time.split(":").map(Number) as [number, number];
  return hours * 60 + minutes;
}

export function windowsToValue(
  windows: readonly CoreWindow[],
): AvailabilityValue {
  const value: AvailabilityValue = {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  };
  for (const day of Object.keys(WEEKDAY_NUMBER) as Weekday[])
    value[day] = windows
      .filter((window) => window.weekday === WEEKDAY_NUMBER[day])
      .sort((a, b) => a.startMinute - b.startMinute)
      .map((window) => ({
        from: toTime(window.startMinute),
        to: toTime(window.endMinute),
      }));
  return value;
}

/** Erwartet eine gültige Woche (`isAvailabilityValid`). */
export function valueToWindows(value: AvailabilityValue): CoreWindow[] {
  return (Object.keys(WEEKDAY_NUMBER) as Weekday[]).flatMap((day) =>
    value[day].map((window) => {
      const end = toMinute(window.to);
      return {
        weekday: WEEKDAY_NUMBER[day],
        startMinute: toMinute(window.from),
        endMinute: end === LAST_MINUTE ? DAY_END : end,
      };
    }),
  );
}
