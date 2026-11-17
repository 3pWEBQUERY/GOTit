import { hasPermission, type AdminActor, type AdminPermission } from "@app/core/admin";
import { getAdminContext } from "../access";

/**
 * Zugang zu einem Bereich nach Recht (Entscheid 0020). Die Seite zeigt ohne
 * Recht den Hinweis «Bereich nicht verfügbar»; der Kern prüft bei jedem
 * Aufruf erneut.
 */
export async function areaAccess(permission: AdminPermission): Promise<{ allowed: true; actor: AdminActor } | { allowed: false; actor: AdminActor | null }> {
  const { actor } = await getAdminContext();
  return actor && hasPermission(actor, permission) ? { allowed: true, actor } : { allowed: false, actor };
}
