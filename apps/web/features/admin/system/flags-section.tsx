import { listFeatureFlags } from "@app/core/admin/system";
import type { Locale } from "@app/core/locale";
import { getDb } from "@app/db";
import { getTranslations } from "next-intl/server";
import { AdminForm } from "../areas/admin-form";
import { Section } from "../areas/facts";
import { adminDates } from "../areas/format";
import { Tag } from "../areas/tag";
import { WideOnly } from "../areas/wide-only";
import { setFlagAction } from "./actions";

const NAME_KEY = { de: "nameDe", fr: "nameFr", it: "nameIt", en: "nameEn" } as const;

/** Feature Flags (v2 7.8, 12.3): an oder aus, pro Region abschaltbar, mit Begründung im Audit-Log. */
export async function FlagsSection({ locale, actorId }: { locale: Locale; actorId: string }) {
  const [t, dates, flags, regions] = await Promise.all([
    getTranslations({ locale, namespace: "adminSystem.flags" }),
    adminDates(locale),
    listFeatureFlags(actorId),
    getDb().region.findMany({ orderBy: [{ kind: "asc" }, { nameDe: "asc" }], select: { slug: true, kind: true, nameDe: true, nameFr: true, nameIt: true, nameEn: true } }),
  ]);
  const options = regions.map((region) => ({ value: region.slug, label: t(region.kind === "CANTON" ? "canton" : "city", { name: region[NAME_KEY[locale]] }) }));
  return (
    <div className="flex flex-col gap-6">
      {flags.map((entry) => (
        <Section key={entry.key} id={`flag-${entry.key}`} title={t(`keys.${entry.key}.name`)} intro={t(`keys.${entry.key}.gates`)}>
          <p className="flex flex-wrap items-center gap-2 text-small text-ink-muted" data-flag-state={entry.key}>
            {entry.enabled ? <Tag tone="success">{t("on")}</Tag> : <Tag>{t("off")}</Tag>}
            <span>{entry.disabledRegions.length ? t("disabledIn", { count: entry.disabledRegions.length }) : t("allRegions")}</span>
            <span>· {entry.updatedAt ? t("updated", { date: dates.dateTime(entry.updatedAt) }) : t("neverSet")}</span>
          </p>
          <WideOnly locale={locale}>
            <AdminForm
              key={`${entry.key}-${entry.updatedAt?.getTime() ?? 0}`}
              id={`flag-form-${entry.key}`}
              action={setFlagAction.bind(null, entry.key)}
              fields={[
                { kind: "checkbox", name: "enabled", label: t("enabled"), description: t("enabledHint"), defaultChecked: entry.enabled },
                { kind: "checkboxes", name: "disabledRegions", label: t("disabledRegions"), hint: t("disabledRegionsHint"), optional: true, options, defaultValues: entry.disabledRegions },
                { kind: "textarea", name: "reason", label: t("reason"), hint: t("reasonHint"), minLength: 10, maxLength: 500, rows: 2 },
              ]}
              submitLabel={t("save")}
              successMessage={t("saved")}
            />
          </WideOnly>
        </Section>
      ))}
    </div>
  );
}
