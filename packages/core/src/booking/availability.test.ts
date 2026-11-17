import { describe, expect, it } from "vitest";
import {
  fitsAvailability,
  freeIntervals,
  overlapsBooking,
} from "./availability";
import { zonedDay, zonedToUtc } from "./time-zone";

const tz = "Europe/Zurich";
// Donnerstag 14–20 Uhr, Samstag 10–12 Uhr Zürcher Zeit.
const windows = [
  { weekday: 4, startMinute: 14 * 60, endMinute: 20 * 60 },
  { weekday: 6, startMinute: 10 * 60, endMinute: 12 * 60 },
];

describe("Zeitzone", () => {
  it("rechnet Winter- und Sommerzeit richtig um", () => {
    expect(zonedToUtc("2026-11-19", 18 * 60, tz).toISOString()).toBe(
      "2026-11-19T17:00:00.000Z",
    );
    expect(zonedToUtc("2026-07-16", 18 * 60, tz).toISOString()).toBe(
      "2026-07-16T16:00:00.000Z",
    );
    expect(zonedDay(new Date("2026-11-19T23:30:00Z"), tz)).toEqual({
      day: "2026-11-20",
      weekday: 5,
      minute: 30,
    });
  });

  it("über die Umstellung im März und Oktober", () => {
    expect(zonedToUtc("2026-03-29", 4 * 60, tz).toISOString()).toBe(
      "2026-03-29T02:00:00.000Z",
    );
    expect(zonedToUtc("2026-10-25", 4 * 60, tz).toISOString()).toBe(
      "2026-10-25T03:00:00.000Z",
    );
  });
});

describe("Verfügbarkeit (Abnahme 20.5)", () => {
  const base = {
    timeZone: tz,
    windows,
    blocks: [],
    bookings: [],
    bufferMinutes: 0,
  };

  it("wiederkehrende Fenster ergeben freie Zeiten in der Ortszeit", () => {
    const free = freeIntervals(base, "2026-11-16", "2026-11-22");
    expect(
      free.map((slot) => [slot.start.toISOString(), slot.end.toISOString()]),
    ).toEqual([
      ["2026-11-19T13:00:00.000Z", "2026-11-19T19:00:00.000Z"],
      ["2026-11-21T09:00:00.000Z", "2026-11-21T11:00:00.000Z"],
    ]);
  });

  it("Blocker und bestätigte Termine mit Puffer werden abgezogen", () => {
    const input = {
      ...base,
      blocks: [
        {
          start: new Date("2026-11-21T09:00:00Z"),
          end: new Date("2026-11-21T11:00:00Z"),
        },
      ],
      bookings: [
        {
          start: new Date("2026-11-19T15:00:00Z"),
          end: new Date("2026-11-19T16:00:00Z"),
        },
      ],
      bufferMinutes: 30,
    };
    const free = freeIntervals(input, "2026-11-16", "2026-11-22");
    expect(
      free.map((slot) => [slot.start.toISOString(), slot.end.toISOString()]),
    ).toEqual([
      ["2026-11-19T13:00:00.000Z", "2026-11-19T14:30:00.000Z"],
      ["2026-11-19T16:30:00.000Z", "2026-11-19T19:00:00.000Z"],
    ]);
  });

  it("eine Anfrage passt nur vollständig in eine freie Zeit", () => {
    expect(
      fitsAvailability(base, {
        start: new Date("2026-11-19T17:00:00Z"),
        end: new Date("2026-11-19T18:00:00Z"),
      }),
    ).toBe(true);
    expect(
      fitsAvailability(base, {
        start: new Date("2026-11-19T18:30:00Z"),
        end: new Date("2026-11-19T19:30:00Z"),
      }),
    ).toBe(false);
    expect(
      fitsAvailability(base, {
        start: new Date("2026-11-20T17:00:00Z"),
        end: new Date("2026-11-20T18:00:00Z"),
      }),
    ).toBe(false);
  });

  it("Überschneidung mit Puffer", () => {
    const bookings = [
      {
        start: new Date("2026-11-19T15:00:00Z"),
        end: new Date("2026-11-19T16:00:00Z"),
      },
    ];
    expect(
      overlapsBooking(
        bookings,
        {
          start: new Date("2026-11-19T16:10:00Z"),
          end: new Date("2026-11-19T17:00:00Z"),
        },
        15,
      ),
    ).toBe(true);
    expect(
      overlapsBooking(
        bookings,
        {
          start: new Date("2026-11-19T16:20:00Z"),
          end: new Date("2026-11-19T17:00:00Z"),
        },
        15,
      ),
    ).toBe(false);
  });
});
