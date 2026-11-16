import { render, screen } from "@testing-library/react";
import { Plus } from "lucide-react";
import { describe, expect, it } from "vitest";
import { FloatingAction } from "./floating-action";

describe("FloatingAction", () => {
  it("trägt bei reinem Icon die Beschriftung als zugänglichen Namen", () => {
    render(<FloatingAction iconOnly label="Beitrag erstellen" icon={<Plus aria-hidden strokeWidth={1.5} />} />);
    expect(screen.getByRole("button", { name: "Beitrag erstellen" })).toBeTruthy();
  });

  it("zeigt die Beschriftung sichtbar und tönt nur die primäre Variante", () => {
    render(<FloatingAction variant="primary" label="Filter anzeigen" icon={<Plus aria-hidden strokeWidth={1.5} />} />);
    const button = screen.getByRole("button", { name: "Filter anzeigen" });
    expect(button.textContent).toBe("Filter anzeigen");
    expect(button.className).toContain("glass-accent");
  });

  it("wird mit href zum Link", () => {
    render(<FloatingAction href="/beispiel" label="Kontakt aufnehmen" icon={<Plus aria-hidden strokeWidth={1.5} />} />);
    expect(screen.getByRole("link", { name: "Kontakt aufnehmen" }).getAttribute("href")).toBe("/beispiel");
  });
});
