import { describe, expect, it } from "vitest";
import { canApprove, canSubmit, isIdentityValid, isPubliclyVisible, type IdentityCheckFacts } from "./policy";

const now = new Date("2026-11-17T12:00:00Z");
const future = new Date("2027-11-17T12:00:00Z");
const past = new Date("2026-11-16T12:00:00Z");

const IDENTITY_STATUSES = ["PENDING", "APPROVED", "REJECTED", "EXPIRED", "CANCELLED"] as const;
const PROFILE_STATUSES = ["DRAFT", "SUBMITTED", "CHANGES_REQUESTED", "PUBLISHED", "PAUSED", "SUSPENDED", "ARCHIVED"] as const;
const REVIEWS = [null, "APPROVED", "CHANGES_REQUESTED", "REJECTED"] as const;
const BOOLS = [null, false, true] as const;
const EXPIRIES = [null, past, future] as const;

/** Alle Kombinationen einer Identitätsprüfung, dazu «keine Prüfung». */
const identities: Array<IdentityCheckFacts | null> = [
  null,
  ...IDENTITY_STATUSES.flatMap((status) =>
    BOOLS.flatMap((ageOver18) => BOOLS.flatMap((livenessPassed) => EXPIRIES.map((expiresAt) => ({ status, ageOver18, livenessPassed, expiresAt })))),
  ),
];

const fullyValid = (identity: IdentityCheckFacts | null) =>
  identity !== null &&
  identity.status === "APPROVED" &&
  identity.ageOver18 === true &&
  identity.livenessPassed === true &&
  identity.expiresAt === future;

describe("Kein Profil wird ohne Prüfung und Freigabe öffentlich (PRD 16.1, Abnahme 1.5)", () => {
  it(`prüft alle ${identities.length * PROFILE_STATUSES.length * REVIEWS.length} Kombinationen aus Identität, Profilstatus und Prüfentscheid`, () => {
    let visible = 0;
    for (const identity of identities) {
      for (const profileStatus of PROFILE_STATUSES) {
        for (const latestReview of REVIEWS) {
          const expected = profileStatus === "PUBLISHED" && latestReview === "APPROVED" && fullyValid(identity);
          expect(isPubliclyVisible({ profileStatus, identity, latestReview }, now), JSON.stringify({ identity, profileStatus, latestReview })).toBe(expected);
          if (expected) visible += 1;
        }
      }
    }
    expect(visible).toBe(1);
  });

  it("eine Identitätsprüfung gilt nur vollständig und nicht abgelaufen", () => {
    for (const identity of identities) expect(isIdentityValid(identity, now)).toBe(fullyValid(identity));
  });

  it("ein freigegebenes Profil verschwindet, sobald die Prüfung abläuft", () => {
    const identity = { status: "APPROVED" as const, ageOver18: true, livenessPassed: true, expiresAt: new Date("2026-11-18T00:00:00Z") };
    const facts = { profileStatus: "PUBLISHED" as const, identity, latestReview: "APPROVED" as const };
    expect(isPubliclyVisible(facts, now)).toBe(true);
    expect(isPubliclyVisible(facts, new Date("2026-11-18T00:00:01Z"))).toBe(false);
  });

  it("einreichen nur aus Entwurf oder Korrektur, mit gültiger Prüfung und vollständigen Schritten", () => {
    const valid = { status: "APPROVED" as const, ageOver18: true, livenessPassed: true, expiresAt: future };
    for (const status of PROFILE_STATUSES) {
      for (const identity of identities) {
        const expected = (status === "DRAFT" || status === "CHANGES_REQUESTED") && fullyValid(identity);
        expect(canSubmit(status, identity, [], now)).toBe(expected);
      }
    }
    expect(canSubmit("DRAFT", valid, ["regions"], now)).toBe(false);
  });

  it("freigeben nur eingereichte Profile mit gültiger Prüfung", () => {
    for (const status of PROFILE_STATUSES) {
      for (const identity of identities) expect(canApprove(status, identity, now)).toBe(status === "SUBMITTED" && fullyValid(identity));
    }
  });
});
