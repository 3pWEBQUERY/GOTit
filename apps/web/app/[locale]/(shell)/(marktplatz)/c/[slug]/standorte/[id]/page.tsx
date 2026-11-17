import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { LocationPage } from "@/features/clubs/components/location-page";
import { clubMetadata } from "@/features/clubs/metadata";

type Props = { params: Promise<{ locale: string; slug: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug, id } = await params;
  return clubMetadata(locale as Locale, slug, { locationId: id });
}

/** Standort einer Organisation (PRD v2 7.1). */
export default async function ClubLocationPage({ params }: Props) {
  const { locale, slug, id } = await params;
  return <LocationPage locale={locale as Locale} slug={slug} id={id} />;
}
