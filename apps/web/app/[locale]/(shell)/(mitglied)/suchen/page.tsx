import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SavedSearchesView } from "@/features/favorites/components/saved-searches-view";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/suchen">): Promise<Metadata> {
  const t = await getTranslations({
    locale: (await params).locale as Locale,
    namespace: "favorites.searches",
  });
  return { title: t("metaTitle") };
}

/** Gespeicherte Suchen (PRD v2 7.5, v1 FR-SEARCH-005). */
export default async function SavedSearchesPage({
  params,
}: PageProps<"/[locale]/suchen">) {
  return <SavedSearchesView locale={(await params).locale as Locale} />;
}
