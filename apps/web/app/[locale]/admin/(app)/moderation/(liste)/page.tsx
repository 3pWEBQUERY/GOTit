import { hasPermission } from "@app/core/admin";
import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { moderationAccess } from "@/features/admin/access";
import { AreaRestricted } from "@/features/admin/components/area-restricted";
import { AdminPageHeader } from "@/features/admin/components/page-header";
import { adminMetadata } from "@/features/admin/metadata";
import { ModerationQueueSection } from "@/features/admin/moderation/moderation-queue-section";
import { ModerationTabs } from "@/features/admin/moderation/moderation-tabs";
import { parseQueueParams } from "@/features/admin/moderation/queue-filter";
import { RestrictionAppealsSection } from "@/features/admin/moderation/restriction-appeals-section";
import { parseQueueSort } from "@/features/admin/queue/queue-sort";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return adminMetadata((await params).locale as Locale, "reportQueue");
}

/**
 * Moderation `/admin/moderation` (v2 7.8, 12.4): Warteschlange der Fälle und,
 * als zweite Ansicht `?ansicht=sperren`, Einsprüche gegen Einschränkungen.
 * Nur mit Moderationsrolle.
 */
export default async function ModerationQueuePage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale;
  const { access, actor } = await moderationAccess();
  const t = await getTranslations({ locale, namespace: "moderation" });
  if (!access.allowed || !actor) return <AreaRestricted locale={locale} title={t("title")} description={t("restricted")} />;
  const raw = await searchParams;
  const queue = parseQueueParams(raw);
  return (
    <>
      <AdminPageHeader title={t("title")} intro={t("intro")} />
      {hasPermission(actor, "users.restrict") ? <ModerationTabs locale={locale} current={queue.ansicht} /> : null}
      {queue.ansicht === "sperren" ? (
        <RestrictionAppealsSection locale={locale} actor={actor} />
      ) : (
        <ModerationQueueSection locale={locale} actorId={actor.userId} params={queue} sort={{ ...parseQueueSort(raw), column: "alter" }} now={new Date()} />
      )}
    </>
  );
}
