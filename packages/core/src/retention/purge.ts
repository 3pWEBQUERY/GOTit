import { getDb } from "@app/db";
import { RETENTION_DAYS, cutoff } from "./policy";

export interface PurgeResult {
  deletedAccounts: number;
  securityEvents: number;
  emailOutbox: number;
  verifications: number;
}

/**
 * Löscht, was seine Frist überschritten hat. Konten werden samt allen
 * abhängigen Daten gelöscht (Kaskade im Schema); Anbieterprofile und
 * Mitgliedschaften gehören dazu.
 */
export async function purgeExpiredData(now = new Date()): Promise<PurgeResult> {
  const db = getDb();
  const [deletedAccounts, securityEvents, emailOutbox, verifications] = await Promise.all([
    db.user.deleteMany({ where: { deletionRequestedAt: { lte: cutoff(RETENTION_DAYS.accountDeletionGrace, now) } } }),
    db.securityEvent.deleteMany({ where: { createdAt: { lte: cutoff(RETENTION_DAYS.securityEvents, now) } } }),
    db.emailOutbox.deleteMany({ where: { createdAt: { lte: cutoff(RETENTION_DAYS.emailOutbox, now) } } }),
    db.verification.deleteMany({ where: { expiresAt: { lte: cutoff(RETENTION_DAYS.expiredVerifications, now) } } }),
  ]);
  return {
    deletedAccounts: deletedAccounts.count,
    securityEvents: securityEvents.count,
    emailOutbox: emailOutbox.count,
    verifications: verifications.count,
  };
}
