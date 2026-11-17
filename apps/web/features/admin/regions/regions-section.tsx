import { listRegionsForAdmin } from "@app/core/geo/admin";
import type { Locale } from "@app/core/locale";
import { Button, EmptyState, InlineAlert, UiLink } from "@app/ui";
import { MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { AdminForm } from "../areas/admin-form";
import { AdminTable } from "../areas/admin-table";
import { Facts, Section } from "../areas/facts";
import { adminDates } from "../areas/format";
import { Tag } from "../areas/tag";
import { WideOnly } from "../areas/wide-only";
import { markRegionCheckedAction, setRegionApprovedAction, updateRegionRulesAction } from "./actions";

type Root = Awaited<ReturnType<typeof listRegionsForAdmin>>[number];
type AdminRegion = Omit<Root, "children">;
const NAME_KEY = { de: "nameDe", fr: "nameFr", it: "nameIt", en: "nameEn" } as const;

/**
 * Regionen `/admin/regionen` (v1 9.5): Baum aus Kantonen und Städten mit
 * Freigabe und dokumentierter Prüfung. `?region=<id>` öffnet die Bearbeitung
 * über der Tabelle; die Auswahl steht damit in der URL.
 */
export async function RegionsSection({ locale, actorId, selectedId }: { locale: Locale; actorId: string; selectedId?: string }) {
  const [t, dates, roots] = await Promise.all([getTranslations({ locale, namespace: "adminCatalog.regions" }), adminDates(locale), listRegionsForAdmin(actorId)]);
  const href = createHref(locale);
  const base = href("/admin/regionen");
  const name = (region: AdminRegion) => region[NAME_KEY[locale]];
  const all = roots.flatMap((root) => [{ region: root as AdminRegion, parent: null as AdminRegion | null }, ...root.children.map((child) => ({ region: child as AdminRegion, parent: root as AdminRegion }))]);
  const selected = selectedId ? all.find((entry) => entry.region.id === selectedId) : undefined;
  const checked = (region: AdminRegion) =>
    region.legalCheckedAt ? t("checkedOn", { date: dates.date(region.legalCheckedAt), name: region.legalCheckedByUsername ?? t("unknownPerson") }) : t("notChecked");

  return (
    <div className="flex flex-col gap-6">
      {selectedId && !selected ? <InlineAlert tone="warning" title={t("unknownRegion")} /> : null}
      {selected ? <RegionEditor key={selected.region.id} locale={locale} region={selected.region} parent={selected.parent} childCount={roots.find((root) => root.id === selected.region.id)?.children.filter((child) => child.approved).length ?? 0} checkedLabel={checked(selected.region)} closeHref={base} /> : null}
      <p role="status" className="tabular text-small text-ink-muted">
        {t("count", { cantons: roots.length, approved: all.filter((entry) => entry.region.approved).length })}
      </p>
      <AdminTable
        testId="regions"
        caption={t("caption")}
        columns={[
          { id: "name", header: t("columns.name"), priority: 1 },
          { id: "approval", header: t("columns.approval"), priority: 2 },
          { id: "checked", header: t("columns.checked"), priority: 3 },
          { id: "rank", header: t("columns.rank"), align: "end" },
          { id: "profiles", header: t("columns.profiles"), align: "end" },
          { id: "edit", header: t("columns.edit") },
        ]}
        rows={all.map(({ region, parent }) => ({
          id: region.id,
          cells: {
            name: parent ? (
              <span className="flex items-center gap-2 pl-6">
                <span aria-hidden className="text-ink-muted">
                  └
                </span>
                <span>
                  {name(region)}
                  <span className="sr-only">, {t("cityOf", { canton: name(parent) })}</span>
                </span>
              </span>
            ) : (
              <span className="font-[550]">{name(region)}</span>
            ),
            approval: region.approved ? <Tag tone="success">{t("approved")}</Tag> : <Tag>{t("notApproved")}</Tag>,
            checked: checked(region),
            rank: region.featuredRank ?? "–",
            profiles: region.providerCount,
            edit: (
              <UiLink href={`${base}?region=${region.id}`} className="underline underline-offset-4" data-region-edit={region.slug} aria-current={region.id === selectedId ? "true" : undefined}>
                {t("edit")}
                <span className="sr-only">: {name(region)}</span>
              </UiLink>
            ),
          },
        }))}
        empty={<EmptyState icon={<MapPin strokeWidth={1.5} />} title={t("emptyTitle")} description={t("emptyDescription")} />}
      />
    </div>
  );
}

async function RegionEditor({ locale, region, parent, childCount, checkedLabel, closeHref }: { locale: Locale; region: AdminRegion; parent: AdminRegion | null; childCount: number; checkedLabel: string; closeHref: string }) {
  const t = await getTranslations({ locale, namespace: "adminCatalog.regions" });
  const tCommon = await getTranslations({ locale, namespace: "adminCommon" });
  const regionName = region[NAME_KEY[locale]];
  const blocked = !region.approved && (!region.legalCheckedAt ? t("needsCheck") : parent && !parent.approved ? t("needsCanton", { canton: parent[NAME_KEY[locale]] }) : null);
  return (
    <Section id="region-bearbeiten" title={t("editTitle", { name: regionName })}>
      <div data-region-editor={region.slug} className="flex flex-col gap-6">
        <Facts
          items={[
            { label: t("kind"), value: t(`kinds.${region.kind}`) },
            ...(parent ? [{ label: t("canton"), value: parent[NAME_KEY[locale]] }] : []),
            { label: t("columns.approval"), value: region.approved ? t("approved") : t("notApproved") },
            { label: t("columns.checked"), value: checkedLabel },
            { label: t("columns.profiles"), value: region.providerCount },
          ]}
        />
        <WideOnly locale={locale}>
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-card border border-border p-4">
              <h3 className="text-h3">{t("rulesTitle")}</h3>
              <p className="text-small text-ink-muted">{t("rulesIntro")}</p>
              <AdminForm
                id={`regel-${region.slug}`}
                action={updateRegionRulesAction.bind(null, region.id)}
                fields={[
                  { kind: "textarea", name: "legalNote", label: t("legalNote"), hint: t("legalNoteHint"), optional: true, maxLength: 2000, defaultValue: region.legalNote ?? "" },
                  { kind: "textarea", name: "requiredPermits", label: t("requiredPermits"), hint: t("requiredPermitsHint"), optional: true, maxLength: 2000, defaultValue: region.requiredPermits ?? "" },
                  { kind: "textarea", name: "contentRestrictions", label: t("contentRestrictions"), hint: t("contentRestrictionsHint"), optional: true, maxLength: 2000, defaultValue: region.contentRestrictions ?? "" },
                  { kind: "text", name: "featuredRank", label: t("rank"), hint: t("rankHint"), optional: true, inputMode: "numeric", defaultValue: region.featuredRank ? String(region.featuredRank) : "" },
                ]}
                submitLabel={t("saveRules")}
                successMessage={t("rulesSaved")}
              />
            </div>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3 rounded-card border border-border p-4">
                <h3 className="text-h3">{t("checkTitle")}</h3>
                <p className="text-small text-ink-muted">{t("checkIntro")}</p>
                <AdminForm
                  id={`pruefung-${region.slug}`}
                  action={markRegionCheckedAction.bind(null, region.id)}
                  fields={[{ kind: "textarea", name: "note", label: t("checkNote"), hint: t("checkNoteHint"), minLength: 10, maxLength: 1000, rows: 3 }]}
                  submitLabel={t("markChecked")}
                  submitVariant="secondary"
                  successMessage={t("checked")}
                  resetOnSuccess
                />
              </div>
              <div className="flex flex-col gap-3 rounded-card border border-border p-4">
                <h3 className="text-h3">{region.approved ? t("withdrawTitle") : t("approveTitle")}</h3>
                {blocked ? <InlineAlert tone="warning" title={blocked} /> : null}
                {region.approved && region.kind === "CANTON" ? <InlineAlert tone="warning" title={t("withdrawCities", { count: childCount })} /> : null}
                <AdminForm
                  id={`freigabe-${region.slug}`}
                  action={setRegionApprovedAction.bind(null, region.id, !region.approved)}
                  fields={[{ kind: "textarea", name: "reason", label: t("reason"), hint: t("reasonHint"), minLength: 10, maxLength: 500, rows: 3 }]}
                  submitLabel={region.approved ? t("withdraw") : t("approve")}
                  submitVariant={region.approved ? "destructive" : "primary"}
                  successMessage={region.approved ? t("withdrawn") : t("approvedSaved")}
                  {...(region.approved
                    ? { confirm: { title: t("withdrawConfirmTitle", { name: regionName }), description: region.kind === "CANTON" ? t("withdrawConfirmCanton", { count: childCount }) : t("withdrawConfirmCity"), confirmLabel: t("withdraw"), cancelLabel: tCommon("form.cancel") } }
                    : {})}
                  resetOnSuccess
                />
              </div>
            </div>
          </div>
        </WideOnly>
        <Button asChild variant="quiet" className="self-start">
          <UiLink href={closeHref}>{t("close")}</UiLink>
        </Button>
      </div>
    </Section>
  );
}
