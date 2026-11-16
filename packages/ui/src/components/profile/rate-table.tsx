import type { ReactNode } from "react";
import { cn } from "../../cn";

export interface RateRow {
  key: string;
  /** Fertiger Text, zum Beispiel «1 Std.». */
  duration: string;
  /** Fertiger Text, zum Beispiel «CHF 300». */
  price: string;
  note?: ReactNode;
}

export interface RateTableProps {
  /** Beschriftung der Tabelle. */
  caption: string;
  /** Versteckt die Beschriftung visuell, wenn direkt darüber eine Überschrift steht. */
  hideCaption?: boolean;
  columns: { duration: string; price: string; note: string };
  rows: readonly RateRow[];
  /** Steht anstelle der Tabelle, wenn es keine Preise gibt, zum Beispiel «Preise auf Anfrage». */
  emptyText: string;
  /** Fertige Zeile mit dem Änderungsdatum, zum Beispiel «Stand: 02.11.2026». */
  updatedText?: string;
  className?: string;
}

/** Preise als echte Tabelle mit Änderungsdatum (PRD 10.1). Ohne Preise steht ein Satz, nie eine leere Tabelle. */
export function RateTable({ caption, hideCaption, columns, rows, emptyText, updatedText, className }: RateTableProps) {
  if (rows.length === 0) return <p className={cn("text-body text-ink", className)}>{emptyText}</p>;

  const cell = "border-b border-border py-3 pr-4 align-top last:pr-0";
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <table className="tabular w-full border-collapse text-left text-body text-ink">
        <caption className={cn("pb-2 text-left text-small text-ink-muted", hideCaption && "sr-only")}>{caption}</caption>
        <thead>
          <tr>
            {[columns.duration, columns.price, columns.note].map((column) => (
              <th key={column} scope="col" className="border-b border-border-strong py-2 pr-4 text-label text-ink-muted last:pr-0">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row" className={cn(cell, "font-normal")}>
                {row.duration}
              </th>
              <td className={cn(cell, "font-[550] whitespace-nowrap")}>{row.price}</td>
              <td className={cn(cell, "text-small text-ink-muted")}>{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {updatedText ? <p className="tabular text-small text-ink-muted">{updatedText}</p> : null}
    </div>
  );
}
