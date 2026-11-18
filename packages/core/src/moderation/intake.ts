import { getDb, type Prisma, type ReportTarget } from "@app/db";
import { requestSearchReindex } from "../search/reindex";
import { blockContent } from "./content-actions";
import { priorityForReason } from "./rules";

/**
 * Eingang aller Meldungen (v1 9.3, v2 12.4). Setzt die Priorität aus dem
 * Grund. Kritische Gründe (Minderjährigkeit, Zwang, Menschenhandel, akute
 * Gefahr) werden sofort an Trust & Safety eskaliert, und der gemeldete
 * Inhalt wird gesperrt, bis jemand entscheidet. Meldungen ohne Konto sperren
 * nicht automatisch (Entscheid 0020): sonst liesse sich jedes Profil anonym
 * aus der Öffentlichkeit nehmen. Aus demselben Grund sperrt auch ein Konto
 * nur automatisch, wenn es seine Adresse bestätigt hat, mindestens 7 Tage alt
 * ist und in den letzten 24 Stunden nicht schon 3 Sofortsperren ausgelöst hat
 * (Sicherheitsprüfung 1.14). Eskaliert wird in jedem Fall.
 */

/** Mindestalter des meldenden Kontos für eine Sofortsperre (Vorschlag aus Entscheid 0020). */
export const AUTO_BLOCK_MIN_ACCOUNT_AGE_DAYS = 7;
/** Höchstzahl Sofortsperren pro meldendem Konto in 24 Stunden. */
export const AUTO_BLOCK_MAX_PER_DAY = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Darf eine Meldung dieses Kontos den Inhalt sofort sperren? */
async function mayAutoBlock(tx: Prisma.TransactionClient, reporterId: string, now: Date): Promise<boolean> {
  const reporter = await tx.user.findUnique({ where: { id: reporterId }, select: { emailVerified: true, createdAt: true } });
  if (!reporter?.emailVerified) return false;
  if (now.getTime() - reporter.createdAt.getTime() < AUTO_BLOCK_MIN_ACCOUNT_AGE_DAYS * DAY_MS) return false;
  const recent = await tx.report.count({ where: { reporterId, contentBlockedAt: { gte: new Date(now.getTime() - DAY_MS) } } });
  return recent < AUTO_BLOCK_MAX_PER_DAY;
}
export interface FileReportInput {
  reporterId: string | null;
  targetType: ReportTarget;
  targetId: string;
  reason: string;
  details: string | null;
  evidence?: Prisma.InputJsonValue;
  targetUrl?: string | null;
  contactEmail?: string | null;
}

export async function fileReport(input: FileReportInput, now = new Date()): Promise<{ reportId: string; blocked: boolean }> {
  const priority = priorityForReason(input.reason);
  const critical = priority === "CRITICAL";
  const outcome = await getDb().$transaction(async (tx) => {
    const block = critical && input.reporterId && (await mayAutoBlock(tx, input.reporterId, now)) ? await blockContent(tx, input.targetType, input.targetId, null, now) : null;
    const report = await tx.report.create({
      data: {
        reporterId: input.reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        details: input.details,
        urgent: critical,
        priority,
        evidence: input.evidence,
        targetUrl: input.targetUrl ?? null,
        contactEmail: input.contactEmail ?? null,
        escalatedAt: critical ? now : null,
        contentBlockedAt: block?.previous ? now : null,
        contentPreviousState: block?.previous ?? null,
      },
      select: { id: true },
    });
    if (critical) {
      // Dokumentierter Eskalationsweg (v2 12.4): Eintrag ohne Inhalt, die Warteschlange von Trust & Safety zeigt den Fall zuoberst.
      await tx.auditEvent.create({ data: { actorId: null, action: "report.escalated", target: `report:${report.id}` } });
      if (block?.previous) await tx.auditEvent.create({ data: { actorId: null, action: "report.content_blocked", target: `report:${report.id}` } });
    }
    return { reportId: report.id, blocked: Boolean(block?.previous), reindex: block?.reindexProfileId ?? null };
  });
  if (outcome.reindex) await requestSearchReindex(outcome.reindex);
  return { reportId: outcome.reportId, blocked: outcome.blocked };
}
