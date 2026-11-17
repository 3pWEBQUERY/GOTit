import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  AvailabilityPage,
  loadAvailability,
} from "@/features/booking/studio/availability/availability-page";
import { getViewer } from "@/features/shell/queries/get-viewer";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/studio/kalender/verfuegbarkeit">): Promise<Metadata> {
  const t = await getTranslations({
    locale: (await params).locale as Locale,
    namespace: "bookingStudio.meta",
  });
  return { title: t("availability") };
}

/** Verfügbarkeit `/studio/kalender/verfuegbarkeit` (PRD v2 7.3, v1 FR-BOOKING-001). */
export default async function StudioAvailabilityPage({
  params,
}: PageProps<"/[locale]/studio/kalender/verfuegbarkeit">) {
  const [{ locale }, viewer] = await Promise.all([params, getViewer()]);
  const data =
    viewer.kind === "account"
      ? await loadAvailability(viewer.userId, locale as Locale)
      : null;
  if (!data) notFound();
  return <AvailabilityPage locale={locale as Locale} data={data} />;
}
