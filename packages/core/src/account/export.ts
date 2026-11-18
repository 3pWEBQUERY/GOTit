import { getDb } from "@app/db";

/**
 * Selbstauskunft (PRD 16.2, revDSG Art. 25): alles, was zum Konto gespeichert
 * ist, als JSON. Ohne Passwort-Hash, ohne 2FA-Geheimnis, ohne Sitzungstoken.
 * Nicht enthalten sind Daten Dritter (Nachrichten der Gegenseite, Beweiskopien
 * in Meldungen) und interne Angaben der Moderation (wer entschieden hat,
 * interne Notizen); Begründungen von Entscheiden über das Konto gehören dazu.
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
      providerProfile: {
        select: {
          slug: true,
          displayName: true,
          status: true,
          shortDescription: true,
          description: true,
          languages: true,
          locationLabel: true,
          visibility: true,
          allowMessages: true,
          allowBookingRequests: true,
          pendingChanges: true,
          submittedAt: true,
          publishedAt: true,
          createdAt: true,
          regions: { select: { region: { select: { slug: true } } } },
          services: { select: { category: { select: { slug: true } } } },
          rates: { omit: { id: true, providerProfileId: true } },
          availabilityWindows: { omit: { id: true, providerProfileId: true } },
          calendarBlocks: { omit: { id: true, providerProfileId: true } },
          // Anfragen an das eigene Profil, mit eigener Notiz; ohne Angaben zum anfragenden Konto.
          bookingRequests: { select: { status: true, startsAt: true, endsAt: true, message: true, providerNote: true, createdAt: true } },
          receivedReviews: { where: { status: "PUBLISHED" }, select: { overall: true, text: true, response: true, respondedAt: true, publishedAt: true } },
        },
      },
      // Prüfergebnis, Zeitpunkt und Ablauf; die Plattform speichert keine Dokumentkopien (PRD 16.1).
      identityChecks: { select: { provider: true, status: true, ageOver18: true, livenessPassed: true, checkedAt: true, expiresAt: true, failureReason: true, createdAt: true } },
      media: {
        where: { deletedAt: null },
        select: { id: true, status: true, visibility: true, altText: true, mimeType: true, sizeBytes: true, width: true, height: true, isCover: true, rightsConfirmedAt: true, createdAt: true },
      },
      collections: { select: { name: true, createdAt: true, items: { select: { createdAt: true, providerProfile: { select: { slug: true } } } } } },
      savedSearches: { select: { name: true, query: true, lastViewedAt: true, createdAt: true } },
      reviews: { select: { communication: true, accuracy: true, organization: true, overall: true, text: true, status: true, moderationReason: true, response: true, publishedAt: true, createdAt: true } },
      reports: { select: { number: true, targetType: true, reason: true, details: true, status: true, decision: true, createdAt: true } },
      restrictions: { select: { kind: true, rule: true, reason: true, until: true, createdAt: true, liftedAt: true, liftReason: true, appealStatus: true, appealReason: true, appealedAt: true } },
      organizationMembers: { select: { role: true, createdAt: true, organization: { select: { slug: true, name: true } } } },
      sessions: { select: { createdAt: true, expiresAt: true, userAgent: true, ipAddress: true } },
      passkeys: { select: { name: true, deviceType: true, createdAt: true } },
      securityEvents: { select: { type: true, device: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      consents: { select: { kind: true, version: true, grantedAt: true, withdrawnAt: true }, orderBy: { grantedAt: "desc" } },
      // Eigene Nachrichten (Schritt 1.8). Nachrichten der Gegenseite gehören deren Konto und fehlen hier.
      messagesSent: { where: { deletedAt: null }, orderBy: { createdAt: "asc" }, select: { conversationId: true, body: true, createdAt: true } },
      chatLabels: { select: { name: true } },
      blocksMade: { select: { createdAt: true } },
    },
  });
  // Ohne Relation am Konto: eigene Terminanfragen als Mitglied und eigene Supportanfragen samt Antworten an die Person.
  const [bookingRequests, supportTickets] = await Promise.all([
    db.bookingRequest.findMany({
      where: { memberUserId: userId },
      orderBy: { createdAt: "asc" },
      select: { status: true, startsAt: true, endsAt: true, message: true, createdAt: true, providerProfile: { select: { slug: true } } },
    }),
    db.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { number: true, email: true, category: true, subject: true, body: true, status: true, createdAt: true, replies: { where: { internal: false }, select: { body: true, createdAt: true } } },
    }),
  ]);
  return { exportedAt: new Date().toISOString(), format: "gotit-account-export/2", account: { ...user, bookingRequests, supportTickets } };
}
