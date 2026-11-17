import { describe, expect, it } from "vitest";
import { valueToWindows, windowsToValue } from "./windows";

describe("Wochenfenster zwischen Kern und Editor", () => {
  it("ordnet Sonntag 0 und Montag 1 den Tagen des Editors zu", () => {
    const value = windowsToValue([
      { weekday: 1, startMinute: 14 * 60, endMinute: 20 * 60 },
      { weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60 },
      { weekday: 0, startMinute: 18 * 60, endMinute: 24 * 60 },
    ]);
    expect(value.mon).toEqual([
      { from: "09:00", to: "12:00" },
      { from: "14:00", to: "20:00" },
    ]);
    expect(value.sun).toEqual([{ from: "18:00", to: "23:59" }]);
    expect(value.tue).toEqual([]);
  });

  it("macht aus 23:59 wieder Mitternacht und bleibt sonst unverändert", () => {
    const windows = [
      { weekday: 0, startMinute: 18 * 60, endMinute: 24 * 60 },
      { weekday: 3, startMinute: 8 * 60 + 30, endMinute: 12 * 60 + 15 },
    ];
    expect(
      valueToWindows(windowsToValue(windows)).sort(
        (a, b) => a.weekday - b.weekday,
      ),
    ).toEqual(windows);
  });
});
