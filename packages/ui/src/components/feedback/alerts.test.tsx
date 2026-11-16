import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Banner } from "./banner";
import { ErrorState } from "./error-state";
import { InlineAlert } from "./inline-alert";
import { Skeleton } from "./skeleton";

describe("InlineAlert, Banner und ErrorState", () => {
  it("melden Fehler als alert und alles andere als status", () => {
    render(
      <>
        <InlineAlert tone="error" title="Foto nicht hochgeladen" />
        <InlineAlert tone="warning" title="Profil unvollständig" />
        <ErrorState title="Liste nicht geladen" description="Deine Filter sind noch da." action={<button type="button">Liste neu laden</button>} />
      </>,
    );
    expect(screen.getAllByRole("alert").map((node) => node.textContent)).toEqual([
      "Foto nicht hochgeladen",
      "Liste nicht geladenDeine Filter sind noch da.Liste neu laden",
    ]);
    expect(screen.getByRole("status").textContent).toBe("Profil unvollständig");
  });

  it("Banner schliesst über den benannten Button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Banner tone="warning" onClose={onClose} closeLabel="Hinweis schliessen">
        Keine Verbindung
      </Banner>,
    );
    await user.click(screen.getByRole("button", { name: "Hinweis schliessen" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Skelette sind für Screenreader unsichtbar", () => {
    const { container } = render(<Skeleton lines={3} />);
    const root = container.firstElementChild;
    expect(root?.getAttribute("aria-hidden")).toBe("true");
    expect(root?.children).toHaveLength(3);
  });
});
