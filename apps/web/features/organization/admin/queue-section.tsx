import type { Locale } from "@app/core/locale";
import { EmptyState } from "@app/ui";
import { Building2 } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { caseAge } from "../../admin/queue/case-age";
import { NextCaseShortcut } from "../../admin/queue/next-case-shortcut";
import { createHref } from "../../shell/nav/href";
import { getOrganizationQueue } from "./queries";
import {
  OrganizationQueueTable,
  type OrganizationQueueRow,
} from "./queue-table";

/** Warteschlange `/admin/unternehmen`: eingereichte Nachweise, älteste zuerst, mit «Nächster Fall» und Taste N. */
export async function OrganizationQueueSection({
  locale,
  actorId,
  now,
}: {
  locale: Locale;
  actorId: string;
  now: Date;
}) {
  const [t, tQueue, format, entries] = await Promise.all([
    getTranslations({ locale, namespace: "organization.admin" }),
    getTranslations({ locale, namespace: "admin.queue" }),
    getFormatter({ locale }),
    getOrganizationQueue(actorId),
  ]);
  const href = createHref(locale);
  const caseHref = (id: string) =>
    href({ pathname: "/admin/unternehmen/[id]", params: { id } });
  const rows: OrganizationQueueRow[] = entries.map((entry) => {
    const age = caseAge(entry.submittedAt, now);
    return {
      id: entry.id,
      href: caseHref(entry.id),
      name: entry.organization.name,
      kindLabel: t(`kinds.${entry.organization.kind}`),
      legalName: entry.legalName,
      uid: entry.uid,
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
          href={caseHref(oldest.id)}
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
      <OrganizationQueueTable
        rows={rows}
        labels={{
          caption: t("caption"),
          name: t("columns.name"),
          kind: t("columns.kind"),
          legalName: t("columns.legalName"),
          uid: t("columns.uid"),
          submitted: t("columns.submitted"),
          age: t("columns.age"),
        }}
        empty={
          <EmptyState
            icon={<Building2 strokeWidth={1.5} />}
            title={t("empty.title")}
            description={t("empty.description")}
          />
        }
      />
    </div>
  );
}
