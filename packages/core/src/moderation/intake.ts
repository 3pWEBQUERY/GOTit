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
 * aus der Öffentlichkeit nehmen.
 */
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
    const block = critical && input.reporterId ? await blockContent(tx, input.targetType, input.targetId, null, now) : null;
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
