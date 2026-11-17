import { describe, expect, it } from "vitest";
import {
  compareKpi,
  comparisonText,
  shownDirection,
  type CompareWords,
} from "./compare";
import { funnelHasData, funnelRows, rate } from "./funnel";
import { parseStatsRange, rangeQuery } from "./range-params";

const words: CompareWords = {
  amount: (comparison) =>
    comparison.unit === "percent"
      ? `${comparison.amount} %`
      : String(comparison.amount),
  up: (amount) => `${amount} mehr`,
  down: (amount) => `${amount} weniger`,
  flat: () => "gleich viele",
};

describe("Vergleich mit der Vorperiode", () => {
  it("nennt die Änderung in Prozent, wenn es einen Vorwert gibt", () => {
    expect(comparisonText(compareKpi({ value: 12, previous: 10 }), words)).toBe(
      "20 % mehr",
    );
    expect(comparisonText(compareKpi({ value: 5, previous: 10 }), words)).toBe(
      "50 % weniger",
    );
  });

  it("nennt ohne Vorwert die Differenz", () => {
    expect(comparisonText(compareKpi({ value: 5, previous: 0 }), words)).toBe(
      "5 mehr",
    );
  });

  it("Favoriten (Saldo) immer als Differenz, auch über null hinweg", () => {
    expect(
      comparisonText(
        compareKpi({ value: -2, previous: 3 }, { absolute: true }),
        words,
      ),
    ).toBe("5 weniger");
  });

  it("gleich bleibt gleich, auch wenn die Rundung 0 % ergibt", () => {
    expect(comparisonText(compareKpi({ value: 0, previous: 0 }), words)).toBe(
      "gleich viele",
    );
    const tiny = compareKpi({ value: 1001, previous: 1000 });
    expect(comparisonText(tiny, words)).toBe("gleich viele");
    expect(shownDirection(tiny)).toBe("flat");
  });
});

describe("Quoten im Trichter", () => {
  it("bezieht jede Stufe auf die davor; ohne Vorstufe keine Quote", () => {
    const rows = funnelRows({
      impressions: 40,
      profileViews: 10,
      contactActions: 0,
      bookingRequests: 2,
      confirmed: 1,
    });
    expect(rows.map((row) => row.rate)).toEqual([null, 0.25, 0, null, 0.5]);
    expect(funnelHasData(rows)).toBe(true);
  });

  it("teilt nie durch null", () => {
    expect(rate(3, 0)).toBeNull();
    expect(
      funnelHasData(
        funnelRows({
          impressions: 0,
          profileViews: 0,
          contactActions: 0,
          bookingRequests: 0,
          confirmed: 0,
        }),
      ),
    ).toBe(false);
  });
});

describe("Zeitraum aus der URL", () => {
  const options = {
    allowed: ["1d", "7d", "30d", "90d"] as const,
    fallback: "7d" as const,
    maxDays: 366,
  };
  const today = "2026-11-17";

  it("«Heute» (v1 7.2) ist genau der laufende Tag", () => {
    expect(parseStatsRange({ zeitraum: "1" }, today, options)).toMatchObject({ preset: "1d", range: { from: today, to: today } });
  });

  it("nimmt Voreinstellungen und fällt sonst auf die Standardwahl zurück", () => {
    expect(parseStatsRange({ zeitraum: "30" }, today, options).range).toEqual({
      from: "2026-10-19",
      to: today,
    });
    expect(parseStatsRange({ zeitraum: "12" }, today, options)).toMatchObject({
      preset: "7d",
      range: { from: "2026-11-11", to: today },
      problem: null,
    });
    expect(
      parseStatsRange({}, today, {
        ...options,
        allowed: ["7d", "30d"] as const,
      }).preset,
    ).toBe("7d");
    expect(
      parseStatsRange({ zeitraum: "90" }, today, {
        ...options,
        allowed: ["7d", "30d"] as const,
      }).preset,
    ).toBe("7d");
  });

  it("nimmt einen gültigen eigenen Zeitraum", () => {
    expect(
      parseStatsRange({ von: "2026-01-01", bis: "2026-01-31" }, today, options),
    ).toMatchObject({
      preset: "custom",
      range: { from: "2026-01-01", to: "2026-01-31" },
      problem: null,
    });
  });

  it("nennt den Grund, wenn der eigene Zeitraum nicht geht", () => {
    expect(
      parseStatsRange({ von: "2026-02-01", bis: "2026-01-01" }, today, options)
        .problem,
    ).toBe("order");
    expect(
      parseStatsRange({ von: "2026-11-01", bis: "2026-11-30" }, today, options)
        .problem,
    ).toBe("future");
    expect(
      parseStatsRange({ von: "2024-01-01", bis: "2026-01-01" }, today, options)
        .problem,
    ).toBe("tooLong");
    expect(
      parseStatsRange({ von: "2026-02-30", bis: "2026-03-01" }, today, options)
        .problem,
    ).toBe("invalid");
    expect(
      parseStatsRange({ von: "2026-02-01" }, today, options),
    ).toMatchObject({ problem: "invalid", range: { to: today } });
  });

  it("366 Tage gehen, 367 nicht", () => {
    expect(
      parseStatsRange({ von: "2025-11-17", bis: "2026-11-17" }, today, options)
        .problem,
    ).toBeNull();
    expect(
      parseStatsRange({ von: "2025-11-16", bis: "2026-11-17" }, today, options)
        .problem,
    ).toBe("tooLong");
  });

  it("schreibt die Adresse ohne Voreinstellung", () => {
    expect(rangeQuery({ preset: "7d" }, "7d")).toEqual({});
    expect(rangeQuery({ preset: "30d" }, "7d")).toEqual({ zeitraum: "30" });
    expect(
      rangeQuery(
        { preset: "custom", from: "2026-01-01", to: "2026-01-31" },
        "7d",
      ),
    ).toEqual({ von: "2026-01-01", bis: "2026-01-31" });
  });
});
