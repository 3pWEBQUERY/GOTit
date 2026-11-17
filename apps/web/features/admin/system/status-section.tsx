import { getServiceStatus, type ServiceCheck } from "@app/core/admin/system";
import type { Locale } from "@app/core/locale";
import { InlineAlert } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { AdminTable } from "../areas/admin-table";
import { adminDates } from "../areas/format";
import { Tag } from "../areas/tag";
import { RefreshButton } from "./refresh-button";

/** Dienststatus (v2 7.8 `/admin/system/status`): Postgres, Redis, Queues, Migrationen. Fehler stehen als Fehler da. */
export async function StatusSection({ locale, actorId }: { locale: Locale; actorId: string }) {
  const [t, dates, status] = await Promise.all([getTranslations({ locale, namespace: "adminSystem.status" }), adminDates(locale), getServiceStatus(actorId)]);
  const state = (check: ServiceCheck) => (check.ok ? <Tag tone="success">{t("ok")}</Tag> : <Tag tone="error">{t("failed")}</Tag>);
  const detail = (check: ServiceCheck) => (check.ok ? (check.latencyMs !== undefined ? t("latency", { ms: check.latencyMs }) : "–") : (check.detail ?? t("unreachable")));
  const failures = [status.postgres, status.redis, status.migrations, ...status.queues].filter((check) => !check.ok).length;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <p role="status" className="text-small text-ink-muted">
          {t("checkedAt", { date: dates.dateTime(status.checkedAt) })}
        </p>
        <RefreshButton label={t("refresh")} />
      </div>
      {failures > 0 ? (
        <InlineAlert tone="error" title={t("failures", { count: failures })}>
          {t("failuresText")}
        </InlineAlert>
      ) : (
        <InlineAlert tone="success" title={t("allOk")} />
      )}
      <AdminTable
        testId="services"
        caption={t("servicesCaption")}
        columns={[
          { id: "service", header: t("columns.service"), priority: 1 },
          { id: "state", header: t("columns.state"), priority: 2 },
          { id: "detail", header: t("columns.detail"), priority: 3 },
        ]}
        rows={[
          { id: "postgres", cells: { service: "Postgres", state: state(status.postgres), detail: detail(status.postgres) } },
          { id: "redis", cells: { service: "Redis", state: state(status.redis), detail: detail(status.redis) } },
          {
            id: "migrations",
            cells: {
              service: t("migrations"),
              state: state(status.migrations),
              detail: status.migrations.ok ? t("migrationsDetail", { count: status.migrations.applied ?? 0, last: status.migrations.last ?? "–" }) : detail(status.migrations),
            },
          },
        ]}
      />
      <AdminTable
        testId="queues"
        caption={t("queuesCaption")}
        columns={[
          { id: "queue", header: t("columns.queue"), priority: 1 },
          { id: "state", header: t("columns.state"), priority: 2 },
          { id: "waiting", header: t("columns.waiting"), align: "end", priority: 3 },
          { id: "active", header: t("columns.active"), align: "end" },
          { id: "delayed", header: t("columns.delayed"), align: "end" },
          { id: "failed", header: t("columns.failed"), align: "end" },
        ]}
        rows={status.queues.map((queue) => ({
          id: queue.name,
          cells: {
            queue: <code className="text-small">{queue.name}</code>,
            state: queue.ok ? state(queue) : <span className="flex flex-col gap-1">{state(queue)}<span className="text-small text-ink-muted">{detail(queue)}</span></span>,
            waiting: queue.counts?.waiting ?? "–",
            active: queue.counts?.active ?? "–",
            delayed: queue.counts?.delayed ?? "–",
            failed: queue.counts ? queue.counts.failed > 0 ? <Tag tone="error">{queue.counts.failed}</Tag> : 0 : "–",
          },
        }))}
        empty={<p className="text-body text-ink-muted">{t("noQueues")}</p>}
      />
      <p className="max-w-prose text-small text-ink-muted">{t("logsNote")}</p>
    </div>
  );
}
