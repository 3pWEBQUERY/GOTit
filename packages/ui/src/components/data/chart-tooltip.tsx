export interface ChartTooltipProps {
  /** Von recharts gesetzt: Die Maus steht über einem Datenpunkt. */
  active?: boolean;
  label?: string | number;
  payload?: readonly { value?: unknown }[];
  formatValue: (value: number) => string;
  /** Name des Werts, zum Beispiel «Profilaufrufe». */
  valueLabel: string;
}

/** Inhalt des Tooltips einer Grafik: erhöhte Ebene mit Beschriftung und formatiertem Wert. */
export function ChartTooltip({ active, label, payload, formatValue, valueLabel }: ChartTooltipProps) {
  const value = payload?.[0]?.value;
  if (!active || typeof value !== "number") return null;
  return (
    <div className="rounded-control border border-border bg-surface px-3 py-2 text-small text-ink shadow-raised">
      <p className="text-ink-muted">{label}</p>
      <p className="tabular font-[550]">
        {formatValue(value)} <span className="font-normal text-ink-muted">{valueLabel}</span>
      </p>
    </div>
  );
}
