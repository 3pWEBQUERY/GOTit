import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterBarButton } from "./filter-bar-button";
import { FilterGroup } from "./filter-group";
import { FilterPanel } from "./filter-panel";
import { FilterSheet } from "./filter-sheet";

function Example({ count = 48, onApply = () => undefined, onReset = () => undefined }: { count?: number; onApply?: () => void; onReset?: () => void }) {
  return (
    <FilterSheet
      title="Filter"
      closeLabel="Filter schliessen"
      handleLabel="Filter schliessen ohne anzuwenden"
      resetLabel="Zurücksetzen"
      onReset={onReset}
      applyLabel={`${count} Profile anzeigen`}
      onApply={onApply}
      trigger={<FilterBarButton>Filter</FilterBarButton>}
    >
      <FilterGroup title="Standort">
        <label>
          Stadt <input />
        </label>
      </FilterGroup>
      <FilterGroup title="Vertrauen">
        <p>Inhalt Vertrauen</p>
      </FilterGroup>
    </FilterSheet>
  );
}

describe("FilterSheet", () => {
  it("öffnet auf voller Höhe und deckend, mit eingeklappten Gruppen", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Filter" }));

    const sheet = screen.getByRole("dialog", { name: "Filter" });
    expect(sheet.getAttribute("data-detent")).toBe("full");
    expect(sheet.className).not.toContain("glass");

    const group = within(sheet).getByRole("group", { name: /Standort/ });
    const toggle = within(group).getByRole("button", { name: "Standort" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(within(sheet).queryByRole("textbox")).toBeNull();

    await user.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(within(sheet).getByRole("textbox", { name: "Stadt" })).toBeTruthy();
  });

  it("wendet über den Button im Fuss an und schliesst", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<Example onApply={onApply} />);
    await user.click(screen.getByRole("button", { name: "Filter" }));

    const apply = screen.getByRole("button", { name: "48 Profile anzeigen" });
    expect(apply.querySelector("[aria-live='polite']")?.textContent).toBe("48 Profile anzeigen");
    await user.click(apply);
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("setzt zurück, ohne zu schliessen, und zeigt die neue Trefferzahl", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    const { rerender } = render(<Example onReset={onReset} />);
    await user.click(screen.getByRole("button", { name: "Filter" }));

    await user.click(screen.getByRole("button", { name: "Zurücksetzen" }));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog", { name: "Filter" })).toBeTruthy();

    rerender(<Example count={112} onReset={onReset} />);
    expect(screen.getByRole("button", { name: "112 Profile anzeigen" })).toBeTruthy();
  });
});

describe("FilterPanel", () => {
  it("zeigt Gruppen offen als fieldset mit legend und setzt alle zurück", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(
      <FilterPanel title="Filter" resetLabel="Alle zurücksetzen" onReset={onReset}>
        <FilterGroup title="Standort">
          <p>Inhalt Standort</p>
        </FilterGroup>
      </FilterPanel>,
    );
    const panel = screen.getByRole("complementary", { name: "Filter" });
    const group = within(panel).getByRole("group", { name: /Standort/ });
    expect(group.tagName).toBe("FIELDSET");
    const toggle = within(group).getByRole("button", { name: "Standort" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    await user.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("Inhalt Standort").parentElement?.hidden).toBe(true);

    await user.click(within(panel).getByRole("button", { name: "Alle zurücksetzen" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
