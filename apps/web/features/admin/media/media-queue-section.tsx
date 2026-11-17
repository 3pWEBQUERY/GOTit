import type { Locale } from "@app/core/locale";
import { EmptyState, type DataTableSort } from "@app/ui";
import { Images } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { caseAge } from "../queue/case-age";
import { NextCaseShortcut } from "../queue/next-case-shortcut";
import { MediaQueueTable, type MediaQueueRow } from "./media-queue-table";
import { getMediaQueue } from "./queries";

/** Warteschlange der Medien: «Nächstes Medium» und die Tabelle, älteste zuerst. */
export async function MediaQueueSection({ locale, actorId, sort, now }: { locale: Locale; actorId: string; sort: DataTableSort; now: Date }) {
  const [t, tQueue, format, entries] = await Promise.all([
    getTranslations({ locale, namespace: "admin.media" }),
    getTranslations({ locale, namespace: "admin.queue" }),
    getFormatter({ locale }),
    getMediaQueue(actorId),
  ]);
  const href = createHref(locale);
  const caseHref = (id: string) => href({ pathname: "/admin/medien/[id]", params: { id } });
  const ordered = sort.direction === "asc" ? entries : [...entries].reverse();
  const rows: MediaQueueRow[] = ordered.map((entry) => {
    const age = caseAge(entry.submittedAt, now);
    return {
      id: entry.id,
      href: caseHref(entry.id),
      label: entry.displayName ?? t("noProfile"),
      submittedIso: entry.submittedAt.toISOString(),
      submittedLabel: format.dateTime(entry.submittedAt, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      ageLabel: age.unit === "lessThanHour" ? tQueue("age.lessThanHour") : tQueue(`age.${age.unit}`, { count: age.count }),
      visibilityLabel: t(`visibility.${entry.visibility}`),
    };
  });
  const oldest = entries[0];
  return (
    <div className="flex flex-col gap-4">
      {oldest ? <NextCaseShortcut href={caseHref(oldest.id)} label={t("next")} hint={{ before: tQueue("shortcut.before"), key: tQueue("shortcut.key"), after: t("shortcutAfter") }} /> : null}
      <p role="status" className="tabular text-small text-ink-muted">
        {t("count", { count: entries.length })}
      </p>
      <MediaQueueTable
        rows={rows}
        sort={sort}
        labels={{ caption: t("caption"), profile: t("columns.profile"), submitted: t("columns.submitted"), age: t("columns.age"), visibility: t("columns.visibility") }}
        empty={<EmptyState icon={<Images strokeWidth={1.5} />} title={t("empty.title")} description={t("empty.description")} />}
      />
    </div>
  );
}
