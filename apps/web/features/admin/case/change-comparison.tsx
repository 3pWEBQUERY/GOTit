import { pickLocalizedName, type Locale } from "@app/core/locale";
import { parsePendingChanges, type CriticalField } from "@app/core/provider-profile";
import { getDb } from "@app/db";
import { getTranslations } from "next-intl/server";
import type { ReviewCase } from "../queries/get-case";

interface Row {
  field: CriticalField;
  before: string;
  after: string;
}

async function regionNames(ids: readonly string[], locale: Locale): Promise<string> {
  const rows = await getDb().region.findMany({ where: { id: { in: [...ids] } }, select: { nameDe: true, nameFr: true, nameIt: true, nameEn: true } });
  return rows
    .map((row) => pickLocalizedName(row, locale))
    .sort((a, b) => a.localeCompare(b, locale))
    .join(", ");
}

/**
 * Offener Prüffall «Änderung» (PRD v2 11.2): der Online-Stand und die
 * beantragten Werte nebeneinander, nur für die geänderten Felder.
 */
export async function ChangeComparison({ locale, review }: { locale: Locale; review: ReviewCase }) {
  const t = await getTranslations({ locale, namespace: "admin.case.change" });
  const profile = review.providerProfile;
  const pending = parsePendingChanges(profile.pendingChanges);
  const flag = (value: boolean) => (value ? t("on") : t("off"));
  const rows: Row[] = [];
  if (pending.displayName !== undefined) rows.push({ field: "displayName", before: profile.displayName, after: pending.displayName });
  if (pending.allowMessages !== undefined) rows.push({ field: "allowMessages", before: flag(profile.allowMessages), after: flag(pending.allowMessages) });
  if (pending.allowBookingRequests !== undefined) rows.push({ field: "allowBookingRequests", before: flag(profile.allowBookingRequests), after: flag(pending.allowBookingRequests) });
  if (pending.regionIds !== undefined) {
    const before = profile.regions.map((entry) => pickLocalizedName(entry.region, locale)).sort((a, b) => a.localeCompare(b, locale)).join(", ");
    rows.push({ field: "regionIds", before, after: await regionNames(pending.regionIds, locale) });
  }

  return (
    <section aria-labelledby="aenderung" className="flex min-w-0 flex-col gap-2" data-change-comparison>
      <h2 id="aenderung" className="text-h3">
        {t("title")}
      </h2>
      <p className="text-small text-ink-muted">{t("intro")}</p>
      {rows.length === 0 ? (
        <p className="text-body text-ink-muted">{t("none")}</p>
      ) : (
        <table className="w-full border-collapse text-left text-body text-ink">
          <caption className="sr-only">{t("caption")}</caption>
          <thead>
            <tr>
              {[t("field"), t("before"), t("after")].map((label) => (
                <th key={label} scope="col" className="border-b border-border-strong py-2 pr-4 text-label text-ink-muted last:pr-0">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.field}>
                <th scope="row" className="border-b border-border py-3 pr-4 align-top font-normal text-ink-muted">
                  {t(row.field)}
                </th>
                <td className="border-b border-border py-3 pr-4 align-top break-words" data-before>
                  {row.before}
                </td>
                <td className="border-b border-border py-3 align-top font-[550] break-words" data-after>
                  {row.after}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
