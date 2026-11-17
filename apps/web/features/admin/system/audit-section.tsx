import { listAuditEvents } from "@app/core/admin/system";
import { zonedToUtc } from "@app/core/booking";
import type { Locale } from "@app/core/locale";
import { DateField, EmptyState } from "@app/ui";
import { ScrollText } from "lucide-react";
import { TextInput } from "../areas/text-input";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { AdminTable } from "../areas/admin-table";
import { CursorPager, FilterBar, withQuery } from "../areas/filter-bar";
import { adminDates, param } from "../areas/format";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Audit-Log (v1 9.7, v2 7.8 `/admin/system/audit`): Filter nach Person,
 * Aktion und Ziel (Präfix) und Zeitraum in der URL, 100 pro Seite. Das Log
 * enthält keine Inhalte, nur Aktion, Ziel und Begründung.
 */
export async function AuditSection({ locale, actorId, query }: { locale: Locale; actorId: string; query: Record<string, string | string[] | undefined> }) {
  const [t, tCommon, tForm, dates] = await Promise.all([
    getTranslations({ locale, namespace: "adminSystem.audit" }),
    getTranslations({ locale, namespace: "adminCommon" }),
    getTranslations({ locale, namespace: "adminCommon.form" }),
    adminDates(locale),
  ]);
  const href = createHref(locale);
  const filters = {
    person: param(query, "person"),
    aktion: param(query, "aktion"),
    ziel: param(query, "ziel"),
    von: DAY.test(param(query, "von") ?? "") ? param(query, "von") : undefined,
    bis: DAY.test(param(query, "bis") ?? "") ? param(query, "bis") : undefined,
  };
  const cursor = param(query, "cursor");
  const { events, nextCursor } = await listAuditEvents(actorId, {
    actorId: filters.person,
    action: filters.aktion,
    target: filters.ziel,
    from: filters.von ? zonedToUtc(filters.von, 0, "Europe/Zurich") : undefined,
    to: filters.bis ? new Date(zonedToUtc(filters.bis, 23 * 60 + 59, "Europe/Zurich").getTime() + 59_999) : undefined,
    cursor,
  });
  const base = href("/admin/system/audit");
  const active = Object.values(filters).some(Boolean);
  const calendar = { openCalendar: tForm("calendar.open"), previousMonth: tForm("calendar.previous"), nextMonth: tForm("calendar.next"), invalidFormat: tCommon("errors.dateInvalid") };
  return (
    <div className="flex flex-col gap-4">
      <FilterBar action={base} label={t("filterLabel")} submitLabel={tCommon("filters.apply")} resetLabel={tCommon("filters.reset")} resetHref={base} active={active}>
        <TextInput name="person" label={t("person")} hint={t("personHint")} defaultValue={filters.person ?? ""} />
        <TextInput name="aktion" label={t("action")} hint={t("actionHint")} defaultValue={filters.aktion ?? ""} />
        <TextInput name="ziel" label={t("target")} hint={t("targetHint")} defaultValue={filters.ziel ?? ""} />
        <DateField name="von" label={t("from")} locale={`${locale}-CH`} placeholder="TT.MM.JJJJ" labels={calendar} defaultValue={filters.von} />
        <DateField name="bis" label={t("to")} locale={`${locale}-CH`} placeholder="TT.MM.JJJJ" labels={calendar} defaultValue={filters.bis} />
      </FilterBar>
      <p role="status" className="tabular text-small text-ink-muted">
        {t("count", { count: events.length })}
      </p>
      <AdminTable
        testId="audit"
        caption={t("caption")}
        columns={[
          { id: "time", header: t("columns.time"), priority: 2 },
          { id: "actor", header: t("columns.actor"), priority: 3 },
          { id: "action", header: t("columns.action"), priority: 1 },
          { id: "target", header: t("columns.target") },
          { id: "reason", header: t("columns.reason") },
        ]}
        rows={events.map((event) => ({
          id: event.id,
          cells: {
            time: <span className="tabular whitespace-nowrap">{dates.dateTime(event.createdAt)}</span>,
            actor: event.actorId ? (event.actorUsername ?? <code className="text-small break-all">{event.actorId}</code>) : t("system"),
            action: <code className="text-small break-all">{event.action}</code>,
            target: event.target ? <code className="text-small break-all">{event.target}</code> : "–",
            reason: event.reason ? <span className="break-words">{event.reason}</span> : "–",
          },
        }))}
        empty={<EmptyState icon={<ScrollText strokeWidth={1.5} />} title={active ? t("noMatchTitle") : t("emptyTitle")} description={active ? t("noMatchDescription") : t("emptyDescription")} />}
      />
      <CursorPager nextHref={nextCursor ? withQuery(base, { ...filters, cursor: nextCursor }) : null} firstHref={cursor ? withQuery(base, filters) : null} nextLabel={tCommon("pager.older")} firstLabel={tCommon("pager.newest")} />
    </div>
  );
}
