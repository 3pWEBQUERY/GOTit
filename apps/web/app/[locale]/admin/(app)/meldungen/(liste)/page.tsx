import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { moderationAccess } from "@/features/admin/access";
import { AreaRestricted } from "@/features/admin/components/area-restricted";
import { AdminPageHeader } from "@/features/admin/components/page-header";
import { adminMetadata } from "@/features/admin/metadata";
import { parseQueueSort } from "@/features/admin/queue/queue-sort";
import { ReportQueueSection } from "@/features/admin/reports/report-queue-section";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return adminMetadata((await params).locale as Locale, "reportQueue");
}

/** Warteschlange `/admin/meldungen` (v1 20.4, v2 12.4): offene Meldungen, dringende zuerst. Nur mit Moderationsrolle. */
export default async function ReportQueuePage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale;
  const { access, actor } = await moderationAccess();
  const t = await getTranslations({ locale, namespace: "admin.reports" });
  if (!access.allowed || !actor) return <AreaRestricted locale={locale} title={t("title")} description={t("restricted")} />;
  return (
    <>
      <AdminPageHeader title={t("title")} intro={t("intro")} />
      <ReportQueueSection locale={locale} actorId={actor.userId} sort={parseQueueSort(await searchParams)} now={new Date()} />
    </>
  );
}
