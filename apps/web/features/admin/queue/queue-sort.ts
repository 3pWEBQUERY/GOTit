import type { DataTableSort } from "@app/ui";

/** Sortierung der Warteschlange in der URL (`?sortierung=eingereicht&richtung=ab`); Vorgabe: älteste zuerst. */
export const QUEUE_SORT_COLUMN = "eingereicht";

export function parseQueueSort(params: { sortierung?: string | string[]; richtung?: string | string[] }): DataTableSort {
  const direction = params.richtung === "ab" ? "desc" : "asc";
  return { column: QUEUE_SORT_COLUMN, direction };
}

export function queueSortQuery(sort: DataTableSort): string {
  return sort.direction === "asc" ? "" : `?sortierung=${QUEUE_SORT_COLUMN}&richtung=ab`;
}
