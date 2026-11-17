import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getViewer } from "@/features/shell/queries/get-viewer";
import { TodayPage } from "@/features/studio-today/components/today-page";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/studio">): Promise<Metadata> {
  const t = await getTranslations({
    locale: (await params).locale as Locale,
    namespace: "studio",
  });
  return { title: t("today.metaTitle") };
}

/** Heute für Anbieter (PRD v2 11.1); der Zeitraum der Kennzahlen steht in der URL. */
export default async function StudioTodayPage({
  params,
  searchParams,
}: PageProps<"/[locale]/studio">) {
  const [{ locale }, raw, viewer] = await Promise.all([
    params,
    searchParams,
    getViewer(),
  ]);
  if (viewer.kind !== "account") notFound();
  return <TodayPage locale={locale as Locale} viewer={viewer} raw={raw} />;
}
