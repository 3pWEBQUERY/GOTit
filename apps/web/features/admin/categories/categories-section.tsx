import { listCategoriesForAdmin } from "@app/core/catalog/admin";
import type { Locale } from "@app/core/locale";
import { Button, EmptyState, InlineAlert, UiLink } from "@app/ui";
import { Tags } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { AdminForm } from "../areas/admin-form";
import { AdminTable } from "../areas/admin-table";
import { Section } from "../areas/facts";
import { Tag } from "../areas/tag";
import { WideOnly } from "../areas/wide-only";
import { setCategoryApprovedAction, upsertCategoryAction } from "./actions";

type Category = Awaited<ReturnType<typeof listCategoriesForAdmin>>[number];
const NAME_KEY = { de: "nameDe", fr: "nameFr", it: "nameIt", en: "nameEn" } as const;

/** Kategorien `/admin/kategorien` (v1 9.5): Tabelle; `?bearbeiten=<id>` oder `?bearbeiten=neu` öffnet das Formular. */
export async function CategoriesSection({ locale, actorId, editing }: { locale: Locale; actorId: string; editing?: string }) {
  const [t, categories] = await Promise.all([getTranslations({ locale, namespace: "adminCatalog.categories" }), listCategoriesForAdmin(actorId)]);
  const href = createHref(locale);
  const base = href("/admin/kategorien");
  const selected = editing && editing !== "neu" ? categories.find((category) => category.id === editing) : undefined;
  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="primary" className="self-start">
        <UiLink href={`${base}?bearbeiten=neu`}>{t("create")}</UiLink>
      </Button>
      {editing && editing !== "neu" && !selected ? <InlineAlert tone="warning" title={t("unknown")} /> : null}
      {editing === "neu" || selected ? <CategoryEditor key={selected?.id ?? "neu"} locale={locale} category={selected ?? null} closeHref={base} nextOrder={(categories.at(-1)?.sortOrder ?? 0) + 10} /> : null}
      <AdminTable
        testId="categories"
        caption={t("caption")}
        columns={[
          { id: "name", header: t("columns.name"), priority: 1 },
          { id: "slug", header: t("columns.slug"), priority: 3 },
          { id: "order", header: t("columns.order"), align: "end" },
          { id: "approval", header: t("columns.approval"), priority: 2 },
          { id: "profiles", header: t("columns.profiles"), align: "end" },
          { id: "edit", header: t("columns.edit") },
        ]}
        rows={categories.map((category) => ({
          id: category.id,
          cells: {
            name: <span className="font-[550]">{category[NAME_KEY[locale]]}</span>,
            slug: <code className="text-small">{category.slug}</code>,
            order: category.sortOrder,
            approval: category.approved ? <Tag tone="success">{t("approved")}</Tag> : <Tag>{t("notApproved")}</Tag>,
            profiles: category.providerCount,
            edit: (
              <UiLink href={`${base}?bearbeiten=${category.id}`} className="underline underline-offset-4" data-category-edit={category.slug}>
                {t("edit")}
                <span className="sr-only">: {category[NAME_KEY[locale]]}</span>
              </UiLink>
            ),
          },
        }))}
        empty={<EmptyState icon={<Tags strokeWidth={1.5} />} title={t("emptyTitle")} description={t("emptyDescription")} />}
      />
    </div>
  );
}

async function CategoryEditor({ locale, category, closeHref, nextOrder }: { locale: Locale; category: Category | null; closeHref: string; nextOrder: number }) {
  const [t, tCommon] = await Promise.all([getTranslations({ locale, namespace: "adminCatalog.categories" }), getTranslations({ locale, namespace: "adminCommon" })]);
  return (
    <Section id="kategorie-bearbeiten" title={category ? t("editTitle", { name: category[NAME_KEY[locale]] }) : t("createTitle")}>
      <WideOnly locale={locale}>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-card border border-border p-4">
            {!category ? <p className="text-small text-ink-muted">{t("createIntro")}</p> : null}
            <AdminForm
              id="kategorie"
              action={upsertCategoryAction.bind(null, locale, category?.id ?? null)}
              fields={[
                { kind: "text", name: "slug", label: t("slug"), hint: t("slugHint"), maxLength: 40, defaultValue: category?.slug ?? "" },
                { kind: "text", name: "nameDe", label: t("nameDe"), maxLength: 60, defaultValue: category?.nameDe ?? "" },
                { kind: "text", name: "nameFr", label: t("nameFr"), maxLength: 60, defaultValue: category?.nameFr ?? "" },
                { kind: "text", name: "nameIt", label: t("nameIt"), maxLength: 60, defaultValue: category?.nameIt ?? "" },
                { kind: "text", name: "nameEn", label: t("nameEn"), maxLength: 60, defaultValue: category?.nameEn ?? "" },
                { kind: "text", name: "sortOrder", label: t("order"), hint: t("orderHint"), inputMode: "numeric", defaultValue: String(category?.sortOrder ?? nextOrder) },
              ]}
              submitLabel={category ? t("save") : t("createSubmit")}
              successMessage={category ? t("saved") : t("created")}
            />
          </div>
          {category ? (
            <div className="flex flex-col gap-3 rounded-card border border-border p-4">
              <h3 className="text-h3">{category.approved ? t("withdrawTitle") : t("approveTitle")}</h3>
              <p className="text-small text-ink-muted">{category.approved ? t("withdrawIntro", { count: category.providerCount }) : t("approveIntro")}</p>
              <AdminForm
                id="kategorie-freigabe"
                action={setCategoryApprovedAction.bind(null, category.id, !category.approved)}
                fields={[{ kind: "textarea", name: "reason", label: t("reason"), hint: t("reasonHint"), minLength: 10, maxLength: 500, rows: 3 }]}
                submitLabel={category.approved ? t("withdraw") : t("approve")}
                submitVariant={category.approved ? "destructive" : "primary"}
                successMessage={category.approved ? t("withdrawn") : t("approvedSaved")}
                {...(category.approved ? { confirm: { title: t("withdrawConfirmTitle", { name: category[NAME_KEY[locale]] }), description: t("withdrawIntro", { count: category.providerCount }), confirmLabel: t("withdraw"), cancelLabel: tCommon("form.cancel") } } : {})}
                resetOnSuccess
              />
            </div>
          ) : null}
        </div>
      </WideOnly>
      <Button asChild variant="quiet" className="self-start">
        <UiLink href={closeHref}>{t("close")}</UiLink>
      </Button>
    </Section>
  );
}
