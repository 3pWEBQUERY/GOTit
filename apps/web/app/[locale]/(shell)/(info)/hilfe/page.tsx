import { listPublishedHelp } from "@app/core/content";
import type { Locale } from "@app/core/locale";
import { Button, EmptyState, UiLink } from "@app/ui";
import { LifeBuoy } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { withSeoOverride } from "@/features/content/seo";
import { TopBarTitle } from "@/features/shell/components/top-bar-title";
import { createHref } from "@/features/shell/nav/href";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "info.help" });
  return withSeoOverride({ title: t("metaTitle"), description: t("intro") }, createHref(locale)("/hilfe"), locale);
}

/** Hilfe `/hilfe` (v2 7.3): veröffentlichte Artikel, fehlende Übersetzungen auf Deutsch. */
export default async function HelpPage({ params }: Props) {
  const locale = (await params).locale as Locale;
  const [t, articles] = await Promise.all([getTranslations({ locale, namespace: "info.help" }), listPublishedHelp(locale)]);
  const href = createHref(locale);
  return (
    <div className="flex max-w-reading min-w-0 flex-col gap-8">
      <TopBarTitle title={t("title")} />
      <header className="flex flex-col gap-3">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="max-w-prose text-body">{t("intro")}</p>
      </header>
      {articles.length ? (
        <ul className="flex flex-col" data-help-list>
          {articles.map((article) => (
            <li key={article.slug} className="border-t border-border py-4" lang={article.locale !== locale ? article.locale : undefined}>
              <UiLink href={href({ pathname: "/hilfe/[slug]", params: { slug: article.slug } })} className="text-h3 text-ink underline-offset-4 hover:underline">
                {article.title}
              </UiLink>
              {article.summary ? <p className="pt-1 text-small text-ink-muted">{article.summary}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<LifeBuoy strokeWidth={1.5} />} title={t("emptyTitle")} description={t("emptyDescription")} />
      )}
      <section aria-labelledby="hilfe-kontakt" className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 id="hilfe-kontakt" className="text-h2">
          {t("contactTitle")}
        </h2>
        <p className="max-w-prose text-body">{t("contactText")}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="primary">
            <UiLink href={href("/kontakt")}>{t("contact")}</UiLink>
          </Button>
          <Button asChild variant="secondary">
            <UiLink href={href("/melden")}>{t("report")}</UiLink>
          </Button>
        </div>
      </section>
    </div>
  );
}
