import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequestPage } from "@/features/booking/studio/request/request-page";
import { requireOwnRequest } from "@/features/booking/studio/queries/own-request";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/studio/anfragen/[id]">): Promise<Metadata> {
  const t = await getTranslations({
    locale: (await params).locale as Locale,
    namespace: "bookingStudio.meta",
  });
  // Neutral: Der Browser-Tab nennt das Mitglied nicht (PRD 13, Diskretion).
  return { title: t("request") };
}

/** Terminanfrage `/studio/anfragen/[id]` (PRD v2 11.5): Detail, Antworten, Notiz, Verlauf. */
export default async function StudioRequestPage({
  params,
  searchParams,
}: PageProps<"/[locale]/studio/anfragen/[id]">) {
  const [{ locale, id }, search] = await Promise.all([params, searchParams]);
  const request = await requireOwnRequest(id, locale as Locale);
  return (
    <RequestPage
      locale={locale as Locale}
      request={request}
      reportOpen={search.melden === "1"}
    />
  );
}
