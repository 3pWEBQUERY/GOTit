import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { reviewerAccess } from "@/features/admin/access";
import { getCase } from "@/features/admin/queries/get-case";

/**
 * Prüft vor dem Ladezustand, ob es den Fall gibt, damit eine unbekannte ID
 * eine echte 404 ergibt. Ohne Prüfrolle bleibt offen, ob es ihn gibt; die
 * Seite zeigt dann den Hinweis zum Bereich.
 */
export default async function CaseLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { access } = await reviewerAccess();
  if (access.allowed && !(await getCase((await params).id))) notFound();
  return children;
}
