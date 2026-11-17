import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { ProvidersPage } from "@/features/organization/components/providers-page";
import { organizationMetadata } from "@/features/organization/metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]/studio/o/[org]/anbieter">): Promise<Metadata> {
  return organizationMetadata((await params).locale as Locale, "providers");
}

/** Verknüpfte Anbieter und Einladungen (v2 12.2). Das Layout prüft die Mitgliedschaft vor dem Ladezustand. */
export default async function Page({ params }: PageProps<"/[locale]/studio/o/[org]/anbieter">) {
  const { locale, org } = await params;
  return <ProvidersPage locale={locale as Locale} slug={org} />;
}
