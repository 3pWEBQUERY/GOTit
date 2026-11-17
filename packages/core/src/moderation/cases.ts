import { getDb, type Prisma, type ReportDecision, type ReportTarget, type RestrictionKind } from "@app/db";
import { z } from "zod";
import { AdminForbiddenError, assertPermission, hasPermission } from "../admin/permissions";
import { loadAdminActor } from "../admin/service";
import { requestSearchReindex } from "../search/reindex";
import { BLOCKABLE_TARGETS, accountOfTarget, blockContent, restoreContent } from "./content-actions";
import { parseEvidence } from "./evidence";
import { liftRestrictionsOfReport, restrictAccount } from "./restrictions";
import { MODERATION_RULE_KEYS } from "./rules";

/**
 * Fälle bearbeiten (v1 9.3, v2 12.4): zuweisen, entscheiden mit Regel und
 * Begründung, Einspruch. Fälle mit Priorität `CRITICAL` entscheidet nur
 * Trust & Safety. Jeder Schritt schreibt einen Audit-Eintrag ohne Inhalt.
 */
type Tx = Prisma.TransactionClient;

const idSchema = z.string().min(1).max(64);
const reasonSchema = z.string().trim().min(10).max(2000);

/** Welche Entscheide zu welchem Ziel passen. */
export function decisionsFor(targetType: ReportTarget): ReportDecision[] {
  const decisions: ReportDecision[] = ["NO_ACTION"];
  if (targetType === "MEDIA") decisions.push("CHANGES_REQUESTED");
  if (BLOCKABLE_TARGETS.includes(targetType)) decisions.push("CONTENT_REMOVED");
  if (targetType !== "URL" && targetType !== "ORGANIZATION") decisions.push("ACCOUNT_RESTRICTED", "ACCOUNT_SUSPENDED");
  return decisions;
}

export const decideCaseSchema = z.object({
  decision: z.enum(["NO_ACTION", "CHANGES_REQUESTED", "CONTENT_REMOVED", "ACCOUNT_RESTRICTED", "ACCOUNT_SUSPENDED"]),
  rule: z.enum(MODERATION_RULE_KEYS),
  reason: reasonSchema,
  // Für `ACCOUNT_RESTRICTED`: was eingeschränkt wird.
  restrictionKind: z.enum(["MESSAGING", "BOOKING"]).optional(),
  // Für Einschränkung und Sperre: Ende, ohne Ende unbefristet.
  until: z.coerce.date().nullable().default(null),
});
export type DecideCaseInput = z.input<typeof decideCaseSchema>;

export type CaseResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "not-found" | "already-decided" | "not-applicable" | "same-person" | "no-account" | "protected" };

async function assertCaseAccess(actorId: string, priority: string | null) {
  const actor = await assertPermission(actorId, "moderation.cases");
  if (priority === "CRITICAL" && !hasPermission(actor, "moderation.critical")) throw new AdminForbiddenError("moderation.critical", "role-missing");
  return actor;
}

/** Zuweisen oder freigeben (`assigneeId` null). Wer zugewiesen wird, braucht selbst Zugang zum Fall. */
export async function assignCase(actorId: string, reportId: string, assigneeId: string | null): Promise<CaseResult> {
  await assertPermission(actorId, "moderation.cases");
  if (!idSchema.safeParse(reportId).success) return { ok: false, reason: "invalid" };
  const db = getDb();
  const report = await db.report.findUnique({ where: { id: reportId }, select: { priority: true, status: true } });
  if (!report) return { ok: false, reason: "not-found" };
  if (assigneeId) {
    const assignee = await loadAdminActor(assigneeId);
    const allowed = hasPermission(assignee, "moderation.cases") && (report.priority !== "CRITICAL" || hasPermission(assignee, "moderation.critical"));
    if (!allowed) return { ok: false, reason: "not-applicable" };
  }
  const updated = await db.report.updateMany({
    where: { id: reportId, status: { in: ["OPEN", "IN_REVIEW"] } },
    data: { assignedToId: assigneeId, status: assigneeId ? "IN_REVIEW" : "OPEN" },
  });
  if (updated.count === 0) return { ok: false, reason: "already-decided" };
  await db.auditEvent.create({ data: { actorId, action: assigneeId ? "report.assigned" : "report.unassigned", target: `report:${reportId}`, reason: assigneeId ? `user:${assigneeId}` : null } });
  return { ok: true };
}

/** Nächster Fall für «Nächster Fall» (v2 12.4): mir zugewiesen oder frei, nach Priorität und Alter. */
export async function nextCase(actorId: string, afterId?: string): Promise<string | null> {
  const actor = await assertPermission(actorId, "moderation.cases");
  const critical = hasPermission(actor, "moderation.critical");
  const rows = await getDb().report.findMany({
    where: {
      status: { in: ["OPEN", "IN_REVIEW"] },
      OR: [{ assignedToId: null }, { assignedToId: actorId }],
      ...(critical ? {} : { priority: { not: "CRITICAL" } }),
      ...(afterId ? { id: { not: afterId } } : {}),
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    take: 1,
    select: { id: true },
  });
  return rows[0]?.id ?? null;
}

async function blockAndRemember(tx: Tx, report: { id: string; targetType: ReportTarget; targetId: string; contentBlockedAt: Date | null }, actorId: string, now: Date) {
  if (report.contentBlockedAt) return null;
  const outcome = await blockContent(tx, report.targetType, report.targetId, actorId, now);
  if (outcome.previous) await tx.report.update({ where: { id: report.id }, data: { contentBlockedAt: now, contentPreviousState: outcome.previous } });
  return outcome.reindexProfileId;
}

/**
 * Entscheid zu einem offenen Fall. Zwei gleichzeitige Entscheide ergeben
 * einen Gewinner. «Kein Verstoss» hebt eine Sofortsperre auf; Einschränkung
 * und Sperre gelten dem Konto hinter dem gemeldeten Inhalt.
 */
export async function decideCase(actorId: string, reportId: string, input: DecideCaseInput, now = new Date()): Promise<CaseResult> {
  const parsed = decideCaseSchema.safeParse(input);
  if (!parsed.success || !idSchema.safeParse(reportId).success) {
    await assertPermission(actorId, "moderation.cases");
    return { ok: false, reason: "invalid" };
  }
  const data = parsed.data;
  const db = getDb();
  const report = await db.report.findUnique({
    where: { id: reportId },
    select: { id: true, priority: true, status: true, targetType: true, targetId: true, evidence: true, contentBlockedAt: true, contentPreviousState: true },
  });
  const actor = await assertCaseAccess(actorId, report?.priority ?? null);
  if (!report) return { ok: false, reason: "not-found" };
  if (report.status !== "OPEN" && report.status !== "IN_REVIEW") return { ok: false, reason: "already-decided" };
  if (!decisionsFor(report.targetType).includes(data.decision)) return { ok: false, reason: "not-applicable" };
  if ((data.decision === "NO_ACTION") !== (data.rule === "R-MOD-0")) return { ok: false, reason: "invalid" };
  if (data.decision === "ACCOUNT_RESTRICTED" && !data.restrictionKind) return { ok: false, reason: "invalid" };

  const evidence = parseEvidence(report.evidence);
  const accountId = await accountOfTarget(db, report.targetType, report.targetId, evidence.kind === "message" ? { senderId: evidence.senderId } : {});
  const restrictionKind: RestrictionKind | null =
    data.decision === "ACCOUNT_SUSPENDED" ? "SUSPENDED" : data.decision === "ACCOUNT_RESTRICTED" ? (data.restrictionKind ?? null) : null;
  if (restrictionKind) {
    if (!accountId) return { ok: false, reason: "no-account" };
    // Recht vor dem Entscheid prüfen, damit kein Fall ohne die verlangte Massnahme als erledigt gilt.
    await assertPermission(actorId, restrictionKind === "SUSPENDED" ? "users.suspend" : "users.restrict");
    if (accountId === actorId) return { ok: false, reason: "same-person" };
    const protectedAccount = await db.internalRoleAssignment.count({ where: { userId: accountId } });
    if (protectedAccount > 0 && !actor.roles.includes("SUPER_ADMIN")) return { ok: false, reason: "protected" };
  }

  const reindex = await db.$transaction(async (tx) => {
    const updated = await tx.report.updateMany({
      where: { id: reportId, status: { in: ["OPEN", "IN_REVIEW"] } },
      data: {
        status: data.decision === "NO_ACTION" ? "DISMISSED" : "RESOLVED",
        decision: data.decision,
        rule: data.rule,
        decisionReason: data.reason,
        decidedById: actorId,
        decidedAt: now,
      },
    });
    if (updated.count === 0) return undefined;
    let profileId: string | null = null;
    if (data.decision === "NO_ACTION" && report.contentBlockedAt && report.contentPreviousState) {
      profileId = await restoreContent(tx, report.targetType, report.targetId, report.contentPreviousState);
      await tx.report.update({ where: { id: reportId }, data: { contentBlockedAt: null } });
    }
    if (data.decision === "CONTENT_REMOVED") profileId = await blockAndRemember(tx, report, actorId, now);
    if (data.decision === "CHANGES_REQUESTED") {
      const media = await tx.mediaAsset.findUnique({ where: { id: report.targetId }, select: { status: true } });
      if (media) {
        await tx.mediaAsset.update({ where: { id: report.targetId }, data: { status: "CHANGES_REQUESTED", moderationNote: data.reason } });
        if (!report.contentBlockedAt) await tx.report.update({ where: { id: reportId }, data: { contentBlockedAt: now, contentPreviousState: media.status } });
      }
    }
    await tx.auditEvent.create({
      data: { actorId, action: `report.decided.${data.decision.toLowerCase()}`, target: `report:${reportId}`, reason: `${data.rule}: ${data.reason}` },
    });
    return profileId;
  });
  if (reindex === undefined) return { ok: false, reason: "already-decided" };
  if (reindex) await requestSearchReindex(reindex);
  if (restrictionKind && accountId) {
    // Eine bereits aktive Einschränkung derselben Art bleibt bestehen; der Fall verweist dann auf sie.
    await restrictAccount(actorId, { userId: accountId, kind: restrictionKind, rule: data.rule, reason: data.reason, until: data.until, reportId }, now);
  }
  return { ok: true };
}

/**
 * Einspruch gegen einen Entscheid (v2 12.4 «über einen Einspruch
 * anfechtbar»), einmal pro Fall: das betroffene Konto gegen eine Massnahme,
 * die meldende Person gegen «Kein Verstoss».
 */
export async function appealCase(userId: string, reportId: string, reason: string, now = new Date()): Promise<CaseResult> {
  const parsedReason = z.string().trim().min(20).max(2000).safeParse(reason);
  if (!parsedReason.success || !idSchema.safeParse(reportId).success) return { ok: false, reason: "invalid" };
  const db = getDb();
  const report = await db.report.findUnique({
    where: { id: reportId },
    select: { reporterId: true, decision: true, appealStatus: true, targetType: true, targetId: true, evidence: true },
  });
  if (!report?.decision) return { ok: false, reason: "not-found" };
  const evidence = parseEvidence(report.evidence);
  const accountId = await accountOfTarget(db, report.targetType, report.targetId, evidence.kind === "message" ? { senderId: evidence.senderId } : {});
  const allowed = report.decision === "NO_ACTION" ? report.reporterId === userId : accountId === userId;
  if (!allowed) return { ok: false, reason: "not-found" };
  const updated = await db.report.updateMany({
    where: { id: reportId, appealStatus: "NONE" },
    data: { appealStatus: "OPEN", appealReason: parsedReason.data, appealedAt: now },
  });
  if (updated.count === 0) return { ok: false, reason: "already-decided" };
  await db.auditEvent.create({ data: { actorId: userId, action: "report.appealed", target: `report:${reportId}` } });
  return { ok: true };
}

/**
 * Entscheid über einen Einspruch, nicht durch die Person, die den Fall
 * entschieden hat (ausser `SUPER_ADMIN`). Stattgegeben: Gegen eine
 * Massnahme stellt er den Inhalt wieder her und hebt Einschränkungen des
 * Falls auf; gegen «Kein Verstoss» öffnet er den Fall erneut.
 */
export async function decideCaseAppeal(
  actorId: string,
  reportId: string,
  input: { outcome: "UPHELD" | "DISMISSED"; reason: string },
  now = new Date(),
): Promise<CaseResult> {
  const parsedReason = reasonSchema.safeParse(input.reason);
  const db = getDb();
  const report = idSchema.safeParse(reportId).success
    ? await db.report.findUnique({
        where: { id: reportId },
        select: { priority: true, decision: true, decidedById: true, appealStatus: true, targetType: true, targetId: true, contentBlockedAt: true, contentPreviousState: true },
      })
    : null;
  const actor = await assertCaseAccess(actorId, report?.priority ?? null);
  if (!parsedReason.success || !["UPHELD", "DISMISSED"].includes(input.outcome)) return { ok: false, reason: "invalid" };
  if (!report || report.appealStatus !== "OPEN") return { ok: false, reason: "not-found" };
  if (report.decidedById === actorId && !actor.roles.includes("SUPER_ADMIN")) return { ok: false, reason: "same-person" };

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.report.updateMany({ where: { id: reportId, appealStatus: "OPEN" }, data: { appealStatus: input.outcome } });
    if (updated.count === 0) return undefined;
    let profileId: string | null = null;
    if (input.outcome === "UPHELD") {
      if (report.decision === "NO_ACTION") {
        await tx.report.update({
          where: { id: reportId },
          data: { status: "OPEN", decision: null, rule: null, decisionReason: null, decidedAt: null, decidedById: null, assignedToId: null },
        });
      } else if (report.contentBlockedAt && report.contentPreviousState) {
        profileId = await restoreContent(tx, report.targetType, report.targetId, report.contentPreviousState);
        await tx.report.update({ where: { id: reportId }, data: { contentBlockedAt: null } });
      }
    }
    await tx.auditEvent.create({
      data: { actorId, action: `report.appeal_${input.outcome.toLowerCase()}`, target: `report:${reportId}`, reason: parsedReason.data },
    });
    return profileId;
  });
  if (result === undefined) return { ok: false, reason: "not-found" };
  if (result) await requestSearchReindex(result);
  if (input.outcome === "UPHELD" && report.decision !== "NO_ACTION") await liftRestrictionsOfReport(actorId, reportId, `Einspruch: ${parsedReason.data}`, now);
  return { ok: true };
}

export interface AccountHistory {
  /** Konto hinter dem gemeldeten Inhalt; null ohne Konto (Adresse, Organisation, gelöscht). */
  accountId: string | null;
  earlierCases: { id: string; number: number; reason: string; decision: ReportDecision | null; createdAt: Date }[];
  restrictions: { id: string; kind: RestrictionKind; rule: string; until: Date | null; createdAt: Date; liftedAt: Date | null }[];
}

/** Verlauf des Kontos (v2 12.4 «frühere Fälle»): Meldungen gegen Konto und Profil, Einschränkungen. */
export async function caseAccountHistory(actorId: string, reportId: string): Promise<AccountHistory | null> {
  const db = getDb();
  const report = idSchema.safeParse(reportId).success
    ? await db.report.findUnique({ where: { id: reportId }, select: { priority: true, targetType: true, targetId: true, evidence: true } })
    : null;
  await assertCaseAccess(actorId, report?.priority ?? null);
  if (!report) return null;
  const evidence = parseEvidence(report.evidence);
  const accountId = await accountOfTarget(db, report.targetType, report.targetId, evidence.kind === "message" ? { senderId: evidence.senderId } : {});
  if (!accountId) return { accountId: null, earlierCases: [], restrictions: [] };
  const profile = await db.providerProfile.findUnique({ where: { userId: accountId }, select: { id: true } });
  const [earlierCases, restrictions] = await Promise.all([
    db.report.findMany({
      where: {
        id: { not: reportId },
        OR: [{ targetType: "USER", targetId: accountId }, ...(profile ? [{ targetType: "PROFILE" as const, targetId: profile.id }] : [])],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, number: true, reason: true, decision: true, createdAt: true },
    }),
    db.accountRestriction.findMany({
      where: { userId: accountId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, kind: true, rule: true, until: true, createdAt: true, liftedAt: true },
    }),
  ]);
  return { accountId, earlierCases, restrictions };
}
