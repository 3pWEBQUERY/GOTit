"use client";

import { CartesianGrid, Line, LineChart as LineChartPrimitive, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartFrame, type ChartBaseProps } from "./chart-frame";
import { ChartTooltip } from "./chart-tooltip";
import { useReducedMotion } from "./use-reduced-motion";

export interface LineChartProps extends ChartBaseProps {
  /** Höhe der Zeichenfläche in Pixeln. */
  height?: number;
}

const tick = { fill: "var(--ink-muted)", fontSize: 13 };

/**
 * Eine Linie über die Zeit, zum Beispiel Profilaufrufe pro Tag. Farben kommen
 * aus den Tokens; die Tabellenansicht zeigt dieselben Daten.
 */
export function LineChart({ height = 240, ...frame }: LineChartProps) {
  const reducedMotion = useReducedMotion();
  const { data, formatValue, tableLabels } = frame;
  return (
    <ChartFrame {...frame} height={height}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChartPrimitive data={[...data]} accessibilityLayer={false} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" stroke="var(--border-strong)" tick={tick} tickLine={false} tickMargin={8} minTickGap={24} />
          <YAxis stroke="var(--ink-muted)" tick={tick} tickLine={false} axisLine={false} tickFormatter={formatValue} width="auto" allowDecimals={false} />
          <Tooltip cursor={{ stroke: "var(--border-strong)" }} isAnimationActive={false} content={<ChartTooltip formatValue={formatValue} valueLabel={tableLabels.valueColumn} />} />
          <Line
            type="linear"
            dataKey="value"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={!reducedMotion}
            animationDuration={250}
          />
        </LineChartPrimitive>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
