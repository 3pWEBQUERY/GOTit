import type { Locale } from "@app/core/locale";
import { reviewEligibility } from "@app/core/review";
import { REVIEW_WINDOW_DAYS } from "@app/core/review/schemas";
import { UiLink, buttonVariants } from "@app/ui";
import { CircleCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../../shell/nav/href";
import { getViewer } from "../../../shell/queries/get-viewer";

/**
 * Nach «Stattgefunden» auf `/termine/[id]` (v2 12.1): «Bewertung schreiben»,
 * solange die Frist läuft, sonst «Bewertung geschrieben» oder der Hinweis auf
 * die abgelaufene Frist. Nur für das Mitglied des Termins.
 */
export async function BookingReviewNote({
  locale,
  requestId,
}: {
  locale: Locale;
  requestId: string;
}) {
  const viewer = await getViewer();
  if (viewer.kind !== "account") return null;
  const [eligibility, t] = await Promise.all([
    reviewEligibility(viewer.userId, requestId),
    getTranslations({ locale, namespace: "reviews.booking" }),
  ]);
  const href = createHref(locale);
  if (eligibility.eligible)
    return (
      <section
        aria-labelledby="bewertung"
        className="flex flex-col items-start gap-3"
        data-booking-review="open"
      >
        <h2 id="bewertung" className="text-h2">
          {t("title")}
        </h2>
        <p className="text-small text-ink-muted">
          {t("text", { days: REVIEW_WINDOW_DAYS })}
        </p>
        <UiLink
          href={href({
            pathname: "/bewertungen/neu/[termin]",
            params: { termin: requestId },
          })}
          className={buttonVariants({ variant: "primary" })}
        >
          {t("write")}
        </UiLink>
      </section>
    );
  if (eligibility.reason === "already-reviewed")
    return (
      <p
        className="flex items-center gap-2 text-small"
        data-booking-review="done"
      >
        <CircleCheck
          aria-hidden
          strokeWidth={1.5}
          className="size-4 shrink-0 text-ink-muted"
        />
        <span className="font-[550]">{t("done")}</span>
        <UiLink
          href={href("/bewertungen")}
          className="underline underline-offset-4 hover:text-accent"
        >
          {t("toOwn")}
        </UiLink>
      </p>
    );
  if (eligibility.reason === "too-late")
    return (
      <p className="text-small text-ink-muted">
        {t("tooLate", { days: REVIEW_WINDOW_DAYS })}
      </p>
    );
  return null;
}
