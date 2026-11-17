import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { areaAccess } from "@/features/admin/areas/access";
import { areaMetadata } from "@/features/admin/areas/metadata";
import { RestrictedArea } from "@/features/admin/areas/restricted";
import { AdminPageHeader } from "@/features/admin/components/page-header";
import { AuditSection } from "@/features/admin/system/audit-section";
import { SystemTabs } from "@/features/admin/system/system-tabs";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return areaMetadata((await params).locale as Locale, "audit");
}

/** Audit-Log `/admin/system/audit` (v1 9.7, v2 7.8). Recht `audit.view`. */
export default async function SystemAuditPage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale;
  const access = await areaAccess("audit.view");
  if (!access.allowed) return <RestrictedArea locale={locale} area="audit" />;
  const [t, query] = await Promise.all([getTranslations({ locale, namespace: "adminSystem.audit" }), searchParams]);
  return (
    <>
      <AdminPageHeader title={t("title")} intro={t("intro")} />
      <SystemTabs locale={locale} actor={access.actor} current="audit" />
      <AuditSection locale={locale} actorId={access.actor.userId} query={query} />
    </>
  );
}
