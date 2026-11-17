import { getPublishedPage } from "@app/core/content";
import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ContentArticle } from "@/features/content/content-article";
import { contentMetadata } from "@/features/content/page-metadata";
import { createHref } from "@/features/shell/nav/href";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  return contentMetadata(await getPublishedPage("HELP", slug, locale), createHref(locale)({ pathname: "/hilfe/[slug]", params: { slug } }), locale);
}

/** Hilfeartikel `/hilfe/[slug]`; unbekannte oder unveröffentlichte Artikel ergeben eine 404. */
export default async function HelpArticlePage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  const published = await getPublishedPage("HELP", slug, locale);
  if (!published) notFound();
  const t = await getTranslations({ locale, namespace: "info.help" });
  const href = createHref(locale);
  return <ContentArticle locale={locale} published={published} crumbs={[{ label: t("title"), href: href("/hilfe") }, { label: published.page.title }]} />;
}
