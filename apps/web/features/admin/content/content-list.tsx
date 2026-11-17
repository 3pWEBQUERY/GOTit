import { listContentPages } from "@app/core/content";
import type { Locale } from "@app/core/locale";
import { Button, EmptyState, Select, UiLink } from "@app/ui";
import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { AdminTable } from "../areas/admin-table";
import { FilterBar } from "../areas/filter-bar";
import { adminDates, param } from "../areas/format";
import { Tag } from "../areas/tag";

const KINDS = ["HELP", "LEGAL", "PAGE"] as const;
const LOCALES = ["de", "fr", "it", "en"] as const;

/** Seiten des CMS `/admin/inhalte` nach Art und Sprache (v2 7.8). */
export async function ContentList({ locale, actorId, query }: { locale: Locale; actorId: string; query: Record<string, string | string[] | undefined> }) {
  const [t, tCommon, dates] = await Promise.all([getTranslations({ locale, namespace: "adminContent" }), getTranslations({ locale, namespace: "adminCommon" }), adminDates(locale)]);
  const href = createHref(locale);
  const kind = KINDS.find((value) => value === param(query, "art"));
  const pageLocale = LOCALES.find((value) => value === param(query, "sprache"));
  const pages = await listContentPages(actorId, { kind, locale: pageLocale });
  const base = href("/admin/inhalte");
  const active = Boolean(kind || pageLocale);
  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="primary" className="self-start">
        <UiLink href={href("/admin/inhalte/neu")}>{t("list.create")}</UiLink>
      </Button>
      <FilterBar action={base} label={t("list.filterLabel")} submitLabel={tCommon("filters.apply")} resetLabel={tCommon("filters.reset")} resetHref={base} active={active}>
        <Select name="art" label={t("editor.fields.kind")} placeholder={t("list.allKinds")} defaultValue={kind} options={KINDS.map((value) => ({ value, label: t(`editor.kinds.${value}`) }))} />
        <Select name="sprache" label={t("editor.fields.locale")} placeholder={t("list.allLocales")} defaultValue={pageLocale} options={LOCALES.map((value) => ({ value, label: t(`editor.locales.${value}`) }))} />
      </FilterBar>
      <p role="status" className="tabular text-small text-ink-muted">
        {t("list.count", { count: pages.length })}
      </p>
      <AdminTable
        testId="content"
        caption={t("list.caption")}
        columns={[
          { id: "title", header: t("editor.fields.title"), priority: 1 },
          { id: "kind", header: t("editor.fields.kind"), priority: 3 },
          { id: "locale", header: t("editor.fields.locale") },
          { id: "slug", header: t("editor.fields.slug") },
          { id: "status", header: t("list.status"), priority: 2 },
          { id: "updated", header: t("list.updated") },
        ]}
        rows={pages.map((page) => ({
          id: page.id,
          cells: {
            title: (
              <UiLink href={href({ pathname: "/admin/inhalte/[id]", params: { id: page.id } })} className="font-[550] break-words text-ink underline-offset-4 hover:underline" data-content-link={`${page.kind}/${page.slug}/${page.locale}`}>
                {page.title}
              </UiLink>
            ),
            kind: t(`editor.kinds.${page.kind}`),
            locale: page.locale.toUpperCase(),
            slug: <code className="text-small break-all">{page.slug}</code>,
            status: page.status === "PUBLISHED" ? <Tag tone="success">{t("status.PUBLISHED")}</Tag> : <Tag>{t("status.DRAFT")}</Tag>,
            updated: dates.dateTime(page.updatedAt),
          },
        }))}
        empty={<EmptyState icon={<FileText strokeWidth={1.5} />} title={active ? t("list.noMatchTitle") : t("list.emptyTitle")} description={active ? t("list.noMatchDescription") : t("list.emptyDescription")} />}
      />
    </div>
  );
}
