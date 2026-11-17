import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { moderationAccess } from "@/features/admin/access";
import { organizationVerificationExists } from "@/features/organization/admin/queries";

/** Prüft vor dem Ladezustand, ob es die Prüfung gibt, damit eine unbekannte ID eine echte 404 ergibt. */
export default async function OrganizationCaseLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { access, actor } = await moderationAccess();
  if (access.allowed && actor && !(await organizationVerificationExists((await params).id))) notFound();
  return children;
}
