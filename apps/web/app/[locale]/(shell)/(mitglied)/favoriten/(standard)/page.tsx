import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FavoritesView } from "@/features/favorites/components/favorites-view";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/favoriten">): Promise<Metadata> {
  const t = await getTranslations({
    locale: (await params).locale as Locale,
    namespace: "favorites.page",
  });
  return { title: t("metaTitle") };
}

/** Favoriten und private Sammlungen (PRD v1 5.6, v2 7.5). */
export default async function FavoritesPage({
  params,
}: PageProps<"/[locale]/favoriten">) {
  return (
    <FavoritesView
      locale={(await params).locale as Locale}
      collectionId={null}
    />
  );
}
