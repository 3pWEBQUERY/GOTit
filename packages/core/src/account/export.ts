import { getDb } from "@app/db";

/**
 * Selbstauskunft (PRD 16.2): alles, was zum Konto gespeichert ist, als JSON.
 * Ohne Passwort-Hash, ohne 2FA-Geheimnis, ohne Sitzungstoken.
 */
export async function exportOwnData(userId: string) {
  const db = getDb();
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      emailVerified: true,
      accountType: true,
      ageConfirmedAt: true,
      twoFactorEnabled: true,
      createdAt: true,
      updatedAt: true,
      deactivatedAt: true,
      deletionRequestedAt: true,
      preference: { omit: { userId: true } },
      providerProfile: { select: { slug: true, displayName: true, status: true, createdAt: true } },
      organizationMembers: { select: { role: true, createdAt: true, organization: { select: { slug: true, name: true } } } },
      sessions: { select: { createdAt: true, expiresAt: true, userAgent: true } },
      passkeys: { select: { name: true, deviceType: true, createdAt: true } },
      securityEvents: { select: { type: true, device: true, createdAt: true }, orderBy: { createdAt: "desc" } },
    },
  });
  return { exportedAt: new Date().toISOString(), format: "gotit-account-export/1", account: user };
}
