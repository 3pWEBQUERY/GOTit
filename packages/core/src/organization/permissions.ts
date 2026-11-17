import type { OrganizationRole } from "@app/db";

/**
 * Rechte pro Rolle einer Organisation (v1 FR-BUSINESS-004, v2 12.2). Jede
 * Berechtigung ist einzeln definiert. Es gibt bewusst keine Berechtigung für
 * Nachrichten, Ausweisdaten oder private Kalender von Anbietern
 * (FR-BUSINESS-005, Abnahme 1.11): Keine Funktion der Organisation liest sie.
 */
export const ORGANIZATION_PERMISSIONS = [
  "profile.edit",
  "media.edit",
  "locations.edit",
  "providers.invite",
  "providers.end",
  "verification.submit",
  "settings.edit",
] as const;
export type OrganizationPermission = (typeof ORGANIZATION_PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Readonly<
  Record<OrganizationRole, readonly OrganizationPermission[]>
> = {
  OWNER: ORGANIZATION_PERMISSIONS,
  LOCATION_MANAGER: ["locations.edit", "providers.invite", "providers.end"],
  MARKETING: ["profile.edit", "media.edit"],
  EDITOR: ["profile.edit", "media.edit"],
  SCHEDULING: [],
};

export function hasPermission(
  role: OrganizationRole,
  permission: OrganizationPermission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
