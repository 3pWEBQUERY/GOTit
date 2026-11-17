import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { ClubPage } from "@/features/clubs/components/club-page";
import { clubMetadata } from "@/features/clubs/metadata";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  return clubMetadata(locale as Locale, slug, { tab: "overview" });
}

/** Club- oder Agenturprofil (PRD v2 9.4). */
export default async function ClubOverviewPage({ params }: Props) {
  const { locale, slug } = await params;
  return <ClubPage locale={locale as Locale} slug={slug} tab="overview" />;
}
