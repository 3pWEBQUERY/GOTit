import { describe, expect, it } from "vitest";
import { durationParts, formatRange, zoneDiffers, zoneSuffix } from "./format";

describe("Zeiten in der Zone des Anbieters", () => {
  it("Schweizer Format mit 24 Stunden, über Mitternacht mit beiden Tagen", () => {
    expect(
      formatRange(
        "2026-11-19T17:00:00.000Z",
        "2026-11-19T18:30:00.000Z",
        "Europe/Zurich",
        "de",
      ),
    ).toBe("Do., 19.11.2026, 18:00–19:30");
    expect(
      formatRange(
        "2026-11-19T22:00:00.000Z",
        "2026-11-20T01:00:00.000Z",
        "Europe/Zurich",
        "de",
      ),
    ).toBe("Do., 19.11.2026, 23:00 – Fr., 20.11.2026, 02:00");
  });

  it("nennt die Zone nur, wenn die Uhr des Betrachters anders geht", () => {
    const at = "2026-11-19T17:00:00.000Z";
    expect(zoneDiffers(at, "Europe/Zurich", null)).toBe(false);
    expect(zoneDiffers(at, "Europe/Zurich", "Europe/Zurich")).toBe(false);
    // Berlin geht gleich wie Zürich: kein Hinweis.
    expect(zoneDiffers(at, "Europe/Zurich", "Europe/Berlin")).toBe(false);
    expect(zoneDiffers(at, "Europe/Zurich", "America/New_York")).toBe(true);
    expect(zoneSuffix(at, "Europe/Zurich", "America/New_York", "de")).toBe(
      " (Mitteleuropäische Zeit)",
    );
    expect(zoneSuffix(at, "Europe/Zurich", "Europe/Zurich", "de")).toBe("");
  });

  it("Dauer in Stunden und Minuten", () => {
    expect(durationParts(90)).toEqual({ hours: 1, minutes: 30 });
    expect(durationParts(30)).toEqual({ hours: 0, minutes: 30 });
  });
});
