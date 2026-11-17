import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { LocationsPage } from "@/features/organization/components/locations-page";
import { organizationMetadata } from "@/features/organization/metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]/studio/o/[org]/standorte">): Promise<Metadata> {
  return organizationMetadata((await params).locale as Locale, "locations");
}

/** Standorte der Organisation (v2 12.2). Das Layout prüft die Mitgliedschaft vor dem Ladezustand. */
export default async function Page({ params }: PageProps<"/[locale]/studio/o/[org]/standorte">) {
  const { locale, org } = await params;
  return <LocationsPage locale={locale as Locale} slug={org} />;
}
