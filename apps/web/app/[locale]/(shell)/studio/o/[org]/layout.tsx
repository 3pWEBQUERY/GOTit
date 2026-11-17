import { requireOrganization } from "@/features/organization/queries/membership";

/** Organisations-Kontext: nur für Mitglieder; für alle anderen existiert die Seite nicht (PRD 16.2), noch vor jedem Ladezustand. */
export default async function OrganizationStudioLayout({ children, params }: LayoutProps<"/[locale]/studio/o/[org]">) {
  await requireOrganization((await params).org);
  return children;
}
