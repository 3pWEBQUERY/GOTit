import type { ReactNode } from "react";
import type { DataTableColumn } from "./data-table-types";

/** Die zwei bis drei wichtigsten Spalten in der Reihenfolge ihrer Priorität; ohne Angaben die ersten drei. */
export function cardColumns<Row>(columns: readonly DataTableColumn<Row>[]): DataTableColumn<Row>[] {
  const ranked = columns.filter((column) => column.priority !== undefined).sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  return (ranked.length > 0 ? ranked : [...columns]).slice(0, 3);
}

export interface DataTableCardProps<Row> {
  row: Row;
  /** Bereits auf die wichtigsten Felder gekürzt (`cardColumns`). */
  columns: readonly DataTableColumn<Row>[];
  selected?: boolean;
  checkbox?: ReactNode;
  actions?: ReactNode;
}

/** Zeile der Tabelle unter 768 px: eine Karte mit Feldname als Label und Wert. */
export function DataTableCard<Row>({ row, columns, selected, checkbox, actions }: DataTableCardProps<Row>) {
  return (
    <li data-selected={selected || undefined} className="flex items-start gap-3 rounded-card border border-border bg-surface p-4 data-selected:border-border-strong data-selected:bg-surface-2">
      {checkbox ? <div className="flex size-6 shrink-0 items-center justify-center">{checkbox}</div> : null}
      <dl className="flex min-w-0 flex-1 flex-col gap-3">
        {columns.map((column) => (
          <div key={column.id} className="flex min-w-0 flex-col gap-1">
            <dt className="text-label text-ink-muted">{column.header}</dt>
            <dd className="text-small text-ink">{column.cell(row)}</dd>
          </div>
        ))}
      </dl>
      {actions ? <div className="-mt-3 -mr-3 shrink-0">{actions}</div> : null}
    </li>
  );
}
