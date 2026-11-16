/**
 * Reine Datumslogik für `DateField`: Schweizer Schreibweise `TT.MM.JJJJ`,
 * Werte als ISO-Datum `YYYY-MM-DD`, Wochenbeginn Montag (PRD 13).
 * Gerechnet wird in UTC, damit Sommerzeit keinen Tag verschiebt.
 */

export interface DateParts {
  year: number;
  month: number;
  day: number;
}

const DAY_MS = 86_400_000;
const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const SWISS_PATTERN = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Anzahl Tage eines Monats; `month` ist 1 bis 12. */
export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isRealDate({ year, month, day }: DateParts): boolean {
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

/** Baut ein ISO-Datum. Prüft nicht, ob es den Tag gibt. */
export function toIsoDate(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/** Zerlegt ein ISO-Datum. `null`, wenn die Form nicht stimmt oder es den Tag nicht gibt. */
export function parseIsoDate(iso: string): DateParts | null {
  const match = ISO_PATTERN.exec(iso);
  if (!match) return null;
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  return isRealDate(parts) ? parts : null;
}

export function isValidIsoDate(iso: string): boolean {
  return parseIsoDate(iso) !== null;
}

/**
 * Liest eine Eingabe in Schweizer Schreibweise und gibt das ISO-Datum zurück.
 * Erlaubt sind `19.11.2026` und `9.1.2026`. Zweistellige Jahre und Tage,
 * die es nicht gibt (`31.02.2026`), ergeben `null`.
 */
export function parseSwissDate(text: string): string | null {
  const match = SWISS_PATTERN.exec(text.trim());
  if (!match) return null;
  const parts = { day: Number(match[1]), month: Number(match[2]), year: Number(match[3]) };
  return isRealDate(parts) ? toIsoDate(parts.year, parts.month, parts.day) : null;
}

/** Schreibt ein ISO-Datum als `TT.MM.JJJJ`. Ungültige Werte ergeben einen leeren Text. */
export function formatSwissDate(iso: string | null | undefined): string {
  const parts = iso ? parseIsoDate(iso) : null;
  return parts ? `${pad(parts.day, 2)}.${pad(parts.month, 2)}.${pad(parts.year, 4)}` : "";
}

/** ISO-Datum als `Date` um Mitternacht UTC, zum Formatieren mit `Intl` und `timeZone: "UTC"`. */
export function isoToUtcDate(iso: string): Date {
  const parts = parseIsoDate(iso);
  if (!parts) return new Date(Number.NaN);
  const date = new Date(Date.UTC(2000, parts.month - 1, parts.day));
  date.setUTCFullYear(parts.year);
  return date;
}

function utcDateToIso(date: Date): string {
  return toIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Heutiges Datum in der Zeitzone des Geräts. */
export function todayIso(now: Date = new Date()): string {
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function addDays(iso: string, amount: number): string {
  return utcDateToIso(new Date(isoToUtcDate(iso).getTime() + amount * DAY_MS));
}

/** Verschiebt um Monate. Gibt es den Tag im Zielmonat nicht, gilt dessen letzter Tag (31.01. plus 1 Monat ist 28.02.). */
export function addMonths(iso: string, amount: number): string {
  const parts = parseIsoDate(iso);
  if (!parts) return iso;
  const index = parts.year * 12 + (parts.month - 1) + amount;
  const year = Math.floor(index / 12);
  const month = (((index % 12) + 12) % 12) + 1;
  return toIsoDate(year, month, Math.min(parts.day, daysInMonth(year, month)));
}

/** Wochentag mit Montag als 0 und Sonntag als 6. */
export function weekdayIndex(iso: string): number {
  return (isoToUtcDate(iso).getUTCDay() + 6) % 7;
}

export function startOfWeek(iso: string): string {
  return addDays(iso, -weekdayIndex(iso));
}

export function endOfWeek(iso: string): string {
  return addDays(iso, 6 - weekdayIndex(iso));
}

/** Begrenzt ein Datum auf `min` und `max` (beide einschliesslich). */
export function clampIsoDate(iso: string, min?: string, max?: string): string {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
}

export function isWithinRange(iso: string, min?: string, max?: string): boolean {
  return clampIsoDate(iso, min, max) === iso;
}

/**
 * Raster eines Monats: ganze Wochen von Montag bis Sonntag als ISO-Daten.
 * Die erste und die letzte Woche enthalten auch Tage der Nachbarmonate.
 */
export function monthGrid(year: number, month: number): string[][] {
  const first = toIsoDate(year, month, 1);
  const last = toIsoDate(year, month, daysInMonth(year, month));
  const weeks: string[][] = [];
  for (let monday = startOfWeek(first); monday <= last; monday = addDays(monday, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, offset) => addDays(monday, offset)));
  }
  return weeks;
}
