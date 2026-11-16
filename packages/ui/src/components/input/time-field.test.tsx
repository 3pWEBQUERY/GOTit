import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TimeField } from "./time-field";
import { isOnStep, parseTime } from "./time-parsing";

const labels = { invalidFormat: "Gib die Zeit als HH:MM ein.", notOnStep: "Wähle eine Zeit im Viertelstundentakt." };

describe("parseTime", () => {
  it("liest 24-Stunden-Zeiten", () => {
    expect(parseTime("09:05")).toBe("09:05");
    expect(parseTime("9:05")).toBe("09:05");
    expect(parseTime("14.30")).toBe("14:30");
    expect(parseTime("1430")).toBe("14:30");
    expect(parseTime("00:00")).toBe("00:00");
    expect(parseTime("23:59")).toBe("23:59");
  });
  it("lehnt Zeiten ab, die es nicht gibt", () => {
    for (const text of ["24:00", "12:60", "25:10", "", "12", "12:5", "9:5", "2 pm", "14:30:00", "ab:cd", "930"]) {
      expect(parseTime(text), text).toBeNull();
    }
  });
  it("prüft das Minutenraster", () => {
    expect(isOnStep("09:15", 15)).toBe(true);
    expect(isOnStep("09:10", 15)).toBe(false);
    expect(isOnStep("09:10", undefined)).toBe(true);
  });
});

describe("TimeField", () => {
  it("übernimmt eine gültige Eingabe als HH:MM", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TimeField label="Beginn" labels={labels} name="beginn" onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Beginn") as HTMLInputElement;
    await user.type(input, "9:30");
    await user.tab();
    expect(onValueChange).toHaveBeenLastCalledWith("09:30");
    expect(input.value).toBe("09:30");
    expect(input.name).toBe("beginn");
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("zeigt bei ungültiger Eingabe erst beim Verlassen den Fehlerzustand", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TimeField label="Beginn" labels={labels} onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Beginn") as HTMLInputElement;
    await user.type(input, "25:10");
    expect(input.getAttribute("aria-invalid")).toBeNull();
    await user.tab();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.value).toBe("25:10");
    expect(document.getElementById((input.getAttribute("aria-describedby") ?? "").split(" ")[0] ?? "")?.textContent).toBe(labels.invalidFormat);
    expect(onValueChange).not.toHaveBeenCalledWith(expect.any(String));
  });

  it("hebt den Fehler auf, sobald die Eingabe beim Verlassen gilt", async () => {
    const user = userEvent.setup();
    render(<TimeField label="Beginn" labels={labels} />);
    const input = screen.getByLabelText("Beginn") as HTMLInputElement;
    await user.type(input, "99");
    await user.tab();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    await user.clear(input);
    await user.type(input, "18:00");
    await user.tab();
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("prüft das Raster von step", async () => {
    const user = userEvent.setup();
    render(<TimeField label="Beginn" labels={labels} step={15} />);
    const input = screen.getByLabelText("Beginn");
    await user.type(input, "09:10");
    await user.tab();
    expect(screen.getByText(labels.notOnStep)).toBeTruthy();
  });

  it("wird mit options zur Auswahl erlaubter Zeiten", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TimeField label="Beginn" labels={labels} options={["09:00", "09:30", "10:00"]} placeholder="Zeit wählen" onValueChange={onValueChange} />);
    await user.click(screen.getByRole("combobox", { name: "Beginn" }));
    await user.click(screen.getByRole("option", { name: "09:30" }));
    expect(onValueChange).toHaveBeenCalledWith("09:30");
  });
});
