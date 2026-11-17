import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { ClubPage } from "@/features/clubs/components/club-page";
import { clubMetadata } from "@/features/clubs/metadata";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  return clubMetadata(locale as Locale, slug, { tab: "team" });
}

/** Alle verknüpften Anbieter einer Organisation (PRD v2 7.1). */
export default async function ClubTeamPage({ params }: Props) {
  const { locale, slug } = await params;
  return <ClubPage locale={locale as Locale} slug={slug} tab="team" />;
}
