import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { areaAccess } from "@/features/admin/areas/access";
import { areaMetadata } from "@/features/admin/areas/metadata";
import { RestrictedArea } from "@/features/admin/areas/restricted";
import { AdminPageHeader } from "@/features/admin/components/page-header";
import { StatusSection } from "@/features/admin/system/status-section";
import { SystemTabs } from "@/features/admin/system/system-tabs";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return areaMetadata((await params).locale as Locale, "status");
}

/** Dienststatus `/admin/system/status` (v2 7.8). Recht `system.status`. */
export default async function SystemStatusPage({ params }: Props) {
  const locale = (await params).locale as Locale;
  const access = await areaAccess("system.status");
  if (!access.allowed) return <RestrictedArea locale={locale} area="status" />;
  const t = await getTranslations({ locale, namespace: "adminSystem.status" });
  return (
    <>
      <AdminPageHeader title={t("title")} intro={t("intro")} />
      <SystemTabs locale={locale} actor={access.actor} current="status" />
      <StatusSection locale={locale} actorId={access.actor.userId} />
    </>
  );
}
