import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { OrganizationSettingsPage } from "@/features/organization/components/settings-page";
import { organizationMetadata } from "@/features/organization/metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]/studio/o/[org]/einstellungen">): Promise<Metadata> {
  return organizationMetadata((await params).locale as Locale, "settings");
}

/** Einstellungen der Organisation (v2 7.7). Das Layout prüft die Mitgliedschaft vor dem Ladezustand. */
export default async function Page({ params }: PageProps<"/[locale]/studio/o/[org]/einstellungen">) {
  const { locale, org } = await params;
  return <OrganizationSettingsPage locale={locale as Locale} slug={org} />;
}
