import { describe, expect, it } from "vitest";
import { formatCaseId } from "./case-id";
import { decisionRules } from "./decision-rules";
import { hasFilters, parseQueueParams, queueQuery, toCoreFilter } from "./queue-filter";
import { untilFromDay } from "./until";

const KEYS = ["R-MOD-1", "R-MOD-2", "R-MOD-3", "R-MOD-4", "R-MOD-5", "R-MOD-6", "R-MOD-7", "R-MOD-8", "R-MOD-0"];

describe("Fall-ID", () => {
  it("Jahr des Eingangs und fünfstellige Nummer", () => {
    expect(formatCaseId(412, new Date("2026-03-02T10:00:00Z"))).toBe("M-2026-00412");
    expect(formatCaseId(123456, new Date("2026-03-02T10:00:00Z"))).toBe("M-2026-123456");
  });
  it("das Jahr gilt in Zürcher Zeit", () => {
    expect(formatCaseId(1, new Date("2026-12-31T23:30:00Z"))).toBe("M-2027-00001");
  });
});

describe("Filter der Warteschlange", () => {
  it("Vorgabe: aktive Fälle ohne weitere Filter", () => {
    const params = parseQueueParams({});
    expect(params).toEqual({ status: "aktiv", prioritaet: null, art: null, zuweisung: null, ansicht: "faelle" });
    expect(toCoreFilter(params)).toEqual({ status: "ACTIVE" });
    expect(hasFilters(params)).toBe(false);
  });
  it("übersetzt die Werte der URL in Filter des Kerns", () => {
    const params = parseQueueParams({ status: "einspruch", prioritaet: "kritisch", art: "nachricht", zuweisung: "mir" });
    expect(toCoreFilter(params)).toEqual({ status: "APPEALED", priority: "CRITICAL", targetType: "MESSAGE", assigned: "me" });
    expect(queueQuery(params)).toEqual({ status: "einspruch", prioritaet: "kritisch", art: "nachricht", zuweisung: "mir" });
  });
  it("unbekannte und mehrfache Werte fallen auf die Vorgabe zurück", () => {
    const params = parseQueueParams({ status: "alles", prioritaet: ["hoch", "normal"], art: "toString", zuweisung: "jemand" });
    expect(toCoreFilter(params)).toEqual({ status: "ACTIVE" });
  });
  it("die Ansicht der Einsprüche gegen Sperren trägt keine Fallfilter", () => {
    expect(queueQuery({ ansicht: "sperren", status: "erledigt" })).toEqual({ ansicht: "sperren" });
  });
});

describe("Regeln zum Entscheid", () => {
  it("«Kein Verstoss» nur mit R-MOD-0, alle anderen Entscheide nie mit R-MOD-0", () => {
    expect(decisionRules("NO_ACTION", KEYS)).toEqual(["R-MOD-0"]);
    expect(decisionRules("CONTENT_REMOVED", KEYS)).not.toContain("R-MOD-0");
    expect(decisionRules("CONTENT_REMOVED", KEYS)).toHaveLength(8);
    expect(decisionRules(null, KEYS)).toHaveLength(9);
  });
  it("ein Ende gilt bis zum Ende des Tages in Zürcher Zeit", () => {
    expect(untilFromDay("2026-12-12")?.toISOString()).toBe("2026-12-12T22:59:00.000Z");
    expect(untilFromDay("2026-07-01")?.toISOString()).toBe("2026-07-01T21:59:00.000Z");
    expect(untilFromDay("12.12.2026")).toBeNull();
    expect(untilFromDay(null)).toBeNull();
  });
});
