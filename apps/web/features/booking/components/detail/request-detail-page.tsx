import type { Locale } from "@app/core/locale";
import { Breadcrumbs, StatusPill, UiLink } from "@app/ui";
import { MessageSquare, UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { TopBarTitle } from "../../../shell/components/top-bar-title";
import { createHref } from "../../../shell/nav/href";
import { isOpen, uiStatus } from "../../lib/status-view";
import { requireRequest } from "../../queries/load-detail";
import { BookingActions } from "../shared/booking-actions";
import {
  BookingDuration,
  BookingStamp,
  BookingWhen,
} from "../shared/booking-when";
import { RequestHistory } from "./request-history";

const linkClass =
  "inline-flex min-h-11 items-center gap-2 text-small font-[550] underline underline-offset-4 hover:text-accent";

/**
 * Eine eigene Anfrage `/termine/[id]` (v2 7.5, 12.1): Status als Wort, der
 * aktuelle Vorschlag in der Zone des Anbieters, Nachricht, Region, die
 * erlaubten Aktionen und der ganze Verlauf. Termin ↔ Unterhaltung (v2 8.2).
 */
export async function RequestDetailPage({
  locale,
  requestId,
}: {
  locale: Locale;
  requestId: string;
}) {
  const [{ booking, events, slots }, t] = await Promise.all([
    requireRequest(locale, requestId),
    getTranslations({ locale, namespace: "booking" }),
  ]);
  const href = createHref(locale);
  const open = isOpen(booking.status);
  const proposedByMe = booking.lastProposedBy === booking.role;
  const title = t("detail.title", { name: booking.counterpartName });

  return (
    <div className="flex max-w-reading flex-col gap-8">
      <TopBarTitle title={title} />
      <Breadcrumbs
        label={t("detail.breadcrumbs")}
        items={[
          { label: t("list.title"), href: href("/termine") },
          { label: booking.counterpartName },
        ]}
      />
      <header className="flex flex-col gap-3">
        <h1 className="text-h1 break-words">{title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill
            status={uiStatus(booking.status)}
            label={t(`status.${booking.status}`)}
          />
          {booking.status === "NEGOTIATING" ? (
            <span className="text-small text-ink-muted">
              {proposedByMe
                ? t("proposal.mine")
                : t("proposal.theirs", { name: booking.counterpartName })}
            </span>
          ) : null}
        </div>
      </header>

      <section aria-labelledby="vorschlag" className="flex flex-col gap-3">
        <h2 id="vorschlag" className="text-h2">
          {open ? t("detail.proposal") : t("detail.appointment")}
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-body xs:grid-cols-[auto_minmax(0,1fr)]">
          <dt className="text-ink-muted">{t("fields.when")}</dt>
          <dd>
            <BookingWhen
              startsAt={booking.startsAt}
              endsAt={booking.endsAt}
              timeZone={booking.timeZone}
            />
          </dd>
          <dt className="text-ink-muted">{t("fields.duration")}</dt>
          <dd>
            <BookingDuration
              startsAt={booking.startsAt}
              endsAt={booking.endsAt}
              timeZone={booking.timeZone}
            />
          </dd>
          <dt className="text-ink-muted">{t("fields.region")}</dt>
          <dd>{booking.regionName ?? t("detail.noRegion")}</dd>
          {open ? (
            <>
              <dt className="text-ink-muted">{t("fields.expires")}</dt>
              <dd>
                <BookingStamp
                  iso={booking.expiresAt}
                  timeZone={booking.timeZone}
                />
              </dd>
            </>
          ) : null}
        </dl>
        {booking.message ? (
          <div className="flex flex-col gap-1">
            <h3 className="text-small text-ink-muted">{t("detail.message")}</h3>
            <p className="text-body break-words whitespace-pre-wrap">
              {booking.message}
            </p>
          </div>
        ) : null}
      </section>

      {booking.actions.length > 0 ? (
        <section aria-labelledby="aktionen" className="flex flex-col gap-3">
          <h2 id="aktionen" className="text-h2">
            {t("detail.actions")}
          </h2>
          {booking.actions.includes("cancel") ? (
            <p className="text-small text-ink-muted">{t("detail.voluntary")}</p>
          ) : null}
          <BookingActions booking={booking} slots={slots} />
        </section>
      ) : null}
      {booking.status === "COMPLETED" ? (
        <p className="text-small text-ink-muted">{t("detail.reviewsLater")}</p>
      ) : null}

      <div className="flex flex-col gap-1 xs:flex-row xs:flex-wrap xs:gap-6">
        <UiLink
          href={href({
            pathname: "/nachrichten/[id]",
            params: { id: booking.conversationId },
          })}
          className={linkClass}
        >
          <MessageSquare
            aria-hidden
            strokeWidth={1.5}
            className="size-4 shrink-0"
          />
          {t("detail.openThread")}
        </UiLink>
        <UiLink
          href={href({
            pathname: "/p/[name]",
            params: { name: booking.profileSlug },
          })}
          className={linkClass}
        >
          <UserRound
            aria-hidden
            strokeWidth={1.5}
            className="size-4 shrink-0"
          />
          {t("detail.openProfile")}
        </UiLink>
      </div>

      <section
        aria-labelledby="verlauf"
        className="flex flex-col gap-3 border-t border-border pt-6"
      >
        <h2 id="verlauf" className="text-h2">
          {t("history.title")}
        </h2>
        <RequestHistory booking={booking} events={events} />
      </section>
    </div>
  );
}
