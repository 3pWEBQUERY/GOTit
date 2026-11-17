import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  RequestsPage,
  parseTab,
} from "@/features/booking/studio/requests/requests-page";
import { getViewer } from "@/features/shell/queries/get-viewer";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/studio/anfragen">): Promise<Metadata> {
  const t = await getTranslations({
    locale: (await params).locale as Locale,
    namespace: "bookingStudio.meta",
  });
  return { title: t("requests") };
}

/** Terminanfragen `/studio/anfragen` (PRD v2 11.5); der Tab steht in der URL. */
export default async function StudioRequestsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/studio/anfragen">) {
  const [{ locale }, search, viewer] = await Promise.all([
    params,
    searchParams,
    getViewer(),
  ]);
  if (viewer.kind !== "account") notFound();
  return (
    <RequestsPage
      locale={locale as Locale}
      userId={viewer.userId}
      tab={parseTab(search.status)}
    />
  );
}
