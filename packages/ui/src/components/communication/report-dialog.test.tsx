import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../actions/button";
import { ReportDialog, type ReportDialogLabels, type ReportSubmission } from "./report-dialog";

const labels: ReportDialogLabels = {
  title: "Nachricht melden",
  close: "Dialog schliessen",
  reasonLegend: "Was trifft zu?",
  reasonMissing: "Wähle einen Grund",
  urgentTitle: "Bei akuter Gefahr wende dich an die Polizei",
  next: "Beschreibung ergänzen",
  back: "Grund ändern",
  detailsLabel: "Beschreibung",
  optional: "optional",
  submit: "Meldung senden",
  sentTitle: "Meldung gesendet",
  done: "Meldung schliessen",
  errorTitle: "Die Meldung wurde nicht gesendet",
  errorText: "Deine Eingaben sind erhalten.",
  step: (current, total) => `Schritt ${current} von ${total}`,
};

const reasons = [
  { value: "spam", label: "Beispielgrund Werbung" },
  { value: "threat", label: "Beispielgrund Bedrohung", urgent: true },
];

function Example({ onSubmit }: { onSubmit: (report: ReportSubmission) => Promise<void> }) {
  return <ReportDialog trigger={<Button>Nachricht melden</Button>} reasons={reasons} labels={labels} onSubmit={onSubmit} />;
}

describe("ReportDialog", () => {
  it("führt in zwei Schritten zum Senden und bestätigt", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(report: ReportSubmission) => Promise<void>>().mockResolvedValue(undefined);
    render(<Example onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "Nachricht melden" }));
    expect(screen.getByRole("dialog", { name: "Nachricht melden" })).toBeTruthy();
    expect(screen.getByText("Schritt 1 von 2")).toBeTruthy();

    // Ohne Grund geht es nicht weiter; der Button erklärt, was fehlt.
    await user.click(screen.getByRole("button", { name: "Beschreibung ergänzen" }));
    expect(screen.getByText("Wähle einen Grund")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();

    await user.click(screen.getByRole("radio", { name: "Beispielgrund Bedrohung" }));
    expect(screen.getByText("Bei akuter Gefahr wende dich an die Polizei")).toBeTruthy();
    await user.click(screen.getByRole("radio", { name: "Beispielgrund Werbung" }));
    expect(screen.queryByText("Bei akuter Gefahr wende dich an die Polizei")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Beschreibung ergänzen" }));
    expect(screen.getByText("Schritt 2 von 2")).toBeTruthy();
    const field = screen.getByRole("textbox", { name: /Beschreibung/ });
    await waitFor(() => expect(document.activeElement).toBe(field));
    await user.type(field, "Beispieltext einer Meldung");
    await user.click(screen.getByRole("button", { name: "Meldung senden" }));

    expect(onSubmit).toHaveBeenCalledWith({ reason: "spam", details: "Beispieltext einer Meldung" });
    expect(await screen.findByText("Meldung gesendet")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Meldung schliessen" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("behält bei einem Fehler Grund und Beschreibung und lässt erneut senden", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(report: ReportSubmission) => Promise<void>>().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    render(<Example onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "Nachricht melden" }));
    await user.click(screen.getByRole("radio", { name: "Beispielgrund Werbung" }));
    await user.click(screen.getByRole("button", { name: "Beschreibung ergänzen" }));
    await user.type(screen.getByRole("textbox", { name: /Beschreibung/ }), "Beispieltext einer Meldung");
    await user.click(screen.getByRole("button", { name: "Meldung senden" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Die Meldung wurde nicht gesendet");
    expect(screen.getByRole<HTMLTextAreaElement>("textbox", { name: /Beschreibung/ }).value).toBe("Beispieltext einer Meldung");

    await user.click(screen.getByRole("button", { name: "Grund ändern" }));
    expect(screen.getByRole("radio", { name: "Beispielgrund Werbung" }).getAttribute("aria-checked")).toBe("true");
    await user.click(screen.getByRole("button", { name: "Beschreibung ergänzen" }));
    expect(screen.getByRole<HTMLTextAreaElement>("textbox", { name: /Beschreibung/ }).value).toBe("Beispieltext einer Meldung");

    await user.click(screen.getByRole("button", { name: "Meldung senden" }));
    expect(await screen.findByText("Meldung gesendet")).toBeTruthy();
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
});
