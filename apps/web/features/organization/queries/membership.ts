import { findOrganizationMembership } from "@app/core/identity";
import {
  getOwnOrganization,
  hasPermission,
  type OrganizationPermission,
} from "@app/core/organization";
import type { OrganizationRole } from "@app/db";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getViewer } from "../../shell/queries/get-viewer";

export interface OrganizationContext {
  userId: string;
  slug: string;
  name: string;
  role: OrganizationRole;
  can: (permission: OrganizationPermission) => boolean;
}

/**
 * Mitgliedschaft der angemeldeten Person in der Organisation der URL. Fremde
 * und unbekannte Organisationen ergeben eine 404 (PRD 16.2), noch im Layout und
 * damit vor dem Ladezustand. Einmal pro Anfrage.
 */
export const requireOrganization = cache(
  async (slug: string): Promise<OrganizationContext> => {
    const viewer = await getViewer();
    const membership = findOrganizationMembership(viewer, slug);
    if (!membership || viewer.kind !== "account") notFound();
    return {
      userId: viewer.userId,
      slug: membership.slug,
      name: membership.name,
      role: membership.role,
      can: (permission) => hasPermission(membership.role, permission),
    };
  },
);

/** Unternehmensprofil und letzte Prüfung der Nachweise; einmal pro Anfrage. */
export const loadOwnOrganization = cache(async (slug: string) => {
  const context = await requireOrganization(slug);
  const data = await getOwnOrganization(context.userId, slug);
  if (!data) notFound();
  return { context, ...data };
});
