import { getDb, type CaseAppealStatus, type ReportDecision, type ReportPriority, type ReportStatus, type ReportTarget } from "@app/db";
import { z } from "zod";
import { assertModerator } from "./access";
import { evidenceSize, parseEvidence, type ParsedEvidence } from "./evidence";

/**
 * Übergabe an die Moderation (v1 20.4, v2 12.4): Fälle lesend. Zuweisen,
 * Entscheiden und Einsprüche stehen in `cases.ts`. Jede
 * Funktion prüft die Rolle selbst; jedes Öffnen eines Falls und jedes
 * Aufdecken der Kopie schreibt einen Audit-Eintrag ohne Inhalt (v2 16.2).
 */
export const REPORT_QUEUE_LIMIT = 200;

const reportIdSchema = z.string().min(1).max(64);
export const revealReasonSchema = z.string().trim().min(10).max(500);

export interface ReportQueueEntry {
  id: string;
  number: number;
  targetType: ReportTarget;
  reason: string;
  urgent: boolean;
  priority: ReportPriority;
  status: ReportStatus;
  assignedToId: string | null;
  appealStatus: CaseAppealStatus;
  createdAt: Date;
}

export interface ReportQueueFilter {
  status?: ReportStatus | "ACTIVE" | "APPEALED";
  priority?: ReportPriority;
  /** `me`: mir zugewiesen, `none`: niemandem. */
  assigned?: "me" | "none";
  targetType?: ReportTarget;
}

/**
 * Warteschlange (v2 12.4): nach Priorität, darin die älteste zuerst.
 * `ACTIVE` sind offene und in Prüfung, `APPEALED` Fälle mit offenem Einspruch.
 */
export async function listReports(
  actorId: string,
  options: ReportQueueFilter = {},
): Promise<ReportQueueEntry[]> {
  await assertModerator(actorId);
  const status = options.status ?? "ACTIVE";
  return getDb().report.findMany({
    where: {
      ...(status === "ACTIVE"
        ? { status: { in: ["OPEN", "IN_REVIEW"] } }
        : status === "APPEALED"
          ? { appealStatus: "OPEN" }
          : { status }),
      ...(options.priority ? { priority: options.priority } : {}),
      ...(options.targetType ? { targetType: options.targetType } : {}),
      ...(options.assigned === "me"
        ? { assignedToId: actorId }
        : options.assigned === "none"
          ? { assignedToId: null }
          : {}),
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    take: REPORT_QUEUE_LIMIT,
    select: {
      id: true,
      number: true,
      targetType: true,
      reason: true,
      urgent: true,
      priority: true,
      status: true,
      assignedToId: true,
      appealStatus: true,
      createdAt: true,
    },
  });
}

/** Offene Meldungen, für die Seitenleiste des Admins. */
export async function countOpenReports(actorId: string): Promise<number> {
  await assertModerator(actorId);
  return getDb().report.count({ where: { OR: [{ status: { in: ["OPEN", "IN_REVIEW"] } }, { appealStatus: "OPEN" }] } });
}

/** Gibt es den Fall? Ohne Audit-Eintrag, für die echte 404 vor dem Ladezustand. */
export async function reportExists(
  actorId: string,
  reportId: string,
): Promise<boolean> {
  await assertModerator(actorId);
  if (!reportIdSchema.safeParse(reportId).success) return false;
  return (await getDb().report.count({ where: { id: reportId } })) > 0;
}

/**
 * Wie eine Person in der Moderation erscheint: Profilname, sonst
 * Benutzername, nie der Name aus der Registrierung (Entscheid 0014).
 */
export interface PartyLabel {
  /** false: Konto oder Profil gibt es nicht mehr. */
  exists: boolean;
  /** null bei vorhandenem Konto: ohne Benutzername (die Oberfläche zeigt «Mitglied»). */
  name: string | null;
}

async function userLabel(userId: string | null): Promise<PartyLabel> {
  if (!userId) return { exists: false, name: null };
  const row = await getDb().user.findUnique({
    where: { id: userId },
    select: {
      username: true,
      providerProfile: { select: { displayName: true } },
    },
  });
  if (!row) return { exists: false, name: null };
  return {
    exists: true,
    name: row.providerProfile?.displayName ?? row.username,
  };
}

async function targetLabel(
  targetType: ReportTarget,
  targetId: string,
  evidence: ParsedEvidence,
): Promise<PartyLabel> {
  if (targetType === "PROFILE") {
    const profile = await getDb().providerProfile.findUnique({
      where: { id: targetId },
      select: { displayName: true },
    });
    return profile
      ? { exists: true, name: profile.displayName }
      : { exists: false, name: null };
  }
  if (targetType === "REVIEW") {
    // Gemeldet ist die Bewertung eines Profils; der Autor erscheint nie (Entscheid 0017).
    const review = await getDb().review.findUnique({
      where: { id: targetId },
      select: { providerProfile: { select: { displayName: true } } },
    });
    return review
      ? { exists: true, name: review.providerProfile.displayName }
      : { exists: false, name: null };
  }
  if (targetType === "USER") return userLabel(targetId);
  if (targetType === "ORGANIZATION") {
    const organization = await getDb().organization.findUnique({
      where: { id: targetId },
      select: { name: true },
    });
    return organization
      ? { exists: true, name: organization.name }
      : { exists: false, name: null };
  }
  if (targetType === "MEDIA") {
    const media = await getDb().mediaAsset.findUnique({
      where: { id: targetId },
      select: {
        providerProfile: { select: { displayName: true } },
        organization: { select: { name: true } },
      },
    });
    if (!media) return { exists: false, name: null };
    return {
      exists: true,
      name:
        media.providerProfile?.displayName ?? media.organization?.name ?? null,
    };
  }
  if (targetType === "URL") return { exists: true, name: targetId };
  if (targetType === "MESSAGE")
    return userLabel(evidence.kind === "message" ? evidence.senderId : null);
  return { exists: false, name: null };
}

export interface ReportView {
  id: string;
  number: number;
  priority: ReportPriority;
  assignedTo: PartyLabel & { id: string | null };
  decision: ReportDecision | null;
  rule: string | null;
  decisionReason: string | null;
  decidedAt: Date | null;
  decidedById: string | null;
  escalatedAt: Date | null;
  contentBlockedAt: Date | null;
  appealStatus: CaseAppealStatus;
  appealReason: string | null;
  appealedAt: Date | null;
  /** Bei Meldungen über `/melden`: gemeldete Adresse und freiwillige Kontaktadresse. */
  targetUrl: string | null;
  contactEmail: string | null;
  targetId: string;
  targetType: ReportTarget;
  reason: string;
  details: string | null;
  urgent: boolean;
  status: ReportStatus;
  createdAt: Date;
  reporter: PartyLabel;
  /** Gemeldete Person oder gemeldetes Profil; bei einer Nachricht der Absender. */
  target: PartyLabel;
  /** Umfang der Kopie; den Inhalt gibt erst `revealReportEvidence` heraus. */
  evidence: { kind: ParsedEvidence["kind"]; count: number };
  /** Bei einer gemeldeten Bewertung ihre ID, für den Weg zum Fall unter `/admin/bewertungen`. */
  reviewId: string | null;
}

async function loadReport(reportId: string) {
  if (!reportIdSchema.safeParse(reportId).success) return null;
  return getDb().report.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      reporterId: true,
      targetType: true,
      targetId: true,
      reason: true,
      details: true,
      urgent: true,
      status: true,
      createdAt: true,
      evidence: true,
      number: true,
      priority: true,
      assignedToId: true,
      decision: true,
      rule: true,
      decisionReason: true,
      decidedAt: true,
      decidedById: true,
      escalatedAt: true,
      contentBlockedAt: true,
      appealStatus: true,
      appealReason: true,
      appealedAt: true,
      targetUrl: true,
      contactEmail: true,
    },
  });
}

/** Ein Fall ohne die Kopie selbst. Jeder Abruf schreibt `report.viewed`. */
export async function getReport(
  actorId: string,
  reportId: string,
): Promise<ReportView | null> {
  await assertModerator(actorId);
  const report = await loadReport(reportId);
  if (!report) return null;
  const evidence = parseEvidence(report.evidence);
  const [reporter, target, assignee] = await Promise.all([
    userLabel(report.reporterId),
    targetLabel(report.targetType, report.targetId, evidence),
    userLabel(report.assignedToId),
  ]);
  await getDb().auditEvent.create({
    data: { actorId, action: "report.viewed", target: `report:${report.id}` },
  });
  return {
    id: report.id,
    number: report.number,
    priority: report.priority,
    assignedTo: { id: report.assignedToId, ...assignee },
    decision: report.decision,
    rule: report.rule,
    decisionReason: report.decisionReason,
    decidedAt: report.decidedAt,
    decidedById: report.decidedById,
    escalatedAt: report.escalatedAt,
    contentBlockedAt: report.contentBlockedAt,
    appealStatus: report.appealStatus,
    appealReason: report.appealReason,
    appealedAt: report.appealedAt,
    targetUrl: report.targetUrl,
    contactEmail: report.contactEmail,
    targetId: report.targetId,
    targetType: report.targetType,
    reason: report.reason,
    details: report.details,
    urgent: report.urgent,
    status: report.status,
    createdAt: report.createdAt,
    reporter,
    target,
    evidence: { kind: evidence.kind, count: evidenceSize(evidence) },
    reviewId: report.targetType === "REVIEW" ? report.targetId : null,
  };
}

export type RevealedEvidence =
  | Exclude<ParsedEvidence, { kind: "message" }>
  | {
      kind: "message";
      sentAt: Date;
      body: string | null;
    };

/**
 * Deckt die Kopie der Nachrichten auf (v2 12.4): nur mit Grund, mit
 * Audit-Eintrag `report.evidence_revealed`. Null für unbekannte Fälle.
 */
export async function revealReportEvidence(
  actorId: string,
  reportId: string,
  reason: string,
): Promise<RevealedEvidence | null> {
  const parsedReason = revealReasonSchema.parse(reason);
  await assertModerator(actorId);
  const report = await loadReport(reportId);
  if (!report) return null;
  await getDb().auditEvent.create({
    data: {
      actorId,
      action: "report.evidence_revealed",
      target: `report:${report.id}`,
      reason: parsedReason,
    },
  });
  const evidence = parseEvidence(report.evidence);
  if (evidence.kind !== "message") return evidence;
  return { kind: "message", sentAt: evidence.sentAt, body: evidence.body };
}
