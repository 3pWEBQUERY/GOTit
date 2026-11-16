import type { ReactNode } from "react";

export interface DataTableColumn<Row> {
  /** Stabile Kennung der Spalte; steht in `sort.column` und damit in der URL. */
  id: string;
  /** Spaltenkopf. Auf Mobile ist er das Label des Felds in der Karte. */
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  sortable?: boolean;
  /** `end` für Zahlen und Beträge. */
  align?: "start" | "end";
  /** Felder der Karte unter 768 px: 1 ist das wichtigste. Spalten ohne Angabe fehlen dort. */
  priority?: 1 | 2 | 3;
}

export interface DataTableSort {
  column: string;
  direction: "asc" | "desc";
}

export type DataTableDensity = "comfortable" | "compact";

/** Texte der Mehrfachauswahl. */
export interface DataTableSelectionLabels<Row> {
  /** Name des Kästchens im Kopf, zum Beispiel «Alle Zeilen auswählen». */
  selectAll: string;
  /** Name des Kästchens einer Zeile, zum Beispiel «Beispielname auswählen». */
  selectRow: (row: Row) => string;
  /** Text über den Sammelaktionen, zum Beispiel «3 ausgewählt». */
  selectedCount: (count: number) => string;
}
