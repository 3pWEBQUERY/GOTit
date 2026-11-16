"use client";

import { usePlotArea } from "recharts";
import type { ChartDatum } from "./chart-table";

export interface BarChartRowLabelProps {
  /** Von recharts gesetzt: Lage des Balkens und Position in den Daten. */
  x?: number | string;
  y?: number | string;
  index?: number;
  data: readonly ChartDatum[];
  formatValue: (value: number) => string;
}

/**
 * Beschriftung eines horizontalen Balkens: Name links über dem Balken, Wert und
 * Zusatz (Quote) rechts. So braucht die Achse keinen Platz und die Balken
 * behalten bei 320 px die volle Breite.
 */
export function BarChartRowLabel({ x, y, index, data, formatValue }: BarChartRowLabelProps) {
  const plot = usePlotArea();
  const datum = index === undefined ? undefined : data[index];
  if (!datum || !plot) return null;
  const top = Number(y) - 8;
  return (
    <g>
      <text x={Number(x)} y={top} fill="var(--ink)" fontSize={14}>
        {datum.label}
      </text>
      <text x={plot.x + plot.width} y={top} textAnchor="end" fontSize={14}>
        <tspan fill="var(--ink)" fontWeight={550}>
          {formatValue(datum.value)}
        </tspan>
        {datum.note ? (
          <tspan fill="var(--ink-muted)" dx={8}>
            {datum.note}
          </tspan>
        ) : null}
      </text>
    </g>
  );
}
