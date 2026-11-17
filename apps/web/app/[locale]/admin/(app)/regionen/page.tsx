import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { areaAccess } from "@/features/admin/areas/access";
import { param } from "@/features/admin/areas/format";
import { areaMetadata } from "@/features/admin/areas/metadata";
import { RestrictedArea } from "@/features/admin/areas/restricted";
import { AdminPageHeader } from "@/features/admin/components/page-header";
import { RegionsSection } from "@/features/admin/regions/regions-section";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return areaMetadata((await params).locale as Locale, "regions");
}

/** Regionen `/admin/regionen` (v1 9.5, v2 7.8). Recht `regions.manage`. */
export default async function RegionsPage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale;
  const access = await areaAccess("regions.manage");
  if (!access.allowed) return <RestrictedArea locale={locale} area="regions" />;
  const t = await getTranslations({ locale, namespace: "adminCatalog.regions" });
  return (
    <>
      <AdminPageHeader title={t("title")} intro={t("intro")} />
      <RegionsSection locale={locale} actorId={access.actor.userId} selectedId={param(await searchParams, "region")} />
    </>
  );
}
