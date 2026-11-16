"use client";

import { Button, DataTable, EmptyState, ErrorState, IconButton, Menu, MenuContent, MenuItem, MenuTrigger, type DataTableColumn, type DataTableSort } from "@app/ui";
import { Ellipsis, Inbox } from "lucide-react";
import { useState } from "react";

interface ExampleRow {
  id: string;
  name: string;
  city: string;
  status: "Online" | "Pausiert";
  views: number;
  updated: string;
}

const exampleRows: ExampleRow[] = [
  { id: "1", name: "Beispielname A", city: "Beispielstadt", status: "Online", views: 412, updated: "12.11.2026" },
  { id: "2", name: "Beispielname B", city: "Musterstadt", status: "Pausiert", views: 96, updated: "03.11.2026" },
  { id: "3", name: "Beispielname C", city: "Beispielstadt", status: "Online", views: 251, updated: "15.11.2026" },
  { id: "4", name: "Beispielname D", city: "Musterdorf", status: "Online", views: 38, updated: "28.10.2026" },
];

const columns: DataTableColumn<ExampleRow>[] = [
  { id: "name", header: "Name", cell: (row) => <span className="font-[550]">{row.name}</span>, sortable: true, priority: 1 },
  { id: "city", header: "Ort", cell: (row) => row.city, sortable: true },
  { id: "status", header: "Status", cell: (row) => row.status, priority: 2 },
  { id: "views", header: "Aufrufe (Beispielwert)", cell: (row) => row.views, sortable: true, align: "end", priority: 3 },
  { id: "updated", header: "Aktualisiert", cell: (row) => row.updated, align: "end" },
];

const selectionLabels = {
  selectAll: "Alle Beispielzeilen auswählen",
  selectRow: (row: ExampleRow) => `${row.name} auswählen`,
  selectedCount: (count: number) => (count === 1 ? "1 Zeile ausgewählt" : `${count} Zeilen ausgewählt`),
};

function sortRows(rows: ExampleRow[], sort: DataTableSort | null): ExampleRow[] {
  if (!sort) return rows;
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sort.column === "views") return (a.views - b.views) * factor;
    if (sort.column === "city") return a.city.localeCompare(b.city, "de-CH") * factor;
    return a.name.localeCompare(b.name, "de-CH") * factor;
  });
}

function RowMenu({ row }: { row: ExampleRow }) {
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton label={`Aktionen für ${row.name} öffnen`} icon={<Ellipsis strokeWidth={1.5} />} />
      </MenuTrigger>
      <MenuContent align="end">
        <MenuItem>Profil ansehen</MenuItem>
        <MenuItem>Profil pausieren</MenuItem>
        <MenuItem destructive>Profil archivieren</MenuItem>
      </MenuContent>
    </Menu>
  );
}

/** DataTable der Testseite «Daten». */
export function DataTableDemo() {
  const [sort, setSort] = useState<DataTableSort | null>({ column: "name", direction: "asc" });
  const [selected, setSelected] = useState<string[]>(["2"]);
  const [compactSort, setCompactSort] = useState<DataTableSort | null>(null);

  return (
    <section className="flex flex-col gap-8">
      <h2 className="text-h2">DataTable</h2>
      <p className="max-w-prose text-small text-ink-muted">Unter 768 px Breite wird jede Zeile zur Karte mit Name, Status und Aufrufen. Die Kopfzeile haftet beim Scrollen der Seite.</p>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Sortierung, Auswahl, Sammel- und Zeilenaktionen</h3>
        <DataTable
          caption="Beispielprofile mit Auswahl"
          captionHidden
          columns={columns}
          rows={sortRows(exampleRows, sort)}
          getRowId={(row) => row.id}
          sort={sort}
          onSortChange={setSort}
          selectedIds={selected}
          onSelectionChange={setSelected}
          selectionLabels={selectionLabels}
          bulkActions={
            <>
              <Button onClick={() => setSelected([])}>Auswahl pausieren</Button>
              <Button variant="quiet" onClick={() => setSelected([])}>
                Auswahl aufheben
              </Button>
            </>
          }
          rowActions={(row) => <RowMenu row={row} />}
          rowActionsLabel="Aktionen"
        />
        <p role="status" className="text-small text-ink-muted">
          Sortiert nach: {sort ? `${sort.column}, ${sort.direction === "asc" ? "aufsteigend" : "absteigend"}` : "nichts"}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Kompakt für den Admin, sichtbare Beschriftung</h3>
        <DataTable caption="Beispielprofile, kompakt" density="compact" columns={columns} rows={sortRows(exampleRows, compactSort)} getRowId={(row) => row.id} sort={compactSort} onSortChange={setCompactSort} />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Lädt</h3>
        <DataTable caption="Beispielprofile, lädt" captionHidden columns={columns} rows={[]} getRowId={(row) => row.id} loading loadingRows={3} selectedIds={[]} selectionLabels={selectionLabels} />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Leer</h3>
        <DataTable
          caption="Beispielprofile, leer"
          captionHidden
          columns={columns}
          rows={[]}
          getRowId={(row) => row.id}
          empty={<EmptyState icon={<Inbox strokeWidth={1.5} />} title="Hier stehen die Beispielprofile deines Studios." action={<Button variant="primary">Beispielprofil anlegen</Button>} />}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Fehler</h3>
        <DataTable
          caption="Beispielprofile, Fehler"
          captionHidden
          columns={columns}
          rows={exampleRows}
          getRowId={(row) => row.id}
          error={<ErrorState title="Die Beispieltabelle konnte nicht geladen werden." description="Deine Sortierung und deine Auswahl sind unverändert." action={<Button>Tabelle neu laden</Button>} />}
        />
      </div>
    </section>
  );
}
