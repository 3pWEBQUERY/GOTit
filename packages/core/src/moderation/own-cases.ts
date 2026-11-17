import { getDb, type CaseAppealStatus, type ReportDecision, type ReportTarget } from "@app/db";
import { z } from "zod";
import { accountOfTarget } from "./content-actions";
import { parseEvidence } from "./evidence";

/**
 * Eigene Fälle aus Sicht des betroffenen Kontos (v2 12.4 «über einen
 * Einspruch anfechtbar»): der zuletzt entschiedene Fall mit Massnahme zu
 * einem eigenen Inhalt, zum Beispiel einem gesperrten Medium im Studio.
 * Ohne Angaben zur meldenden Person.
 */
export interface AppealableCase {
  reportId: string;
  number: number;
  createdAt: Date;
  decision: ReportDecision;
  rule: string | null;
  decisionReason: string | null;
  decidedAt: Date | null;
  appealStatus: CaseAppealStatus;
  appealedAt: Date | null;
  /** Einspruch noch möglich: einmal pro Fall (`appealCase`). */
  canAppeal: boolean;
}

const idSchema = z.string().min(1).max(64);

/** Null ohne entschiedenen Fall mit Massnahme oder wenn der Inhalt nicht dem Konto gehört. */
export async function appealableCaseFor(userId: string, targetType: ReportTarget, targetId: string): Promise<AppealableCase | null> {
  if (!idSchema.safeParse(userId).success || !idSchema.safeParse(targetId).success) return null;
  const db = getDb();
  const report = await db.report.findFirst({
    where: { targetType, targetId, decision: { not: null }, NOT: { decision: "NO_ACTION" } },
    orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      number: true,
      createdAt: true,
      decision: true,
      rule: true,
      decisionReason: true,
      decidedAt: true,
      appealStatus: true,
      appealedAt: true,
      evidence: true,
    },
  });
  if (!report?.decision) return null;
  const evidence = parseEvidence(report.evidence);
  const accountId = await accountOfTarget(db, targetType, targetId, evidence.kind === "message" ? { senderId: evidence.senderId } : {});
  if (accountId !== userId) return null;
  return {
    reportId: report.id,
    number: report.number,
    createdAt: report.createdAt,
    decision: report.decision,
    rule: report.rule,
    decisionReason: report.decisionReason,
    decidedAt: report.decidedAt,
    appealStatus: report.appealStatus,
    appealedAt: report.appealedAt,
    canAppeal: report.appealStatus === "NONE",
  };
}
