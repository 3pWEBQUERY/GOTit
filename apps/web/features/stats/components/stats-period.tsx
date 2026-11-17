import type { Locale } from "@app/core/locale";
import { MAX_RANGE_DAYS, type DayRange } from "@app/core/stats";
import { InlineAlert } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { rangeLabel } from "../lib/kpi-items";
import {
  PRESET_DAYS,
  STATS_FALLBACK,
  addDays,
  type ParsedRange,
} from "../lib/range-params";
import { RangeControl } from "./range-control";

/** Zeitraumwahl mit dem gezeigten Zeitraum und der Vorperiode; ein ungültiger eigener Zeitraum nennt den Grund am Ort. */
export async function StatsPeriod({
  locale,
  today,
  parsed,
  range,
  previous,
}: {
  locale: Locale;
  today: string;
  parsed: ParsedRange;
  range: DayRange;
  previous: DayRange;
}) {
  const t = await getTranslations({ locale, namespace: "stats" });
  const fallbackDays = PRESET_DAYS[STATS_FALLBACK];
  return (
    <section aria-labelledby="stats-period" className="flex flex-col gap-3">
      <h2 id="stats-period" className="sr-only">
        {t("period.group")}
      </h2>
      <RangeControl
        value={
          parsed.preset === "custom"
            ? {
                preset: "custom",
                from: parsed.custom?.from ?? "",
                to: parsed.custom?.to ?? "",
              }
            : { preset: parsed.preset }
        }
        labels={{
          group: t("period.group"),
          "1d": t("period.1d"),
          "7d": t("period.7d"),
          "30d": t("period.30d"),
          "90d": t("period.90d"),
          custom: t("period.custom"),
          from: t("period.from"),
          to: t("period.to"),
          date: {
            openCalendar: t("period.openCalendar"),
            previousMonth: t("period.previousMonth"),
            nextMonth: t("period.nextMonth"),
            invalidFormat: t("period.invalidFormat"),
            outOfRange: t("period.outOfRange"),
          },
        }}
        locale={locale}
        today={today}
        min={addDays(today, -(3 * MAX_RANGE_DAYS))}
        dateHint={t("period.dateHint")}
        fallback={STATS_FALLBACK}
        customDefault={range}
      />
      {parsed.problem ? (
        <InlineAlert
          tone="warning"
          title={t(`period.problem.${parsed.problem}`, {
            days: fallbackDays,
            max: MAX_RANGE_DAYS,
          })}
        />
      ) : null}
      <p data-stats-period className="text-small text-ink-muted">
        {t("period.shown", {
          range: rangeLabel(range, locale),
          previous: rangeLabel(previous, locale),
        })}
      </p>
    </section>
  );
}
