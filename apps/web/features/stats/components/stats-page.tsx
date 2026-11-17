import type { Locale } from "@app/core/locale";
import { MAX_RANGE_DAYS, daysIn, rangeEndingToday } from "@app/core/stats";
import { getTranslations } from "next-intl/server";
import { TopBarTitle } from "../../shell/components/top-bar-title";
import { funnelRows } from "../lib/funnel";
import { dayLabel, kpiItems } from "../lib/kpi-items";
import {
  STATS_FALLBACK,
  STATS_PRESETS,
  parseStatsRange,
} from "../lib/range-params";
import type { StatsData } from "../queries/load-stats";
import { FunnelChart, ViewsChart, type ChartTexts } from "./charts";
import { KpiRow } from "./kpi-row";
import { StatsPeriod } from "./stats-period";
import { MediaTable, SearchesTable } from "./stats-tables";

type Raw = Record<string, string | string[] | undefined>;

/** Zeitraum der Seite aus der URL; heute ist ein Kalendertag in Zürich. */
export function statsRange(raw: Raw, now = new Date()) {
  const today = rangeEndingToday(1, now).to;
  return {
    today,
    parsed: parseStatsRange(raw, today, {
      allowed: STATS_PRESETS,
      fallback: STATS_FALLBACK,
      maxDays: MAX_RANGE_DAYS,
    }),
  };
}

/**
 * Statistik `/studio/statistik` (PRD v2 11.6), von oben nach unten:
 * Zeitraum, Kennzahlen mit Vergleich, Trichter, Profilaufrufe pro Tag und die
 * beiden Tabellen. Jede Grafik hat eine Tabellenansicht, einen Leerzustand und
 * eine Fussnote. Nie einzelne Besucher.
 */
export async function StatsPage({
  locale,
  data,
  raw,
}: {
  locale: Locale;
  data: StatsData;
  raw: Raw;
}) {
  const t = await getTranslations({ locale, namespace: "stats" });
  const { today, parsed } = statsRange(raw);
  const { overview } = data;
  const days = daysIn(overview.range).length;
  const percent = new Intl.NumberFormat(`${locale}-CH`, {
    style: "percent",
    maximumFractionDigits: 1,
  });
  const chartTexts = (
    key: "funnel" | "views",
    labelColumn: string,
    valueColumn: string,
    noteColumn?: string,
  ): ChartTexts => ({
    title: t(`${key}.title`),
    emptyText: t("chart.empty"),
    footnote: t(`${key}.footnote`),
    tableLabels: {
      show: t("chart.showTable"),
      hide: t("chart.showChart"),
      labelColumn,
      valueColumn,
      noteColumn,
    },
  });
  const funnel = funnelRows(overview.funnel).map((row, index) => ({
    label: t(`funnel.${row.step}`),
    value: row.value,
    note:
      index === 0
        ? undefined
        : row.rate === null
          ? t("funnel.noRate")
          : percent.format(row.rate),
  }));

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <TopBarTitle title={t("title")} />
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="max-w-prose text-body text-ink-muted">{t("intro")}</p>
      </header>

      <StatsPeriod
        locale={locale}
        today={today}
        parsed={parsed}
        range={overview.range}
        previous={data.previous}
      />

      <section aria-labelledby="stats-kpis" className="flex flex-col gap-3">
        <h2 id="stats-kpis" className="text-h2">
          {t("kpi.heading")}
        </h2>
        <KpiRow
          items={kpiItems(overview, days, locale, t)}
          footnote={t("kpi.footnote")}
        />
      </section>

      <FunnelChart
        rows={funnel}
        texts={chartTexts(
          "funnel",
          t("funnel.step"),
          t("funnel.count"),
          t("funnel.rate"),
        )}
      />
      <ViewsChart
        titleAs="h2"
        points={overview.viewsPerDay.map((point) => ({
          label: dayLabel(point.day, locale),
          value: point.value,
        }))}
        texts={chartTexts("views", t("views.day"), t("views.value"))}
      />

      <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2">
        <SearchesTable
          rows={data.searches}
          texts={{
            title: t("searches.title"),
            emptyText: t("chart.empty"),
            footnote: t("searches.footnote"),
            labelColumn: t("searches.search"),
            valueColumn: t("searches.impressions"),
          }}
        />
        <MediaTable
          rows={data.media}
          noAlt={t("media.noAlt")}
          texts={{
            title: t("media.title"),
            emptyText: t("chart.empty"),
            footnote: t("media.footnote"),
            labelColumn: t("media.medium"),
            valueColumn: t("media.views"),
          }}
        />
      </div>
    </div>
  );
}
