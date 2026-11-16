import { getDb } from "@app/db";
import type { AdminActor } from "./policy";

/** Interne Rollen und 2FA-Status eines Kontos; null ohne Konto. */
export async function loadAdminActor(userId: string): Promise<AdminActor | null> {
  const user = await getDb().user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true, internalRoles: { select: { role: true } } } });
  if (!user) return null;
  return { userId, roles: user.internalRoles.map((assignment) => assignment.role), twoFactorEnabled: user.twoFactorEnabled };
}
