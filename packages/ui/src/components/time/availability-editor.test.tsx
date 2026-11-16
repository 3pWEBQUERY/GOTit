import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { AvailabilityEditor } from "./availability-editor";
import { emptyAvailability, type AvailabilityValue } from "./availability-validation";
import { BookingTimeline } from "./booking-timeline";
import { BOOKING_STATUSES, StatusPill, type BookingStatus } from "./status-pill";

const dayLabels = { mon: "Montag", tue: "Dienstag", wed: "Mittwoch", thu: "Donnerstag", fri: "Freitag", sat: "Samstag", sun: "Sonntag" };
const labels = {
  available: (day: string) => `${day} verfügbar`,
  unavailable: "Nicht verfügbar",
  from: "Von",
  to: "Bis",
  window: (day: string, position: number) => `${day}, Zeitfenster ${position}`,
  addWindow: "Zeitfenster hinzufügen",
  removeWindow: "Zeitfenster entfernen",
  errors: { endBeforeStart: "Das Ende muss nach dem Beginn liegen.", overlap: "Dieses Zeitfenster überschneidet ein anderes." },
  timeField: { invalidFormat: "Gib die Zeit als HH:MM ein." },
};

function Example({ initial, onChange }: { initial: AvailabilityValue; onChange?: (value: AvailabilityValue) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <AvailabilityEditor
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      dayLabels={dayLabels}
      labels={labels}
    />
  );
}

describe("AvailabilityEditor", () => {
  it("zeigt sieben Tage ab Montag und schaltet einen Tag mit Standardfenster ein", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Example initial={emptyAvailability()} onChange={onChange} />);
    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(7);
    expect(screen.getAllByRole("group")[0]?.getAttribute("aria-label")).toBe("Montag");

    await user.click(screen.getByRole("switch", { name: "Montag verfügbar" }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ mon: [{ from: "09:00", to: "17:00" }] }));
    const window = screen.getByRole("group", { name: "Montag, Zeitfenster 1" });
    expect((within(window).getByLabelText("Von") as HTMLInputElement).value).toBe("09:00");
    expect((within(window).getByLabelText("Bis") as HTMLInputElement).value).toBe("17:00");
  });

  it("fügt Zeitfenster hinzu und entfernt sie", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Example initial={{ ...emptyAvailability(), tue: [{ from: "09:00", to: "12:00" }] }} onChange={onChange} />);
    const tuesday = screen.getByRole("group", { name: "Dienstag" });

    await user.click(within(tuesday).getByRole("button", { name: "Zeitfenster hinzufügen" }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tue: [
          { from: "09:00", to: "12:00" },
          { from: "13:00", to: "15:00" },
        ],
      }),
    );
    expect(within(tuesday).getByRole("group", { name: "Dienstag, Zeitfenster 2" })).toBeTruthy();

    const first = within(tuesday).getByRole("group", { name: "Dienstag, Zeitfenster 1" });
    await user.click(within(first).getByRole("button", { name: "Zeitfenster entfernen" }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ tue: [{ from: "13:00", to: "15:00" }] }));
    expect(within(tuesday).queryByRole("group", { name: "Dienstag, Zeitfenster 2" })).toBeNull();

    await user.click(within(tuesday).getByRole("button", { name: "Zeitfenster entfernen" }));
    expect(within(tuesday).getByText("Nicht verfügbar")).toBeTruthy();
    expect(within(tuesday).getByRole("switch").getAttribute("aria-checked")).toBe("false");
  });

  it("prüft erst beim Verlassen des Felds, ob das Ende nach dem Beginn liegt", async () => {
    const user = userEvent.setup();
    render(<Example initial={{ ...emptyAvailability(), wed: [{ from: "14:00", to: "18:00" }] }} />);
    const to = screen.getByLabelText("Bis");
    await user.clear(to);
    await user.type(to, "13:00");
    expect(screen.queryByText("Das Ende muss nach dem Beginn liegen.")).toBeNull();
    await user.tab();
    expect(screen.getByText("Das Ende muss nach dem Beginn liegen.")).toBeTruthy();
    expect(to.getAttribute("aria-invalid")).toBe("true");
  });

  it("meldet überlappende Zeitfenster am späteren Fenster", () => {
    render(
      <AvailabilityEditor
        value={{
          ...emptyAvailability(),
          thu: [
            { from: "09:00", to: "12:00" },
            { from: "11:00", to: "14:00" },
          ],
        }}
        onValueChange={() => undefined}
        dayLabels={dayLabels}
        labels={labels}
        showAllErrors
      />,
    );
    const second = screen.getByRole("group", { name: "Donnerstag, Zeitfenster 2" });
    expect(within(second).getByText("Dieses Zeitfenster überschneidet ein anderes.")).toBeTruthy();
    expect(within(screen.getByRole("group", { name: "Donnerstag, Zeitfenster 1" })).queryByText("Dieses Zeitfenster überschneidet ein anderes.")).toBeNull();
  });

  it("zeigt das Feld für den Puffer nur, wenn es übergeben wird", () => {
    const { rerender } = render(<AvailabilityEditor value={emptyAvailability()} onValueChange={() => undefined} dayLabels={dayLabels} labels={labels} />);
    expect(screen.queryByText("Puffer zwischen Terminen")).toBeNull();
    rerender(
      <AvailabilityEditor
        value={emptyAvailability()}
        onValueChange={() => undefined}
        dayLabels={dayLabels}
        labels={labels}
        buffer={{ label: "Puffer zwischen Terminen", value: "15", onValueChange: () => undefined, options: [{ value: "15", label: "15 Minuten" }] }}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Puffer zwischen Terminen" }).textContent).toContain("15 Minuten");
  });
});

describe("StatusPill", () => {
  const words: Record<BookingStatus, string> = {
    requested: "Angefragt",
    negotiating: "In Abstimmung",
    confirmed: "Bestätigt",
    declined: "Abgelehnt",
    cancelled: "Abgesagt",
    expired: "Abgelaufen",
    completed: "Stattgefunden",
    disputed: "Strittig",
  };

  it.each(BOOKING_STATUSES)("zeigt für %s Wort und Icon", (status) => {
    const { container } = render(<StatusPill status={status} label={words[status]} />);
    expect(screen.getByText(words[status])).toBeTruthy();
    const icon = container.querySelector("svg");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });

  it("kennt genau acht Status mit je eigenem Icon", () => {
    expect(BOOKING_STATUSES).toHaveLength(8);
    const icons = BOOKING_STATUSES.map((status) => {
      const { container, unmount } = render(<StatusPill status={status} label={words[status]} />);
      const markup = container.querySelector("svg")?.innerHTML ?? "";
      unmount();
      return markup;
    });
    expect(new Set(icons).size).toBe(8);
  });

  it("färbt nie den Text, nur das Icon von abgelehnt und strittig", () => {
    const { container } = render(
      <>
        <StatusPill status="declined" label="Abgelehnt" />
        <StatusPill status="disputed" label="Strittig" />
        <StatusPill status="confirmed" label="Bestätigt" />
      </>,
    );
    const [declined, disputed, confirmed] = Array.from(container.querySelectorAll("[data-status]"));
    expect(declined?.className).not.toMatch(/text-(error|warning)/);
    expect(declined?.querySelector("svg")?.getAttribute("class")).toContain("text-warning");
    expect(disputed?.querySelector("svg")?.getAttribute("class")).toContain("text-error");
    expect(confirmed?.className).toContain("border-accent");
    expect(declined?.className).not.toContain("border-accent");
  });
});

describe("BookingTimeline", () => {
  it("zeigt Ereignisse als geordnete Liste und hebt das neueste hervor", () => {
    render(
      <BookingTimeline
        label="Verlauf der Terminanfrage"
        latestLabel="Aktueller Stand:"
        events={[
          { id: "2", status: "confirmed", statusLabel: "Bestätigt", time: "vor 2 Stunden", exactTime: "16.11.2026, 12:05", actor: "Beispielname", note: "Beispieltext einer Notiz" },
          { id: "1", status: "requested", statusLabel: "Angefragt", time: "gestern", exactTime: "15.11.2026, 18:40", actor: "Beispielgast" },
        ]}
      />,
    );
    const list = screen.getByRole("list", { name: "Verlauf der Terminanfrage" });
    expect(list.tagName).toBe("OL");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]?.getAttribute("aria-current")).toBe("step");
    expect(items[0]?.textContent).toContain("Aktueller Stand: Bestätigt");
    expect(items[1]?.getAttribute("aria-current")).toBeNull();
    expect(screen.getByText("vor 2 Stunden").getAttribute("title")).toBe("16.11.2026, 12:05");
    expect(screen.getByText("Beispieltext einer Notiz")).toBeTruthy();
  });
});
