import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CalendarDay } from "./calendar-day";
import { CalendarMonth } from "./calendar-month";
import { CalendarToolbar } from "./calendar-toolbar";
import type { CalendarDayCounts, CalendarEntry, CalendarView } from "./calendar-types";
import { CalendarWeek } from "./calendar-week";

const entries: CalendarEntry[] = [
  { id: "frei", start: "2026-11-16T14:00", end: "2026-11-16T18:00", kind: "available", label: "Arbeitszeit", statusLabel: "Verfügbar" },
  { id: "anfrage", start: "2026-11-18T16:00", end: "2026-11-18T17:00", kind: "request", label: "Terminanfrage", statusLabel: "Angefragt" },
  { id: "termin", start: "2026-11-16T18:00", end: "2026-11-16T19:30", kind: "confirmed", label: "Termin", statusLabel: "Bestätigt" },
  { id: "blocker", start: "2026-11-20T18:00", end: "2026-11-20T20:00", kind: "blocker", label: "Privat", statusLabel: "Blockiert", href: "/studio/kalender/blocker" },
];

const weekLabels = { today: "Heute", emptyDay: "Keine Einträge" };

describe("CalendarWeek", () => {
  function renderWeek(onEntrySelect = vi.fn()) {
    render(<CalendarWeek date="2026-11-18" entries={entries} locale="de-CH" label="Kalender, 16. bis 22. November 2026" labels={weekLabels} today="2026-11-16" onEntrySelect={onEntrySelect} />);
    return onEntrySelect;
  }

  it("zeigt sieben Spaltenköpfe von Montag bis Sonntag und markiert heute", () => {
    renderWeek();
    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(7);
    expect(headers[0]?.textContent).toContain("Montag, 16. November");
    expect(headers[0]?.textContent).toContain("Heute");
    expect(headers[0]?.getAttribute("aria-current")).toBe("date");
    expect(headers[6]?.textContent).toContain("Sonntag, 22. November");
    expect(headers[6]?.getAttribute("aria-current")).toBeNull();
  });

  it("nennt bei jedem Eintrag Zeit, Label und Status im Namen und zeigt den Status als Wort", () => {
    renderWeek();
    const table = screen.getByRole("table", { name: "Kalender, 16. bis 22. November 2026" });
    const names = ["14:00–18:00, Arbeitszeit, Verfügbar", "16:00–17:00, Terminanfrage, Angefragt", "18:00–19:30, Termin, Bestätigt"];
    for (const name of names) expect(within(table).getByRole("button", { name })).toBeTruthy();
    expect(within(table).getByRole("link", { name: "18:00–20:00, Privat, Blockiert" }).getAttribute("href")).toBe("/studio/kalender/blocker");
    for (const entry of entries) {
      const block = table.querySelector(`[data-kind="${entry.kind}"]`);
      expect(block?.textContent).toContain(entry.statusLabel);
    }
  });

  it("meldet die Auswahl eines Eintrags per Tastatur", async () => {
    const user = userEvent.setup();
    const onEntrySelect = renderWeek();
    const block = screen.getByRole("button", { name: "18:00–19:30, Termin, Bestätigt" });
    block.focus();
    await user.keyboard("{Enter}");
    expect(onEntrySelect).toHaveBeenCalledWith(entries[2]);
    await user.keyboard(" ");
    expect(onEntrySelect).toHaveBeenCalledTimes(2);
  });

  it("erreicht die Einträge eines Tages mit Tab in zeitlicher Reihenfolge", async () => {
    const user = userEvent.setup();
    renderWeek();
    await user.tab();
    expect(document.activeElement?.getAttribute("aria-label")).toBe("14:00–18:00, Arbeitszeit, Verfügbar");
    await user.tab();
    expect(document.activeElement?.getAttribute("aria-label")).toBe("18:00–19:30, Termin, Bestätigt");
  });

  it("zeigt den Hinweis zur Zeitzone nur, wenn er gesetzt ist", () => {
    const { rerender } = render(<CalendarWeek date="2026-11-18" entries={[]} locale="de-CH" label="Kalender" labels={weekLabels} />);
    expect(screen.queryByText("Zeiten in der Zeitzone Zürich")).toBeNull();
    rerender(<CalendarWeek date="2026-11-18" entries={[]} locale="de-CH" label="Kalender" labels={weekLabels} timeZoneNote="Zeiten in der Zeitzone Zürich" />);
    expect(screen.getByText("Zeiten in der Zeitzone Zürich")).toBeTruthy();
  });
});

describe("CalendarDay", () => {
  it("zeigt den Wochenstreifen und meldet den gewählten Tag", async () => {
    const user = userEvent.setup();
    const onDateChange = vi.fn();
    render(<CalendarDay date="2026-11-18" entries={entries} locale="de-CH" labels={{ today: "Heute", weekStrip: "Tag wählen", emptyDay: "Keine Einträge an diesem Tag" }} today="2026-11-16" onDateChange={onDateChange} />);
    const strip = screen.getByRole("group", { name: "Tag wählen" });
    const days = within(strip).getAllByRole("button");
    expect(days).toHaveLength(7);
    expect(days[0]?.getAttribute("aria-current")).toBe("date");
    expect(days[2]?.getAttribute("aria-pressed")).toBe("true");
    expect(days[0]?.getAttribute("aria-pressed")).toBe("false");

    await user.click(within(strip).getByRole("button", { name: "Freitag, 20. November 2026" }));
    expect(onDateChange).toHaveBeenCalledWith("2026-11-20");
    expect(screen.getByRole("button", { name: "16:00–17:00, Terminanfrage, Angefragt" })).toBeTruthy();
  });

  it("sagt, wenn ein Tag leer ist", () => {
    render(<CalendarDay date="2026-11-19" entries={entries} locale="de-CH" labels={{ today: "Heute", weekStrip: "Tag wählen", emptyDay: "Keine Einträge an diesem Tag" }} />);
    expect(screen.getByText("Keine Einträge an diesem Tag")).toBeTruthy();
  });
});

describe("CalendarMonth", () => {
  const dayLabel = (_date: string, counts: CalendarDayCounts) => {
    const total = counts.available + counts.request + counts.confirmed + counts.blocker;
    return total > 0 ? `${total} Einträge` : "";
  };

  function renderMonth(onDateSelect = vi.fn()) {
    render(<CalendarMonth month="2026-11" entries={entries} locale="de-CH" label="November 2026" dayLabel={dayLabel} todayLabel="Heute" today="2026-11-16" onDateSelect={onDateSelect} />);
    return onDateSelect;
  }

  it("beginnt die Woche am Montag und nennt die Anzahl Einträge je Tag", () => {
    renderMonth();
    const headers = screen.getAllByRole("columnheader");
    expect(headers[0]?.getAttribute("aria-label")).toBe("Montag");
    expect(headers[6]?.getAttribute("aria-label")).toBe("Sonntag");
    expect(screen.getByRole("button", { name: "Montag, 16. November 2026, Heute, 2 Einträge" }).getAttribute("aria-current")).toBe("date");
    expect(screen.getByRole("button", { name: "Dienstag, 17. November 2026" })).toBeTruthy();
    // Tage des Nachbarmonats sind vorhanden und wählbar.
    expect(screen.getByRole("button", { name: "Montag, 26. Oktober 2026" })).toBeTruthy();
  });

  it("hat genau einen Tabstopp und bewegt den Fokus mit den Pfeiltasten", async () => {
    const user = userEvent.setup();
    const onDateSelect = renderMonth();
    const grid = screen.getByRole("grid", { name: "November 2026" });
    expect(grid.querySelectorAll('button[tabindex="0"]')).toHaveLength(1);

    await user.tab();
    expect(document.activeElement?.getAttribute("data-date")).toBe("2026-11-16");
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement?.getAttribute("data-date")).toBe("2026-11-17");
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement?.getAttribute("data-date")).toBe("2026-11-24");
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement?.getAttribute("data-date")).toBe("2026-11-23");
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement?.getAttribute("data-date")).toBe("2026-11-16");
    await user.keyboard("{End}");
    expect(document.activeElement?.getAttribute("data-date")).toBe("2026-11-22");
    expect(grid.querySelectorAll('button[tabindex="0"]')).toHaveLength(1);

    await user.keyboard("{Enter}");
    expect(onDateSelect).toHaveBeenCalledWith("2026-11-22");
  });

  it("bleibt an den Rändern des Rasters stehen", async () => {
    const user = userEvent.setup();
    renderMonth();
    screen.getByRole("button", { name: "Montag, 26. Oktober 2026" }).focus();
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement?.getAttribute("data-date")).toBe("2026-10-26");
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement?.getAttribute("data-date")).toBe("2026-10-26");
  });
});

describe("CalendarToolbar", () => {
  const labels = { previous: "Vorherige Woche", next: "Nächste Woche", today: "Heute", view: "Ansicht", day: "Tag", week: "Woche", month: "Monat" };

  function Example({ onViewChange }: { onViewChange: (view: CalendarView) => void }) {
    const [view, setView] = useState<CalendarView>("week");
    return (
      <CalendarToolbar
        title="16.–22. Nov. 2026"
        view={view}
        onViewChange={(next) => {
          setView(next);
          onViewChange(next);
        }}
        onPrevious={() => undefined}
        onNext={() => undefined}
        onToday={() => undefined}
        labels={labels}
      />
    );
  }

  it("lässt die Ansicht nie leer", async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();
    render(<Example onViewChange={onViewChange} />);
    const group = screen.getByRole("radiogroup", { name: "Ansicht" });
    const week = within(group).getByRole("radio", { name: "Woche" });
    expect(week.getAttribute("aria-checked")).toBe("true");

    await user.click(week);
    expect(onViewChange).not.toHaveBeenCalled();
    expect(week.getAttribute("aria-checked")).toBe("true");

    await user.click(within(group).getByRole("radio", { name: "Monat" }));
    expect(onViewChange).toHaveBeenCalledWith("month");
    expect(within(group).getByRole("radio", { name: "Monat" }).getAttribute("aria-checked")).toBe("true");
    expect(week.getAttribute("aria-checked")).toBe("false");
  });

  it("meldet zurück, heute und vor", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    render(
      <CalendarToolbar title="16.–22. Nov. 2026" view="week" onViewChange={() => undefined} onPrevious={() => calls.push("zurück")} onNext={() => calls.push("vor")} onToday={() => calls.push("heute")} labels={labels} actions={<button type="button">Blocker anlegen</button>} />,
    );
    await user.click(screen.getByRole("button", { name: "Vorherige Woche" }));
    await user.click(screen.getByRole("button", { name: "Heute" }));
    await user.click(screen.getByRole("button", { name: "Nächste Woche" }));
    expect(calls).toEqual(["zurück", "heute", "vor"]);
    expect(screen.getByText("16.–22. Nov. 2026")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Blocker anlegen" })).toBeTruthy();
  });
});
