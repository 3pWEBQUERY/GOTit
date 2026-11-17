import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { OrganizationProfilePage } from "@/features/organization/components/profile-page";
import { organizationMetadata } from "@/features/organization/metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]/studio/o/[org]/profil">): Promise<Metadata> {
  return organizationMetadata((await params).locale as Locale, "profile");
}

/** Unternehmensprofil (v2 7.7, v1 FR-BUSINESS-001). Das Layout prüft die Mitgliedschaft vor dem Ladezustand. */
export default async function Page({ params }: PageProps<"/[locale]/studio/o/[org]/profil">) {
  const { locale, org } = await params;
  return <OrganizationProfilePage locale={locale as Locale} slug={org} />;
}
