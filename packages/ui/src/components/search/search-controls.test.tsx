import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ResultCount } from "./result-count";
import { SavedSearchButton } from "./saved-search-button";
import { SortMenu } from "./sort-menu";
import { ViewToggle, type ViewMode } from "./view-toggle";

const sortOptions = [
  { value: "relevance", label: "Relevanz" },
  { value: "updated", label: "Kürzlich aktualisiert" },
  { value: "new", label: "Neu" },
  { value: "price", label: "Preis" },
] as const;

function SortExample({ onChange }: { onChange: (value: string) => void }) {
  const [value, setValue] = useState<(typeof sortOptions)[number]["value"]>("relevance");
  return (
    <SortMenu
      label="Sortierung"
      options={sortOptions}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("SortMenu", () => {
  it("zeigt die aktuelle Wahl im Auslöser und wählt per Tastatur", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SortExample onChange={onChange} />);
    const trigger = screen.getByRole("button", { name: "Sortierung Relevanz" });

    trigger.focus();
    await user.keyboard("{Enter}");
    const items = screen.getAllByRole("menuitemradio");
    expect(items.map((item) => item.textContent)).toEqual(["Relevanz", "Kürzlich aktualisiert", "Neu", "Preis"]);
    expect(items[0]?.getAttribute("aria-checked")).toBe("true");

    await user.keyboard("{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith("updated");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button", { name: "Sortierung Kürzlich aktualisiert" })).toBe(trigger);
    expect(document.activeElement).toBe(trigger);
  });
});

function ViewExample({ onChange }: { onChange: (value: ViewMode) => void }) {
  const [value, setValue] = useState<ViewMode>("grid");
  return (
    <ViewToggle
      label="Ansicht"
      labels={{ grid: "Raster", list: "Liste" }}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("ViewToggle", () => {
  it("wechselt die Ansicht und bleibt nie leer", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ViewExample onChange={onChange} />);
    expect(screen.getByRole("radiogroup", { name: "Ansicht" })).toBeTruthy();
    const grid = screen.getByRole("radio", { name: "Raster" });
    const list = screen.getByRole("radio", { name: "Liste" });
    expect(grid.getAttribute("aria-checked")).toBe("true");

    await user.click(grid);
    expect(onChange).not.toHaveBeenCalled();
    expect(grid.getAttribute("aria-checked")).toBe("true");

    await user.click(list);
    expect(onChange).toHaveBeenCalledWith("list");
    expect(list.getAttribute("aria-checked")).toBe("true");
    expect(grid.getAttribute("aria-checked")).toBe("false");

    await user.click(list);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(list.getAttribute("aria-checked")).toBe("true");
  });
});

describe("SavedSearchButton", () => {
  const labels = { idle: "Suche speichern", saving: "Suche wird gespeichert", saved: "Suche gespeichert" };

  it("zeigt je Zustand Text und aria-pressed und verhindert doppeltes Speichern", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<SavedSearchButton state="idle" labels={labels} onClick={onClick} />);
    const button = screen.getByRole("button", { name: "Suche speichern" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<SavedSearchButton state="saving" labels={labels} onClick={onClick} />);
    expect(button.getAttribute("aria-busy")).toBe("true");
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<SavedSearchButton state="saved" labels={labels} onClick={onClick} />);
    expect(screen.getByRole("button", { name: "Suche gespeichert" }).getAttribute("aria-pressed")).toBe("true");
  });
});

describe("ResultCount", () => {
  it("sagt die Trefferzahl in einer Live-Region an und bleibt als h1 eine Überschrift", () => {
    render(<ResultCount as="h1">48 Profile in Beispielstadt</ResultCount>);
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("48 Profile in Beispielstadt");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByRole("heading", { level: 1, name: "48 Profile in Beispielstadt" })).toBeTruthy();
  });
});
