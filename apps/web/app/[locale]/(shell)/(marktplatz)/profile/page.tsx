import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { SearchView } from "@/features/search/components/search-view";
import { landingMetadata, profilesLanding } from "@/features/search/landing";

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/profile">): Promise<Metadata> {
  const landing = await profilesLanding((await params).locale as Locale);
  return landingMetadata(landing, await searchParams, landing.title);
}

/** Einzelanbieter (PRD v2 7.1): Suche mit Voreinstellung; heute alle Profile (Entscheid 0013). */
export default async function ProfilesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/profile">) {
  const [{ locale }, raw] = await Promise.all([params, searchParams]);
  return (
    <SearchView
      locale={locale as Locale}
      searchParams={raw}
      landing={await profilesLanding(locale as Locale)}
    />
  );
}
