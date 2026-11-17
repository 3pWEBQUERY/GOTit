import type { PublishedPage } from "@app/core/content";
import type { Locale } from "@app/core/locale";
import { Breadcrumbs, InlineAlert, type Crumb } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { swissDate } from "../admin/areas/format";
import { TopBarTitle } from "../shell/components/top-bar-title";
import { MarkdownView } from "./markdown-view";

/**
 * Eine veröffentlichte Seite aus dem CMS: Titel, Kurztext, «Stand», Text.
 * Fehlt die Übersetzung, steht die deutsche Fassung mit `lang="de"` und
 * einem Hinweis da.
 */
export async function ContentArticle({ locale, published, crumbs }: { locale: Locale; published: PublishedPage; crumbs?: readonly Crumb[] }) {
  const t = await getTranslations({ locale, namespace: "info.page" });
  const { page, fallback } = published;
  return (
    <article className="flex max-w-reading min-w-0 flex-col gap-6" lang={fallback ? published.locale : undefined} data-content-article={page.slug}>
      <TopBarTitle title={page.title} />
      {crumbs ? <Breadcrumbs label={t("breadcrumbs")} items={crumbs} /> : null}
      <header className="flex flex-col gap-3">
        <h1 className="text-h1 break-words">{page.title}</h1>
        {page.summary ? <p className="max-w-prose text-body text-ink-muted">{page.summary}</p> : null}
        <p className="text-small text-ink-muted" lang={locale}>
          {t("updated", { date: swissDate(locale, page.updatedAt) })}
        </p>
      </header>
      {fallback ? (
        <div lang={locale}>
          <InlineAlert tone="info" title={t("fallbackTitle")}>
            {t("fallbackText")}
          </InlineAlert>
        </div>
      ) : null}
      <MarkdownView source={page.body} />
    </article>
  );
}
