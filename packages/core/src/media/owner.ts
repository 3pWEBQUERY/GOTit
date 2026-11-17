import { getDb } from "@app/db";

/**
 * Das eigene Anbieterprofil einer Person. Archivierte und gesperrte Profile
 * nehmen keine neuen Medien an; Lesen bleibt möglich.
 */
export async function ownProfile(userId: string): Promise<{ id: string; canUpload: boolean } | null> {
  const profile = await getDb().providerProfile.findUnique({ where: { userId }, select: { id: true, status: true, user: { select: { deactivatedAt: true } } } });
  if (!profile || profile.user.deactivatedAt) return null;
  return { id: profile.id, canUpload: profile.status !== "ARCHIVED" && profile.status !== "SUSPENDED" };
}

/** Filter für ein eigenes, nicht gelöschtes Medium: Eine fremde ID verhält sich wie eine unbekannte. */
export function ownMediaWhere(userId: string, mediaId: string) {
  return { id: mediaId, ownerUserId: userId, deletedAt: null } as const;
}
