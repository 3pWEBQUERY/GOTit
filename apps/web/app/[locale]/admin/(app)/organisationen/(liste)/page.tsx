import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { moderationAccess } from "@/features/admin/access";
import { AreaRestricted } from "@/features/admin/components/area-restricted";
import { AdminPageHeader } from "@/features/admin/components/page-header";
import { organizationAdminMetadata } from "@/features/organization/admin/metadata";
import { OrganizationQueueSection } from "@/features/organization/admin/queue-section";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return organizationAdminMetadata((await params).locale as Locale, "queue");
}

/** Warteschlange `/admin/organisationen` (v1 FR-VERIFY-003, v2 12.4): eingereichte Nachweise, älteste zuerst. Nur mit Moderationsrolle. */
export default async function OrganizationQueuePage({ params }: Props) {
  const locale = (await params).locale as Locale;
  const { access, actor } = await moderationAccess();
  const t = await getTranslations({ locale, namespace: "organization.admin" });
  if (!access.allowed || !actor) return <AreaRestricted locale={locale} title={t("title")} description={t("restricted")} />;
  return (
    <>
      <AdminPageHeader title={t("title")} intro={t("intro")} />
      <OrganizationQueueSection locale={locale} actorId={actor.userId} now={new Date()} />
    </>
  );
}
