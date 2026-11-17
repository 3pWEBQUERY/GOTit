"use client";

import {
  BarChart,
  LineChart,
  type ChartDatum,
  type ChartTableLabels,
} from "@app/ui";
import { useLocale } from "next-intl";
import { useMemo } from "react";

export interface ChartTexts {
  title: string;
  emptyText: string;
  footnote: string;
  tableLabels: ChartTableLabels;
}

function useNumber(): (value: number) => string {
  const locale = useLocale();
  return useMemo(() => {
    const format = new Intl.NumberFormat(`${locale}-CH`);
    return (value: number) => format.format(value);
  }, [locale]);
}

/**
 * Eine Linie: Profilaufrufe pro Tag (PRD v2 11.1, 11.6). Gibt es im Zeitraum
 * keinen einzigen Aufruf, steht der Leerzustand statt einer Nulllinie.
 */
export function ViewsChart({
  points,
  texts,
  titleAs = "h3",
  height,
}: {
  points: readonly ChartDatum[];
  texts: ChartTexts;
  titleAs?: "h2" | "h3";
  height?: number;
}) {
  const formatValue = useNumber();
  const data = points.some((point) => point.value > 0) ? points : [];
  return (
    <div data-stats-chart="views">
      <LineChart
        {...texts}
        titleAs={titleAs}
        data={data}
        formatValue={formatValue}
        height={height}
      />
    </div>
  );
}

/** Trichter als liegende Balken, die Quote neben dem Wert (PRD v2 11.6). */
export function FunnelChart({
  rows,
  texts,
}: {
  rows: readonly ChartDatum[];
  texts: ChartTexts;
}) {
  const formatValue = useNumber();
  const data = rows.some((row) => row.value > 0) ? rows : [];
  return (
    <div data-stats-chart="funnel">
      <BarChart
        {...texts}
        titleAs="h2"
        layout="horizontal"
        data={data}
        formatValue={formatValue}
      />
    </div>
  );
}
