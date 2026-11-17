import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequestDetailPage } from "@/features/booking/components/detail/request-detail-page";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/termine/[id]">): Promise<Metadata> {
  const t = await getTranslations({
    locale: (await params).locale as Locale,
    namespace: "booking.detail",
  });
  // Neutral: Der Browser-Tab nennt die Gegenseite nicht (PRD 13, Diskretion).
  return { title: t("metaTitle") };
}

/** Eine eigene Terminanfrage mit Aktionen und Verlauf (PRD v2 12.1, 11.5). */
export default async function AppointmentPage({
  params,
}: PageProps<"/[locale]/termine/[id]">) {
  const { locale, id } = await params;
  return <RequestDetailPage locale={locale as Locale} requestId={id} />;
}
