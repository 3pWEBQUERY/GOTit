import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { CalendarPage } from "@/features/booking/studio/calendar/calendar-page";
import { parseCalendarParams } from "@/features/booking/studio/lib/calendar-params";
import { loadCalendar } from "@/features/booking/studio/queries/load-calendar";
import { getViewer } from "@/features/shell/queries/get-viewer";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/studio/kalender">): Promise<Metadata> {
  const t = await getTranslations({
    locale: (await params).locale as Locale,
    namespace: "bookingStudio.meta",
  });
  return { title: t("calendar") };
}

/** Kalender `/studio/kalender` (PRD v2 11.5); Ansicht, Datum und Panel stehen in der URL. */
export default async function StudioCalendarPage({
  params,
  searchParams,
}: PageProps<"/[locale]/studio/kalender">) {
  const [{ locale }, search, viewer] = await Promise.all([
    params,
    searchParams,
    getViewer(),
  ]);
  const data =
    viewer.kind === "account"
      ? await loadCalendar(
          viewer.userId,
          locale as Locale,
          parseCalendarParams(search),
        )
      : null;
  if (!data) notFound();
  return <CalendarPage locale={locale as Locale} data={data} />;
}
