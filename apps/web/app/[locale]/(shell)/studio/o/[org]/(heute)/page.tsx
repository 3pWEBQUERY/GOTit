import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { OrganizationTodayPage } from "@/features/organization/components/today-page";
import { organizationMetadata } from "@/features/organization/metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]/studio/o/[org]">): Promise<Metadata> {
  return organizationMetadata((await params).locale as Locale, "today");
}

/** Heute für die Organisation (v2 7.7): Aufgaben nach Dringlichkeit. Das Layout prüft die Mitgliedschaft vor dem Ladezustand. */
export default async function Page({ params }: PageProps<"/[locale]/studio/o/[org]">) {
  const { locale, org } = await params;
  return <OrganizationTodayPage locale={locale as Locale} slug={org} />;
}
