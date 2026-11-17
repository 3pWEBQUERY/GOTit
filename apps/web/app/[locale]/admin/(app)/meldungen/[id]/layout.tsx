import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { moderationAccess } from "@/features/admin/access";
import { reportExistsFor } from "@/features/admin/reports/queries";

/**
 * Prüft vor dem Ladezustand, ob es die Meldung gibt, damit eine unbekannte ID
 * eine echte 404 ergibt. Ohne Audit-Eintrag: Das Layout läuft auch beim
 * Vorausladen; protokolliert wird erst das Öffnen auf der Seite.
 */
export default async function ReportCaseLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { access, actor } = await moderationAccess();
  if (access.allowed && actor && !(await reportExistsFor(actor.userId, (await params).id))) notFound();
  return children;
}
