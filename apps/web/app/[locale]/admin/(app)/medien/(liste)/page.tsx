import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { reviewerAccess } from "@/features/admin/access";
import { AreaRestricted } from "@/features/admin/components/area-restricted";
import { AdminPageHeader } from "@/features/admin/components/page-header";
import { MediaQueueSection } from "@/features/admin/media/media-queue-section";
import { adminMetadata } from "@/features/admin/metadata";
import { parseQueueSort } from "@/features/admin/queue/queue-sort";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return adminMetadata((await params).locale as Locale, "mediaQueue");
}

/** Warteschlange `/admin/medien` (PRD v2 12.4, 14.3): Medien in Prüfung, älteste zuerst. Nur mit Prüfrolle. */
export default async function MediaQueuePage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale;
  const { access, actor } = await reviewerAccess();
  const t = await getTranslations({ locale, namespace: "admin.media" });
  if (!access.allowed || !actor) return <AreaRestricted locale={locale} title={t("title")} />;
  return (
    <>
      <AdminPageHeader title={t("title")} intro={t("intro")} />
      <MediaQueueSection locale={locale} actorId={actor.userId} sort={parseQueueSort(await searchParams)} now={new Date()} />
    </>
  );
}
