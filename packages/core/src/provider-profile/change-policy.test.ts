import { describe, expect, it } from "vitest";
import { editMode, hasPending, mergePending, parsePendingChanges, samePending, splitCritical, type CriticalValues } from "./change-policy";
import { sectionStatus } from "./section-status";

const current: CriticalValues = { displayName: "Alt Fiktiv", allowMessages: true, allowBookingRequests: false, regionIds: ["a", "b"] };

describe("Wirkung von Änderungen (PRD v2 11.2, v1 FR-PROFILE-006)", () => {
  it.each([
    ["DRAFT", "direct"],
    ["CHANGES_REQUESTED", "direct"],
    ["PUBLISHED", "reviewed"],
    ["PAUSED", "reviewed"],
    ["RESTRICTED", "reviewed"],
    ["SUBMITTED", "locked"],
    ["SUSPENDED", "locked"],
    ["ARCHIVED", "locked"],
  ] as const)("Status %s: %s", (status, mode) => {
    expect(editMode(status)).toBe(mode);
  });

  it("freigegeben: neuer Anzeigename wartet auf Prüfung", () => {
    expect(splitCritical(current, { displayName: "Neu Fiktiv" }, "reviewed")).toEqual({ immediate: {}, pending: { displayName: "Neu Fiktiv" } });
  });

  it("im Entwurf gilt alles sofort", () => {
    expect(splitCritical(current, { displayName: "Neu Fiktiv", allowBookingRequests: true, regionIds: ["c"] }, "direct")).toEqual({
      immediate: { displayName: "Neu Fiktiv", allowBookingRequests: true, regionIds: ["c"] },
      pending: {},
    });
  });

  it("Kontaktweg einschalten wird geprüft, abschalten gilt sofort", () => {
    expect(splitCritical(current, { allowMessages: false, allowBookingRequests: true }, "reviewed")).toEqual({
      immediate: { allowMessages: false },
      pending: { allowBookingRequests: true },
    });
  });

  it("Regionen hinzufügen wird geprüft, streichen gilt sofort", () => {
    expect(splitCritical(current, { regionIds: ["a", "c"] }, "reviewed").pending).toEqual({ regionIds: ["a", "c"] });
    expect(splitCritical(current, { regionIds: ["b"] }, "reviewed").immediate).toEqual({ regionIds: ["b"] });
    expect(splitCritical(current, { regionIds: ["b", "a"] }, "reviewed")).toEqual({ immediate: {}, pending: {} });
  });

  it("zurück zum Online-Stand entfernt die wartende Änderung des Abschnitts, andere bleiben", () => {
    const previous = { displayName: "Neu Fiktiv", regionIds: ["a", "c"] };
    const split = splitCritical(current, { displayName: "Alt Fiktiv" }, "reviewed");
    expect(mergePending(previous, "basics", split)).toEqual({ regionIds: ["a", "c"] });
    expect(hasPending(mergePending({ displayName: "Neu Fiktiv" }, "basics", split))).toBe(false);
  });

  it("vergleicht Regionen als Menge und liest Unlesbares als keine Änderung", () => {
    expect(samePending({ regionIds: ["a", "b"] }, { regionIds: ["b", "a"] })).toBe(true);
    expect(samePending({ displayName: "x" }, {})).toBe(false);
    expect(parsePendingChanges({ displayName: 3 })).toEqual({});
    expect(parsePendingChanges(null)).toEqual({});
  });
});

describe("Stand der Abschnitte", () => {
  const values = {
    basics: { displayName: "Fiktiv", shortDescription: "", languages: ["de" as const] },
    description: { description: "zu kurz" },
    offer: { categoryIds: [] },
    rates: { rates: [{ durationMinutes: 60, priceChf: 200, hidden: true }] },
    contact: { allowMessages: true, allowBookingRequests: true },
    visibility: { visibility: "PUBLIC" as const, locationLabel: "" },
    regions: { regionIds: ["a"] },
  };
  it("nur ausgeblendete Preise gelten als fehlend; Leistungen ohne Kategorien folgen später", () => {
    expect(sectionStatus("basics", values, 0)).toBe("complete");
    expect(sectionStatus("description", values, 0)).toBe("missing");
    expect(sectionStatus("rates", values, 0)).toBe("missing");
    expect(sectionStatus("offer", values, 0)).toBe("later");
    expect(sectionStatus("offer", values, 3)).toBe("missing");
    expect(sectionStatus("regions", values, 0)).toBe("complete");
  });
});
