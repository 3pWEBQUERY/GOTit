import type { Kpi } from "@app/core/stats";

/**
 * Vergleich einer Kennzahl mit der Vorperiode (PRD v2 11.1): immer in Zahl
 * und Wort, nie nur als Pfeil. Mit Vorwert über null in Prozent, sonst als
 * Differenz; Favoriten (ein Saldo) immer als Differenz, denn Prozent eines
 * Saldos sagt nichts.
 */
export type CompareDirection = "up" | "down" | "flat";

export interface Comparison {
  direction: CompareDirection;
  /** `percent`: `amount` ist eine ganze Prozentzahl; `count`: eine Anzahl. */
  unit: "percent" | "count";
  /** Betrag der Änderung, immer ≥ 0. */
  amount: number;
}

export function compareKpi(
  kpi: Kpi,
  options: { absolute?: boolean } = {},
): Comparison {
  const delta = kpi.value - kpi.previous;
  const direction: CompareDirection =
    delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  if (!options.absolute && kpi.previous > 0)
    return {
      direction,
      unit: "percent",
      amount: Math.round((Math.abs(delta) / kpi.previous) * 100),
    };
  return { direction, unit: "count", amount: Math.abs(delta) };
}

export interface CompareWords {
  /** Formatierter Betrag, zum Beispiel «12 %» oder «5». */
  amount: (comparison: Comparison) => string;
  up: (amount: string) => string;
  down: (amount: string) => string;
  flat: () => string;
}

/** Satz für die Kennzahl, zum Beispiel «12 % mehr als in den 7 Tagen davor». */
export function comparisonText(
  comparison: Comparison,
  words: CompareWords,
): string {
  // Gerundet auf 0 % ist es für den Leser gleich viel, auch wenn sich die Zahl leicht bewegt hat.
  if (comparison.direction === "flat" || comparison.amount === 0)
    return words.flat();
  const amount = words.amount(comparison);
  return comparison.direction === "up" ? words.up(amount) : words.down(amount);
}

/** Richtung für das Icon; gleich zum Text, damit Icon und Wort nie widersprechen. */
export function shownDirection(comparison: Comparison): CompareDirection {
  return comparison.amount === 0 ? "flat" : comparison.direction;
}
