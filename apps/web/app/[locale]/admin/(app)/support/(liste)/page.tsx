import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { areaAccess } from "@/features/admin/areas/access";
import { areaMetadata } from "@/features/admin/areas/metadata";
import { RestrictedArea } from "@/features/admin/areas/restricted";
import { AdminPageHeader } from "@/features/admin/components/page-header";
import { SupportQueueSection } from "@/features/admin/support/queue-section";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return areaMetadata((await params).locale as Locale, "support");
}

/** Support `/admin/support` (v2 7.8). Recht `support.handle`. */
export default async function SupportPage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale;
  const access = await areaAccess("support.handle");
  if (!access.allowed) return <RestrictedArea locale={locale} area="support" />;
  const t = await getTranslations({ locale, namespace: "adminSupport.queue" });
  return (
    <>
      <AdminPageHeader title={t("title")} intro={t("intro")} />
      <SupportQueueSection locale={locale} actorId={access.actor.userId} query={await searchParams} />
    </>
  );
}
