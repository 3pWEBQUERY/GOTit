import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  MemberRequestsPage,
  TAB_PARAM,
  parseTab,
} from "@/features/booking/components/list/member-requests-page";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/termine">): Promise<Metadata> {
  const t = await getTranslations({
    locale: (await params).locale as Locale,
    namespace: "booking.list",
  });
  return { title: t("metaTitle") };
}

/** Eigene Terminanfragen mit Tabs Offen, Bestätigt, Vergangen (PRD v2 12.1). */
export default async function AppointmentsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/termine">) {
  const [{ locale }, search] = await Promise.all([params, searchParams]);
  return (
    <MemberRequestsPage
      locale={locale as Locale}
      tab={parseTab(search[TAB_PARAM])}
    />
  );
}
