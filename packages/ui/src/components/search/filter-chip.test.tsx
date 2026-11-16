import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterBar } from "./filter-bar";
import { FilterBarButton } from "./filter-bar-button";
import { FilterChip } from "./filter-chip";

describe("FilterChip", () => {
  it("meldet als Schnellfilter den Zustand über aria-pressed und schaltet um", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    const { rerender } = render(
      <FilterChip pressed={false} onPressedChange={onPressedChange}>
        Heute
      </FilterChip>,
    );
    const chip = screen.getByRole("button", { name: "Heute" });
    expect(chip.getAttribute("aria-pressed")).toBe("false");

    await user.click(chip);
    expect(onPressedChange).toHaveBeenCalledWith(true);

    rerender(
      <FilterChip pressed onPressedChange={onPressedChange}>
        Heute
      </FilterChip>,
    );
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    chip.focus();
    await user.keyboard(" ");
    expect(onPressedChange).toHaveBeenLastCalledWith(false);
  });

  it("hat als aktiver Filter einen eigenen Entfernen-Button mit Namen", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <FilterChip variant="removable" removeLabel="Filter Heute entfernen" onRemove={onRemove}>
        Heute
      </FilterChip>,
    );
    expect(screen.getByText("Heute")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Heute" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Filter Heute entfernen" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe("FilterBar", () => {
  it("ist eine benannte Gruppe und trägt haftend die Glasfläche nur für Mobile", () => {
    const { rerender } = render(
      <FilterBar label="Schnellfilter" sticky leading={<FilterBarButton count={2}>Filter</FilterBarButton>}>
        <FilterChip pressed={false} onPressedChange={() => undefined}>
          Heute
        </FilterChip>
      </FilterBar>,
    );
    const bar = screen.getByRole("group", { name: "Schnellfilter" });
    expect(bar.className).toContain("sticky");
    const glass = bar.querySelector("[data-filter-bar-glass]");
    expect(glass?.className).toContain("glass");
    expect(glass?.className).toContain("md:hidden");
    expect(screen.getByRole("button", { name: "Filter 2" })).toBeTruthy();

    rerender(
      <FilterBar label="Schnellfilter">
        <span>Chip</span>
      </FilterBar>,
    );
    expect(screen.getByRole("group", { name: "Schnellfilter" }).querySelector("[data-filter-bar-glass]")).toBeNull();
  });
});
