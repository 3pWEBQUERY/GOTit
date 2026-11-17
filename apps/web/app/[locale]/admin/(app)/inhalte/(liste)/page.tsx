import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { areaAccess } from "@/features/admin/areas/access";
import { areaMetadata } from "@/features/admin/areas/metadata";
import { RestrictedArea } from "@/features/admin/areas/restricted";
import { AdminPageHeader } from "@/features/admin/components/page-header";
import { ContentList } from "@/features/admin/content/content-list";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return areaMetadata((await params).locale as Locale, "content");
}

/** Inhalte `/admin/inhalte` (v1 9.6, v2 7.8). Recht `content.manage`. */
export default async function ContentPagesPage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale;
  const access = await areaAccess("content.manage");
  if (!access.allowed) return <RestrictedArea locale={locale} area="content" />;
  const t = await getTranslations({ locale, namespace: "adminContent.list" });
  return (
    <>
      <AdminPageHeader title={t("title")} intro={t("intro")} />
      <ContentList locale={locale} actorId={access.actor.userId} query={await searchParams} />
    </>
  );
}
