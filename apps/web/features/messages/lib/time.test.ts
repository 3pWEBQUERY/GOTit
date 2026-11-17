import { describe, expect, it } from "vitest";
import { dayKey, dayLabel, formatTime, listTime, yearOf } from "./time";

const words = { today: "Heute", yesterday: "Gestern" };
const now = "2026-11-17T13:02:00Z";

describe("Zeitangaben im Messenger", () => {
  it("rechnet Kalendertage in Zürich, nicht in UTC", () => {
    expect(dayKey("2026-11-16T23:30:00Z")).toBe("2026-11-17");
    expect(formatTime("2026-11-16T23:30:00Z", "de")).toBe("00:30");
  });

  it("benennt Tage im Verlauf: Heute, Gestern, sonst Wochentag und Datum", () => {
    expect(dayLabel("2026-11-17T06:00:00Z", now, "de", words)).toBe("Heute");
    expect(dayLabel("2026-11-16T06:00:00Z", now, "de", words)).toBe("Gestern");
    expect(dayLabel("2026-11-10T06:00:00Z", now, "de", words)).toBe(
      "Di., 10.11.2026",
    );
  });

  it("zeigt in der Liste Uhrzeit, Gestern, Wochentag oder Datum", () => {
    expect(listTime("2026-11-17T13:00:00Z", now, "de", "Gestern")).toBe(
      "14:00",
    );
    expect(listTime("2026-11-16T13:00:00Z", now, "de", "Gestern")).toBe(
      "Gestern",
    );
    expect(listTime("2026-11-13T13:00:00Z", now, "de", "Gestern")).toBe(
      "Freitag",
    );
    expect(listTime("2026-10-01T13:00:00Z", now, "fr", "Hier")).toBe(
      "01.10.2026",
    );
  });

  it("liest das Jahr in Zürich", () => {
    expect(yearOf("2025-12-31T23:30:00Z")).toBe(2026);
  });
});
