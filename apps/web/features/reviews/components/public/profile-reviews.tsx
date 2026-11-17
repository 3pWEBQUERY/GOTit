import type { Locale } from "@app/core/locale";
import { EmptyState, UiLink, buttonVariants } from "@app/ui";
import { ChevronRight, MessageSquareText } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { loadProfileReviews } from "../../queries/public";
import { ReportReview } from "./report-review";
import { ReviewEntry } from "./review-entry";

/** So viele Bewertungen zeigt die Übersicht; der Tab zeigt bis zu `TAB_LIMIT`. */
export const OVERVIEW_LIMIT = 3;
export const TAB_LIMIT = 50;

export interface ProfileReviewsProps {
  locale: Locale;
  slug: string;
  providerName: string;
  /** `section`: Abschnitt der Übersicht mit «Alle ansehen»; `tab`: der Tab «Bewertungen». */
  variant: "section" | "tab";
  /** Tab «Bewertungen», für «Alle ansehen» und den Weg nach der Anmeldung. */
  tabHref: string;
  overviewHref: string;
  /** Anmeldung mit Rückweg; null für angemeldete Konten. */
  signInHref: string | null;
  /** Der Inhaber meldet nicht, er antwortet im Studio. */
  owner: boolean;
  studioHref: string;
}

/**
 * Bewertungen auf dem Profil (v2 10, 10.1): neueste zuerst, ohne Sternesumme
 * und ohne Autor. Die Übersicht zeigt den Abschnitt nur mit mindestens einer
 * veröffentlichten Bewertung, der Tab hat einen ehrlichen Leerzustand.
 */
export async function ProfileReviews({
  locale,
  slug,
  providerName,
  variant,
  tabHref,
  overviewHref,
  signInHref,
  owner,
  studioHref,
}: ProfileReviewsProps) {
  const [t, format, { total, reviews }] = await Promise.all([
    getTranslations({ locale, namespace: "reviews" }),
    getFormatter({ locale }),
    loadProfileReviews(
      slug,
      variant === "section" ? OVERVIEW_LIMIT : TAB_LIMIT,
    ),
  ]);
  if (variant === "section" && total === 0) return null;
  const date = (value: Date) =>
    format.dateTime(value, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  const headingId =
    variant === "section" ? "profil-bewertungen" : "bewertungen-titel";

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-4"
      data-profile-reviews={variant}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={headingId} className="text-h2">
          {t("public.heading", { count: total })}
        </h2>
        {variant === "section" ? (
          <UiLink
            href={tabHref}
            className="inline-flex min-h-11 items-center gap-1 text-small font-[550] underline-offset-4 hover:underline"
          >
            {t("public.all")}
            <ChevronRight aria-hidden strokeWidth={1.5} className="size-4" />
          </UiLink>
        ) : null}
      </div>
      {owner ? (
        <p className="max-w-prose text-small text-ink-muted">
          {t("public.ownerHint")}{" "}
          <UiLink
            href={studioHref}
            className="underline underline-offset-4 hover:text-ink"
          >
            {t("public.ownerLink")}
          </UiLink>
        </p>
      ) : null}
      {reviews.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText strokeWidth={1.5} />}
          title={t("public.empty")}
          description={t("public.emptyHint")}
          action={
            <UiLink
              href={overviewHref}
              className={buttonVariants({ variant: "secondary" })}
            >
              {t("public.toOverview")}
            </UiLink>
          }
        />
      ) : (
        <ul
          aria-label={t("public.listLabel")}
          className="flex flex-col divide-y divide-border border-y border-border"
        >
          {reviews.map((review) => (
            <li key={review.id} className="py-5" data-review={review.id}>
              <ReviewEntry
                t={t}
                date={date(review.publishedAt)}
                dateTime={review.publishedAt.toISOString()}
                ratings={review.ratings}
                text={review.text}
                providerName={providerName}
                response={
                  review.response
                    ? {
                        text: review.response.text,
                        date: date(review.response.respondedAt),
                      }
                    : null
                }
                actions={
                  owner ? undefined : (
                    <ReportReview
                      reviewId={review.id}
                      signInHref={signInHref}
                    />
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}
      {variant === "tab" && total > reviews.length ? (
        <p className="text-small text-ink-muted">
          {t("public.limited", { shown: reviews.length, total })}
        </p>
      ) : null}
    </section>
  );
}
