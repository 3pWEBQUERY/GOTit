import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../actions/button";
import { ConfirmDialog } from "./confirm-dialog";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from "./dialog";
import { SidePanel, SidePanelContent, SidePanelTrigger } from "./side-panel";

describe("Dialog", () => {
  it("schliesst mit Escape und gibt den Fokus an den Auslöser zurück", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Profil pausieren</Button>
        </DialogTrigger>
        <DialogContent title="Beispielprofil pausieren" description="Das Profil ist nicht mehr auffindbar." closeLabel="Dialog schliessen">
          <DialogFooter>
            <DialogClose asChild>
              <Button>Abbrechen</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    const trigger = screen.getByRole("button", { name: "Profil pausieren" });

    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Beispielprofil pausieren" });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(screen.getByRole("button", { name: "Dialog schliessen" })).toBeTruthy();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});

describe("ConfirmDialog", () => {
  function Example({ onConfirm }: { onConfirm: () => void | Promise<void> }) {
    return (
      <ConfirmDialog
        trigger={<Button>Medium löschen</Button>}
        title="Dieses Medium endgültig löschen?"
        description="Das Beispielfoto wird aus allen Profilen entfernt."
        confirmLabel="Medium endgültig löschen"
        cancelLabel="Medium behalten"
        onConfirm={onConfirm}
      />
    );
  }

  it("schliesst mit Escape ohne zu bestätigen und gibt den Fokus zurück", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Example onConfirm={onConfirm} />);
    const trigger = screen.getByRole("button", { name: "Medium löschen" });

    await user.click(trigger);
    expect(screen.getByRole("alertdialog", { name: "Dieses Medium endgültig löschen?" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Medium behalten" }));

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("bestätigt mit dem benannten Button und schliesst", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Example onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Medium löschen" }));
    await user.click(screen.getByRole("button", { name: "Medium endgültig löschen" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("bleibt offen, wenn die Aktion fehlschlägt", async () => {
    const user = userEvent.setup();
    let reject: (reason: Error) => void = () => undefined;
    const onConfirm = vi.fn(() => new Promise<void>((_resolve, fail) => (reject = fail)));
    render(<Example onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Medium löschen" }));
    const confirm = screen.getByRole("button", { name: "Medium endgültig löschen" });
    await user.click(confirm);
    expect(confirm.getAttribute("aria-busy")).toBe("true");

    reject(new Error("Beispielfehler"));
    await waitFor(() => expect(confirm.getAttribute("aria-busy")).toBeNull());
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });
});

describe("SidePanel", () => {
  it("zeigt Titel und Fuss und schliesst mit Escape", async () => {
    const user = userEvent.setup();
    render(
      <SidePanel>
        <SidePanelTrigger asChild>
          <Button>Tarif bearbeiten</Button>
        </SidePanelTrigger>
        <SidePanelContent title="Beispieltarif bearbeiten" closeLabel="Panel schliessen" footer={<Button variant="primary">Tarif speichern</Button>}>
          Inhalt
        </SidePanelContent>
      </SidePanel>,
    );
    const trigger = screen.getByRole("button", { name: "Tarif bearbeiten" });

    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Beispieltarif bearbeiten" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tarif speichern" })).toBeTruthy();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
