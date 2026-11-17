import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FavoritesView } from "@/features/favorites/components/favorites-view";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/favoriten/[sammlung]">): Promise<Metadata> {
  const t = await getTranslations({
    locale: (await params).locale as Locale,
    namespace: "favorites.page",
  });
  return { title: t("metaTitle") };
}

/** Eine eigene Sammlung; fremde oder unbekannte Ids ergeben 404 (Entscheid 0013). */
export default async function CollectionPage({
  params,
}: PageProps<"/[locale]/favoriten/[sammlung]">) {
  const { locale, sammlung } = await params;
  return <FavoritesView locale={locale as Locale} collectionId={sammlung} />;
}
