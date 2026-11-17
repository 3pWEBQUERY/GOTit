import type { Locale } from "@app/core/locale";
import { InlineAlert, UiLink } from "@app/ui";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AdminPageHeader } from "../../../admin/components/page-header";
import { caseAge } from "../../../admin/queue/case-age";
import { createHref } from "../../../shell/nav/href";
import { decisionsFrom } from "../../lib/status";
import type { ReviewCase } from "../../queries/admin";
import { ReviewEntry } from "../public/review-entry";
import { DismissAppealForm } from "./dismiss-appeal-form";
import { ReviewDecisionForm } from "./review-decision-form";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="text-body break-words whitespace-pre-wrap text-ink">
        {children}
      </dd>
    </div>
  );
}

type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

function CaseFacts({
  review,
  t,
  stamp,
  profileHref,
  bookingStatus,
}: {
  review: ReviewCase;
  t: Translate;
  stamp: (value: Date) => string;
  profileHref: string;
  bookingStatus: string;
}) {
  return (
    <dl>
      <Fact label={t("facts.profile")}>
        <UiLink
          href={profileHref}
          className="underline underline-offset-4 hover:text-accent"
        >
          {review.providerProfile.displayName}
        </UiLink>
      </Fact>
      <Fact label={t("facts.appointment")}>
        {t("facts.appointmentValue", {
          start: stamp(review.bookingRequest.startsAt),
          end: stamp(review.bookingRequest.endsAt),
          status: bookingStatus,
        })}
      </Fact>
      <Fact label={t("facts.submitted")}>{stamp(review.createdAt)}</Fact>
      <Fact label={t("facts.published")}>
        {review.publishedAt ? stamp(review.publishedAt) : t("facts.none")}
      </Fact>
      <Fact label={t("facts.lastDecision")}>
        {review.moderationReason ?? t("facts.none")}
      </Fact>
    </dl>
  );
}

function AppealList({
  appeals,
  t,
  stamp,
}: {
  appeals: ReviewCase["appeals"];
  t: Translate;
  stamp: (value: Date) => string;
}) {
  return (
    <>
      {appeals.length === 0 ? (
        <p className="text-small text-ink-muted">{t("appeals.none")}</p>
      ) : (
        <ol
          className="flex flex-col divide-y divide-border border-y border-border"
          aria-label={t("appeals.title")}
        >
          {appeals.map((appeal) => (
            <li
              key={appeal.id}
              className="flex flex-col gap-1 py-3"
              data-appeal={appeal.id}
            >
              <p className="text-small text-ink-muted">
                {t(
                  `appeals.by.${appeal.byRole === "PROVIDER" ? "PROVIDER" : "MEMBER"}`,
                )}{" "}
                · {stamp(appeal.createdAt)} ·{" "}
                {t(`appeals.status.${appeal.status}`)}
              </p>
              <p className="text-body break-words whitespace-pre-wrap">
                {appeal.reason}
              </p>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

function DecisionPanel({
  reviewId,
  status,
  openAppeals,
  alreadyDecided,
  queueHref,
  t,
  readOnly,
}: {
  reviewId: string;
  status: ReviewCase["status"];
  openAppeals: ReviewCase["appeals"];
  alreadyDecided: boolean;
  queueHref: string;
  t: Translate;
  readOnly: { title: string; text: string };
}) {
  return (
    <>
      {alreadyDecided ? (
        <InlineAlert tone="warning" title={t("errors.alreadyDecided")}>
          {t("decision.alreadyDecidedHelp")}
        </InlineAlert>
      ) : null}
      <div className="hidden flex-col gap-8 lg:flex">
        <ReviewDecisionForm
          reviewId={reviewId}
          decisions={decisionsFrom(status)}
          queueHref={queueHref}
        />
        {openAppeals.map((appeal) => (
          <div
            key={appeal.id}
            className="flex flex-col gap-2 border-t border-border pt-6"
          >
            <h3 className="text-label">
              {t(
                `dismiss.title.${appeal.byRole === "PROVIDER" ? "PROVIDER" : "MEMBER"}`,
              )}
            </h3>
            <p className="text-small text-ink-muted">{t("dismiss.text")}</p>
            <DismissAppealForm appealId={appeal.id} />
          </div>
        ))}
      </div>
      <div className="lg:hidden">
        <InlineAlert title={readOnly.title}>{readOnly.text}</InlineAlert>
      </div>
    </>
  );
}

/**
 * Einzelfall einer Bewertung (v2 12.4): links die Bewertung, wie sie
 * öffentlich erschiene, in der Mitte Termin, Verlauf und Einsprüche mit
 * Gründen, rechts der Entscheid. Ohne Autor; jedes Öffnen steht im Audit-Log.
 */
export async function ReviewCaseView({
  locale,
  review,
  alreadyDecided,
  now,
}: {
  locale: Locale;
  review: ReviewCase;
  alreadyDecided: boolean;
  now: Date;
}) {
  const [t, tReviews, tAdmin, tBooking, format] = await Promise.all([
    getTranslations({ locale, namespace: "reviews.admin" }),
    getTranslations({ locale, namespace: "reviews" }),
    getTranslations({ locale, namespace: "admin" }),
    getTranslations({ locale, namespace: "booking" }),
    getFormatter({ locale }),
  ]);
  const href = createHref(locale);
  const name = review.providerProfile.displayName;
  const stamp = (value: Date) =>
    format.dateTime(value, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  const age = caseAge(review.createdAt, now);
  const ageLabel =
    age.unit === "lessThanHour"
      ? tAdmin("queue.age.lessThanHour")
      : tAdmin(`queue.age.${age.unit}`, { count: age.count });
  const openAppeals = review.appeals.filter(
    (appeal) => appeal.status === "OPEN",
  );
  const title = t("caseTitle", { name });
  const queueHref = href("/admin/bewertungen");

  return (
    <>
      <AdminPageHeader
        title={title}
        crumbsLabel={tAdmin("shell.breadcrumbs")}
        crumbs={[
          { label: tAdmin("shell.overview"), href: href("/admin") },
          { label: tAdmin("shell.reviews"), href: queueHref },
          { label: name },
        ]}
      />
      <p className="text-small text-ink-muted">
        {t("meta", {
          submitted: stamp(review.createdAt),
          age: ageLabel,
          state: tReviews(`status.${review.status}`),
        })}
      </p>
      <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,22rem)]">
        <section
          aria-labelledby="bewertung-text"
          className="flex min-w-0 flex-col gap-3"
        >
          <h2 id="bewertung-text" className="text-h3">
            {t("review")}
          </h2>
          <ReviewEntry
            t={tReviews}
            date={stamp(review.publishedAt ?? review.createdAt)}
            dateTime={(review.publishedAt ?? review.createdAt).toISOString()}
            ratings={review}
            text={review.text}
            providerName={name}
            response={review.response ? { text: review.response } : null}
          />
        </section>
        <section
          aria-labelledby="bewertung-angaben"
          className="flex min-w-0 flex-col gap-2"
        >
          <h2 id="bewertung-angaben" className="text-h3">
            {t("facts.title")}
          </h2>
          <CaseFacts
            review={review}
            t={t}
            stamp={stamp}
            profileHref={href({
              pathname: "/p/[name]",
              params: { name: review.providerProfile.slug },
            })}
            bookingStatus={tBooking(`status.${review.bookingRequest.status}`)}
          />
          <h3 className="mt-4 text-label text-ink-muted">
            {t("appeals.title")}
          </h3>
          <AppealList appeals={review.appeals} t={t} stamp={stamp} />
        </section>
        <section
          aria-labelledby="bewertung-entscheid"
          className="flex min-w-0 flex-col gap-4 lg:col-span-2 xl:col-span-1"
        >
          <h2 id="bewertung-entscheid" className="text-h3">
            {t("decision.title")}
          </h2>
          <DecisionPanel
            reviewId={review.id}
            status={review.status}
            openAppeals={openAppeals}
            alreadyDecided={alreadyDecided}
            queueHref={queueHref}
            t={t}
            readOnly={{
              title: tAdmin("decision.readOnlyTitle"),
              text: tAdmin("decision.readOnlyDescription"),
            }}
          />
        </section>
      </div>
    </>
  );
}
