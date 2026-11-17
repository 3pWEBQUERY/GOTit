import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { moderationAccess } from "@/features/admin/access";
import { AreaRestricted } from "@/features/admin/components/area-restricted";
import { AdminPageHeader } from "@/features/admin/components/page-header";
import { adminMetadata } from "@/features/admin/metadata";
import { parseQueueSort } from "@/features/admin/queue/queue-sort";
import { ReviewQueueSection } from "@/features/reviews/components/admin/review-queue-section";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return adminMetadata((await params).locale as Locale, "reviewQueue");
}

/** Warteschlange `/admin/bewertungen` (v2 12.4, Entscheid 0017): neue Bewertungen und Einsprüche, älteste zuerst. Nur mit Moderationsrolle. */
export default async function ReviewQueuePage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale;
  const { access, actor } = await moderationAccess();
  const t = await getTranslations({ locale, namespace: "reviews.admin" });
  if (!access.allowed || !actor)
    return (
      <AreaRestricted
        locale={locale}
        title={t("title")}
        description={t("restricted")}
      />
    );
  return (
    <>
      <AdminPageHeader title={t("title")} intro={t("intro")} />
      <ReviewQueueSection
        locale={locale}
        actorId={actor.userId}
        sort={parseQueueSort(await searchParams)}
        now={new Date()}
      />
    </>
  );
}
