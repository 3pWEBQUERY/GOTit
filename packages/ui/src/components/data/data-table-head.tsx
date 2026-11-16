"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../cn";
import type { DataTableColumn, DataTableDensity, DataTableSort } from "./data-table-types";

export interface DataTableHeadProps<Row> {
  columns: readonly DataTableColumn<Row>[];
  sort: DataTableSort | null;
  onSortChange?: (sort: DataTableSort) => void;
  density: DataTableDensity;
  /** Kästchen «alle auswählen»; ohne Angabe gibt es keine Auswahlspalte. */
  selectAll?: ReactNode;
  /** Kopf der Spalte mit den Zeilenaktionen (nur für Screenreader). Ohne Angabe gibt es die Spalte nicht. */
  rowActionsLabel?: string;
}

/**
 * Haftende Kopfzeile. Sortierbare Spalten tragen `aria-sort` und einen Button:
 * erster Klick aufsteigend, jeder weitere kehrt die Richtung um.
 */
export function DataTableHead<Row>({ columns, sort, onSortChange, density, selectAll, rowActionsLabel }: DataTableHeadProps<Row>) {
  const cell = cn("sticky top-(--data-table-sticky-top,0px) z-10 border-b border-border-strong bg-bg text-label text-ink-muted", density === "compact" ? "h-10 px-3" : "h-12 px-4");
  return (
    <thead>
      <tr>
        {selectAll ? (
          <th scope="col" className={cn(cell, "w-px")}>
            {selectAll}
          </th>
        ) : null}
        {columns.map((column) => {
          const active = sort?.column === column.id ? sort.direction : null;
          const align = column.align === "end" ? "text-right" : "text-left";
          if (!column.sortable) {
            return (
              <th key={column.id} scope="col" className={cn(cell, align)}>
                {column.header}
              </th>
            );
          }
          const Icon = active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ArrowUpDown;
          return (
            <th key={column.id} scope="col" aria-sort={active === "asc" ? "ascending" : active === "desc" ? "descending" : "none"} className={cn(cell, align)}>
              <button
                type="button"
                onClick={() => onSortChange?.({ column: column.id, direction: active === "asc" ? "desc" : "asc" })}
                className={cn(
                  "inline-flex items-center gap-1 rounded-chip text-label transition-colors duration-state hover:text-ink",
                  density === "compact" ? "min-h-10" : "min-h-11",
                  column.align === "end" && "flex-row-reverse",
                  active ? "text-ink" : "text-ink-muted",
                )}
              >
                <span>{column.header}</span>
                <Icon aria-hidden strokeWidth={1.5} className={cn("size-4 shrink-0", !active && "opacity-55")} />
              </button>
            </th>
          );
        })}
        {rowActionsLabel ? (
          <th scope="col" className={cn(cell, "w-px")}>
            <span className="sr-only">{rowActionsLabel}</span>
          </th>
        ) : null}
      </tr>
    </thead>
  );
}
