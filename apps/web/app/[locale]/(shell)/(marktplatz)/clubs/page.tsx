import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ClubsListPage } from "@/features/clubs/components/clubs-list-page";
import { createHref } from "@/features/shell/nav/href";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/clubs">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "clubs.meta" });
  return {
    title: t("listTitle"),
    description: t("listDescription"),
    alternates: { canonical: createHref(locale)("/clubs") },
  };
}

/** Clubs und Agenturen (PRD v2 7.1), Filter Art und Region in der URL. */
export default async function ClubsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/clubs">) {
  const [{ locale }, raw] = await Promise.all([params, searchParams]);
  return <ClubsListPage locale={locale as Locale} searchParams={raw} />;
}
