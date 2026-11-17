import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SearchView } from "@/features/search/components/search-view";
import {
  landingMetadata,
  loadCategoryLanding,
} from "@/features/search/landing";

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/kategorie/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  return landingMetadata(
    await loadCategoryLanding(locale as Locale, slug),
    await searchParams,
    slug,
  );
}

/** Kategorie-Landingpage (PRD v2 7.1): Suche mit fester Kategorie. */
export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/[locale]/kategorie/[slug]">) {
  const [{ locale, slug }, raw] = await Promise.all([params, searchParams]);
  const landing = await loadCategoryLanding(locale as Locale, slug);
  if (!landing) notFound();
  return (
    <SearchView
      locale={locale as Locale}
      searchParams={raw}
      landing={landing}
    />
  );
}
