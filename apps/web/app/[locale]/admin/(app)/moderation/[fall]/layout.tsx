import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { moderationAccess } from "@/features/admin/access";
import { caseExistsFor } from "@/features/admin/moderation/queries";

/**
 * Prüft vor dem Ladezustand, ob es den Fall gibt, damit eine unbekannte ID
 * eine echte 404 ergibt. Ohne Audit-Eintrag: Das Layout läuft auch beim
 * Vorausladen; protokolliert wird erst das Öffnen auf der Seite.
 */
export default async function ModerationCaseLayout({ children, params }: { children: ReactNode; params: Promise<{ fall: string }> }) {
  const { access, actor } = await moderationAccess();
  if (access.allowed && actor && !(await caseExistsFor(actor.userId, (await params).fall))) notFound();
  return children;
}
