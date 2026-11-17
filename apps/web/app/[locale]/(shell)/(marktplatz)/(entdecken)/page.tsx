import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DiscoverPage } from "@/features/discover/components/discover-page";
import { createHref } from "@/features/shell/nav/href";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "discover" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: createHref(locale)("/") },
  };
}

/** Entdecken (PRD v2 9.1): Suchfeld, Region und echte Profile der Region. */
export default async function Discover({ params }: PageProps<"/[locale]">) {
  return <DiscoverPage locale={(await params).locale as Locale} />;
}
