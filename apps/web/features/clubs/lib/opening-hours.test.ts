import { describe, expect, it } from "vitest";
import {
  formatMinute,
  formatSpan,
  todayStatus,
  weeklyRows,
  zurichNow,
  type HoursException,
  type HoursWindow,
} from "./opening-hours";

/** Freitag 22:00 bis Samstag 02:00, Samstag 22:00 bis 24:00, Mittwoch 18:00 bis 23:00. */
const HOURS: HoursWindow[] = [
  { weekday: 5, startMinute: 22 * 60, endMinute: 24 * 60 },
  { weekday: 6, startMinute: 0, endMinute: 2 * 60 },
  { weekday: 6, startMinute: 22 * 60, endMinute: 24 * 60 },
  { weekday: 3, startMinute: 18 * 60, endMinute: 23 * 60 },
];

/** Ortszeit Zürich als Zeitpunkt; November ist Winterzeit (UTC+1). */
const at = (local: string) => new Date(`${local}+01:00`);

describe("zurichNow", () => {
  it("rechnet in Europe/Zurich, auch über die Datumsgrenze von UTC", () => {
    expect(zurichNow(new Date("2026-11-20T23:30:00Z"))).toEqual({
      day: "2026-11-21",
      weekday: 6,
      minute: 30,
    });
    // Sommerzeit: UTC+2.
    expect(zurichNow(new Date("2026-07-03T22:15:00Z")).minute).toBe(15);
  });
});

describe("todayStatus", () => {
  it("Freitagabend vor der Öffnung: später geöffnet, bis 02:00 über Mitternacht", () => {
    expect(todayStatus(HOURS, [], at("2026-11-20T20:00:00"))).toEqual({
      kind: "later",
      from: 22 * 60,
      until: 26 * 60,
    });
  });

  it("Freitag 23:00: geöffnet bis 02:00", () => {
    const status = todayStatus(HOURS, [], at("2026-11-20T23:00:00"));
    expect(status).toEqual({ kind: "open", until: 26 * 60 });
    expect(status.kind === "open" && formatMinute(status.until)).toBe("02:00");
  });

  it("Samstag 01:00: die Nacht vom Freitag läuft noch", () => {
    expect(todayStatus(HOURS, [], at("2026-11-21T01:00:00"))).toEqual({
      kind: "open",
      until: 2 * 60,
    });
  });

  it("Samstag 03:00: später wieder geöffnet; Samstag 22:30 offen bis 24:00", () => {
    expect(todayStatus(HOURS, [], at("2026-11-21T03:00:00"))).toMatchObject({
      kind: "later",
      from: 22 * 60,
    });
    expect(todayStatus(HOURS, [], at("2026-11-21T22:30:00"))).toEqual({
      kind: "open",
      until: 24 * 60,
    });
  });

  it("Mittwoch 23:30: heute vorbei; Montag: heute geschlossen", () => {
    expect(todayStatus(HOURS, [], at("2026-11-18T23:30:00"))).toEqual({
      kind: "over",
    });
    expect(todayStatus(HOURS, [], at("2026-11-16T12:00:00"))).toEqual({
      kind: "closed",
    });
  });

  it("eine geschlossene Ausnahme ersetzt die Zeiten ihres Tages", () => {
    const closed: HoursException[] = [
      {
        day: "2026-11-20",
        closed: true,
        startMinute: null,
        endMinute: null,
        note: "Fiktiv",
      },
    ];
    expect(todayStatus(HOURS, closed, at("2026-11-20T23:00:00"))).toEqual({
      kind: "closed",
    });
    // Der Samstag 00:00–02:00 bleibt, er gehört zum Samstag.
    expect(todayStatus(HOURS, closed, at("2026-11-21T01:00:00"))).toEqual({
      kind: "open",
      until: 2 * 60,
    });
  });

  it("eine Ausnahme mit anderen Zeiten öffnet an einem sonst geschlossenen Tag", () => {
    const special: HoursException[] = [
      {
        day: "2026-11-16",
        closed: false,
        startMinute: 20 * 60,
        endMinute: 23 * 60,
        note: null,
      },
    ];
    expect(todayStatus(HOURS, special, at("2026-11-16T21:00:00"))).toEqual({
      kind: "open",
      until: 23 * 60,
    });
  });

  it("ohne Zeiten: geschlossen", () => {
    expect(todayStatus([], [], at("2026-11-20T23:00:00"))).toEqual({
      kind: "closed",
    });
  });
});

describe("weeklyRows", () => {
  it("Montag zuerst; die Nacht über Mitternacht steht einmal am Vortag", () => {
    const rows = weeklyRows(HOURS);
    expect(rows.map((row) => row.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    const text = Object.fromEntries(
      rows.map((row) => [row.weekday, row.spans.map(formatSpan).join(", ")]),
    );
    expect(text).toEqual({
      1: "",
      2: "",
      3: "18:00–23:00",
      4: "",
      5: "22:00–02:00",
      6: "22:00–24:00",
      0: "",
    });
  });

  it("ein Fenster ab 00:00 ohne Vortag bleibt stehen", () => {
    const rows = weeklyRows([{ weekday: 1, startMinute: 0, endMinute: 120 }]);
    expect(rows[0]?.spans.map(formatSpan)).toEqual(["00:00–02:00"]);
  });
});
