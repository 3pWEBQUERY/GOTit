import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SearchView } from "@/features/search/components/search-view";
import { landingMetadata, loadRegionLanding } from "@/features/search/landing";

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/ch/[kanton]/[stadt]">): Promise<Metadata> {
  const { locale, kanton, stadt } = await params;
  return landingMetadata(
    await loadRegionLanding(locale as Locale, kanton, stadt),
    await searchParams,
    stadt,
  );
}

/** Städtische Landingpage (PRD v2 7.1): Suche mit fester Region. */
export default async function CityPage({
  params,
  searchParams,
}: PageProps<"/[locale]/ch/[kanton]/[stadt]">) {
  const [{ locale, kanton, stadt }, raw] = await Promise.all([
    params,
    searchParams,
  ]);
  const landing = await loadRegionLanding(locale as Locale, kanton, stadt);
  if (!landing) notFound();
  return (
    <SearchView
      locale={locale as Locale}
      searchParams={raw}
      landing={landing}
    />
  );
}
