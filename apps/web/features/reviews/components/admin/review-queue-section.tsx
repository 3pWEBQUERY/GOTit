import type { Locale } from "@app/core/locale";
import { EmptyState, type DataTableSort } from "@app/ui";
import { MessageSquareText } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { caseAge } from "../../../admin/queue/case-age";
import { NextCaseShortcut } from "../../../admin/queue/next-case-shortcut";
import { createHref } from "../../../shell/nav/href";
import { getReviewQueue } from "../../queries/admin";
import { ReviewQueueTable, type ReviewQueueRow } from "./review-queue";

/** Warteschlange `/admin/bewertungen`: neue Bewertungen und offene Einsprüche, älteste zuerst, mit «Nächster Fall» und Taste N. */
export async function ReviewQueueSection({
  locale,
  actorId,
  sort,
  now,
}: {
  locale: Locale;
  actorId: string;
  sort: DataTableSort;
  now: Date;
}) {
  const [t, tQueue, format, entries] = await Promise.all([
    getTranslations({ locale, namespace: "reviews.admin" }),
    getTranslations({ locale, namespace: "admin.queue" }),
    getFormatter({ locale }),
    getReviewQueue(actorId),
  ]);
  const href = createHref(locale);
  const caseHref = (id: string) =>
    href({ pathname: "/admin/bewertungen/[id]", params: { id } });
  const ordered = sort.direction === "asc" ? entries : [...entries].reverse();
  const rows: ReviewQueueRow[] = ordered.map((entry) => {
    const age = caseAge(entry.submittedAt, now);
    return {
      id: entry.key,
      href: caseHref(entry.reviewId),
      kindLabel: t(`kind.${entry.kind}`),
      profileName: entry.profileName,
      submittedIso: entry.submittedAt.toISOString(),
      submittedLabel: format.dateTime(entry.submittedAt, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      ageLabel:
        age.unit === "lessThanHour"
          ? tQueue("age.lessThanHour")
          : tQueue(`age.${age.unit}`, { count: age.count }),
    };
  });
  const oldest = entries[0];
  return (
    <div className="flex flex-col gap-4">
      {oldest ? (
        <NextCaseShortcut
          href={caseHref(oldest.reviewId)}
          label={t("next")}
          hint={{
            before: tQueue("shortcut.before"),
            key: tQueue("shortcut.key"),
            after: t("shortcutAfter"),
          }}
        />
      ) : null}
      <p role="status" className="tabular text-small text-ink-muted">
        {t("count", { count: entries.length })}
      </p>
      <ReviewQueueTable
        rows={rows}
        sort={sort}
        labels={{
          caption: t("caption"),
          kind: t("columns.kind"),
          profile: t("columns.profile"),
          submitted: t("columns.submitted"),
          age: t("columns.age"),
        }}
        empty={
          <EmptyState
            icon={<MessageSquareText strokeWidth={1.5} />}
            title={t("empty.title")}
            description={t("empty.description")}
          />
        }
      />
    </div>
  );
}
