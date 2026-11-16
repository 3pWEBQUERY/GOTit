"use client";

import { Bar, BarChart as BarChartPrimitive, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChartRowLabel } from "./bar-chart-row-label";
import { ChartFrame, type ChartBaseProps } from "./chart-frame";
import { ChartTooltip } from "./chart-tooltip";
import { useReducedMotion } from "./use-reduced-motion";

export interface BarChartProps extends ChartBaseProps {
  /**
   * Richtung der Balken: `vertical` sind Säulen über einer Achse, `horizontal`
   * liegende Balken untereinander, zum Beispiel für den Trichter. Dort steht
   * der Zusatz `note` (Quote) neben dem Wert.
   */
  layout?: "horizontal" | "vertical";
  /** Höhe der Zeichenfläche in Pixeln. Liegende Balken bestimmen sie selbst aus der Anzahl. */
  height?: number;
}

const tick = { fill: "var(--ink-muted)", fontSize: 13 };

/** Höhe eines liegenden Balkens samt seiner Beschriftungszeile. */
const ROW_HEIGHT = 56;

/** Balken in einer Farbe aus den Tokens. Die Tabellenansicht zeigt dieselben Daten. */
export function BarChart({ layout = "vertical", height = 240, ...frame }: BarChartProps) {
  const reducedMotion = useReducedMotion();
  const { data, formatValue, tableLabels } = frame;
  const rows = [...data];

  if (layout === "horizontal") {
    const ownHeight = rows.length * ROW_HEIGHT + 8;
    return (
      <ChartFrame {...frame} height={ownHeight}>
        <ResponsiveContainer width="100%" height={ownHeight}>
          {/* recharts nennt liegende Balken `layout="vertical"`. */}
          <BarChartPrimitive data={rows} layout="vertical" accessibilityLayer={false} barSize={12} margin={{ top: 24, right: 0, bottom: 0, left: 0 }}>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis type="category" dataKey="label" hide />
            <Bar dataKey="value" fill="var(--accent)" radius={6} background={{ fill: "var(--surface-2)", radius: 6 }} isAnimationActive={!reducedMotion} animationDuration={250}>
              <LabelList dataKey="value" content={<BarChartRowLabel data={rows} formatValue={formatValue} />} />
            </Bar>
          </BarChartPrimitive>
        </ResponsiveContainer>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame {...frame} height={height}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChartPrimitive data={rows} accessibilityLayer={false} margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" stroke="var(--border-strong)" tick={tick} tickLine={false} tickMargin={8} minTickGap={8} />
          <YAxis stroke="var(--ink-muted)" tick={tick} tickLine={false} axisLine={false} tickFormatter={formatValue} width="auto" allowDecimals={false} />
          <Tooltip cursor={{ fill: "var(--surface-2)" }} isAnimationActive={false} content={<ChartTooltip formatValue={formatValue} valueLabel={tableLabels.valueColumn} />} />
          <Bar dataKey="value" fill="var(--accent)" radius={[6, 6, 0, 0]} maxBarSize={48} isAnimationActive={!reducedMotion} animationDuration={250} />
        </BarChartPrimitive>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
