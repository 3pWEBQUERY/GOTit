import { getDb, type SecurityEventType } from "@app/db";
import { assertPermission } from "./permissions";

/**
 * Ereignisse, die auf ein Risiko für ein Konto hindeuten: abgeschalteter
 * zweiter Faktor, zurückgesetztes Passwort, entfernter Passkey. Fehlgeschlagene
 * Anmeldungen erfasst das Änderungsprotokoll nicht (kein Typ dafür); sie
 * bremst das Rate Limit.
 */
export const SECURITY_WARNING_TYPES: readonly SecurityEventType[] = ["TWO_FACTOR_DISABLED", "PASSWORD_RESET", "PASSKEY_REMOVED"];

const DAY = 24 * 3600_000;

/**
 * Plattformübersicht (v1 9.1, v2 7.8 `/admin`). Nur Zahlen, keine Inhalte.
 * Offene Verifizierungen zählen wie die Warteschlange `/admin/verifizierungen`
 * (Prüffälle ohne Entscheid).
 */
export async function getPlatformOverview(actorId: string, now = new Date()) {
  await assertPermission(actorId, "dashboard.view");
  const db = getDb();
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY);
  const dayAgo = new Date(now.getTime() - DAY);
  const openCase = { status: { in: ["OPEN" as const, "IN_REVIEW" as const] } };
  const [
    registrationsThisWeek,
    registrationsPreviousWeek,
    activeProfiles,
    pendingVerifications,
    openCases,
    criticalCases,
    openSupportTickets,
    openRestrictionAppeals,
    pendingReviews,
    pendingMedia,
    submittedOrganizations,
    warnings,
  ] = await Promise.all([
    db.user.count({ where: { createdAt: { gte: weekAgo } } }),
    db.user.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    db.providerProfile.count({ where: { status: "PUBLISHED" } }),
    db.profileReview.count({ where: { decision: null } }),
    db.report.count({ where: { OR: [openCase, { appealStatus: "OPEN" }] } }),
    db.report.count({ where: { ...openCase, priority: "CRITICAL" } }),
    db.supportTicket.count({ where: { status: "OPEN" } }),
    db.accountRestriction.count({ where: { appealStatus: "OPEN" } }),
    db.review.count({ where: { status: "PENDING" } }),
    db.mediaAsset.count({ where: { status: "IN_REVIEW" } }),
    db.organization.count({ where: { status: "SUBMITTED" } }),
    db.securityEvent.groupBy({ by: ["type"], where: { type: { in: [...SECURITY_WARNING_TYPES] }, createdAt: { gte: dayAgo } }, _count: { _all: true } }),
  ]);
  const securityWarnings = Object.fromEntries(SECURITY_WARNING_TYPES.map((type) => [type, warnings.find((row) => row.type === type)?._count._all ?? 0]));
  return {
    registrations: { last7Days: registrationsThisWeek, previous7Days: registrationsPreviousWeek },
    activeProfiles,
    pendingVerifications,
    moderation: { openCases, criticalCases, openRestrictionAppeals, pendingReviews, pendingMedia },
    // Beschwerden = offene Supportanfragen.
    openSupportTickets,
    submittedOrganizations,
    securityWarnings: { last24h: Object.values(securityWarnings).reduce((sum, count) => sum + count, 0), byType: securityWarnings },
    // Abos und Zahlungen gibt es erst in Phase 2 (Business-Suite).
    billing: null,
    // Kein eigener Fehlerspeicher: technische Fehler stehen in den Logs von Railway.
    technicalErrors: null,
  };
}
export type PlatformOverview = Awaited<ReturnType<typeof getPlatformOverview>>;
