import type { Locale } from "@app/core/locale";
import { listOwnReviews } from "@app/core/review";
import {
  Button,
  EmptyState,
  InlineAlert,
  StatusPill,
  UiLink,
  buttonVariants,
  type BookingStatus as UiStatus,
} from "@app/ui";
import { CalendarCheck, MessageSquareText } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireAccount } from "../../../account/require-account";
import { TopBarTitle } from "../../../shell/components/top-bar-title";
import { createHref } from "../../../shell/nav/href";
import { appealView, type ReviewStatusValue } from "../../lib/status";
import { AppealDialog } from "../shared/appeal-dialog";

/** `?gesendet=1` nach dem Senden einer Bewertung: der Dank über der Liste. */
export const SENT_PARAM = "gesendet";

/** Status als Wort mit ruhiger Farbe der Statusanzeige (v2 13: Status nie nur als Farbe). */
export const STATUS_TONE: Record<ReviewStatusValue, UiStatus> = {
  PENDING: "requested",
  PUBLISHED: "confirmed",
  REJECTED: "declined",
  REMOVED: "cancelled",
};

type OwnReview = Awaited<ReturnType<typeof listOwnReviews>>["written"][number];
type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

/** Eine eigene Bewertung mit Status als Wort, Bedeutung des Status und Einspruch. */
function WrittenReview({
  review,
  t,
  date,
  profileHref,
}: {
  review: OwnReview;
  t: Translate;
  date: (value: Date) => string;
  profileHref: string;
}) {
  const appeal = appealView("MEMBER", review.status, review.appeals);
  return (
    <li className="flex flex-col gap-3 py-5" data-own-review={review.id}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <UiLink
          href={profileHref}
          className="text-body font-[550] break-words underline-offset-4 hover:underline"
        >
          {review.providerProfile.displayName}
        </UiLink>
        <StatusPill
          status={STATUS_TONE[review.status]}
          label={t(`status.${review.status}`)}
        />
      </div>
      <p className="text-small text-ink-muted">
        {t("member.writtenOn", { date: date(review.createdAt) })}
        {review.publishedAt
          ? ` · ${t("member.publishedOn", { date: date(review.publishedAt) })}`
          : null}
      </p>
      <p className="text-body break-words whitespace-pre-wrap">{review.text}</p>
      <p className="text-small text-ink-muted">
        {t(`member.statusHint.${review.status}`)}
      </p>
      {appeal.open ? (
        <p className="text-small font-[550]" data-appeal-open>
          {t("appeal.running")}
        </p>
      ) : null}
      {appeal.canAppeal ? (
        <div>
          <AppealDialog reviewId={review.id} side="member" />
        </div>
      ) : null}
    </li>
  );
}

/**
 * `/bewertungen` (v2 7.5, 12.1): zuerst die Termine, die auf eine Bewertung
 * warten, dann die eigenen Bewertungen mit Status als Wort. Gegen «Abgelehnt»
 * und «Entfernt» ist ein Einspruch mit Grund möglich (Entscheid 0017).
 */
export async function OwnReviewsPage({
  locale,
  sent,
}: {
  locale: Locale;
  sent: boolean;
}) {
  const viewer = await requireAccount(locale);
  const [t, format, { written, pending }] = await Promise.all([
    getTranslations({ locale, namespace: "reviews" }),
    getFormatter({ locale }),
    listOwnReviews(viewer.userId),
  ]);
  const href = createHref(locale);
  const date = (value: Date) =>
    format.dateTime(value, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <div className="flex max-w-reading flex-col gap-8">
      <TopBarTitle title={t("member.title")} />
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t("member.title")}</h1>
        <p className="text-body text-ink-muted">{t("member.intro")}</p>
      </div>
      {sent ? <InlineAlert tone="success" title={t("form.sent")} /> : null}

      <section
        aria-labelledby="offene-bewertungen"
        className="flex flex-col gap-3"
      >
        <h2 id="offene-bewertungen" className="text-h2">
          {t("member.pendingTitle")}
        </h2>
        {pending.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck strokeWidth={1.5} />}
            title={t("member.pendingEmpty")}
            description={t("member.pendingEmptyHint")}
          />
        ) : (
          <ul
            className="flex flex-col divide-y divide-border border-y border-border"
            data-pending-reviews
          >
            {pending.map((booking) => (
              <li
                key={booking.id}
                className="flex flex-col gap-3 py-4 xs:flex-row xs:items-center xs:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-body font-[550] break-words">
                    {booking.providerProfile.displayName}
                  </span>
                  <span className="text-small text-ink-muted">
                    {t("member.appointmentOn", { date: date(booking.endsAt) })}
                  </span>
                </div>
                <UiLink
                  href={href({
                    pathname: "/bewertungen/neu/[termin]",
                    params: { termin: booking.id },
                  })}
                  className={buttonVariants({ variant: "primary" })}
                >
                  {t("member.write")}
                </UiLink>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="eigene-bewertungen"
        className="flex flex-col gap-3"
      >
        <h2 id="eigene-bewertungen" className="text-h2">
          {t("member.writtenTitle")}
        </h2>
        {written.length === 0 ? (
          <EmptyState
            icon={<MessageSquareText strokeWidth={1.5} />}
            title={t("member.writtenEmpty")}
            description={t("member.writtenEmptyHint")}
            action={
              <Button asChild>
                <UiLink
                  href={href({
                    pathname: "/termine",
                    query: { ansicht: "vergangen" },
                  })}
                >
                  {t("member.toAppointments")}
                </UiLink>
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border border-y border-border">
            {written.map((review) => (
              <WrittenReview
                key={review.id}
                review={review}
                t={t}
                date={date}
                profileHref={href({
                  pathname: "/p/[name]",
                  params: { name: review.providerProfile.slug },
                })}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
