import type { Locale } from "@app/core/locale";
import { REPORT_QUEUE_LIMIT } from "@app/core/moderation";
import { Button, EmptyState, InlineAlert, UiLink, type DataTableSort } from "@app/ui";
import { Flag, SearchX } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { caseAge } from "../queue/case-age";
import { NextCaseShortcut } from "../queue/next-case-shortcut";
import { reasonLabel } from "../reports/reason-label";
import { formatCaseId } from "./case-id";
import { ModerationQueueTable, type ModerationQueueRow } from "./moderation-queue-table";
import { getModerationQueue, getNextCaseId, staffNames } from "./queries";
import { ASSIGNED_FILTERS, PRIORITY_FILTERS, STATUS_FILTERS, TARGET_FILTERS, hasFilters, type QueueParams } from "./queue-filter";
import { QueueFilters } from "./queue-filters";

const keys = <Map extends object>(map: Map) => Object.keys(map) as (keyof Map & string)[];

/**
 * Warteschlange `/admin/moderation` (v2 12.4): Tabelle mit Filtern in der
 * URL, nach Priorität und Alter, mit Zuweisung und «Nächster Fall» (Taste N).
 */
export async function ModerationQueueSection({ locale, actorId, params, sort, now }: { locale: Locale; actorId: string; params: QueueParams; sort: DataTableSort; now: Date }) {
  const [t, tReports, tQueue, format, entries, nextId] = await Promise.all([
    getTranslations({ locale, namespace: "moderation" }),
    getTranslations({ locale, namespace: "admin.reports" }),
    getTranslations({ locale, namespace: "admin.queue" }),
    getFormatter({ locale }),
    getModerationQueue(actorId, params),
    getNextCaseId(actorId),
  ]);
  const names = await staffNames(entries.map((entry) => entry.assignedToId));
  const href = createHref(locale);
  const caseHref = (id: string) => href({ pathname: "/admin/moderation/[fall]", params: { fall: id } });
  // Der Kern sortiert nach Priorität und Alter; «Neueste zuerst» kehrt nur das Alter innerhalb einer Priorität um.
  const groups = (["CRITICAL", "HIGH", "NORMAL", "LOW"] as const).map((priority) => entries.filter((entry) => entry.priority === priority));
  const ordered = groups.flatMap((group) => (sort.direction === "asc" ? group : [...group].reverse()));
  const rows: ModerationQueueRow[] = ordered.map((entry) => {
    const age = caseAge(entry.createdAt, now);
    return {
      id: entry.id,
      href: caseHref(entry.id),
      caseId: formatCaseId(entry.number, entry.createdAt),
      category: t("category", { target: t(`targetType.${entry.targetType}`), reason: reasonLabel(tReports, entry.reason) }),
      priority: entry.priority,
      priorityLabel: t(`priorityLabel.${entry.priority}`),
      statusLabel: t(`status.${entry.status}`),
      appealOpen: entry.appealStatus === "OPEN",
      assignee: entry.assignedToId === actorId ? t("queue.me") : entry.assignedToId ? (names.get(entry.assignedToId) ?? t("queue.unknownPerson")) : t("queue.unassigned"),
      submittedIso: entry.createdAt.toISOString(),
      submittedLabel: format.dateTime(entry.createdAt, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      ageLabel: age.unit === "lessThanHour" ? tQueue("age.lessThanHour") : tQueue(`age.${age.unit}`, { count: age.count }),
    };
  });
  const filtered = hasFilters(params);
  const option = <Key extends string>(group: string, values: Key[]) => values.map((value) => ({ value, label: t(`queue.filters.${group}.${value}` as "queue.filters.status.aktiv") }));

  return (
    <div className="flex flex-col gap-4">
      {nextId ? (
        <NextCaseShortcut href={caseHref(nextId)} label={t("queue.next")} hint={{ before: tQueue("shortcut.before"), key: tQueue("shortcut.key"), after: t("queue.shortcutAfter") }} />
      ) : (
        <p className="text-small text-ink-muted" data-no-next-case>
          {t("queue.noNext")}
        </p>
      )}
      <QueueFilters
        params={params}
        options={{
          status: option("status", keys(STATUS_FILTERS)),
          prioritaet: option("prioritaet", keys(PRIORITY_FILTERS)),
          art: option("art", keys(TARGET_FILTERS)),
          zuweisung: option("zuweisung", keys(ASSIGNED_FILTERS)),
        }}
        labels={{
          title: t("queue.filters.title"),
          status: t("queue.filters.statusLabel"),
          priority: t("queue.filters.priorityLabel"),
          target: t("queue.filters.targetLabel"),
          assigned: t("queue.filters.assignedLabel"),
          all: t("queue.filters.all"),
          reset: t("queue.filters.reset"),
        }}
      />
      <p role="status" className="tabular text-small text-ink-muted">
        {t("queue.count", { count: entries.length })}
      </p>
      {entries.length >= REPORT_QUEUE_LIMIT ? <InlineAlert tone="warning" title={t("queue.limit", { count: REPORT_QUEUE_LIMIT })} /> : null}
      <ModerationQueueTable
        rows={rows}
        sort={sort}
        labels={{
          caption: t("queue.caption"),
          caseId: t("queue.columns.caseId"),
          category: t("queue.columns.category"),
          priority: t("queue.columns.priority"),
          status: t("queue.columns.status"),
          assignee: t("queue.columns.assignee"),
          age: t("queue.columns.age"),
          appealOpen: t("queue.appealOpen"),
        }}
        empty={
          filtered ? (
            <EmptyState
              icon={<SearchX strokeWidth={1.5} />}
              title={t("queue.emptyFiltered.title")}
              description={t("queue.emptyFiltered.description")}
              action={
                <Button asChild variant="secondary">
                  <UiLink href={href("/admin/moderation")}>{t("queue.filters.reset")}</UiLink>
                </Button>
              }
            />
          ) : (
            <EmptyState icon={<Flag strokeWidth={1.5} />} title={t("queue.empty.title")} description={t("queue.empty.description")} />
          )
        }
      />
    </div>
  );
}
