import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { reviewerAccess } from "@/features/admin/access";
import { AreaRestricted } from "@/features/admin/components/area-restricted";
import { AdminPageHeader } from "@/features/admin/components/page-header";
import { adminMetadata } from "@/features/admin/metadata";
import { QueueSection } from "@/features/admin/queue/queue-section";
import { parseQueueSort } from "@/features/admin/queue/queue-sort";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return adminMetadata((await params).locale as Locale, "queue");
}

/** Prüfwarteschlange `/admin/verifizierungen` (PRD 7.8, 12.4). Nur mit Prüfrolle. */
export default async function VerificationQueuePage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale;
  const { access } = await reviewerAccess();
  if (!access.allowed) return <AreaRestricted locale={locale} />;
  const [t, query] = await Promise.all([getTranslations({ locale, namespace: "admin.queue" }), searchParams]);
  return (
    <>
      <AdminPageHeader title={t("title")} intro={t("intro")} />
      <QueueSection locale={locale} sort={parseQueueSort(query)} now={new Date()} />
    </>
  );
}
