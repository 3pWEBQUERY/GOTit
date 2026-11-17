import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { OrganizationMediaPage } from "@/features/organization/components/media-page";
import { organizationMetadata } from "@/features/organization/metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]/studio/o/[org]/medien">): Promise<Metadata> {
  return organizationMetadata((await params).locale as Locale, "media");
}

/** Medien der Organisation (v1 FR-BUSINESS-001, Entscheid 0018). Das Layout prüft die Mitgliedschaft vor dem Ladezustand. */
export default async function Page({ params }: PageProps<"/[locale]/studio/o/[org]/medien">) {
  const { locale, org } = await params;
  return <OrganizationMediaPage locale={locale as Locale} slug={org} />;
}
