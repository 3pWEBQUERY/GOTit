import type { Locale } from "@app/core/locale";
import type { DataTableSort } from "@app/ui";
import { EmptyState } from "@app/ui";
import { ClipboardCheck } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { getQueue } from "../queries/get-queue";
import { caseAge } from "./case-age";
import { NextCaseShortcut } from "./next-case-shortcut";
import { QueueTable, type QueueRow } from "./queue-table";

/** Prüfwarteschlange: Kürzel «Nächster Fall» und die Tabelle der offenen Fälle. */
export async function QueueSection({ locale, sort, now }: { locale: Locale; sort: DataTableSort; now: Date }) {
  const [t, format, cases] = await Promise.all([getTranslations({ locale, namespace: "admin.queue" }), getFormatter({ locale }), getQueue()]);
  const href = createHref(locale);
  const caseHref = (id: string) => href({ pathname: "/admin/verifizierungen/[id]", params: { id } });
  const ordered = sort.direction === "asc" ? cases : [...cases].reverse();
  const rows: QueueRow[] = ordered.map((entry) => {
    const age = caseAge(entry.submittedAt, now);
    return {
      id: entry.id,
      href: caseHref(entry.id),
      displayName: entry.displayName,
      submittedIso: entry.submittedAt.toISOString(),
      submittedLabel: format.dateTime(entry.submittedAt, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      ageLabel: age.unit === "lessThanHour" ? t("age.lessThanHour") : t(`age.${age.unit}`, { count: age.count }),
      assigneeLabel: entry.assigneeName ?? t("unassigned"),
    };
  });
  const oldest = cases[0];
  return (
    <div className="flex flex-col gap-4">
      {oldest ? (
        <NextCaseShortcut href={caseHref(oldest.id)} label={t("next")} hint={{ before: t("shortcut.before"), key: t("shortcut.key"), after: t("shortcut.after") }} />
      ) : null}
      <p role="status" className="tabular text-small text-ink-muted">
        {t("count", { count: cases.length })}
      </p>
      <QueueTable
        rows={rows}
        sort={sort}
        labels={{ caption: t("caption"), displayName: t("columns.displayName"), submitted: t("columns.submitted"), age: t("columns.age"), assignee: t("columns.assignee") }}
        empty={<EmptyState icon={<ClipboardCheck strokeWidth={1.5} />} title={t("empty.title")} description={t("empty.description")} />}
      />
    </div>
  );
}
