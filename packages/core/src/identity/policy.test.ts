import { describe, expect, it } from "vitest";
import {
  canAccessProviderStudio,
  findOrganizationMembership,
  resolveStudioEntry,
  showsModeSwitch,
} from "./policy";
import type { AccountViewer, Viewer } from "./types";

const member: AccountViewer = {
  kind: "account",
  userId: "u1",
  name: "Mitglied",
  ageConfirmed: true,
  provider: null,
  organizations: [],
};
const provider = (status: NonNullable<AccountViewer["provider"]>["status"]): AccountViewer => ({
  ...member,
  provider: { slug: "fiktiv", displayName: "Fiktiv", status },
});
const orgMember: AccountViewer = { ...member, organizations: [{ slug: "club-fiktiv", name: "Club", role: "MARKETING" }] };
const visitor: Viewer = { kind: "visitor" };

describe("Studio-Zugang pro Rolle (PRD 6.2, 8.2)", () => {
  it("Besucher: kein ModeSwitch, Studio führt zur Anmeldung", () => {
    expect(showsModeSwitch(visitor)).toBe(false);
    expect(resolveStudioEntry(visitor)).toEqual({ target: "sign-in" });
    expect(canAccessProviderStudio(visitor)).toBe(false);
  });

  it("Mitglied ohne Anbieterrolle: kein ModeSwitch, Studio führt zu «Für Anbieter»", () => {
    expect(showsModeSwitch(member)).toBe(false);
    expect(resolveStudioEntry(member)).toEqual({ target: "for-providers" });
    expect(canAccessProviderStudio(member)).toBe(false);
  });

  it("Anbieter mit begonnener Rolle: Studio führt ins Onboarding", () => {
    expect(showsModeSwitch(provider("DRAFT"))).toBe(true);
    expect(resolveStudioEntry(provider("DRAFT"))).toEqual({ target: "onboarding" });
    expect(canAccessProviderStudio(provider("DRAFT"))).toBe(false);
  });

  it.each(["SUBMITTED", "CHANGES_REQUESTED", "PUBLISHED", "PAUSED", "SUSPENDED"] as const)(
    "Anbieter im Status %s erreicht das Studio",
    (status) => {
      expect(resolveStudioEntry(provider(status))).toEqual({ target: "studio" });
      expect(canAccessProviderStudio(provider(status))).toBe(true);
    },
  );

  it("archivierte Anbieterrolle zählt nicht als Rolle", () => {
    expect(showsModeSwitch(provider("ARCHIVED"))).toBe(false);
    expect(resolveStudioEntry(provider("ARCHIVED"))).toEqual({ target: "for-providers" });
  });

  it("Organisationsmitglied ohne eigenes Profil landet im Organisations-Kontext", () => {
    expect(showsModeSwitch(orgMember)).toBe(true);
    expect(resolveStudioEntry(orgMember)).toEqual({ target: "organization", slug: "club-fiktiv" });
    expect(canAccessProviderStudio(orgMember)).toBe(false);
  });

  it("Organisations-Studio nur für Mitglieder genau dieser Organisation", () => {
    expect(findOrganizationMembership(orgMember, "club-fiktiv")?.role).toBe("MARKETING");
    expect(findOrganizationMembership(orgMember, "anderer-club")).toBeNull();
    expect(findOrganizationMembership(member, "club-fiktiv")).toBeNull();
    expect(findOrganizationMembership(provider("PUBLISHED"), "club-fiktiv")).toBeNull();
    expect(findOrganizationMembership(visitor, "club-fiktiv")).toBeNull();
  });
});
