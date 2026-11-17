import type { ProviderStatus, ReviewDecision } from "@app/db";
import { describe, expect, it } from "vitest";
import type { Viewer } from "../identity/types";
import { contactOptions, publicState, type PublicStateFacts } from "./public-policy";

const now = new Date("2026-11-17T12:00:00Z");
const valid = { status: "APPROVED" as const, ageOver18: true, livenessPassed: true, expiresAt: new Date("2027-06-01T00:00:00Z") };
const expired = { ...valid, expiresAt: new Date("2026-11-01T00:00:00Z") };
const visitor: Viewer = { kind: "visitor" };
const member: Viewer = { kind: "account", userId: "m", name: "Fiktiv", ageConfirmed: true, provider: null, organizations: [] };

function facts(status: ProviderStatus, overrides: Partial<PublicStateFacts> = {}): PublicStateFacts {
  return { status, visibility: "PUBLIC", identity: valid, latestProfileReview: "APPROVED", ...overrides };
}

describe("Sichtbarkeit der Profilseite (PRD v2 10.1)", () => {
  it.each([
    ["PUBLISHED", "ready"],
    ["RESTRICTED", "ready"],
    ["PAUSED", "paused"],
    ["DRAFT", null],
    ["SUBMITTED", null],
    ["CHANGES_REQUESTED", null],
    ["SUSPENDED", null],
    ["ARCHIVED", null],
  ] as const)("Status %s ergibt %s", (status, expected) => {
    expect(publicState(facts(status), visitor, now)).toBe(expected);
  });

  it.each(["PUBLISHED", "PAUSED", "RESTRICTED"] as const)("%s mit abgelaufener Identität: 404", (status) => {
    expect(publicState(facts(status, { identity: expired }), visitor, now)).toBeNull();
    expect(publicState(facts(status, { identity: null }), member, now)).toBeNull();
  });

  it.each([null, "CHANGES_REQUESTED", "REJECTED"] as (ReviewDecision | null)[])("ohne freigegebene Erstprüfung (%s): 404, auch pausiert", (decision) => {
    expect(publicState(facts("PUBLISHED", { latestProfileReview: decision }), visitor, now)).toBeNull();
    expect(publicState(facts("PAUSED", { latestProfileReview: decision }), visitor, now)).toBeNull();
  });

  it("nur für Mitglieder: Besucher sehen den Hinweis, Mitglieder das Profil", () => {
    expect(publicState(facts("PUBLISHED", { visibility: "MEMBERS" }), visitor, now)).toBe("members-only");
    expect(publicState(facts("PUBLISHED", { visibility: "MEMBERS" }), member, now)).toBe("ready");
    expect(publicState(facts("PAUSED", { visibility: "MEMBERS" }), visitor, now)).toBe("members-only");
    expect(publicState(facts("SUSPENDED", { visibility: "MEMBERS" }), visitor, now)).toBeNull();
  });

  it("Kontakt nur bei veröffentlichtem Profil; eingeschränkt und pausiert ohne Kontakt", () => {
    expect(contactOptions("PUBLISHED", true, false)).toEqual({ available: true, messages: true, bookingRequests: false, restricted: false });
    expect(contactOptions("RESTRICTED", true, true)).toEqual({ available: false, messages: false, bookingRequests: false, restricted: true });
    expect(contactOptions("PAUSED", true, true).available).toBe(false);
  });
});
