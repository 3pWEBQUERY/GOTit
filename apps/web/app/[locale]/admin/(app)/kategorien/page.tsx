import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { areaAccess } from "@/features/admin/areas/access";
import { param } from "@/features/admin/areas/format";
import { areaMetadata } from "@/features/admin/areas/metadata";
import { RestrictedArea } from "@/features/admin/areas/restricted";
import { AdminPageHeader } from "@/features/admin/components/page-header";
import { CategoriesSection } from "@/features/admin/categories/categories-section";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return areaMetadata((await params).locale as Locale, "categories");
}

/** Kategorien `/admin/kategorien` (v1 9.5, v2 7.8). Recht `categories.manage`. */
export default async function CategoriesPage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale;
  const access = await areaAccess("categories.manage");
  if (!access.allowed) return <RestrictedArea locale={locale} area="categories" />;
  const t = await getTranslations({ locale, namespace: "adminCatalog.categories" });
  return (
    <>
      <AdminPageHeader title={t("title")} intro={t("intro")} />
      <CategoriesSection locale={locale} actorId={access.actor.userId} editing={param(await searchParams, "bearbeiten")} />
    </>
  );
}
