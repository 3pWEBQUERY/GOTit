import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableProps } from "./data-table";
import type { DataTableColumn } from "./data-table-types";

interface Row {
  id: string;
  name: string;
  city: string;
  views: number;
  status: string;
}

const rows: Row[] = [
  { id: "a", name: "Beispielname A", city: "Beispielstadt", views: 120, status: "Online" },
  { id: "b", name: "Beispielname B", city: "Musterstadt", views: 80, status: "Pausiert" },
  { id: "c", name: "Beispielname C", city: "Beispielstadt", views: 45, status: "Online" },
];

const columns: DataTableColumn<Row>[] = [
  { id: "name", header: "Name", cell: (row) => row.name, sortable: true, priority: 1 },
  { id: "city", header: "Ort", cell: (row) => row.city },
  { id: "views", header: "Aufrufe", cell: (row) => row.views, sortable: true, align: "end", priority: 3 },
  { id: "status", header: "Status", cell: (row) => row.status, priority: 2 },
];

const selectionLabels = {
  selectAll: "Alle Zeilen auswählen",
  selectRow: (row: Row) => `${row.name} auswählen`,
  selectedCount: (count: number) => `${count} ausgewählt`,
};

function renderTable(props: Partial<DataTableProps<Row>> = {}) {
  return render(<DataTable caption="Beispielprofile" columns={columns} rows={rows} getRowId={(row) => row.id} {...props} />);
}

describe("DataTable", () => {
  it("trägt den Namen aus der caption und aria-sort an sortierbaren Spalten", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    const { rerender } = renderTable({ sort: null, onSortChange });
    const table = screen.getByRole("table", { name: "Beispielprofile" });
    const name = within(table).getByRole("columnheader", { name: "Name" });
    const city = within(table).getByRole("columnheader", { name: "Ort" });
    expect(name.getAttribute("aria-sort")).toBe("none");
    expect(city.hasAttribute("aria-sort")).toBe(false);
    expect(name.className).toContain("sticky");

    await user.click(within(name).getByRole("button", { name: "Name" }));
    expect(onSortChange).toHaveBeenLastCalledWith({ column: "name", direction: "asc" });

    rerender(<DataTable caption="Beispielprofile" columns={columns} rows={rows} getRowId={(row) => row.id} sort={{ column: "name", direction: "asc" }} onSortChange={onSortChange} />);
    expect(name.getAttribute("aria-sort")).toBe("ascending");
    expect(within(table).getByRole("columnheader", { name: "Aufrufe" }).getAttribute("aria-sort")).toBe("none");

    within(name).getByRole("button").focus();
    await user.keyboard("{Enter}");
    expect(onSortChange).toHaveBeenLastCalledWith({ column: "name", direction: "desc" });
  });

  it("wählt alle aus, zeigt den Zwischenzustand und die Sammelaktionen", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    const base = { selectionLabels, onSelectionChange, bulkActions: <button type="button">Auswahl archivieren</button> };
    const { rerender } = renderTable({ ...base, selectedIds: [] });
    const table = screen.getByRole("table");
    const all = within(table).getByRole("checkbox", { name: "Alle Zeilen auswählen" });
    expect(all.getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByRole("button", { name: "Auswahl archivieren" })).toBeNull();

    await user.click(within(table).getByRole("checkbox", { name: "Beispielname B auswählen" }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(["b"]);

    rerender(<DataTable caption="Beispielprofile" columns={columns} rows={rows} getRowId={(row) => row.id} {...base} selectedIds={["b"]} />);
    expect(all.getAttribute("aria-checked")).toBe("mixed");
    expect(screen.getByRole("status").textContent).toBe("1 ausgewählt");
    expect(screen.getByRole("button", { name: "Auswahl archivieren" })).toBeTruthy();

    await user.click(all);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["a", "b", "c"]);

    rerender(<DataTable caption="Beispielprofile" columns={columns} rows={rows} getRowId={(row) => row.id} {...base} selectedIds={["a", "b", "c"]} />);
    expect(all.getAttribute("aria-checked")).toBe("true");
    await user.click(all);
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it("zeigt Zeilenaktionen in einer benannten Spalte", () => {
    renderTable({ rowActions: (row) => <button type="button">{`Aktionen für ${row.name}`}</button>, rowActionsLabel: "Aktionen" });
    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Aktionen" })).toBeTruthy();
    expect(within(table).getByRole("button", { name: "Aktionen für Beispielname A" })).toBeTruthy();
  });

  it("enthält für Mobile jede Zeile als Karte mit den wichtigsten Feldern in ihrer Reihenfolge", () => {
    const { container } = renderTable();
    expect(screen.getByRole("table").className).toMatch(/^hidden .*\bmd:table\b/);
    const list = container.querySelector("[data-table-cards]");
    expect(list).toBeTruthy();
    expect(list?.parentElement?.className).toContain("md:hidden");
    const cards = within(list as HTMLElement).getAllByRole("listitem");
    expect(cards).toHaveLength(3);
    const first = cards[0] as HTMLElement;
    expect(within(first).getAllByRole("term").map((term) => term.textContent)).toEqual(["Name", "Status", "Aufrufe"]);
    expect(within(first).getAllByRole("definition").map((value) => value.textContent)).toEqual(["Beispielname A", "Online", "120"]);
    expect(within(first).queryByText("Beispielstadt")).toBeNull();
  });

  it("zeigt beim Laden Skelett-Zeilen in Tabellenform", () => {
    const { container } = renderTable({ loading: true, loadingRows: 4, density: "compact" });
    const table = screen.getByRole("table");
    expect(table.getAttribute("aria-busy")).toBe("true");
    expect(container.querySelectorAll("[data-skeleton-row]")).toHaveLength(4);
    expect(container.querySelector("[data-skeleton-row] td")?.className).toContain("h-10");
    expect(container.querySelector("[data-skeleton-cards]")).toBeTruthy();
    expect(screen.queryByText("Beispielname A")).toBeNull();
  });

  it("zeigt leer und Fehler anstelle der Zeilen, genau einmal", () => {
    const { rerender } = renderTable({ rows: [], empty: <p>Noch keine Beispielprofile</p> });
    expect(screen.getAllByText("Noch keine Beispielprofile")).toHaveLength(1);
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(1);

    rerender(<DataTable caption="Beispielprofile" columns={columns} rows={rows} getRowId={(row) => row.id} error={<p>Die Beispielliste konnte nicht geladen werden.</p>} empty={<p>Noch keine Beispielprofile</p>} />);
    expect(screen.getAllByText("Die Beispielliste konnte nicht geladen werden.")).toHaveLength(1);
    expect(screen.queryByText("Beispielname A")).toBeNull();
    expect(screen.queryByText("Noch keine Beispielprofile")).toBeNull();
  });
});
