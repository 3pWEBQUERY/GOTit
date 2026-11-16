import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DateField, type DateFieldProps } from "./date-field";

const labels = {
  openCalendar: "Kalender öffnen",
  previousMonth: "Vorheriger Monat",
  nextMonth: "Nächster Monat",
  invalidFormat: "Gib das Datum als TT.MM.JJJJ ein.",
  outOfRange: "Dieser Tag liegt in der Vergangenheit.",
};
const closedReason = "An diesem Tag ist das Beispielstudio geschlossen.";

function setup(props: Partial<DateFieldProps> = {}) {
  const onValueChange = vi.fn();
  const view = render(
    <DateField label="Datum" locale="de-CH" labels={labels} name="datum" today="2026-11-16" hint="Format: TT.MM.JJJJ" onValueChange={onValueChange} {...props} />,
  );
  const input = screen.getByLabelText("Datum") as HTMLInputElement;
  const hidden = () => view.container.querySelector<HTMLInputElement>('input[name="datum"]')?.value;
  return { user: userEvent.setup(), onValueChange, input, hidden };
}

function day(iso: string) {
  const element = document.querySelector<HTMLElement>(`[data-date="${iso}"]`);
  if (!element) throw new Error(`Tag ${iso} fehlt`);
  return element;
}

describe("DateField, Eingabe per Tastatur", () => {
  it("macht aus «19.11.2026» den Wert 2026-11-19", async () => {
    const { user, input, onValueChange, hidden } = setup();
    await user.type(input, "19.11.2026");
    expect(onValueChange).toHaveBeenLastCalledWith("2026-11-19");
    expect(hidden()).toBe("2026-11-19");
    await user.tab();
    expect(input.value).toBe("19.11.2026");
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("bringt eine kurze Eingabe beim Verlassen auf TT.MM.JJJJ", async () => {
    const { user, input, onValueChange } = setup();
    await user.type(input, "9.1.2027");
    await user.tab();
    expect(input.value).toBe("09.01.2027");
    expect(onValueChange).toHaveBeenLastCalledWith("2027-01-09");
  });

  it("prüft erst beim Verlassen und behält die ungültige Eingabe", async () => {
    const { user, input, onValueChange, hidden } = setup();
    await user.type(input, "31.02.2026");
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(screen.queryByText(labels.invalidFormat)).toBeNull();
    await user.tab();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.value).toBe("31.02.2026");
    expect(hidden()).toBe("");
    expect(onValueChange).not.toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-/));
    const described = (input.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent);
    expect(described).toContain(labels.invalidFormat);
  });

  it("lehnt zweistellige Jahre ab", async () => {
    const { user, input, hidden } = setup();
    await user.type(input, "19.11.26");
    await user.tab();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(hidden()).toBe("");
  });

  it("meldet beim Leeren null und zeigt keinen Fehler", async () => {
    const { user, input, onValueChange } = setup({ defaultValue: "2026-11-19" });
    expect(input.value).toBe("19.11.2026");
    await user.clear(input);
    await user.tab();
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("nennt den Grund, wenn ein gesperrter Tag getippt wird", async () => {
    const { user, input, hidden } = setup({ isDateDisabled: (iso) => (iso === "2026-11-20" ? closedReason : null) });
    await user.type(input, "20.11.2026");
    await user.tab();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(closedReason)).toBeTruthy();
    expect(hidden()).toBe("");
  });

  it("lehnt Tage vor min ab", async () => {
    const { user, input, hidden } = setup({ min: "2026-11-16" });
    await user.type(input, "15.11.2026");
    await user.tab();
    expect(screen.getByText(labels.outOfRange)).toBeTruthy();
    expect(hidden()).toBe("");
  });

  it("zeigt den kontrollierten Wert und übernimmt Änderungen von aussen", () => {
    const { rerender } = render(<DateField label="Start" locale="de-CH" labels={labels} value="2026-11-19" />);
    const input = screen.getByLabelText("Start") as HTMLInputElement;
    expect(input.value).toBe("19.11.2026");
    rerender(<DateField label="Start" locale="de-CH" labels={labels} value="2026-12-01" />);
    expect(input.value).toBe("01.12.2026");
  });
});

describe("DateField, Kalender", () => {
  it("öffnet ein Grid mit Montag als erstem Wochentag und fokussiert den heutigen Tag", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Kalender öffnen" }));
    const grid = screen.getByRole("grid", { name: "November 2026" });
    const headers = within(grid).getAllByRole("columnheader");
    expect(headers).toHaveLength(7);
    expect(headers[0]?.getAttribute("aria-label")).toBe("Montag");
    expect(headers[6]?.getAttribute("aria-label")).toBe("Sonntag");
    expect(document.activeElement).toBe(day("2026-11-16"));
    expect(day("2026-11-16").getAttribute("aria-current")).toBe("date");
  });

  it("wählt einen Tag per Klick, schliesst und füllt das Feld", async () => {
    const { user, input, onValueChange, hidden } = setup();
    await user.click(screen.getByRole("button", { name: "Kalender öffnen" }));
    await user.click(day("2026-11-19"));
    expect(onValueChange).toHaveBeenCalledWith("2026-11-19");
    expect(input.value).toBe("19.11.2026");
    expect(hidden()).toBe("2026-11-19");
    expect(screen.queryByRole("grid")).toBeNull();
  });

  it("lässt sich mit Pfeiltasten, Home, End und PageUp/PageDown bedienen", async () => {
    const { user, onValueChange } = setup();
    await user.click(screen.getByRole("button", { name: "Kalender öffnen" }));
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(day("2026-11-17"));
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(day("2026-11-24"));
    await user.keyboard("{ArrowLeft}{ArrowUp}");
    expect(document.activeElement).toBe(day("2026-11-16"));
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(day("2026-11-22"));
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(day("2026-11-16"));
    await user.keyboard("{PageDown}");
    expect(screen.getByRole("grid", { name: "Dezember 2026" })).toBeTruthy();
    expect(document.activeElement).toBe(day("2026-12-16"));
    await user.keyboard("{PageUp}{PageUp}");
    expect(document.activeElement).toBe(day("2026-10-16"));
    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("2026-10-16");
  });

  it("wechselt den Monat über die Buttons", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Kalender öffnen" }));
    await user.click(screen.getByRole("button", { name: "Nächster Monat" }));
    expect(screen.getByRole("grid", { name: "Dezember 2026" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Vorheriger Monat" }));
    expect(screen.getByRole("grid", { name: "November 2026" })).toBeTruthy();
  });

  it("erklärt einen gesperrten Tag und lässt ihn nicht wählen", async () => {
    const { user, onValueChange, hidden } = setup({ isDateDisabled: (iso) => (iso === "2026-11-20" ? closedReason : null) });
    await user.click(screen.getByRole("button", { name: "Kalender öffnen" }));
    const blocked = day("2026-11-20");
    expect(blocked.getAttribute("aria-disabled")).toBe("true");
    expect(blocked.getAttribute("title")).toBe(closedReason);
    expect(blocked.getAttribute("aria-label")).toContain(closedReason);
    expect(blocked.getAttribute("aria-label")).toContain("20. November 2026");
    expect(screen.queryByText(closedReason)).toBeNull();

    await user.click(blocked);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(hidden()).toBe("");
    expect(screen.getByRole("grid")).toBeTruthy();
    expect(screen.getByText(closedReason)).toBeTruthy();

    await user.keyboard("{Enter}");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(day("2026-11-19").getAttribute("aria-disabled")).toBeNull();
  });

  it("zeigt die Legende, wenn ein gesperrter Tag mit der Tastatur fokussiert wird", async () => {
    const { user } = setup({ isDateDisabled: (iso) => (iso === "2026-11-17" ? closedReason : null) });
    await user.click(screen.getByRole("button", { name: "Kalender öffnen" }));
    expect(screen.queryByText(closedReason)).toBeNull();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(day("2026-11-17"));
    expect(screen.getByText(closedReason)).toBeTruthy();
  });

  it("sperrt Tage vor min und bleibt bei der Tastatur im erlaubten Bereich", async () => {
    const { user, onValueChange } = setup({ min: "2026-11-16" });
    await user.click(screen.getByRole("button", { name: "Kalender öffnen" }));
    expect(day("2026-11-15").getAttribute("aria-disabled")).toBe("true");
    expect(day("2026-11-15").getAttribute("title")).toBe(labels.outOfRange);
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(day("2026-11-16"));
    expect(screen.getByRole("button", { name: "Vorheriger Monat" }).getAttribute("aria-disabled")).toBe("true");
    await user.click(day("2026-11-15"));
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
