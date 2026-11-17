import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { VerificationPage } from "@/features/organization/components/verification-page";
import { organizationMetadata } from "@/features/organization/metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]/studio/o/[org]/nachweise">): Promise<Metadata> {
  return organizationMetadata((await params).locale as Locale, "credentials");
}

/** Geschäftsidentität und Prüfstatus (v2 7.7, v1 FR-VERIFY-003). Das Layout prüft die Mitgliedschaft vor dem Ladezustand. */
export default async function Page({ params }: PageProps<"/[locale]/studio/o/[org]/nachweise">) {
  const { locale, org } = await params;
  return <VerificationPage locale={locale as Locale} slug={org} />;
}
