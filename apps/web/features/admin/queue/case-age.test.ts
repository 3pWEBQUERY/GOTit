import { describe, expect, it } from "vitest";
import { caseAge } from "./case-age";

const now = new Date("2026-11-17T12:00:00Z");
const ago = (hours: number) => new Date(now.getTime() - hours * 3_600_000);

describe("Alter eines Prüffalls", () => {
  it("unter einer Stunde, in Stunden, ab 24 Stunden in ganzen Tagen", () => {
    expect(caseAge(ago(0.5), now)).toEqual({ unit: "lessThanHour" });
    expect(caseAge(ago(5), now)).toEqual({ unit: "hours", count: 5 });
    expect(caseAge(ago(24), now)).toEqual({ unit: "days", count: 1 });
    expect(caseAge(ago(71), now)).toEqual({ unit: "days", count: 2 });
  });
  it("ein Zeitpunkt in der Zukunft zählt als eben eingereicht", () => {
    expect(caseAge(ago(-3), now)).toEqual({ unit: "lessThanHour" });
  });
});
