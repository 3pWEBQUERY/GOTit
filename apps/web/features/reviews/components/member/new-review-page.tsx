import type { Locale } from "@app/core/locale";
import { reviewEligibility, type ReviewEligibility } from "@app/core/review";
import { REVIEW_WINDOW_DAYS } from "@app/core/review/schemas";
import { Breadcrumbs, Button, InlineAlert, UiLink } from "@app/ui";
import { getFormatter, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireAccount } from "../../../account/require-account";
import { TopBarTitle } from "../../../shell/components/top-bar-title";
import { createHref } from "../../../shell/nav/href";
import { SENT_PARAM } from "./own-reviews-page";
import { ReviewForm } from "./review-form";

/**
 * Ob das Konto diesen Termin bewerten darf, einmal pro Anfrage für Layout und
 * Seite. Fremde und unbekannte Termine ergeben eine echte 404, auch für den
 * Anbieter des Termins (Abnahme 20.5); alles andere ist ein ehrlicher Zustand.
 */
export const requireEligibility = cache(
  async (
    locale: Locale,
    bookingRequestId: string,
  ): Promise<ReviewEligibility> => {
    const viewer = await requireAccount(locale);
    const eligibility = await reviewEligibility(
      viewer.userId,
      bookingRequestId,
    );
    if (
      !eligibility.eligible &&
      (eligibility.reason === "not-found" ||
        eligibility.reason === "not-member")
    )
      notFound();
    return eligibility;
  },
);

/** `/bewertungen/neu/[termin]` (v2 12.1): vier Kategorien und ein freier Text, mit dem Hinweis, was nicht hineingehört. */
export async function NewReviewPage({
  locale,
  bookingRequestId,
}: {
  locale: Locale;
  bookingRequestId: string;
}) {
  const [eligibility, t, format] = await Promise.all([
    requireEligibility(locale, bookingRequestId),
    getTranslations({ locale, namespace: "reviews" }),
    getFormatter({ locale }),
  ]);
  const href = createHref(locale);
  const appointmentHref = href({
    pathname: "/termine/[id]",
    params: { id: bookingRequestId },
  });
  const crumbs = (
    <Breadcrumbs
      label={t("form.breadcrumbs")}
      items={[
        { label: t("member.title"), href: href("/bewertungen") },
        { label: t("form.crumb") },
      ]}
    />
  );

  if (!eligibility.eligible) {
    const reason = eligibility.reason as
      | "not-completed"
      | "already-reviewed"
      | "too-late";
    return (
      <div className="flex max-w-reading flex-col gap-6">
        <TopBarTitle title={t("form.title")} />
        {crumbs}
        <h1 className="text-h1">{t("form.title")}</h1>
        <InlineAlert
          title={t(`form.ineligible.${reason}.title`)}
          action={
            <Button asChild variant="secondary">
              <UiLink
                href={
                  reason === "already-reviewed"
                    ? href("/bewertungen")
                    : appointmentHref
                }
              >
                {t(`form.ineligible.${reason}.action`)}
              </UiLink>
            </Button>
          }
        >
          {t(`form.ineligible.${reason}.text`, { days: REVIEW_WINDOW_DAYS })}
        </InlineAlert>
      </div>
    );
  }

  const title = t("form.titleFor", { name: eligibility.providerName });
  const until = new Date(
    eligibility.endsAt.getTime() + REVIEW_WINDOW_DAYS * 24 * 3600_000,
  );
  return (
    <div className="flex max-w-reading flex-col gap-6">
      <TopBarTitle title={t("form.title")} />
      {crumbs}
      <div className="flex flex-col gap-2">
        <h1 className="text-h1 break-words">{title}</h1>
        <p className="text-body text-ink-muted">
          {t("form.intro", {
            date: format.dateTime(eligibility.endsAt, {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }),
            until: format.dateTime(until, {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }),
          })}
        </p>
      </div>
      <ReviewForm
        bookingRequestId={bookingRequestId}
        sentHref={href({
          pathname: "/bewertungen",
          query: { [SENT_PARAM]: "1" },
        })}
      />
    </div>
  );
}
