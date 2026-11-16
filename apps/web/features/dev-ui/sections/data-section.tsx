"use client";

import { DataChartsDemo } from "./data-charts-demo";
import { DataPaginationDemo } from "./data-pagination-demo";
import { DataStatsDemo } from "./data-stats-demo";
import { DataTableDemo } from "./data-table-demo";

/** Testseite der Gruppe «Daten»: jede Komponente in allen Zuständen. Alle Namen und Zahlen sind Beispielwerte. */
export function DataSection() {
  return (
    <div className="flex flex-col gap-16">
      <DataTableDemo />
      <DataStatsDemo />
      <DataChartsDemo />
      <DataPaginationDemo />
    </div>
  );
}
