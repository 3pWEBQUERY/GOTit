import { describe, expect, it } from "vitest";
import { firstOpenStep, onboardingAccess } from "./access";
import { reviewNotes } from "./review-notes";
import { stepFromSlug, stepSlug } from "./steps";

describe("Zugriff auf das Onboarding", () => {
  it("lässt nur Entwurf und Korrektur bearbeiten", () => {
    expect(onboardingAccess("DRAFT")).toBe("edit");
    expect(onboardingAccess("CHANGES_REQUESTED")).toBe("edit");
    expect(onboardingAccess("SUBMITTED")).toBe("in-review");
    expect(onboardingAccess("PUBLISHED")).toBe("in-review");
    expect(onboardingAccess("PAUSED")).toBe("in-review");
    expect(onboardingAccess("SUSPENDED")).toBe("suspended");
    expect(onboardingAccess("ARCHIVED")).toBe("none");
    expect(onboardingAccess(null)).toBe("none");
  });
});

describe("/studio/start", () => {
  it("führt zum ersten offenen Schritt", () => {
    expect(firstOpenStep([], {})).toBe("identity");
    expect(firstOpenStep(["identity", "regions"], {})).toBe("profile");
    expect(firstOpenStep(["identity", "regions", "profile", "media", "offer", "availability", "preview"], {})).toBe("submit");
  });

  it("führt bei einer Rückgabe zum ersten Schritt mit Prüfnotiz", () => {
    expect(
      firstOpenStep(["identity", "regions", "profile", "preview"], {
        offer: "Preise prüfen",
        profile: "Beschreibung ergänzen",
      }),
    ).toBe("profile");
  });
});

describe("Prüfnotizen", () => {
  const review = {
    decision: "CHANGES_REQUESTED",
    fieldNotes: { profile: "Beschreibung ergänzen", unbekannt: "x" },
  };

  it("gelten nur in Korrektur und nur für bekannte Schritte", () => {
    expect(reviewNotes("CHANGES_REQUESTED", review)).toEqual({
      profile: "Beschreibung ergänzen",
    });
    expect(reviewNotes("DRAFT", review)).toEqual({});
    expect(
      reviewNotes("CHANGES_REQUESTED", {
        decision: "APPROVED",
        fieldNotes: {},
      }),
    ).toEqual({});
    expect(
      reviewNotes("CHANGES_REQUESTED", {
        decision: "CHANGES_REQUESTED",
        fieldNotes: "kaputt",
      }),
    ).toEqual({});
  });
});

describe("Adressen der Schritte", () => {
  it("sind pro Sprache übersetzt und werden in jeder Sprache erkannt", () => {
    expect(stepSlug("de", "availability")).toBe("verfuegbarkeit");
    expect(stepSlug("fr", "preview")).toBe("apercu");
    expect(stepFromSlug("apercu")).toBe("preview");
    expect(stepFromSlug("identitaet")).toBe("identity");
    expect(stepFromSlug("gibt-es-nicht")).toBeNull();
  });
});
