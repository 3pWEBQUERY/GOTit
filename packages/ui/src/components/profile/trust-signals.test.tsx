import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TrustSignals } from "./trust-signals";

function Example() {
  return (
    <TrustSignals
      label="Vertrauenssignale"
      closeLabel="Erklärung schliessen"
      explanationLabels={{ checked: "Was geprüft wurde", checkedAt: "Wann", notImplied: "Was das nicht aussagt" }}
      updated={{ label: "Aktualisiert vor 3 Tagen", exact: "13.11.2026", dateTime: "2026-11-13" }}
      signals={[
        {
          key: "id",
          label: "Identität geprüft",
          infoLabel: "Erklärung zu Identität geprüft anzeigen",
          explanation: { checked: "Beispieltext zur Prüfung", checkedAt: "Geprüft am 01.11.2026", notImplied: "Beispieltext zur Grenze des Signals" },
        },
        {
          key: "photos",
          label: "Fotos geprüft",
          infoLabel: "Erklärung zu Fotos geprüft anzeigen",
          explanation: { checked: "Beispieltext zu Fotos", checkedAt: "Geprüft am 02.11.2026", notImplied: "Beispieltext zur Grenze" },
        },
      ]}
    />
  );
}

describe("TrustSignals", () => {
  it("führt die Signale getrennt, jedes mit eigenem Info-Button", () => {
    render(<Example />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Erklärung zu Fotos geprüft anzeigen" })).toBeTruthy();
    expect(screen.getByText("Aktualisiert vor 3 Tagen").getAttribute("title")).toBe("13.11.2026");
  });

  it("öffnet die Erklärung per Tastatur und schliesst sie mit Escape", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    const trigger = screen.getByRole("button", { name: "Erklärung zu Identität geprüft anzeigen" });
    expect(document.activeElement).toBe(trigger);
    expect(screen.queryByText("Beispieltext zur Prüfung")).toBeNull();

    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog", { name: "Identität geprüft" })).toBeTruthy();
    expect(screen.getByText("Beispieltext zur Prüfung")).toBeTruthy();
    expect(screen.getByText("Geprüft am 01.11.2026")).toBeTruthy();
    expect(screen.getByText("Beispieltext zur Grenze des Signals")).toBeTruthy();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
