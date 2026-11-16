import type { ReactNode } from "react";
import { cn } from "../../cn";

export interface ChartDatum {
  label: string;
  value: number;
  /** Zusatz zum Wert, zum Beispiel die Quote «33 % der Einblendungen». */
  note?: string;
}

export interface ChartTableProps {
  /** Name der Tabelle; derselbe wie der Titel der Grafik. */
  caption: ReactNode;
  data: readonly ChartDatum[];
  formatValue: (value: number) => string;
  labelColumn: string;
  valueColumn: string;
  /** Kopf der dritten Spalte. Sie erscheint nur, wenn es Zusätze gibt. */
  noteColumn?: string;
  /** Nicht sichtbar bleibt die Tabelle für Screenreader lesbar: Sie ist die Textfassung der Grafik. */
  visible: boolean;
}

/** Tabellenansicht einer Grafik mit denselben Daten. */
export function ChartTable({ caption, data, formatValue, labelColumn, valueColumn, noteColumn, visible }: ChartTableProps) {
  const hasNotes = noteColumn !== undefined && data.some((datum) => datum.note);
  const head = "border-b border-border-strong px-3 py-3 text-label text-ink-muted first:pl-0 last:pr-0";
  const cell = "border-b border-border px-3 py-3 text-small text-ink first:pl-0 last:pr-0";
  return (
    <table className={cn("w-full border-separate border-spacing-0", !visible && "sr-only")}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className={cn(head, "text-left")}>
            {labelColumn}
          </th>
          <th scope="col" className={cn(head, "text-right")}>
            {valueColumn}
          </th>
          {hasNotes ? (
            <th scope="col" className={cn(head, "text-right")}>
              {noteColumn}
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {data.map((datum) => (
          <tr key={datum.label}>
            <th scope="row" className={cn(cell, "text-left font-normal")}>
              {datum.label}
            </th>
            <td className={cn(cell, "text-right")}>{formatValue(datum.value)}</td>
            {hasNotes ? <td className={cn(cell, "text-right text-ink-muted")}>{datum.note}</td> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
