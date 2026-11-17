import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { LocationDetailPage } from "@/features/organization/components/location-detail-page";
import { organizationMetadata } from "@/features/organization/metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]/studio/o/[org]/standorte/[id]">): Promise<Metadata> {
  return organizationMetadata((await params).locale as Locale, "location");
}

/** Standort mit Öffnungszeiten, Ausnahmen und zugeordneten Anbietern (v2 12.2). */
export default async function Page({ params }: PageProps<"/[locale]/studio/o/[org]/standorte/[id]">) {
  const { locale, org, id } = await params;
  return <LocationDetailPage locale={locale as Locale} slug={org} id={id} />;
}
