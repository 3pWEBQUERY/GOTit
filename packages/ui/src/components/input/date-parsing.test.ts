import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  clampIsoDate,
  daysInMonth,
  endOfWeek,
  formatSwissDate,
  isLeapYear,
  isValidIsoDate,
  isWithinRange,
  monthGrid,
  parseIsoDate,
  parseSwissDate,
  startOfWeek,
  todayIso,
  weekdayIndex,
} from "./date-parsing";

describe("parseSwissDate", () => {
  it("liest TT.MM.JJJJ", () => {
    expect(parseSwissDate("19.11.2026")).toBe("2026-11-19");
    expect(parseSwissDate("01.01.2027")).toBe("2027-01-01");
    expect(parseSwissDate("31.12.1999")).toBe("1999-12-31");
  });

  it("erlaubt einstellige Tage und Monate und Leerraum am Rand", () => {
    expect(parseSwissDate("9.1.2026")).toBe("2026-01-09");
    expect(parseSwissDate("  19.11.2026 ")).toBe("2026-11-19");
  });

  it("lehnt Tage ab, die es nicht gibt", () => {
    expect(parseSwissDate("31.02.2026")).toBeNull();
    expect(parseSwissDate("31.04.2026")).toBeNull();
    expect(parseSwissDate("00.01.2026")).toBeNull();
    expect(parseSwissDate("32.01.2026")).toBeNull();
    expect(parseSwissDate("15.13.2026")).toBeNull();
    expect(parseSwissDate("15.00.2026")).toBeNull();
  });

  it("kennt Schaltjahre", () => {
    expect(parseSwissDate("29.02.2024")).toBe("2024-02-29");
    expect(parseSwissDate("29.02.2028")).toBe("2028-02-29");
    expect(parseSwissDate("29.02.2026")).toBeNull();
    expect(parseSwissDate("29.02.2000")).toBe("2000-02-29");
    expect(parseSwissDate("29.02.1900")).toBeNull();
    expect(parseSwissDate("29.02.2100")).toBeNull();
  });

  it("lehnt zweistellige und andere unvollständige Jahre ab", () => {
    expect(parseSwissDate("19.11.26")).toBeNull();
    expect(parseSwissDate("19.11.202")).toBeNull();
    expect(parseSwissDate("19.11.20266")).toBeNull();
    expect(parseSwissDate("19.11.0000")).toBeNull();
  });

  it("lehnt andere Schreibweisen und Unsinn ab", () => {
    for (const text of ["", " ", "2026-11-19", "19/11/2026", "19-11-2026", "19.11.", "19.11", "19..2026", "a.b.cccc", "19.11.2026 12:00", "morgen", "19. 11. 2026", "-1.11.2026", "1e1.11.2026"]) {
      expect(parseSwissDate(text), text).toBeNull();
    }
  });
});

describe("formatSwissDate", () => {
  it("schreibt TT.MM.JJJJ mit führenden Nullen", () => {
    expect(formatSwissDate("2026-11-19")).toBe("19.11.2026");
    expect(formatSwissDate("2026-01-09")).toBe("09.01.2026");
  });
  it("gibt für leere und ungültige Werte einen leeren Text zurück", () => {
    expect(formatSwissDate(null)).toBe("");
    expect(formatSwissDate(undefined)).toBe("");
    expect(formatSwissDate("2026-02-31")).toBe("");
    expect(formatSwissDate("19.11.2026")).toBe("");
  });
  it("ist die Umkehrung von parseSwissDate", () => {
    expect(parseSwissDate(formatSwissDate("2024-02-29"))).toBe("2024-02-29");
  });
});

describe("ISO-Datum", () => {
  it("prüft Form und Kalender", () => {
    expect(isValidIsoDate("2026-11-19")).toBe(true);
    expect(isValidIsoDate("2026-02-29")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("2026-1-1")).toBe(false);
    expect(isValidIsoDate("2026-11-19T00:00:00Z")).toBe(false);
    expect(parseIsoDate("2026-11-19")).toEqual({ year: 2026, month: 11, day: 19 });
  });
  it("kennt Monatslängen und Schaltjahre", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
  it("liest das heutige Datum in der Zeitzone des Geräts", () => {
    expect(todayIso(new Date(2026, 10, 16, 23, 59))).toBe("2026-11-16");
  });
});

describe("Rechnen mit Tagen und Monaten", () => {
  it("geht über Monats- und Jahresgrenzen", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
    expect(addDays("2026-11-19", 7)).toBe("2026-11-26");
  });
  it("verliert an den Tagen der Zeitumstellung keinen Tag", () => {
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
  });
  it("begrenzt beim Monatswechsel auf den letzten Tag", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
    expect(addMonths("2024-02-29", 12)).toBe("2025-02-28");
  });
  it("begrenzt auf min und max", () => {
    expect(clampIsoDate("2026-11-01", "2026-11-16", "2026-12-31")).toBe("2026-11-16");
    expect(clampIsoDate("2027-01-05", "2026-11-16", "2026-12-31")).toBe("2026-12-31");
    expect(isWithinRange("2026-11-16", "2026-11-16", "2026-12-31")).toBe(true);
    expect(isWithinRange("2026-11-15", "2026-11-16")).toBe(false);
    expect(isWithinRange("2026-11-15")).toBe(true);
  });
});

describe("Woche beginnt am Montag", () => {
  it("zählt Montag als 0 und Sonntag als 6", () => {
    expect(weekdayIndex("2026-11-16")).toBe(0);
    expect(weekdayIndex("2026-11-19")).toBe(3);
    expect(weekdayIndex("2026-11-22")).toBe(6);
  });
  it("findet Anfang und Ende der Woche", () => {
    expect(startOfWeek("2026-11-19")).toBe("2026-11-16");
    expect(endOfWeek("2026-11-19")).toBe("2026-11-22");
    expect(startOfWeek("2026-11-22")).toBe("2026-11-16");
    expect(startOfWeek("2026-11-16")).toBe("2026-11-16");
  });
});

describe("monthGrid", () => {
  it("beginnt jede Woche am Montag und enthält den ganzen Monat", () => {
    const weeks = monthGrid(2026, 11);
    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
    expect(weeks.at(-1)?.[0]).toBe("2026-11-30");
    for (const week of weeks) {
      expect(week).toHaveLength(7);
      expect(weekdayIndex(week[0] ?? "")).toBe(0);
    }
    const days = weeks.flat().filter((iso) => iso.startsWith("2026-11"));
    expect(days).toHaveLength(30);
  });
  it("braucht für einen Februar, der am Montag beginnt, genau vier Wochen", () => {
    const weeks = monthGrid(2027, 2);
    expect(weeks).toHaveLength(4);
    expect(weeks[0]?.[0]).toBe("2027-02-01");
    expect(weeks[3]?.[6]).toBe("2027-02-28");
  });
  it("enthält den 29. Februar im Schaltjahr", () => {
    expect(monthGrid(2024, 2).flat()).toContain("2024-02-29");
    expect(monthGrid(2026, 2).flat()).not.toContain("2026-02-29");
  });
});
