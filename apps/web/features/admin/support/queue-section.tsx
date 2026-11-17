import type { Locale } from "@app/core/locale";
import { listSupportTickets, ticketReference } from "@app/core/support";
import { EmptyState, Select, UiLink } from "@app/ui";
import { LifeBuoy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { AdminTable } from "../areas/admin-table";
import { FilterBar } from "../areas/filter-bar";
import { adminDates, param } from "../areas/format";
import { Tag } from "../areas/tag";
import { usernames } from "./usernames";

const STATUSES = ["OPEN", "ANSWERED", "CLOSED"] as const;
const ASSIGNED = ["any", "me", "none"] as const;

/** Warteschlange `/admin/support`: offene zuerst, darin älteste zuerst (Kern). Filter in der URL. */
export async function SupportQueueSection({ locale, actorId, query }: { locale: Locale; actorId: string; query: Record<string, string | string[] | undefined> }) {
  const [t, tCommon, dates] = await Promise.all([getTranslations({ locale, namespace: "adminSupport" }), getTranslations({ locale, namespace: "adminCommon" }), adminDates(locale)]);
  const href = createHref(locale);
  const status = STATUSES.find((value) => value === param(query, "status"));
  const assigned = ASSIGNED.find((value) => value === param(query, "zustaendig")) ?? "any";
  const tickets = await listSupportTickets(actorId, { status, assigned });
  const names = await usernames(tickets.map((ticket) => ticket.assignedToId));
  const base = href("/admin/support");
  const active = Boolean(status) || assigned !== "any";
  return (
    <div className="flex flex-col gap-4">
      <FilterBar action={base} label={t("queue.filterLabel")} submitLabel={tCommon("filters.apply")} resetLabel={tCommon("filters.reset")} resetHref={base} active={active}>
        <Select name="status" label={t("queue.status")} placeholder={t("queue.allStatuses")} defaultValue={status} options={STATUSES.map((value) => ({ value, label: t(`status.${value}`) }))} />
        <Select name="zustaendig" label={t("queue.assigned")} defaultValue={assigned} options={ASSIGNED.map((value) => ({ value, label: t(`assigned.${value}`) }))} />
      </FilterBar>
      <p role="status" className="tabular text-small text-ink-muted">
        {t("queue.count", { count: tickets.length })}
      </p>
      <AdminTable
        testId="support"
        caption={t("queue.caption")}
        columns={[
          { id: "number", header: t("columns.number"), priority: 1 },
          { id: "subject", header: t("columns.subject"), priority: 2 },
          { id: "category", header: t("columns.category") },
          { id: "status", header: t("columns.status"), priority: 3 },
          { id: "assigned", header: t("columns.assigned") },
          { id: "created", header: t("columns.created") },
          { id: "replies", header: t("columns.replies"), align: "end" },
        ]}
        rows={tickets.map((ticket) => ({
          id: ticket.id,
          cells: {
            number: (
              <UiLink href={href({ pathname: "/admin/support/[ticket]", params: { ticket: ticket.id } })} className="font-[550] text-ink underline-offset-4 hover:underline" data-ticket-link={ticketReference(ticket.number)}>
                {ticketReference(ticket.number)}
              </UiLink>
            ),
            subject: <span className="break-words">{ticket.subject}</span>,
            category: t(`categories.${ticket.category as "other"}`),
            status: <Tag tone={ticket.status === "OPEN" ? "warning" : ticket.status === "ANSWERED" ? "success" : "neutral"}>{t(`status.${ticket.status}`)}</Tag>,
            assigned: ticket.assignedToId ? (ticket.assignedToId === actorId ? t("assigned.you") : (names.get(ticket.assignedToId) ?? t("assigned.someone"))) : "–",
            created: dates.dateTime(ticket.createdAt),
            replies: ticket._count.replies,
          },
        }))}
        empty={<EmptyState icon={<LifeBuoy strokeWidth={1.5} />} title={active ? t("queue.noMatchTitle") : t("queue.emptyTitle")} description={active ? t("queue.noMatchDescription") : t("queue.emptyDescription")} />}
      />
    </div>
  );
}
