import type { ReactNode } from "react";
import { cn } from "../../cn";
import type { DataTableColumn, DataTableDensity } from "./data-table-types";

export interface DataTableRowProps<Row> {
  row: Row;
  columns: readonly DataTableColumn<Row>[];
  density: DataTableDensity;
  selected?: boolean;
  /** Kästchen der Zeile; ohne Angabe gibt es keine Auswahlspalte. */
  checkbox?: ReactNode;
  /** Zeilenaktionen, in der Regel ein Menü hinter einem `IconButton`. */
  actions?: ReactNode;
  /** Die Tabelle hat eine Aktionsspalte, auch wenn diese Zeile keine Aktion hat. */
  hasActions: boolean;
}

/** Zeile der Tabelle ab 768 px. `compact` ist 40 px hoch (Admin), `comfortable` 56 px. */
export function DataTableRow<Row>({ row, columns, density, selected, checkbox, actions, hasActions }: DataTableRowProps<Row>) {
  const cell = cn("border-b border-border text-small text-ink", density === "compact" ? "h-10 px-3 py-1" : "h-14 px-4 py-2");
  return (
    <tr data-selected={selected || undefined} className="transition-colors duration-state hover:bg-surface-2 data-selected:bg-surface-2">
      {checkbox ? <td className={cn(cell, "w-px")}>{checkbox}</td> : null}
      {columns.map((column) => (
        <td key={column.id} className={cn(cell, column.align === "end" && "text-right")}>
          {column.cell(row)}
        </td>
      ))}
      {hasActions ? <td className={cn(cell, "w-px py-0 text-right")}>{actions}</td> : null}
    </tr>
  );
}
