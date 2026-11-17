import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CantonCities } from "@/features/search/components/region-overview";
import { SearchView } from "@/features/search/components/search-view";
import { landingMetadata, loadRegionLanding } from "@/features/search/landing";

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/ch/[kanton]">): Promise<Metadata> {
  const { locale, kanton } = await params;
  return landingMetadata(
    await loadRegionLanding(locale as Locale, kanton),
    await searchParams,
    kanton,
  );
}

/** Kantonale Landingpage (PRD v2 7.1): Suche mit fester Region, darunter die Städte des Kantons. */
export default async function CantonPage({
  params,
  searchParams,
}: PageProps<"/[locale]/ch/[kanton]">) {
  const [{ locale, kanton }, raw] = await Promise.all([params, searchParams]);
  const landing = await loadRegionLanding(locale as Locale, kanton);
  if (!landing) notFound();
  return (
    <SearchView
      locale={locale as Locale}
      searchParams={raw}
      landing={landing}
      footer={<CantonCities locale={locale as Locale} canton={kanton} />}
    />
  );
}
