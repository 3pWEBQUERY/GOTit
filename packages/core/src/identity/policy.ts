import type { Viewer, ViewerOrganization } from "./types";

/** Archivierte Anbieterrollen zählen nicht mehr als Rolle. */
export function hasProviderRole(viewer: Viewer): boolean {
  return viewer.kind === "account" && viewer.provider !== null && viewer.provider.status !== "ARCHIVED";
}

export function hasOrganizationRole(viewer: Viewer): boolean {
  return viewer.kind === "account" && viewer.organizations.length > 0;
}

/** Der ModeSwitch erscheint nur für Anbieter und Organisationsmitglieder (PRD 6.2). */
export function showsModeSwitch(viewer: Viewer): boolean {
  return hasProviderRole(viewer) || hasOrganizationRole(viewer);
}

export type StudioEntry =
  | { target: "sign-in" }
  | { target: "for-providers" }
  | { target: "onboarding" }
  | { target: "studio" }
  | { target: "organization"; slug: string };

/**
 * Wohin `/studio` führt (PRD 8.2): ohne Konto zur Anmeldung, ohne Anbieterrolle
 * zu «Für Anbieter», mit begonnener, nicht eingereichter Rolle ins Onboarding.
 * Wer nur einer Organisation angehört, landet in deren Kontext.
 */
export function resolveStudioEntry(viewer: Viewer): StudioEntry {
  if (viewer.kind === "visitor") return { target: "sign-in" };
  if (hasProviderRole(viewer)) {
    return viewer.provider?.status === "DRAFT" ? { target: "onboarding" } : { target: "studio" };
  }
  const first = viewer.organizations[0];
  return first ? { target: "organization", slug: first.slug } : { target: "for-providers" };
}

/** Das persönliche Studio gehört allein der Person mit der Anbieterrolle. */
export function canAccessProviderStudio(viewer: Viewer): boolean {
  return hasProviderRole(viewer) && viewer.kind === "account" && viewer.provider?.status !== "DRAFT";
}

/** Zugriff auf das Studio einer Organisation nur als deren Mitglied. */
export function findOrganizationMembership(viewer: Viewer, slug: string): ViewerOrganization | null {
  if (viewer.kind !== "account") return null;
  return viewer.organizations.find((organization) => organization.slug === slug) ?? null;
}
