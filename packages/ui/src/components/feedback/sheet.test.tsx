import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../actions/button";
import { Sheet, SheetContent, SheetTrigger } from "./sheet";

function Example({ onDetentChange }: { onDetentChange?: (detent: "half" | "full") => void }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Filter anzeigen</Button>
      </SheetTrigger>
      <SheetContent title="Filter" closeLabel="Filter schliessen" handleLabel="Höhe umschalten" onDetentChange={onDetentChange}>
        Inhalt
      </SheetContent>
    </Sheet>
  );
}

describe("Sheet", () => {
  it("wechselt die Stufe am Griff mit Enter und Leertaste", async () => {
    const user = userEvent.setup();
    const onDetentChange = vi.fn();
    render(<Example onDetentChange={onDetentChange} />);

    await user.click(screen.getByRole("button", { name: "Filter anzeigen" }));
    const sheet = screen.getByRole("dialog", { name: "Filter" });
    const handle = screen.getByRole("button", { name: "Höhe umschalten" });
    expect(sheet.getAttribute("data-detent")).toBe("half");
    expect(sheet.className).toContain("glass");

    handle.focus();
    await user.keyboard("{Enter}");
    expect(sheet.getAttribute("data-detent")).toBe("full");
    expect(sheet.className).not.toContain("glass");
    expect(sheet.className).toContain("bg-surface");
    expect(handle.getAttribute("aria-expanded")).toBe("true");

    await user.keyboard(" ");
    expect(sheet.getAttribute("data-detent")).toBe("half");
    expect(onDetentChange.mock.calls).toEqual([["full"], ["half"]]);
  });

  it("schliesst mit Escape und gibt den Fokus zurück", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Filter anzeigen" });

    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
