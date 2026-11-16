import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { Menu, MenuCheckboxItem, MenuContent, MenuItem, MenuTrigger } from "./menu";
import { SplitButton } from "./split-button";

function Example({ onArchive = () => undefined }: { onArchive?: () => void }) {
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button>Aktionen öffnen</Button>
      </MenuTrigger>
      <MenuContent>
        <MenuItem onSelect={onArchive}>Profil archivieren</MenuItem>
        <MenuItem destructive>Profil löschen</MenuItem>
        <MenuCheckboxItem checked>Gelesene anzeigen</MenuCheckboxItem>
      </MenuContent>
    </Menu>
  );
}

describe("Menu", () => {
  it("öffnet mit der Tastatur, schliesst mit Escape und gibt den Fokus zurück", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Aktionen öffnen" });

    trigger.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("menu")).toBeTruthy();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("wählt einen Eintrag mit Pfeil und Enter und schliesst danach", async () => {
    const user = userEvent.setup();
    const onArchive = vi.fn();
    render(<Example onArchive={onArchive} />);
    const trigger = screen.getByRole("button", { name: "Aktionen öffnen" });

    trigger.focus();
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Profil archivieren" }));
    await user.keyboard("{Enter}");

    expect(onArchive).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("meldet den Zustand eines Checkbox-Eintrags", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Aktionen öffnen" }));
    expect(screen.getByRole("menuitemcheckbox", { name: "Gelesene anzeigen" }).getAttribute("aria-checked")).toBe("true");
  });
});

describe("SplitButton", () => {
  it("löst die Hauptaktion aus und öffnet die weiteren Aktionen über den Pfeil", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onSaveAndClose = vi.fn();
    render(
      <SplitButton onClick={onSave} menuLabel="Weitere Speicheroptionen öffnen" menu={<MenuItem onSelect={onSaveAndClose}>Speichern und schliessen</MenuItem>}>
        Entwurf speichern
      </SplitButton>,
    );

    await user.click(screen.getByRole("button", { name: "Entwurf speichern" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Weitere Speicheroptionen öffnen" }));
    await user.click(screen.getByRole("menuitem", { name: "Speichern und schliessen" }));
    expect(onSaveAndClose).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
