import type { InternalRole } from "@app/db";
import { adminAccess } from "../admin/policy";
import { loadAdminActor } from "../admin/service";

/**
 * Rollen, die Meldungen sehen (PRD v2 3, 7.8, 12.4): Moderation und Trust &
 * Safety, dazu die Plattform-Administration. Support nicht: Meldungen zu
 * Nachrichten enthalten private Inhalte (Entscheid 0014).
 */
export const MODERATION_ROLES = [
  "SUPER_ADMIN",
  "PLATFORM_ADMIN",
  "MODERATOR",
  "TRUST_SAFETY",
] as const satisfies readonly InternalRole[];

/** Autorisierung im Kern (PRD 4.2): Rolle und zweiter Faktor, unabhängig vom Aufrufer. */
export async function assertModerator(actorId: string): Promise<void> {
  const access = adminAccess(await loadAdminActor(actorId), MODERATION_ROLES);
  if (!access.allowed) throw new Error(`forbidden:${access.reason}`);
}
