import { getDb } from "@app/db";
import {
  purgeMessagingData,
  purgeOrphanConversations,
} from "../messaging/retention";
import { purgeMediaObjectsOfUsers } from "../media/purge-storage";
import { RETENTION_DAYS, cutoff } from "./policy";

export interface PurgeResult {
  deletedAccounts: number;
  securityEvents: number;
  emailOutbox: number;
  verifications: number;
  chatAttachments: number;
  /** Medien abgelaufener Konten, deren Dateien aus den Buckets entfernt wurden. */
  media: number;
  orphanConversations: number;
}

/**
 * Löscht, was seine Frist überschritten hat. Konten werden samt allen
 * abhängigen Daten gelöscht (Kaskade im Schema); Anbieterprofile und
 * Mitgliedschaften gehören dazu.
 */
export async function purgeExpiredData(now = new Date()): Promise<PurgeResult> {
  const db = getDb();
  const expiring = await db.user.findMany({
    where: {
      deletionRequestedAt: {
        lte: cutoff(RETENTION_DAYS.accountDeletionGrace, now),
      },
    },
    select: { id: true },
  });
  const media = await purgeMediaObjectsOfUsers(expiring.map((user) => user.id));
  const messaging = await purgeMessagingData(
    expiring.map((user) => user.id),
    now,
  );
  const [deletedAccounts, securityEvents, emailOutbox, verifications] =
    await Promise.all([
      db.user.deleteMany({
        where: {
          deletionRequestedAt: {
            lte: cutoff(RETENTION_DAYS.accountDeletionGrace, now),
          },
        },
      }),
      db.securityEvent.deleteMany({
        where: {
          createdAt: { lte: cutoff(RETENTION_DAYS.securityEvents, now) },
        },
      }),
      db.emailOutbox.deleteMany({
        where: { createdAt: { lte: cutoff(RETENTION_DAYS.emailOutbox, now) } },
      }),
      db.verification.deleteMany({
        where: {
          expiresAt: { lte: cutoff(RETENTION_DAYS.expiredVerifications, now) },
        },
      }),
    ]);
  return {
    deletedAccounts: deletedAccounts.count,
    securityEvents: securityEvents.count,
    emailOutbox: emailOutbox.count,
    verifications: verifications.count,
    chatAttachments: messaging.attachments + messaging.unsent,
    media,
    orphanConversations: await purgeOrphanConversations(),
  };
}
