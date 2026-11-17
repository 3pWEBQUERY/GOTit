import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { areaAccess } from "@/features/admin/areas/access";
import { param } from "@/features/admin/areas/format";
import { areaMetadata } from "@/features/admin/areas/metadata";
import { RestrictedArea } from "@/features/admin/areas/restricted";
import { AdminPageHeader } from "@/features/admin/components/page-header";
import { SeoSection } from "@/features/admin/seo/seo-section";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return areaMetadata((await params).locale as Locale, "seo");
}

/** SEO `/admin/seo` (v2 7.8). Recht `content.manage`. */
export default async function SeoPage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale;
  const access = await areaAccess("content.manage");
  if (!access.allowed) return <RestrictedArea locale={locale} area="seo" />;
  const [t, query] = await Promise.all([getTranslations({ locale, namespace: "adminContent.seo" }), searchParams]);
  return (
    <>
      <AdminPageHeader title={t("title")} intro={t("intro")} />
      <SeoSection locale={locale} actorId={access.actor.userId} editPath={param(query, "pfad")} editLocale={param(query, "sprache")} />
    </>
  );
}
