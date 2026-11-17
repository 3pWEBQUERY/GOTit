import { hasPermission, type AdminActor } from "@app/core/admin";
import type { Locale } from "@app/core/locale";
import { ticketReference, type getSupportTicket } from "@app/core/support";
import { UiLink } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { ActionButton } from "../areas/action-button";
import { AdminForm } from "../areas/admin-form";
import { Facts, Section } from "../areas/facts";
import { adminDates } from "../areas/format";
import { Tag } from "../areas/tag";
import { WideOnly } from "../areas/wide-only";
import { AdminPageHeader } from "../components/page-header";
import { assignAction, replyAction, setStatusAction } from "./actions";
import { usernames } from "./usernames";

type Ticket = NonNullable<Awaited<ReturnType<typeof getSupportTicket>>>;

/**
 * Anfrage `/admin/support/[ticket]`: Anfrage, Verlauf, Antwort oder interne
 * Notiz, Status und Zuständigkeit. Eine Antwort geht im Wortlaut per E-Mail
 * an die anfragende Adresse; eine interne Notiz nie.
 */
export async function TicketView({ locale, actor, ticket }: { locale: Locale; actor: AdminActor; ticket: Ticket }) {
  const [t, tCommon, dates, names] = await Promise.all([getTranslations({ locale, namespace: "adminSupport" }), getTranslations({ locale, namespace: "adminCommon" }), adminDates(locale), usernames([ticket.assignedToId])]);
  const href = createHref(locale);
  const reference = ticketReference(ticket.number);
  const mine = ticket.assignedToId === actor.userId;
  const assignee = ticket.assignedToId ? (mine ? t("assigned.you") : (names.get(ticket.assignedToId) ?? t("assigned.someone"))) : t("assigned.nobody");
  return (
    <>
      <AdminPageHeader
        title={t("ticket.title", { reference, subject: ticket.subject })}
        crumbsLabel={tCommon("breadcrumbs")}
        crumbs={[{ label: tCommon("areas.overview"), href: href("/admin") }, { label: tCommon("areas.support"), href: href("/admin/support") }, { label: reference }]}
      />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Section id="anfrage" title={t("ticket.request")}>
            <p className="max-w-prose text-body whitespace-pre-wrap break-words" data-ticket-body>
              {ticket.body}
            </p>
          </Section>
          <Section id="verlauf" title={t("ticket.history")}>
            {ticket.replies.length ? (
              <ol className="flex flex-col gap-4">
                {ticket.replies.map((reply) => (
                  <li key={reply.id} className="flex flex-col gap-2 rounded-card border border-border p-4" data-reply={reply.internal ? "internal" : "public"}>
                    <p className="flex flex-wrap items-center gap-2 text-small text-ink-muted">
                      <span>{reply.authorUsername ?? t("ticket.unknownAuthor")}</span>
                      <span aria-hidden>·</span>
                      <span>{dates.dateTime(reply.createdAt)}</span>
                      {reply.internal ? <Tag tone="warning">{t("ticket.internalTag")}</Tag> : <Tag>{t("ticket.sentTag")}</Tag>}
                    </p>
                    <p className="text-body whitespace-pre-wrap break-words">{reply.body}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-body text-ink-muted">{t("ticket.noReplies")}</p>
            )}
          </Section>
          <Section id="antworten" title={t("ticket.replyTitle")} intro={t("ticket.replyIntro", { email: ticket.email })}>
            <WideOnly locale={locale}>
              <AdminForm
                id="antwort"
                action={replyAction.bind(null, ticket.id)}
                fields={[
                  { kind: "textarea", name: "body", label: t("ticket.body"), hint: t("ticket.bodyHint"), maxLength: 5000, rows: 6 },
                  { kind: "checkbox", name: "internal", label: t("ticket.internal"), description: t("ticket.internalHint") },
                ]}
                submitLabel={t("ticket.send")}
                successMessage={t("ticket.sent")}
                resetOnSuccess
              />
            </WideOnly>
          </Section>
        </div>
        <aside aria-label={t("ticket.details")} className="flex min-w-0 flex-col gap-6">
          <Facts
            items={[
              { label: t("columns.status"), value: t(`status.${ticket.status}`) },
              { label: t("columns.category"), value: t(`categories.${ticket.category as "other"}`) },
              { label: t("ticket.email"), value: <span className="break-all">{ticket.email}</span> },
              {
                label: t("ticket.account"),
                value: ticket.account ? (
                  hasPermission(actor, "users.view") ? (
                    <UiLink href={href({ pathname: "/admin/benutzer/[id]", params: { id: ticket.account.id } })} className="underline underline-offset-4">
                      {ticket.account.username ?? t("ticket.accountLink")}
                    </UiLink>
                  ) : (
                    (ticket.account.username ?? t("ticket.withAccount"))
                  )
                ) : (
                  t("ticket.withoutAccount")
                ),
              },
              { label: t("ticket.language"), value: ticket.locale.toUpperCase() },
              { label: t("columns.created"), value: dates.dateTime(ticket.createdAt) },
              { label: t("columns.assigned"), value: assignee },
            ]}
          />
          <WideOnly locale={locale}>
            <div className="flex flex-col gap-3">
              <ActionButton action={assignAction.bind(null, ticket.id, !mine)} label={mine ? t("ticket.release") : t("ticket.assignMe")} successMessage={mine ? t("ticket.released") : t("ticket.assigned")} />
              <AdminForm
                key={ticket.status}
                id="status"
                action={setStatusAction.bind(null, ticket.id)}
                fields={[{ kind: "select", name: "status", label: t("ticket.statusLabel"), hint: t("ticket.statusHint"), options: (["OPEN", "ANSWERED", "CLOSED"] as const).map((value) => ({ value, label: t(`status.${value}`) })), defaultValue: ticket.status }]}
                submitLabel={t("ticket.saveStatus")}
                submitVariant="secondary"
                successMessage={t("ticket.statusSaved")}
              />
            </div>
          </WideOnly>
        </aside>
      </div>
    </>
  );
}
