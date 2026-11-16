import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Switch } from "./switch";

describe("Switch", () => {
  it("schaltet über Klick und Tastatur und trägt Label und Beschreibung", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch label="Profil pausieren" description="Dein Profil erscheint nicht in der Suche." onCheckedChange={onCheckedChange} />);
    const control = screen.getByRole("switch", { name: "Profil pausieren" });
    expect(document.getElementById(control.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Dein Profil erscheint nicht in der Suche.");
    await user.click(control);
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    expect(control.getAttribute("aria-checked")).toBe("true");
    await user.keyboard(" ");
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
  });

  it("bestätigt das Speichern am Ort über eine Live-Region", () => {
    const { container, rerender } = render(<Switch label="E-Mail bei neuer Nachricht" status="idle" statusLabel="" />);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live?.textContent).toBe("");

    rerender(<Switch label="E-Mail bei neuer Nachricht" status="saving" statusLabel="Wird gespeichert" />);
    expect(container.querySelector('[aria-live="polite"]')).toBe(live);
    expect(live?.textContent).toBe("Wird gespeichert");
    expect(screen.getByRole("switch").getAttribute("aria-busy")).toBe("true");

    rerender(<Switch label="E-Mail bei neuer Nachricht" status="saved" statusLabel="Gespeichert" />);
    expect(live?.textContent).toBe("Gespeichert");
    expect(live?.querySelector("svg")).not.toBeNull();
    expect(live?.className).toContain("text-success");
    expect(screen.getByRole("switch").getAttribute("aria-busy")).toBeNull();

    rerender(<Switch label="E-Mail bei neuer Nachricht" status="error" statusLabel="Nicht gespeichert. Die Einstellung ist unverändert." />);
    expect(live?.textContent).toBe("Nicht gespeichert. Die Einstellung ist unverändert.");
    expect(live?.className).toContain("text-error");
    expect(live?.querySelector("svg")).not.toBeNull();
  });
});
