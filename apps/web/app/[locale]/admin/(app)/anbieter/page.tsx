import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProviderListSection } from "@/features/admin/providers/list-section";
import { areaAccess } from "@/features/admin/areas/access";
import { areaMetadata } from "@/features/admin/areas/metadata";
import { RestrictedArea } from "@/features/admin/areas/restricted";
import { AdminPageHeader } from "@/features/admin/components/page-header";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return areaMetadata((await params).locale as Locale, "providers");
}

/** Anbieter `/admin/anbieter` (v2 7.8). Recht `providers.view`. */
export default async function ProvidersPage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale;
  const access = await areaAccess("providers.view");
  if (!access.allowed) return <RestrictedArea locale={locale} area="providers" />;
  const t = await getTranslations({ locale, namespace: "adminUsers.providers" });
  return (
    <>
      <AdminPageHeader title={t("title")} intro={t("intro")} />
      <ProviderListSection locale={locale} actorId={access.actor.userId} query={await searchParams} />
    </>
  );
}
