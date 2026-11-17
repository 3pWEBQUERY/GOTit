import { describe, expect, it } from "vitest";
import {
  STEP_MINUTES,
  findStart,
  fittingDurations,
  keepDuration,
  slotDays,
} from "./slot-options";

const ZONE = "Europe/Zurich";

describe("slotDays", () => {
  it("bietet nur Tage mit freien Zeiten und Startzeiten im 30-Minuten-Raster in der Zone des Anbieters", () => {
    // Do 19.11.2026, 18:00–20:00 in Zürich (17:00–19:00 UTC); Sa 21.11., 10:15–11:00 (nach dem Mindestvorlauf angeschnitten).
    const days = slotDays(
      [
        { start: "2026-11-21T09:15:00.000Z", end: "2026-11-21T10:00:00.000Z" },
        { start: "2026-11-19T17:00:00.000Z", end: "2026-11-19T19:00:00.000Z" },
      ],
      ZONE,
    );
    expect(STEP_MINUTES).toBe(30);
    expect(days.map((day) => day.day)).toEqual(["2026-11-19", "2026-11-21"]);
    expect(days[0]?.times.map((time) => time.time)).toEqual([
      "18:00",
      "18:30",
      "19:00",
      "19:30",
    ]);
    expect(days[0]?.times[0]).toEqual({
      time: "18:00",
      startsAt: "2026-11-19T17:00:00.000Z",
      maxMinutes: 120,
    });
    // 10:15 wird auf 10:30 gerundet; 30 Minuten passen bis 11:00.
    expect(days[1]?.times).toEqual([
      { time: "10:30", startsAt: "2026-11-21T09:30:00.000Z", maxMinutes: 30 },
    ]);
  });

  it("lässt Fenster weg, in die nicht einmal die kürzeste Dauer passt", () => {
    expect(
      slotDays(
        [
          {
            start: "2026-11-19T17:10:00.000Z",
            end: "2026-11-19T17:50:00.000Z",
          },
        ],
        ZONE,
      ),
    ).toEqual([]);
  });

  it("ordnet Zeiten nach Mitternacht dem Tag in der Zone des Anbieters zu, nicht dem in UTC", () => {
    const days = slotDays(
      [{ start: "2026-11-19T23:00:00.000Z", end: "2026-11-20T00:00:00.000Z" }],
      "America/New_York",
    );
    expect(days.map((day) => day.day)).toEqual(["2026-11-19"]);
    expect(days[0]?.times.map((time) => time.time)).toEqual(["18:00", "18:30"]);
  });
});

describe("Dauer", () => {
  it("nur Dauern, die vollständig frei sind", () => {
    expect(
      fittingDurations({ time: "18:00", startsAt: "", maxMinutes: 120 }),
    ).toEqual([30, 60, 90, 120]);
    expect(fittingDurations(undefined)).toEqual([]);
  });

  it("behält die Wahl, sonst 60 Minuten, sonst die längste passende", () => {
    expect(keepDuration(90, [30, 60, 90])).toBe(90);
    expect(keepDuration(120, [30, 60, 90])).toBe(60);
    expect(keepDuration(null, [30])).toBe(30);
    expect(keepDuration(60, [])).toBeNull();
  });

  it("findet die Startzeit eines Entwurfs oder nichts, wenn sie vergeben ist", () => {
    const days = slotDays(
      [{ start: "2026-11-19T17:00:00.000Z", end: "2026-11-19T18:00:00.000Z" }],
      ZONE,
    );
    expect(findStart(days, "2026-11-19", "18:30")?.maxMinutes).toBe(30);
    expect(findStart(days, "2026-11-19", "19:00")).toBeUndefined();
    expect(findStart(days, null, "18:00")).toBeUndefined();
  });
});
