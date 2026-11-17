import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { areaAccess } from "@/features/admin/areas/access";
import { areaMetadata } from "@/features/admin/areas/metadata";
import { RestrictedArea } from "@/features/admin/areas/restricted";
import { AdminPageHeader } from "@/features/admin/components/page-header";
import { FlagsSection } from "@/features/admin/system/flags-section";
import { SystemTabs } from "@/features/admin/system/system-tabs";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return areaMetadata((await params).locale as Locale, "flags");
}

/** Feature Flags `/admin/system/flags` (v2 7.8). Recht `flags.manage`. */
export default async function SystemFlagsPage({ params }: Props) {
  const locale = (await params).locale as Locale;
  const access = await areaAccess("flags.manage");
  if (!access.allowed) return <RestrictedArea locale={locale} area="flags" />;
  const t = await getTranslations({ locale, namespace: "adminSystem.flags" });
  return (
    <>
      <AdminPageHeader title={t("title")} intro={t("intro")} />
      <SystemTabs locale={locale} actor={access.actor} current="flags" />
      <FlagsSection locale={locale} actorId={access.actor.userId} />
    </>
  );
}
