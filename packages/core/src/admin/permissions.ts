import type { InternalRole } from "@app/db";
import { adminAccess, type AdminActor } from "./policy";
import { loadAdminActor } from "./service";

/**
 * Rechte der internen Rollen pro Bereich (v2 3, 7.8; v1 20.6 «Rollenrechte
 * werden in jedem API-Endpunkt geprüft», «Kritische Änderungen benötigen
 * passende Berechtigungen»). `SUPER_ADMIN` darf alles; jede Funktion im Kern
 * prüft ihr Recht selbst, unabhängig von der Oberfläche. Begründung der
 * Zuordnung: Entscheid 0020.
 */
const ALL: readonly InternalRole[] = ["PLATFORM_ADMIN", "MODERATOR", "TRUST_SAFETY", "SUPPORT", "FINANCE", "CONTENT_EDITOR"];

export const ADMIN_PERMISSIONS = {
  "dashboard.view": ALL,
  // Konten suchen und ansehen; Support braucht das für Anfragen.
  "users.view": ["PLATFORM_ADMIN", "MODERATOR", "TRUST_SAFETY", "SUPPORT"],
  // Nachrichten oder Termine einschränken.
  "users.restrict": ["PLATFORM_ADMIN", "MODERATOR", "TRUST_SAFETY"],
  // Konto sperren: schwerer Eingriff, nur Plattform-Administration und Trust & Safety.
  "users.suspend": ["PLATFORM_ADMIN", "TRUST_SAFETY"],
  // Interne Rollen vergeben: nur `SUPER_ADMIN`.
  "roles.manage": [],
  "moderation.cases": ["PLATFORM_ADMIN", "MODERATOR", "TRUST_SAFETY"],
  // Fälle mit Verdacht auf Minderjährigkeit, Zwang oder Menschenhandel entscheidet Trust & Safety (v2 12.4).
  "moderation.critical": ["TRUST_SAFETY"],
  "providers.view": ["PLATFORM_ADMIN", "MODERATOR", "TRUST_SAFETY", "SUPPORT"],
  "regions.manage": ["PLATFORM_ADMIN"],
  "categories.manage": ["PLATFORM_ADMIN"],
  "content.manage": ["PLATFORM_ADMIN", "CONTENT_EDITOR"],
  "support.handle": ["PLATFORM_ADMIN", "SUPPORT"],
  "flags.manage": ["PLATFORM_ADMIN"],
  "audit.view": ["PLATFORM_ADMIN", "TRUST_SAFETY"],
  "system.status": ["PLATFORM_ADMIN"],
} as const satisfies Record<string, readonly InternalRole[]>;

export type AdminPermission = keyof typeof ADMIN_PERMISSIONS;

export class AdminForbiddenError extends Error {
  constructor(readonly permission: AdminPermission, readonly reason: string) {
    super(`forbidden:${reason}`);
  }
}

/** Darf die Person das? Ohne Rolle, ohne 2FA oder ohne passende Rolle: nein. */
export function hasPermission(actor: AdminActor | null, permission: AdminPermission): boolean {
  if (!actor || actor.roles.length === 0 || !actor.twoFactorEnabled) return false;
  if (actor.roles.includes("SUPER_ADMIN")) return true;
  const allowed: readonly InternalRole[] = ADMIN_PERMISSIONS[permission];
  return actor.roles.some((role) => allowed.includes(role));
}

/** Alle Rechte einer Person, für die Navigation der Oberfläche. */
export function permissionsOf(actor: AdminActor | null): AdminPermission[] {
  return (Object.keys(ADMIN_PERMISSIONS) as AdminPermission[]).filter((permission) => hasPermission(actor, permission));
}

/** Lädt die Person und prüft das Recht; wirft `AdminForbiddenError`. */
export async function assertPermission(actorId: string, permission: AdminPermission): Promise<AdminActor> {
  const actor = await loadAdminActor(actorId);
  if (!hasPermission(actor, permission)) {
    const access = adminAccess(actor);
    throw new AdminForbiddenError(permission, access.allowed ? "role-missing" : access.reason);
  }
  return actor as AdminActor;
}
