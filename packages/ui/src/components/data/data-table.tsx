"use client";

import { useId, type ReactNode } from "react";
import { cn } from "../../cn";
import { Skeleton } from "../feedback/skeleton";
import { DataTableCard, cardColumns } from "./data-table-card";
import { DataTableCheckbox } from "./data-table-checkbox";
import { DataTableHead } from "./data-table-head";
import { DataTableRow } from "./data-table-row";
import type { DataTableColumn, DataTableDensity, DataTableSelectionLabels, DataTableSort } from "./data-table-types";

export interface DataTableProps<Row> {
  /** Name der Tabelle. Pflicht; mit `captionHidden` nur für Screenreader. */
  caption: ReactNode;
  captionHidden?: boolean;
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  getRowId: (row: Row) => string;
  /** Gesteuerte Sortierung, damit die App sie in die URL legen kann. Sortiert wird ausserhalb. */
  sort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort) => void;
  /** Gesteuerte Mehrfachauswahl. Mit `selectedIds` erscheinen die Kästchen; dann ist `selectionLabels` nötig. */
  selectedIds?: readonly string[];
  onSelectionChange?: (ids: string[]) => void;
  selectionLabels?: DataTableSelectionLabels<Row>;
  /** Sammelaktionen; erscheinen neben der Anzahl, sobald etwas ausgewählt ist. */
  bulkActions?: ReactNode;
  /** Aktionen einer Zeile, in der Regel ein Menü. Braucht `rowActionsLabel` als Spaltenkopf. */
  rowActions?: (row: Row) => ReactNode;
  rowActionsLabel?: string;
  /** `compact` hat 40 px Zeilenhöhe und ist für den Admin gedacht. */
  density?: DataTableDensity;
  /** Zeigt Skelett-Zeilen in der Form der Tabelle. */
  loading?: boolean;
  loadingRows?: number;
  /** Steht anstelle der Zeilen, wenn `rows` leer ist, zum Beispiel ein `EmptyState`. */
  empty?: ReactNode;
  /** Steht anstelle der Zeilen, wenn das Laden scheiterte, zum Beispiel ein `ErrorState`. */
  error?: ReactNode;
  className?: string;
}

/**
 * Tabelle mit haftender Kopfzeile, gesteuerter Sortierung und Mehrfachauswahl.
 * Unter 768 px wird jede Zeile zur Karte mit den wichtigsten Feldern; es gibt
 * kein horizontales Scrollen. Der Abstand der Kopfzeile zum oberen Rand lässt
 * sich über `--data-table-sticky-top` setzen.
 */
export function DataTable<Row>({ caption, captionHidden, columns, rows, getRowId, sort = null, onSortChange, selectedIds, onSelectionChange, selectionLabels, bulkActions, rowActions, rowActionsLabel, density = "comfortable", loading, loadingRows = 5, empty, error, className }: DataTableProps<Row>) {
  const captionId = useId();
  const selection = selectedIds !== undefined && selectionLabels !== undefined ? { ids: new Set(selectedIds), labels: selectionLabels } : null;
  const state = error ? "error" : loading ? "loading" : rows.length === 0 ? "empty" : "ready";
  const visibleRows = state === "ready" ? rows : [];
  const rowIds = visibleRows.map(getRowId);
  const selectedCount = selection ? rowIds.filter((id) => selection.ids.has(id)).length : 0;
  const allSelected = rowIds.length > 0 && selectedCount === rowIds.length;
  const hasActions = Boolean(rowActions && rowActionsLabel);
  const mobileColumns = cardColumns(columns);
  const skeletonRows = Array.from({ length: Math.max(1, loadingRows) }, (_, index) => index);

  function toggleAll(checked: boolean) {
    onSelectionChange?.(checked ? rowIds : []);
  }

  function toggleRow(id: string, checked: boolean) {
    if (!selection) return;
    const next = new Set(selection.ids);
    if (checked) next.add(id);
    else next.delete(id);
    onSelectionChange?.([...next]);
  }

  function selectAllBox() {
    if (!selection) return null;
    return <DataTableCheckbox label={selection.labels.selectAll} checked={allSelected ? true : selectedCount > 0 ? "indeterminate" : false} disabled={rowIds.length === 0} onCheckedChange={toggleAll} />;
  }

  function rowBox(row: Row, id: string) {
    if (!selection) return undefined;
    return <DataTableCheckbox label={selection.labels.selectRow(row)} checked={selection.ids.has(id)} onCheckedChange={(checked) => toggleRow(id, checked)} />;
  }

  return (
    <div data-state={state} className={cn("flex min-w-0 flex-col gap-3 text-ink", className)}>
      {selection ? (
        <div className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-2">
          <p role="status" className="tabular text-small font-[550]">
            {selectedCount > 0 ? selection.labels.selectedCount(selectedCount) : null}
          </p>
          {selectedCount > 0 && bulkActions ? <div className="flex flex-wrap items-center gap-2">{bulkActions}</div> : null}
        </div>
      ) : null}

      <table aria-busy={state === "loading" || undefined} className="hidden w-full border-separate border-spacing-0 md:table">
        <caption className={cn("pb-3 text-left text-h3", captionHidden && "sr-only")}>{caption}</caption>
        <DataTableHead columns={columns} sort={sort} onSortChange={onSortChange} density={density} selectAll={selectAllBox()} rowActionsLabel={hasActions ? rowActionsLabel : undefined} />
        <tbody>
          {state === "loading"
            ? skeletonRows.map((index) => (
                <tr key={index} data-skeleton-row>
                  {selection ? <td className={cn("border-b border-border", density === "compact" ? "h-10 px-3" : "h-14 px-4")} /> : null}
                  {columns.map((column) => (
                    <td key={column.id} className={cn("border-b border-border", density === "compact" ? "h-10 px-3" : "h-14 px-4")}>
                      <Skeleton className={column.align === "end" ? "ml-auto w-12" : "w-3/4"} />
                    </td>
                  ))}
                  {hasActions ? <td className="border-b border-border" /> : null}
                </tr>
              ))
            : visibleRows.map((row) => {
                const id = getRowId(row);
                return <DataTableRow key={id} row={row} columns={columns} density={density} selected={selection?.ids.has(id)} checkbox={rowBox(row, id)} actions={rowActions?.(row)} hasActions={hasActions} />;
              })}
        </tbody>
      </table>

      <div className="flex flex-col gap-3 md:hidden">
        <p id={captionId} className={cn("text-h3", captionHidden && "sr-only")}>
          {caption}
        </p>
        {selection && state === "ready" ? (
          <div className="flex min-h-11 items-center gap-3 px-4">
            {selectAllBox()}
            <span aria-hidden className="text-small text-ink-muted">
              {selection.labels.selectAll}
            </span>
          </div>
        ) : null}
        {state === "loading" ? (
          <div aria-hidden data-skeleton-cards className="flex flex-col gap-3">
            {skeletonRows.slice(0, 3).map((index) => (
              <div key={index} className="rounded-card border border-border bg-surface p-4">
                <Skeleton lines={mobileColumns.length} />
              </div>
            ))}
          </div>
        ) : null}
        {state === "ready" ? (
          <ul aria-labelledby={captionId} data-table-cards className="flex flex-col gap-3">
            {visibleRows.map((row) => {
              const id = getRowId(row);
              return <DataTableCard key={id} row={row} columns={mobileColumns} selected={selection?.ids.has(id)} checkbox={rowBox(row, id)} actions={hasActions ? rowActions?.(row) : undefined} />;
            })}
          </ul>
        ) : null}
      </div>

      {state === "error" ? <div>{error}</div> : null}
      {state === "empty" ? <div>{empty}</div> : null}
    </div>
  );
}
