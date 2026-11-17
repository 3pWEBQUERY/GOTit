import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RegionOverview } from "@/features/search/components/region-overview";
import { createHref } from "@/features/shell/nav/href";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/ch">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "search.meta" });
  return {
    title: t("overviewTitle"),
    description: t("overviewDescription"),
    alternates: { canonical: createHref(locale)("/ch") },
  };
}

/** Übersicht der Regionen (PRD v2 7.1): freigegebene Kantone mit ihren Städten als Linkliste. */
export default async function RegionsPage({
  params,
}: PageProps<"/[locale]/ch">) {
  return <RegionOverview locale={(await params).locale as Locale} />;
}
