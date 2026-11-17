import { describe, expect, it } from "vitest";
import {
  hourRange,
  localStamp,
  localToUtc,
  mondayOf,
  toGridEntries,
  utcRange,
  visibleDays,
  type EntryWords,
} from "./calendar-model";
import {
  calendarQuery,
  entryKey,
  isIsoDay,
  parseCalendarParams,
} from "./calendar-params";
import { durationParts, formatSpan, rangeTitle } from "./format";

const words: EntryWords = {
  available: "Arbeitszeit",
  availableStatus: "Verfügbar",
  blocker: "Blocker",
  blockerStatus: "Blockiert",
  absence: "Abwesenheit",
  absenceStatus: "Abwesend",
  request: (name) => name ?? "Terminanfrage",
  status: (status) => status.toLowerCase(),
};

describe("Kalender im Studio: URL", () => {
  it("liest Ansicht, Datum und Panel und verwirft Ungültiges", () => {
    expect(
      parseCalendarParams({
        ansicht: "monat",
        datum: "2026-11-18",
        anfrage: "abc_1",
      }),
    ).toEqual({
      view: "month",
      date: "2026-11-18",
      request: "abc_1",
      block: null,
    });
    expect(
      parseCalendarParams({
        ansicht: "jahr",
        datum: "2026-02-30",
        blocker: "x y",
      }),
    ).toEqual({ view: null, date: null, request: null, block: null });
  });

  it("schreibt nur gesetzte Werte und höchstens ein Panel", () => {
    expect(calendarQuery({ view: "week", date: "2026-11-16" })).toBe(
      "?ansicht=woche&datum=2026-11-16",
    );
    expect(calendarQuery({ request: "r1", block: "b1" })).toBe("?anfrage=r1");
    expect(calendarQuery({})).toBe("");
  });

  it("prüft Kalendertage", () => {
    expect(isIsoDay("2028-02-29")).toBe(true);
    expect(isIsoDay("2027-02-29")).toBe(false);
  });
});

describe("Kalender im Studio: Zeitzone und Raster", () => {
  it("zeigt UTC als Ortszeit des Anbieters, auch über die Sommerzeit", () => {
    expect(localStamp(new Date("2026-11-18T17:00:00Z"), "Europe/Zurich")).toBe(
      "2026-11-18T18:00",
    );
    expect(localStamp(new Date("2026-07-01T17:00:00Z"), "Europe/Zurich")).toBe(
      "2026-07-01T19:00",
    );
    expect(localStamp(new Date("2026-11-18T17:00:00Z"), "Europe/London")).toBe(
      "2026-11-18T17:00",
    );
  });

  it("rechnet Ortszeiten zurück und lehnt ungültige Zeiten ab", () => {
    expect(
      localToUtc("2026-11-18", "18:30", "Europe/Zurich")?.toISOString(),
    ).toBe("2026-11-18T17:30:00.000Z");
    expect(localToUtc("2026-11-18", "24:00", "Europe/Zurich")).toBeNull();
    expect(localToUtc("2026-11-18", "9:00", "Europe/Zurich")).toBeNull();
  });

  it("beginnt Wochen am Montag und zeigt Monate in ganzen Wochen", () => {
    expect(mondayOf("2026-11-22")).toBe("2026-11-16");
    expect(mondayOf("2026-11-16")).toBe("2026-11-16");
    expect(visibleDays("week", "2026-11-18")).toEqual({
      first: "2026-11-16",
      last: "2026-11-22",
    });
    expect(visibleDays("month", "2026-11-18")).toEqual({
      first: "2026-10-26",
      last: "2026-12-06",
    });
  });

  it("fasst den Zeitraum von Mitternacht bis Mitternacht in der Zone des Anbieters", () => {
    const range = utcRange("2026-11-16", "2026-11-22", "Europe/Zurich");
    expect(range.from.toISOString()).toBe("2026-11-15T23:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-11-22T23:00:00.000Z");
  });

  it("macht aus Kerneinträgen Rastereinträge mit Status als Wort", () => {
    const grid = toGridEntries(
      [
        {
          kind: "available",
          id: null,
          start: new Date("2026-11-18T11:00:00Z"),
          end: new Date("2026-11-18T21:00:00Z"),
          note: null,
          status: null,
        },
        {
          kind: "absence",
          id: "b1",
          start: new Date("2026-11-19T23:00:00Z"),
          end: new Date("2026-11-20T23:00:00Z"),
          note: "privat",
          status: null,
        },
        {
          kind: "blocker",
          id: "b2",
          start: new Date("2026-11-18T12:00:00Z"),
          end: new Date("2026-11-18T13:00:00Z"),
          note: " ",
          status: null,
        },
        {
          kind: "request",
          id: "r1",
          start: new Date("2026-11-18T17:00:00Z"),
          end: new Date("2026-11-18T18:00:00Z"),
          note: null,
          status: "REQUESTED",
          counterpartName: "gast",
        },
      ],
      "Europe/Zurich",
      words,
    );
    expect(
      grid.map((entry) => [
        entry.id,
        entry.kind,
        entry.label,
        entry.statusLabel,
        entry.start,
        entry.end,
      ]),
    ).toEqual([
      [
        "a:2026-11-18T12:00|2026-11-18T22:00",
        "available",
        "Arbeitszeit",
        "Verfügbar",
        "2026-11-18T12:00",
        "2026-11-18T22:00",
      ],
      [
        "b:b1",
        "blocker",
        "Abwesenheit",
        "Abwesend",
        "2026-11-20T00:00",
        "2026-11-21T00:00",
      ],
      [
        "b:b2",
        "blocker",
        "Blocker",
        "Blockiert",
        "2026-11-18T13:00",
        "2026-11-18T14:00",
      ],
      [
        "r:r1",
        "request",
        "gast",
        "requested",
        "2026-11-18T18:00",
        "2026-11-18T19:00",
      ],
    ]);
    expect(entryKey("r:r1")).toEqual({ kind: "request", id: "r1" });
    expect(entryKey("a:2026-11-18T12:00|2026-11-18T22:00")).toEqual({
      kind: "available",
      start: "2026-11-18T12:00",
      end: "2026-11-18T22:00",
    });
    expect(entryKey("x")).toBeNull();
  });

  it("wählt die sichtbaren Stunden nach den Einträgen, mindestens acht", () => {
    const days = { first: "2026-11-16", last: "2026-11-22" };
    const entry = (start: string, end: string) => ({
      id: start,
      start,
      end,
      kind: "request" as const,
      label: "",
      statusLabel: "",
    });
    expect(hourRange([], days)).toEqual({ startHour: 8, endHour: 20 });
    expect(
      hourRange([entry("2026-11-18T12:00", "2026-11-18T22:00")], days),
    ).toEqual({ startHour: 12, endHour: 22 });
    expect(
      hourRange([entry("2026-11-18T18:00", "2026-11-18T19:30")], days),
    ).toEqual({ startHour: 15, endHour: 23 });
    expect(
      hourRange([entry("2026-11-18T22:00", "2026-11-19T02:00")], days),
    ).toEqual({ startHour: 0, endHour: 24 });
    expect(
      hourRange([entry("2026-11-10T10:00", "2026-11-10T12:00")], days),
    ).toEqual({ startHour: 8, endHour: 20 });
  });
});

describe("Kalender im Studio: Texte", () => {
  it("formatiert Zeiträume in der Zone des Anbieters", () => {
    expect(
      formatSpan(
        new Date("2026-11-19T17:00:00Z"),
        new Date("2026-11-19T18:00:00Z"),
        "de",
        "Europe/Zurich",
      ),
    ).toBe("Do., 19.11.2026, 18:00–19:00");
    expect(
      formatSpan(
        new Date("2026-11-19T22:00:00Z"),
        new Date("2026-11-19T23:00:00Z"),
        "de",
        "Europe/Zurich",
      ),
    ).toBe("Do., 19.11.2026, 23:00–24:00");
    expect(
      formatSpan(
        new Date("2026-11-19T21:00:00Z"),
        new Date("2026-11-20T01:00:00Z"),
        "de",
        "Europe/Zurich",
      ),
    ).toBe("Do., 19.11.2026, 22:00 – Fr., 20.11.2026, 02:00");
    expect(durationParts(new Date(0), new Date(90 * 60_000))).toEqual({
      hours: 1,
      minutes: 30,
    });
  });

  it("benennt den gezeigten Bereich", () => {
    expect(
      rangeTitle("week", "2026-11-18", "2026-11-16", "2026-11-22", "de"),
    ).toBe("16.–22. Nov. 2026");
    expect(rangeTitle("month", "2026-11-18", "", "", "de")).toBe(
      "November 2026",
    );
    expect(rangeTitle("day", "2026-11-18", "", "", "de")).toBe(
      "Mittwoch, 18. November 2026",
    );
  });
});
