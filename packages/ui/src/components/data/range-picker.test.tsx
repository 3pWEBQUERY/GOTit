import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { RangePicker, type RangeValue } from "./range-picker";

const labels = {
  group: "Zeitraum",
  "7d": "7 Tage",
  "30d": "30 Tage",
  "90d": "90 Tage",
  custom: "Eigener Zeitraum",
  from: "Von",
  to: "Bis",
  date: { openCalendar: "Kalender öffnen", previousMonth: "Vorheriger Monat", nextMonth: "Nächster Monat", invalidFormat: "Gib das Datum als TT.MM.JJJJ ein.", outOfRange: "Dieser Tag liegt ausserhalb des Zeitraums." },
};

function Example({ onChange, initial = { preset: "7d" } }: { onChange: (value: RangeValue) => void; initial?: RangeValue }) {
  const [value, setValue] = useState<RangeValue>(initial);
  return (
    <RangePicker
      locale="de-CH"
      labels={labels}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("RangePicker", () => {
  it("wechselt die Voreinstellung und bleibt nie leer", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);
    expect(screen.getByRole("radiogroup", { name: "Zeitraum" })).toBeTruthy();
    const seven = screen.getByRole("radio", { name: "7 Tage" });
    expect(seven.getAttribute("aria-checked")).toBe("true");
    expect(screen.queryByRole("textbox")).toBeNull();

    await user.click(seven);
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("radio", { name: "30 Tage" }));
    expect(onChange).toHaveBeenLastCalledWith({ preset: "30d" });
    expect(screen.getByRole("radio", { name: "30 Tage" }).getAttribute("aria-checked")).toBe("true");
  });

  it("zeigt beim eigenen Zeitraum zwei Datumsfelder und liefert from und to", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: "Eigener Zeitraum" }));
    expect(onChange).toHaveBeenLastCalledWith({ preset: "custom", from: "", to: "" });

    await user.type(screen.getByRole("textbox", { name: "Von" }), "01.11.2026");
    expect(onChange).toHaveBeenLastCalledWith({ preset: "custom", from: "2026-11-01", to: "" });

    await user.type(screen.getByRole("textbox", { name: "Bis" }), "15.11.2026");
    expect(onChange).toHaveBeenLastCalledWith({ preset: "custom", from: "2026-11-01", to: "2026-11-15" });
  });

  it("lässt kein Ende vor dem Anfang zu", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Example onChange={onChange} initial={{ preset: "custom", from: "2026-11-10", to: "" }} />);
    const to = screen.getByRole("textbox", { name: "Bis" });
    await user.type(to, "05.11.2026");
    await user.tab();
    expect(onChange.mock.calls.every(([value]) => (value as { to?: string }).to === "")).toBe(true);
    expect(screen.getByText("Dieser Tag liegt ausserhalb des Zeitraums.")).toBeTruthy();
  });
});
