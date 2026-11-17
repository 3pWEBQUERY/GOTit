import { AdminForbiddenError, hasPermission, type AdminActor } from "@app/core/admin";
import {
  caseAccountHistory,
  decisionsFor,
  getReport,
  listReports,
  listRestrictionAppeals,
  nextCase,
  reportExists,
  type AccountHistory,
  type ReportQueueEntry,
  type ReportView,
} from "@app/core/moderation";
import { getDb } from "@app/db";
import { cache } from "react";
import { toCoreFilter, type QueueParams } from "./queue-filter";

/** Fälle für die Warteschlange; der Kern prüft die Rolle und sortiert nach Priorität und Alter. */
export async function getModerationQueue(actorId: string, params: QueueParams): Promise<ReportQueueEntry[]> {
  return listReports(actorId, toCoreFilter(params));
}

/** Nächster freier oder mir zugewiesener Fall (v2 12.4 «Nächster Fall»). */
export async function getNextCaseId(actorId: string, afterId?: string): Promise<string | null> {
  return nextCase(actorId, afterId);
}

/**
 * Namen interner Personen (Zuständig, Entschieden von): der Name des Kontos.
 * Nur im Admin sichtbar, nie gegenüber Mitgliedern (Entscheid 0021).
 */
export async function staffNames(ids: readonly (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();
  const rows = await getDb().user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
  return new Map(rows.map((row) => [row.id, row.name]));
}

/** Ein Fall für `/admin/moderation/[fall]`; schreibt `report.viewed`. Einmal pro Anfrage. */
export const getCaseFor = cache(async (actorId: string, id: string): Promise<ReportView | null> => getReport(actorId, id));

/** Nur die Existenz, ohne Audit-Eintrag: für die echte 404 im Layout, das auch beim Vorausladen läuft. */
export const caseExistsFor = cache(async (actorId: string, id: string): Promise<boolean> => reportExists(actorId, id));

/**
 * Verlauf des Kontos. Kritische Fälle zeigt der Kern nur Trust & Safety;
 * für alle anderen bleibt er dann leer (`null`), statt die Seite zu brechen.
 */
export async function getAccountHistory(actorId: string, id: string): Promise<AccountHistory | null> {
  try {
    return await caseAccountHistory(actorId, id);
  } catch (error) {
    if (error instanceof AdminForbiddenError) return null;
    throw error;
  }
}

export interface CaseRights {
  /** Darf den Fall zuweisen und entscheiden; bei kritischen Fällen nur Trust & Safety. */
  decide: boolean;
  /** Welche Massnahmen am Konto die Person verhängen darf. */
  restrict: boolean;
  suspend: boolean;
}

export function caseRights(actor: AdminActor, report: Pick<ReportView, "priority">): CaseRights {
  const cases = hasPermission(actor, "moderation.cases") && (report.priority !== "CRITICAL" || hasPermission(actor, "moderation.critical"));
  return { decide: cases, restrict: cases && hasPermission(actor, "users.restrict"), suspend: cases && hasPermission(actor, "users.suspend") };
}

/** Entscheide, die zum Ziel passen und die die Person verhängen darf. */
export function availableDecisions(report: Pick<ReportView, "targetType">, rights: CaseRights) {
  return decisionsFor(report.targetType).filter((decision) => {
    if (decision === "ACCOUNT_RESTRICTED") return rights.restrict;
    if (decision === "ACCOUNT_SUSPENDED") return rights.suspend;
    return true;
  });
}

export type RestrictionAppeal = Awaited<ReturnType<typeof listRestrictionAppeals>>[number];

/** Offene Einsprüche gegen Einschränkungen; null ohne das Recht «users.restrict». */
export async function getRestrictionAppeals(actor: AdminActor): Promise<RestrictionAppeal[] | null> {
  if (!hasPermission(actor, "users.restrict")) return null;
  return listRestrictionAppeals(actor.userId);
}
