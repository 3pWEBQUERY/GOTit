import { describe, expect, it } from "vitest";
import { countEntriesForDay, entriesForDay, formatSegmentTime, layoutDay, minutesToOffset, monthWeeks, segmentsOverlap, shiftCalendarDate, weekDays } from "./calendar-layout";
import type { CalendarEntry } from "./calendar-types";

function entry(id: string, start: string, end: string, kind: CalendarEntry["kind"] = "confirmed"): CalendarEntry {
  return { id, start, end, kind, label: `Eintrag ${id}`, statusLabel: "Bestätigt" };
}

describe("weekDays", () => {
  it("beginnt die Woche am Montag", () => {
    // Der 19.11.2026 ist ein Donnerstag.
    expect(weekDays("2026-11-19")).toEqual(["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"]);
  });

  it("ordnet den Sonntag der Woche zu, die am Montag davor beginnt", () => {
    expect(weekDays("2026-11-22")[0]).toBe("2026-11-16");
    expect(weekDays("2026-11-16")[0]).toBe("2026-11-16");
  });

  it("geht über den Jahreswechsel", () => {
    expect(weekDays("2027-01-01")).toEqual(["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
  });
});

describe("monthWeeks", () => {
  it("liefert ganze Wochen von Montag bis Sonntag", () => {
    const weeks = monthWeeks("2026-11");
    expect(weeks).toHaveLength(6);
    expect(weeks[0]?.[0]).toBe("2026-10-26");
    expect(weeks[0]?.[6]).toBe("2026-11-01");
    expect(weeks.at(-1)).toEqual(["2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05", "2026-12-06"]);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it("enthält am Jahreswechsel Tage des Nachbarjahrs", () => {
    const december = monthWeeks("2026-12");
    expect(december[0]?.[0]).toBe("2026-11-30");
    expect(december.at(-1)?.[6]).toBe("2027-01-03");
    const january = monthWeeks("2027-01");
    expect(january[0]).toEqual(["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
    expect(january.at(-1)?.[6]).toBe("2027-01-31");
  });

  it("kürzt ein ganzes Datum auf den Monat", () => {
    expect(monthWeeks("2026-11-19")).toEqual(monthWeeks("2026-11"));
  });
});

describe("shiftCalendarDate", () => {
  it("verschiebt je Ansicht um Tag, Woche oder Monat", () => {
    expect(shiftCalendarDate("day", "2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftCalendarDate("week", "2026-11-16", -1)).toBe("2026-11-09");
    expect(shiftCalendarDate("month", "2026-12-15", 1)).toBe("2027-01-15");
  });
});

describe("entriesForDay", () => {
  const entries = [
    entry("spaet", "2026-11-16T18:00", "2026-11-16T19:30"),
    entry("frueh", "2026-11-16T09:15", "2026-11-16T10:00"),
    entry("anderer-tag", "2026-11-17T09:00", "2026-11-17T10:00"),
    entry("nacht", "2026-11-16T22:00", "2026-11-17T02:00"),
  ];

  it("liefert nur die Einträge des Tages, nach Beginn sortiert", () => {
    expect(entriesForDay(entries, "2026-11-16").map((segment) => segment.entry.id)).toEqual(["frueh", "spaet", "nacht"]);
  });

  it("rechnet Zeiten in Minuten seit Mitternacht", () => {
    const [first] = entriesForDay(entries, "2026-11-16");
    expect(first?.startMinutes).toBe(555);
    expect(first?.endMinutes).toBe(600);
  });

  it("schneidet Einträge über Mitternacht auf den Tag zu", () => {
    const evening = entriesForDay(entries, "2026-11-16").find((segment) => segment.entry.id === "nacht");
    expect(evening).toMatchObject({ startMinutes: 1320, endMinutes: 1440, continuesBefore: false, continuesAfter: true });
    const morning = entriesForDay(entries, "2026-11-17").find((segment) => segment.entry.id === "nacht");
    expect(morning).toMatchObject({ startMinutes: 0, endMinutes: 120, continuesBefore: true, continuesAfter: false });
  });

  it("zählt ein Ende um Mitternacht nicht zum Folgetag", () => {
    const untilMidnight = [entry("a", "2026-11-16T20:00", "2026-11-17T00:00")];
    expect(entriesForDay(untilMidnight, "2026-11-17")).toEqual([]);
    expect(entriesForDay(untilMidnight, "2026-11-16")[0]).toMatchObject({ endMinutes: 1440, continuesAfter: false });
  });

  it("übergeht Einträge, deren Ende nicht nach dem Beginn liegt", () => {
    expect(entriesForDay([entry("a", "2026-11-16T10:00", "2026-11-16T10:00")], "2026-11-16")).toEqual([]);
  });
});

describe("minutesToOffset", () => {
  const hours = { startHour: 8, endHour: 20 };

  it("rechnet Minuten in den Anteil der sichtbaren Stunden um", () => {
    expect(minutesToOffset(8 * 60, hours)).toBe(0);
    expect(minutesToOffset(14 * 60, hours)).toBe(0.5);
    expect(minutesToOffset(20 * 60, hours)).toBe(1);
  });

  it("begrenzt Zeiten ausserhalb der sichtbaren Stunden", () => {
    expect(minutesToOffset(6 * 60, hours)).toBe(0);
    expect(minutesToOffset(23 * 60, hours)).toBe(1);
  });
});

describe("segmentsOverlap", () => {
  it("erkennt geteilte Minuten, nicht aber aneinander grenzende Zeiträume", () => {
    expect(segmentsOverlap({ startMinutes: 600, endMinutes: 660 }, { startMinutes: 630, endMinutes: 720 })).toBe(true);
    expect(segmentsOverlap({ startMinutes: 600, endMinutes: 660 }, { startMinutes: 660, endMinutes: 720 })).toBe(false);
  });
});

describe("layoutDay", () => {
  const hours = { startHour: 8, endHour: 18 };

  it("setzt Beginn und Dauer als Position und Höhe", () => {
    const [placed] = layoutDay([entry("a", "2026-11-16T13:00", "2026-11-16T15:30")], "2026-11-16", hours);
    expect(placed).toMatchObject({ top: 0.5, height: 0.25, column: 0, columns: 1, layer: "foreground" });
  });

  it("verteilt überlappende Einträge auf Spalten", () => {
    const placed = layoutDay(
      [entry("a", "2026-11-16T10:00", "2026-11-16T12:00"), entry("b", "2026-11-16T11:00", "2026-11-16T13:00"), entry("c", "2026-11-16T12:00", "2026-11-16T13:00"), entry("d", "2026-11-16T15:00", "2026-11-16T16:00")],
      "2026-11-16",
      hours,
    );
    const byId = Object.fromEntries(placed.map((segment) => [segment.entry.id, segment]));
    expect(byId.a).toMatchObject({ column: 0, columns: 2 });
    expect(byId.b).toMatchObject({ column: 1, columns: 2 });
    // c beginnt, wenn a endet, und nutzt dessen Spalte wieder.
    expect(byId.c).toMatchObject({ column: 0, columns: 2 });
    // d überlappt nichts und bekommt die ganze Breite.
    expect(byId.d).toMatchObject({ column: 0, columns: 1 });
  });

  it("legt Verfügbarkeit als eigene Ebene hinter die übrigen Einträge", () => {
    const placed = layoutDay([entry("frei", "2026-11-16T09:00", "2026-11-16T17:00", "available"), entry("termin", "2026-11-16T10:00", "2026-11-16T11:00")], "2026-11-16", hours);
    expect(placed.find((segment) => segment.entry.id === "frei")).toMatchObject({ layer: "background", columns: 1 });
    expect(placed.find((segment) => segment.entry.id === "termin")).toMatchObject({ layer: "foreground", columns: 1 });
  });

  it("begrenzt Einträge auf die sichtbaren Stunden und lässt unsichtbare weg", () => {
    const placed = layoutDay([entry("frueh", "2026-11-16T06:00", "2026-11-16T07:00"), entry("rand", "2026-11-16T17:00", "2026-11-16T20:00")], "2026-11-16", hours);
    expect(placed.map((segment) => segment.entry.id)).toEqual(["rand"]);
    expect(placed[0]?.top).toBeCloseTo(0.9);
    expect(placed[0]?.height).toBeCloseTo(0.1);
  });
});

describe("formatSegmentTime", () => {
  it("schreibt Zeiten im 24-Stunden-Format", () => {
    expect(formatSegmentTime({ startMinutes: 545, endMinutes: 1110 })).toBe("09:05–18:30");
    expect(formatSegmentTime({ startMinutes: 1320, endMinutes: 1440 })).toBe("22:00–24:00");
  });
});

describe("countEntriesForDay", () => {
  it("zählt je Art", () => {
    const entries = [entry("a", "2026-11-16T10:00", "2026-11-16T11:00"), entry("b", "2026-11-16T12:00", "2026-11-16T13:00"), entry("c", "2026-11-16T14:00", "2026-11-16T15:00", "request"), entry("d", "2026-11-17T14:00", "2026-11-17T15:00", "blocker")];
    expect(countEntriesForDay(entries, "2026-11-16")).toEqual({ available: 0, request: 1, confirmed: 2, blocker: 0 });
    expect(countEntriesForDay(entries, "2026-11-18")).toEqual({ available: 0, request: 0, confirmed: 0, blocker: 0 });
  });
});
