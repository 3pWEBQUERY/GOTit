import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { areaAccess } from "@/features/admin/areas/access";
import { param } from "@/features/admin/areas/format";
import { areaMetadata } from "@/features/admin/areas/metadata";
import { RestrictedArea } from "@/features/admin/areas/restricted";
import { WideOnly } from "@/features/admin/areas/wide-only";
import { AdminPageHeader } from "@/features/admin/components/page-header";
import { ContentEditor } from "@/features/admin/content/content-editor";
import { createHref } from "@/features/shell/nav/href";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return areaMetadata((await params).locale as Locale, "contentNew");
}

/** Neue Seite `/admin/inhalte/neu`; `?art=&slug=&sprache=` füllt eine Übersetzung vor. */
export default async function NewContentPage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale;
  const access = await areaAccess("content.manage");
  if (!access.allowed) return <RestrictedArea locale={locale} area="content" />;
  const [t, tCommon, query] = await Promise.all([getTranslations({ locale, namespace: "adminContent" }), getTranslations({ locale, namespace: "adminCommon" }), searchParams]);
  const href = createHref(locale);
  const kind = ["HELP", "LEGAL", "PAGE"].find((value) => value === param(query, "art")) ?? "HELP";
  const pageLocale = ["de", "fr", "it", "en"].find((value) => value === param(query, "sprache")) ?? "de";
  const slug = /^[a-z0-9-]{1,80}$/.test(param(query, "slug") ?? "") ? (param(query, "slug") as string) : "";
  return (
    <>
      <AdminPageHeader
        title={t("page.newTitle")}
        intro={t("page.newIntro")}
        crumbsLabel={tCommon("breadcrumbs")}
        crumbs={[{ label: tCommon("areas.overview"), href: href("/admin") }, { label: tCommon("areas.content"), href: href("/admin/inhalte") }, { label: t("page.newTitle") }]}
      />
      <WideOnly locale={locale}>
        <ContentEditor locale={locale} id={null} published={false} initial={{ kind, slug, locale: pageLocale, title: "", summary: "", body: "", metaTitle: "", metaDescription: "" }} />
      </WideOnly>
    </>
  );
}
