import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { LegalPage, legalMetadata } from "@/features/content/legal-page";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return legalMetadata((await params).locale as Locale, "datenschutz");
}

/** Rechtsseite `/recht/datenschutz` aus dem CMS (v2 7.3). */
export default async function Page({ params }: Props) {
  return <LegalPage locale={(await params).locale as Locale} slug="datenschutz" />;
}
