import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { SearchView } from "@/features/search/components/search-view";
import { searchMetadata } from "@/features/search/landing";

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/suche">): Promise<Metadata> {
  return searchMetadata((await params).locale as Locale, await searchParams);
}

/** Suche (PRD v2 9.2): Ergebnisse, Filter, Sortierung und Ansicht aus der URL. */
export default async function SearchPage({
  params,
  searchParams,
}: PageProps<"/[locale]/suche">) {
  const [{ locale }, raw] = await Promise.all([params, searchParams]);
  return (
    <SearchView locale={locale as Locale} searchParams={raw} landing={null} />
  );
}
