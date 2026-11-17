import type { Locale } from "@app/core/locale";
import type { StatsOverview } from "@app/core/stats";
import { UiLink } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { ViewsChart } from "../../stats/components/charts";
import { KpiRow } from "../../stats/components/kpi-row";
import { dayLabel, kpiItems } from "../../stats/lib/kpi-items";
import {
  PRESET_DAYS,
  rangeQuery,
  type StatsPreset,
} from "../../stats/lib/range-params";
import { PeriodSwitch } from "./period-switch";

export const TODAY_PRESETS = [
  "7d",
  "30d",
] as const satisfies readonly StatsPreset[];
export const TODAY_FALLBACK = "7d" as const;
type TodayPreset = (typeof TODAY_PRESETS)[number];

const withQuery = (path: string, query: Record<string, string>) =>
  Object.keys(query).length > 0
    ? `${path}?${new URLSearchParams(query)}`
    : path;

/**
 * «Letzte 7 Tage» auf Heute (PRD v2 11.1): Zeitraum in der URL, höchstens vier
 * Kennzahlen mit Vergleich in Zahl und Wort, eine Linie und «Zur Statistik»
 * mit demselben Zeitraum.
 */
export async function TodayStats({
  locale,
  overview,
  preset,
}: {
  locale: Locale;
  overview: StatsOverview;
  preset: TodayPreset;
}) {
  const [t, tStats] = await Promise.all([
    getTranslations({ locale, namespace: "studio.today" }),
    getTranslations({ locale, namespace: "stats" }),
  ]);
  const days = PRESET_DAYS[preset];
  const here = getPathname({ href: "/studio", locale });
  return (
    <section
      aria-labelledby="today-kpis-heading"
      data-today-stats
      className="flex min-w-0 flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="today-kpis-heading" className="text-h2">
          {t("kpis.heading", { days })}
        </h2>
        <PeriodSwitch
          label={tStats("period.group")}
          options={TODAY_PRESETS.map((option) => ({
            key: option,
            label: tStats(`period.${option}`),
            href: withQuery(
              here,
              rangeQuery({ preset: option }, TODAY_FALLBACK),
            ),
            current: option === preset,
          }))}
        />
      </div>
      <KpiRow items={kpiItems(overview, days, locale, tStats)} />
      <ViewsChart
        points={overview.viewsPerDay.map((point) => ({
          label: dayLabel(point.day, locale),
          value: point.value,
        }))}
        height={180}
        texts={{
          title: tStats("views.title"),
          emptyText: tStats("chart.empty"),
          footnote: tStats("views.footnote"),
          tableLabels: {
            show: tStats("chart.showTable"),
            hide: tStats("chart.showChart"),
            labelColumn: tStats("views.day"),
            valueColumn: tStats("views.value"),
          },
        }}
      />
      <UiLink
        href={withQuery(
          getPathname({ href: "/studio/statistik", locale }),
          rangeQuery({ preset }, TODAY_FALLBACK),
        )}
        className="inline-flex min-h-11 items-center self-end text-body text-ink underline underline-offset-4 hover:text-accent"
      >
        {t("kpis.toStats")}
      </UiLink>
    </section>
  );
}
