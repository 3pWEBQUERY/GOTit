import { findOrganizationMembership } from "@app/core/identity";
import { notFound } from "next/navigation";
import { getViewer } from "@/features/shell/queries/get-viewer";

/** Organisations-Kontext: nur für Mitglieder; für alle anderen existiert die Seite nicht (PRD 16.2). */
export default async function OrganizationStudioLayout({ children, params }: LayoutProps<"/[locale]/studio/o/[org]">) {
  const { org } = await params;
  if (!findOrganizationMembership(await getViewer(), org)) notFound();
  return children;
}
