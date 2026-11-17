import type { DayRange } from "@app/core/stats";

/**
 * Zeitraum in der URL (PRD v2 11.6, v1 7.2): `?zeitraum=7|30|90` oder ein
 * eigener Zeitraum `?von=JJJJ-MM-TT&bis=JJJJ-MM-TT`. Der letzte Tag ist
 * höchstens heute; ein Zeitraum hat höchstens `maxDays` Tage. Ungültiges
 * fällt auf die Voreinstellung zurück und nennt den Grund.
 */
export const PRESET_DAYS = { "1d": 1, "7d": 7, "30d": 30, "90d": 90 } as const;
export type StatsPreset = keyof typeof PRESET_DAYS;
/** Wahl der Statistik; «Heute» bietet nur 7 und 30 Tage. */
export const STATS_PRESETS = ["1d", "7d", "30d", "90d"] as const;
export const STATS_FALLBACK = "7d" as const;
export const RANGE_PARAM = "zeitraum";
export const FROM_PARAM = "von";
export const TO_PARAM = "bis";

export type RangeProblem = "order" | "future" | "tooLong" | "invalid";

export interface ParsedRange {
  preset: StatsPreset | "custom";
  range: DayRange;
  /** Nur beim eigenen Zeitraum: was daran nicht ging. Die Seite zeigt dann die Voreinstellung. */
  problem: RangeProblem | null;
  /** Die eingegebenen Tage des eigenen Zeitraums, auch wenn sie ungültig sind. */
  custom: { from: string; to: string } | null;
}

type Raw = Record<string, string | string[] | undefined>;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function firstOf(raw: Raw, key: string): string | null {
  const value = raw[key];
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

export function isIsoDay(value: string): boolean {
  if (!ISO_DAY.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Anzahl Tage von `from` bis `to`, beide eingeschlossen. */
export function dayCount(from: string, to: string): number {
  return (
    Math.round(
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
        86_400_000,
    ) + 1
  );
}

export function presetRange(preset: StatsPreset, today: string): DayRange {
  return { from: addDays(today, -(PRESET_DAYS[preset] - 1)), to: today };
}

export function parsePreset(
  raw: Raw,
  allowed: readonly StatsPreset[],
  fallback: StatsPreset,
): StatsPreset {
  const value = `${firstOf(raw, RANGE_PARAM) ?? ""}d`;
  return (allowed as readonly string[]).includes(value)
    ? (value as StatsPreset)
    : fallback;
}

export function parseStatsRange(
  raw: Raw,
  today: string,
  options: {
    allowed: readonly StatsPreset[];
    fallback: StatsPreset;
    maxDays: number;
  },
): ParsedRange {
  const preset = parsePreset(raw, options.allowed, options.fallback);
  const presetResult = (
    problem: RangeProblem | null,
    custom: ParsedRange["custom"],
  ): ParsedRange => ({
    preset: custom ? "custom" : preset,
    range: presetRange(preset, today),
    problem,
    custom,
  });
  const from = firstOf(raw, FROM_PARAM);
  const to = firstOf(raw, TO_PARAM);
  if (from === null && to === null) return presetResult(null, null);
  const custom = { from: from ?? "", to: to ?? "" };
  if (!from || !to || !isIsoDay(from) || !isIsoDay(to))
    return presetResult("invalid", custom);
  if (from > to) return presetResult("order", custom);
  if (to > today) return presetResult("future", custom);
  if (dayCount(from, to) > options.maxDays)
    return presetResult("tooLong", custom);
  return { preset: "custom", range: { from, to }, problem: null, custom };
}

/** Query der Adresse für einen Zeitraum; die Voreinstellung `fallback` lässt den Parameter weg. */
export function rangeQuery(
  value:
    | { preset: StatsPreset }
    | { preset: "custom"; from: string; to: string },
  fallback: StatsPreset,
): Record<string, string> {
  if (value.preset === "custom")
    return { [FROM_PARAM]: value.from, [TO_PARAM]: value.to };
  return value.preset === fallback
    ? {}
    : { [RANGE_PARAM]: String(PRESET_DAYS[value.preset]) };
}
