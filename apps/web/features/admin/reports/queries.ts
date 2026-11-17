import { getReport, listReports, reportExists, type ReportQueueEntry, type ReportView } from "@app/core/moderation";
import { cache } from "react";

/** Offene Meldungen, dringende zuerst; der Kern prüft die Rolle selbst. */
export async function getReportQueue(actorId: string): Promise<ReportQueueEntry[]> {
  return listReports(actorId, { status: "OPEN" });
}

/**
 * Ein Fall für `/admin/meldungen/[id]`; schreibt `report.viewed`. `cache`
 * gilt nur für diese Anfrage, damit ein Seitenaufruf genau einen Eintrag ergibt.
 */
export const getReportFor = cache(async (actorId: string, id: string): Promise<ReportView | null> => getReport(actorId, id));

/** Nur die Existenz, ohne Audit-Eintrag: für die echte 404 im Layout, das auch beim Vorausladen läuft. */
export const reportExistsFor = cache(async (actorId: string, id: string): Promise<boolean> => reportExists(actorId, id));
