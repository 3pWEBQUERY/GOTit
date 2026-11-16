import type { InternalRole } from "@app/db";

export interface AdminActor {
  userId: string;
  roles: readonly InternalRole[];
  twoFactorEnabled: boolean;
}

export type AdminAccess = { allowed: true } | { allowed: false; reason: "no-role" | "two-factor-required" | "role-missing" };

/**
 * Zugang zur Admin-Anwendung (PRD 7.8, 16.2): nur interne Rollen und nur mit
 * zweitem Faktor. Ohne passende Rolle für einen Bereich ist er nicht
 * erreichbar.
 */
export function adminAccess(actor: AdminActor | null, required: readonly InternalRole[] = []): AdminAccess {
  if (!actor || actor.roles.length === 0) return { allowed: false, reason: "no-role" };
  if (!actor.twoFactorEnabled) return { allowed: false, reason: "two-factor-required" };
  if (required.length > 0 && !actor.roles.some((role) => role === "SUPER_ADMIN" || required.includes(role))) {
    return { allowed: false, reason: "role-missing" };
  }
  return { allowed: true };
}
