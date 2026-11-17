import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { reviewerAccess } from "@/features/admin/access";
import { getMediaCaseFor } from "@/features/admin/media/queries";

/** Prüft vor dem Ladezustand, ob es das Medium gibt, damit eine unbekannte ID eine echte 404 ergibt (wie bei den Verifizierungen). */
export default async function MediaCaseLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { access, actor } = await reviewerAccess();
  if (access.allowed && actor && !(await getMediaCaseFor(actor.userId, (await params).id))) notFound();
  return children;
}
