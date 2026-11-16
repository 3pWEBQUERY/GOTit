import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FileDrop, type FileDropProps } from "./file-drop";
import type { FileDropItemData } from "./file-drop-item";

const labels = {
  choose: "Dateien wählen",
  queued: "Wartet auf den Upload",
  uploading: (percent: number) => `${percent} % hochgeladen`,
  done: "Hochgeladen",
  retry: "Erneut versuchen",
  remove: (name: string) => `${name} entfernen`,
};

function file(name: string, type: string, size: number) {
  const created = new File(["x"], name, { type });
  Object.defineProperty(created, "size", { value: size });
  return created;
}

function setup(props: Partial<FileDropProps> = {}) {
  const handlers = { onFilesSelected: vi.fn(), onReject: vi.fn(), onRetry: vi.fn(), onRemove: vi.fn() };
  const view = render(<FileDrop label="Fotos" labels={labels} items={[]} multiple {...handlers} {...props} />);
  const input = view.container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("Dateifeld fehlt");
  return { ...handlers, input, user: userEvent.setup({ applyAccept: false }) };
}

describe("FileDrop", () => {
  it("lehnt eine zu grosse Datei ab und gibt die übrigen weiter", async () => {
    const { user, input, onFilesSelected, onReject } = setup({ maxSizeBytes: 1000 });
    const small = file("klein.jpg", "image/jpeg", 500);
    const large = file("gross.jpg", "image/jpeg", 5000);
    await user.upload(input, [small, large]);
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledWith(large, "size");
    expect(onFilesSelected).toHaveBeenCalledWith([small]);
  });

  it("meldet nichts als gewählt, wenn alle Dateien abgelehnt sind", async () => {
    const { user, input, onFilesSelected, onReject } = setup({ maxSizeBytes: 1000 });
    await user.upload(input, file("gross.jpg", "image/jpeg", 1001));
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onFilesSelected).not.toHaveBeenCalled();
  });

  it("prüft den Typ auch beim Ablegen", () => {
    const { onFilesSelected, onReject } = setup({ accept: "image/*,.pdf" });
    const photo = file("foto.png", "image/png", 10);
    const pdf = file("Vertrag.PDF", "", 10);
    const text = file("notiz.txt", "text/plain", 10);
    const zone = screen.getByRole("button", { name: "Dateien wählen" }).parentElement;
    if (!zone) throw new Error("Ablagefläche fehlt");
    fireEvent.drop(zone, { dataTransfer: { files: [photo, pdf, text] } });
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledWith(text, "type");
    expect(onFilesSelected).toHaveBeenCalledWith([photo, pdf]);
  });

  it("nimmt ohne multiple nur eine Datei an", () => {
    const { onFilesSelected, onReject } = setup({ multiple: false });
    const first = file("a.png", "image/png", 10);
    const second = file("b.png", "image/png", 10);
    const zone = screen.getByRole("button", { name: "Dateien wählen" }).parentElement;
    if (!zone) throw new Error("Ablagefläche fehlt");
    fireEvent.drop(zone, { dataTransfer: { files: [first, second] } });
    expect(onFilesSelected).toHaveBeenCalledWith([first]);
    expect(onReject).toHaveBeenCalledWith(second, "count");
  });

  it("öffnet die Dateiauswahl über den Button", async () => {
    const { user, input } = setup();
    const click = vi.spyOn(input, "click");
    await user.click(screen.getByRole("button", { name: "Dateien wählen" }));
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("zeigt jeden Zustand als Text und ruft Retry und Entfernen mit der ID auf", async () => {
    const items: FileDropItemData[] = [
      { id: "a", name: "eins.jpg", status: "queued" },
      { id: "b", name: "zwei.jpg", status: "uploading", progress: 40 },
      { id: "c", name: "drei.jpg", status: "done" },
      { id: "d", name: "vier.jpg", status: "error", error: "Die Verbindung wurde unterbrochen." },
    ];
    const { user, onRetry, onRemove } = setup({ items });
    expect(screen.getByRole("list", { name: "Fotos" }).children).toHaveLength(4);
    expect(screen.getByText("Wartet auf den Upload")).toBeTruthy();
    expect(screen.getByText("40 % hochgeladen")).toBeTruthy();
    const progress = screen.getByRole("progressbar", { name: "zwei.jpg" }) as HTMLProgressElement;
    expect(progress.value).toBe(40);
    expect(progress.max).toBe(100);
    expect(screen.getByText("Hochgeladen")).toBeTruthy();
    expect(screen.getByText("Die Verbindung wurde unterbrochen.")).toBeTruthy();

    const retryButtons = screen.getAllByRole("button", { name: "Erneut versuchen" });
    expect(retryButtons).toHaveLength(1);
    await user.click(retryButtons[0] as HTMLElement);
    expect(onRetry).toHaveBeenCalledWith("d");
    await user.click(screen.getByRole("button", { name: "zwei.jpg entfernen" }));
    expect(onRemove).toHaveBeenCalledWith("b");
  });
});
