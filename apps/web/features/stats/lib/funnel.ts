import type { StatsOverview } from "@app/core/stats";

/**
 * Trichter der Statistik (PRD v2 11.6): Einblendungen → Profilaufrufe →
 * Kontaktaktionen → Terminanfragen → bestätigte Termine. Die Quote jeder Stufe
 * bezieht sich auf die Stufe davor; ohne Vorstufe (0) gibt es keine Quote.
 */
export const FUNNEL_STEPS = [
  "impressions",
  "profileViews",
  "contactActions",
  "bookingRequests",
  "confirmed",
] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export interface FunnelRow {
  step: FunnelStep;
  value: number;
  /** Anteil an der Stufe davor (0 bis 1, kann über 1 liegen); `null` bei der ersten Stufe oder einer Vorstufe von 0. */
  rate: number | null;
}

export function rate(value: number, base: number): number | null {
  return base > 0 ? value / base : null;
}

export function funnelRows(funnel: StatsOverview["funnel"]): FunnelRow[] {
  return FUNNEL_STEPS.map((step, index) => {
    const previous = index > 0 ? FUNNEL_STEPS[index - 1] : undefined;
    return {
      step,
      value: funnel[step],
      rate: previous ? rate(funnel[step], funnel[previous]) : null,
    };
  });
}

/** Gibt es im Trichter überhaupt etwas zu zeigen? */
export function funnelHasData(rows: readonly FunnelRow[]): boolean {
  return rows.some((row) => row.value > 0);
}
