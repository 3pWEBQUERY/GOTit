import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { moderationAccess } from "@/features/admin/access";
import { reviewExists } from "@/features/reviews/queries/admin";

/**
 * Prüft vor dem Ladezustand, ob es die Bewertung gibt, damit eine unbekannte
 * ID eine echte 404 ergibt. Ohne Audit-Eintrag: protokolliert wird erst das
 * Öffnen auf der Seite.
 */
export default async function ReviewCaseLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { access, actor } = await moderationAccess();
  if (access.allowed && actor && !(await reviewExists((await params).id)))
    notFound();
  return children;
}
