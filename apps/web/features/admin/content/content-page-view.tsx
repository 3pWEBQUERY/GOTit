import { listContentPages, type getContentPage } from "@app/core/content";
import type { Locale } from "@app/core/locale";
import { Button, UiLink } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { ActionButton } from "../areas/action-button";
import { Section } from "../areas/facts";
import { adminDates } from "../areas/format";
import { WideOnly } from "../areas/wide-only";
import { AdminPageHeader } from "../components/page-header";
import { deleteContentAction, setContentPublishedAction } from "./actions";
import { ContentEditor } from "./content-editor";

const PUBLIC_PATH = { HELP: "/hilfe/[slug]", LEGAL: null, PAGE: null } as const;
const LEGAL_PATHS: Record<string, "/recht/agb" | "/recht/datenschutz" | "/recht/impressum" | "/recht/richtlinien"> = {
  agb: "/recht/agb",
  datenschutz: "/recht/datenschutz",
  impressum: "/recht/impressum",
  richtlinien: "/recht/richtlinien",
};

type Page = NonNullable<Awaited<ReturnType<typeof getContentPage>>>;

/** Öffentliche Adresse einer Seite, wenn es eine gibt. */
function publicHref(locale: Locale, page: Pick<Page, "kind" | "slug" | "locale">): string | null {
  const href = createHref(page.locale as Locale);
  if (page.kind === "HELP" && PUBLIC_PATH.HELP) return href({ pathname: PUBLIC_PATH.HELP, params: { slug: page.slug } });
  const legal = page.kind === "LEGAL" ? LEGAL_PATHS[page.slug] : undefined;
  return legal ? href(legal) : null;
}

/** Bearbeiten `/admin/inhalte/[id]` mit Veröffentlichen, Zurückziehen, Löschen und Übersetzungen. */
export async function ContentPageView({ locale, actorId, page }: { locale: Locale; actorId: string; page: Page }) {
  const [t, tCommon, dates, siblings] = await Promise.all([
    getTranslations({ locale, namespace: "adminContent" }),
    getTranslations({ locale, namespace: "adminCommon" }),
    adminDates(locale),
    listContentPages(actorId, { kind: page.kind }),
  ]);
  const href = createHref(locale);
  const published = page.status === "PUBLISHED";
  const live = publicHref(locale, page);
  const translations = siblings.filter((entry) => entry.slug === page.slug && entry.id !== page.id);
  const missing = (["de", "fr", "it", "en"] as const).filter((code) => code !== page.locale && !translations.some((entry) => entry.locale === code));
  return (
    <>
      <AdminPageHeader
        title={page.title}
        crumbsLabel={tCommon("breadcrumbs")}
        crumbs={[{ label: tCommon("areas.overview"), href: href("/admin") }, { label: tCommon("areas.content"), href: href("/admin/inhalte") }, { label: page.title }]}
      />
      <p className="text-small text-ink-muted" data-content-status>
        {published ? t("page.publishedSince", { date: dates.dateTime(page.publishedAt ?? page.updatedAt) }) : t("page.draft")} · {t("page.updated", { date: dates.dateTime(page.updatedAt) })}
      </p>
      <WideOnly locale={locale}>
        <div className="flex flex-wrap items-start gap-3">
          <ActionButton
            action={setContentPublishedAction.bind(null, page.id, !published)}
            label={published ? t("page.unpublish") : t("page.publish")}
            successMessage={published ? t("page.unpublished") : t("page.published")}
            variant={published ? "secondary" : "primary"}
          />
          {live && published ? (
            <Button asChild variant="quiet">
              <UiLink href={live}>{t("page.openPublic")}</UiLink>
            </Button>
          ) : null}
          <ActionButton
            action={deleteContentAction.bind(null, locale, page.id)}
            label={t("page.delete")}
            successMessage={t("page.deleted")}
            variant="destructive"
            confirm={{ title: t("page.deleteTitle", { title: page.title }), description: published ? t("page.deleteLive") : t("page.deleteDraft"), confirmLabel: t("page.delete"), cancelLabel: tCommon("form.cancel") }}
          />
        </div>
        <ContentEditor
          locale={locale}
          id={page.id}
          published={published}
          initial={{ kind: page.kind, slug: page.slug, locale: page.locale, title: page.title, summary: page.summary ?? "", body: page.body, metaTitle: page.metaTitle ?? "", metaDescription: page.metaDescription ?? "" }}
        />
      </WideOnly>
      <Section id="uebersetzungen" title={t("page.translations")}>
        {translations.length ? (
          <ul className="flex flex-col gap-1">
            {translations.map((entry) => (
              <li key={entry.id} className="text-body">
                <UiLink href={href({ pathname: "/admin/inhalte/[id]", params: { id: entry.id } })} className="underline underline-offset-4">
                  {t(`editor.locales.${entry.locale as "de"}`)}: {entry.title}
                </UiLink>{" "}
                · {t(`status.${entry.status}`)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-ink-muted">{t("page.noTranslations")}</p>
        )}
        {missing.length ? (
          <div className="flex flex-wrap gap-2">
            {missing.map((code) => (
              <Button key={code} asChild variant="secondary">
                <UiLink href={href({ pathname: "/admin/inhalte/neu", query: { art: page.kind, slug: page.slug, sprache: code } })}>{t("page.addTranslation", { language: t(`editor.locales.${code}`) })}</UiLink>
              </Button>
            ))}
          </div>
        ) : null}
      </Section>
    </>
  );
}
