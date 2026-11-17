import type { Locale } from "@app/core/locale";
import type { StatsOverview } from "@app/core/stats";
import type { KpiItem } from "../components/kpi-row";
import { compareKpi, comparisonText, shownDirection } from "./compare";

type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

const KPI_KEYS = [
  "profileViews",
  "contactActions",
  "bookingRequests",
  "favoritesNet",
] as const;

export function numberFormat(locale: Locale): Intl.NumberFormat {
  return new Intl.NumberFormat(`${locale}-CH`);
}

/**
 * Die vier Kennzahlen mit Vergleich in Zahl und Wort (PRD v2 11.1), aus dem
 * Namensraum `stats`. Favoriten sind ein Saldo und tragen ein Vorzeichen.
 */
export function kpiItems(
  overview: StatsOverview,
  days: number,
  locale: Locale,
  t: Translate,
): KpiItem[] {
  const number = numberFormat(locale);
  const percent = new Intl.NumberFormat(`${locale}-CH`, {
    style: "percent",
    maximumFractionDigits: 0,
  });
  const signed = new Intl.NumberFormat(`${locale}-CH`, {
    signDisplay: "exceptZero",
  });
  const previous = t("kpi.previous", { days });
  return KPI_KEYS.map((key) => {
    const kpi = overview.kpis[key];
    const comparison = compareKpi(kpi, { absolute: key === "favoritesNet" });
    const text = comparisonText(comparison, {
      amount: (entry) =>
        entry.unit === "percent"
          ? percent.format(entry.amount / 100)
          : number.format(entry.amount),
      up: (amount) => t("kpi.up", { amount, previous }),
      down: (amount) => t("kpi.down", { amount, previous }),
      flat: () => t("kpi.flat", { previous }),
    });
    return {
      key,
      label: t(`kpi.${key}`),
      value:
        key === "favoritesNet"
          ? signed.format(kpi.value)
          : number.format(kpi.value),
      comparison: { text, direction: shownDirection(comparison) },
    };
  });
}

/** «Mo., 16.11.» für Achse und Tabelle; der Tag ist ein Kalendertag in Zürich. */
export function dayLabel(day: string, locale: Locale): string {
  return new Intl.DateTimeFormat(`${locale}-CH`, {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${day}T12:00:00Z`));
}

/** «16.10.2026–15.11.2026». */
export function rangeLabel(
  range: { from: string; to: string },
  locale: Locale,
): string {
  const format = new Intl.DateTimeFormat(`${locale}-CH`, {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return format.formatRange(
    new Date(`${range.from}T12:00:00Z`),
    new Date(`${range.to}T12:00:00Z`),
  );
}
