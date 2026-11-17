import { listSeoOverrides } from "@app/core/content";
import type { Locale } from "@app/core/locale";
import { Button, EmptyState, UiLink } from "@app/ui";
import { Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { ActionButton } from "../areas/action-button";
import { AdminForm } from "../areas/admin-form";
import { AdminTable } from "../areas/admin-table";
import { Section } from "../areas/facts";
import { adminDates } from "../areas/format";
import { WideOnly } from "../areas/wide-only";
import { deleteSeoAction, saveSeoAction } from "./actions";

/**
 * Metadaten `/admin/seo` (v2 7.8): Titel, Beschreibung und `noindex` pro Pfad
 * und Sprache. `?pfad=&sprache=` lädt einen Eintrag ins Formular.
 */
export async function SeoSection({ locale, actorId, editPath, editLocale }: { locale: Locale; actorId: string; editPath?: string; editLocale?: string }) {
  const [t, tCommon, dates, overrides] = await Promise.all([getTranslations({ locale, namespace: "adminContent.seo" }), getTranslations({ locale, namespace: "adminCommon" }), adminDates(locale), listSeoOverrides(actorId)]);
  const href = createHref(locale);
  const base = href("/admin/seo");
  const editing = editPath ? overrides.find((entry) => entry.path === editPath && entry.locale === editLocale) : undefined;
  const localeOptions = (["de", "fr", "it", "en"] as const).map((code) => ({ value: code, label: code.toUpperCase() }));
  return (
    <div className="flex flex-col gap-6">
      <Section id="seo-formular" title={editing ? t("editTitle", { path: editing.path }) : t("createTitle")} intro={t("formIntro")}>
        <WideOnly locale={locale}>
          <AdminForm
            key={editing ? `${editing.locale}${editing.path}` : "neu"}
            id="seo"
            action={saveSeoAction.bind(null, locale)}
            fields={[
              { kind: "text", name: "path", label: t("path"), hint: t("pathHint"), maxLength: 200, defaultValue: editing?.path ?? "" },
              { kind: "select", name: "locale", label: t("locale"), options: localeOptions, defaultValue: editing?.locale ?? "de" },
              { kind: "text", name: "title", label: t("metaTitle"), hint: t("metaTitleHint"), optional: true, maxLength: 70, defaultValue: editing?.title ?? "" },
              { kind: "textarea", name: "description", label: t("metaDescription"), optional: true, maxLength: 160, rows: 2, defaultValue: editing?.description ?? "" },
              { kind: "checkbox", name: "noindex", label: t("noindex"), description: t("noindexHint"), defaultChecked: editing?.noindex ?? false },
            ]}
            submitLabel={t("save")}
            successMessage={t("saved")}
            resetOnSuccess={!editing}
          />
          {editing ? (
            <Button asChild variant="quiet" className="self-start">
              <UiLink href={base}>{t("cancelEdit")}</UiLink>
            </Button>
          ) : null}
        </WideOnly>
      </Section>
      <AdminTable
        testId="seo"
        caption={t("caption")}
        columns={[
          { id: "path", header: t("path"), priority: 1 },
          { id: "locale", header: t("locale") },
          { id: "title", header: t("metaTitle"), priority: 2 },
          { id: "noindex", header: t("noindexColumn"), priority: 3 },
          { id: "updated", header: t("updated") },
          { id: "actions", header: t("actions") },
        ]}
        rows={overrides.map((entry) => ({
          id: `${entry.locale}${entry.path}`,
          cells: {
            path: <code className="text-small break-all">{entry.path}</code>,
            locale: entry.locale.toUpperCase(),
            title: entry.title ?? "–",
            noindex: entry.noindex ? t("noindexYes") : t("noindexNo"),
            updated: dates.dateTime(entry.updatedAt),
            actions: (
              <div className="flex flex-wrap items-center gap-2">
                <UiLink href={`${base}?${new URLSearchParams({ pfad: entry.path, sprache: entry.locale }).toString()}`} className="underline underline-offset-4">
                  {t("edit")}
                  <span className="sr-only">: {entry.path}</span>
                </UiLink>
                <span className="hidden lg:inline-flex">
                <ActionButton
                  action={deleteSeoAction.bind(null, entry.path, entry.locale)}
                  label={t("delete")}
                  successMessage={t("deleted")}
                  variant="quiet"
                  confirm={{ title: t("deleteTitle", { path: entry.path }), description: t("deleteText"), confirmLabel: t("delete"), cancelLabel: tCommon("form.cancel") }}
                />
                </span>
              </div>
            ),
          },
        }))}
        empty={<EmptyState icon={<Search strokeWidth={1.5} />} title={t("emptyTitle")} description={t("emptyDescription")} />}
      />
    </div>
  );
}
