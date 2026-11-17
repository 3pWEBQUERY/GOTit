import type { Locale } from "@app/core/locale";
import { EmptyState, type DataTableSort } from "@app/ui";
import { Flag } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { caseAge } from "../queue/case-age";
import { NextCaseShortcut } from "../queue/next-case-shortcut";
import { getReportQueue } from "./queries";
import { reasonLabel } from "./reason-label";
import { ReportQueueTable, type ReportQueueRow } from "./report-queue-table";

/**
 * Warteschlange der Meldungen: dringende zuerst, darin die älteste zuerst.
 * «Neueste zuerst» kehrt nur die Reihenfolge innerhalb der Priorität um.
 */
export async function ReportQueueSection({ locale, actorId, sort, now }: { locale: Locale; actorId: string; sort: DataTableSort; now: Date }) {
  const [t, tQueue, format, entries] = await Promise.all([
    getTranslations({ locale, namespace: "admin.reports" }),
    getTranslations({ locale, namespace: "admin.queue" }),
    getFormatter({ locale }),
    getReportQueue(actorId),
  ]);
  const href = createHref(locale);
  const caseHref = (id: string) => href({ pathname: "/admin/meldungen/[id]", params: { id } });
  const byPriority = [entries.filter((entry) => entry.urgent), entries.filter((entry) => !entry.urgent)];
  const ordered = byPriority.flatMap((group) => (sort.direction === "asc" ? group : [...group].reverse()));
  const rows: ReportQueueRow[] = ordered.map((entry) => {
    const age = caseAge(entry.createdAt, now);
    return {
      id: entry.id,
      href: caseHref(entry.id),
      urgent: entry.urgent,
      reasonLabel: reasonLabel(t, entry.reason),
      targetLabel: t(`targetType.${entry.targetType}`),
      submittedIso: entry.createdAt.toISOString(),
      submittedLabel: format.dateTime(entry.createdAt, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      ageLabel: age.unit === "lessThanHour" ? tQueue("age.lessThanHour") : tQueue(`age.${age.unit}`, { count: age.count }),
    };
  });
  const first = entries[0];
  return (
    <div className="flex flex-col gap-4">
      {first ? <NextCaseShortcut href={caseHref(first.id)} label={t("next")} hint={{ before: tQueue("shortcut.before"), key: tQueue("shortcut.key"), after: t("shortcutAfter") }} /> : null}
      <p role="status" className="tabular text-small text-ink-muted">
        {t("count", { count: entries.length })}
        {entries.some((entry) => entry.urgent) ? ` · ${t("urgentCount", { count: entries.filter((entry) => entry.urgent).length })}` : null}
      </p>
      <ReportQueueTable
        rows={rows}
        sort={sort}
        labels={{
          caption: t("caption"),
          priority: t("columns.priority"),
          reason: t("columns.reason"),
          target: t("columns.target"),
          submitted: t("columns.submitted"),
          age: t("columns.age"),
          urgent: t("urgent"),
          normal: t("normal"),
        }}
        empty={<EmptyState icon={<Flag strokeWidth={1.5} />} title={t("empty.title")} description={t("empty.description")} />}
      />
      <p className="max-w-prose text-small text-ink-muted">{t("readOnly")}</p>
    </div>
  );
}
