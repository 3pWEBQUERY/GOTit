import { getDb, type ReportStatus, type ReportTarget } from "@app/db";
import { z } from "zod";
import { assertModerator } from "./access";
import { evidenceSize, parseEvidence, type ParsedEvidence } from "./evidence";

/**
 * Übergabe an die Moderation (v1 20.4, v2 12.4): offene Meldungen lesend.
 * Zuständigkeit, Entscheid und Einspruch folgen mit Schritt 1.13. Jede
 * Funktion prüft die Rolle selbst; jedes Öffnen eines Falls und jedes
 * Aufdecken der Kopie schreibt einen Audit-Eintrag ohne Inhalt (v2 16.2).
 */
export const REPORT_QUEUE_LIMIT = 200;

const reportIdSchema = z.string().min(1).max(64);
export const revealReasonSchema = z.string().trim().min(10).max(500);

export interface ReportQueueEntry {
  id: string;
  targetType: ReportTarget;
  reason: string;
  urgent: boolean;
  status: ReportStatus;
  createdAt: Date;
}

/** Warteschlange: dringende zuerst, darin die älteste zuerst. */
export async function listReports(
  actorId: string,
  options: { status?: ReportStatus } = {},
): Promise<ReportQueueEntry[]> {
  await assertModerator(actorId);
  return getDb().report.findMany({
    where: { status: options.status ?? "OPEN" },
    orderBy: [{ urgent: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    take: REPORT_QUEUE_LIMIT,
    select: {
      id: true,
      targetType: true,
      reason: true,
      urgent: true,
      status: true,
      createdAt: true,
    },
  });
}

/** Offene Meldungen, für die Seitenleiste des Admins. */
export async function countOpenReports(actorId: string): Promise<number> {
  await assertModerator(actorId);
  return getDb().report.count({ where: { status: "OPEN" } });
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
  if (targetType === "USER") return userLabel(targetId);
  if (targetType === "MESSAGE")
    return userLabel(evidence.kind === "message" ? evidence.senderId : null);
  return { exists: false, name: null };
}

export interface ReportView {
  id: string;
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
  const [reporter, target] = await Promise.all([
    userLabel(report.reporterId),
    targetLabel(report.targetType, report.targetId, evidence),
  ]);
  await getDb().auditEvent.create({
    data: { actorId, action: "report.viewed", target: `report:${report.id}` },
  });
  return {
    id: report.id,
    targetType: report.targetType,
    reason: report.reason,
    details: report.details,
    urgent: report.urgent,
    status: report.status,
    createdAt: report.createdAt,
    reporter,
    target,
    evidence: { kind: evidence.kind, count: evidenceSize(evidence) },
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
