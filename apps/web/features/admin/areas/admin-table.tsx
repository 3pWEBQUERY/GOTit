"use client";

import { DataTable, type DataTableColumn } from "@app/ui";
import type { ReactNode } from "react";

export interface AdminTableColumn {
  id: string;
  header: string;
  /** Felder der Karte unter 768 px: 1 ist das wichtigste. */
  priority?: 1 | 2 | 3;
  align?: "start" | "end";
}

export interface AdminTableRow {
  id: string;
  /** Fertig gerenderte Zellen pro Spalte; der Server übersetzt und formatiert. */
  cells: Record<string, ReactNode>;
}

/**
 * Dichte Tabelle der Admin-Bereiche (PRD 12.4: 40 px Zeilen, haftender Kopf).
 * Die Zellen kommen fertig vom Server, damit Seiten ohne eigene Client-Datei
 * pro Tabelle auskommen.
 */
export function AdminTable({ caption, columns, rows, empty, testId }: { caption: string; columns: readonly AdminTableColumn[]; rows: readonly AdminTableRow[]; empty?: ReactNode; testId?: string }) {
  const tableColumns: DataTableColumn<AdminTableRow>[] = columns.map((column) => ({
    id: column.id,
    header: column.header,
    priority: column.priority,
    align: column.align,
    cell: (row) => row.cells[column.id] ?? null,
  }));
  return (
    <div data-admin-table={testId}>
      <DataTable caption={caption} captionHidden columns={tableColumns} rows={rows} getRowId={(row) => row.id} density="compact" empty={empty} />
    </div>
  );
}
