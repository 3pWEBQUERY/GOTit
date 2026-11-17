import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getViewer } from "@/features/shell/queries/get-viewer";
import { StatsPage, statsRange } from "@/features/stats/components/stats-page";
import { loadStats } from "@/features/stats/queries/load-stats";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/studio/statistik">): Promise<Metadata> {
  const t = await getTranslations({
    locale: (await params).locale as Locale,
    namespace: "stats.meta",
  });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** Statistik (PRD v2 11.6); der Zeitraum steht in der URL. */
export default async function StudioStatsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/studio/statistik">) {
  const [{ locale }, raw, viewer] = await Promise.all([
    params,
    searchParams,
    getViewer(),
  ]);
  const data =
    viewer.kind === "account"
      ? await loadStats(
          viewer.userId,
          locale as Locale,
          statsRange(raw).parsed.range,
        )
      : null;
  if (!data) notFound();
  return <StatsPage locale={locale as Locale} data={data} raw={raw} />;
}
