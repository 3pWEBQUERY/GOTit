import type { Locale } from "@app/core/locale";
import { listReceivedReviews } from "@app/core/review";
import { EmptyState, StatusPill } from "@app/ui";
import { MessageSquareText } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { TopBarTitle } from "../../../shell/components/top-bar-title";
import { appealView } from "../../lib/status";
import { STATUS_TONE } from "../member/own-reviews-page";
import { ReviewEntry } from "../public/review-entry";
import { AppealDialog } from "../shared/appeal-dialog";
import { ResponseEditor } from "./response-editor";

/**
 * `/studio/bewertungen` (v2 7.6, Entscheid 0017): erhaltene Bewertungen,
 * veröffentlichte und entfernte, ohne Autor. Zu veröffentlichten gibt es die
 * Stellungnahme und den Einspruch mit Grund; ein offener steht als «Einspruch läuft» da.
 */
export async function ReceivedReviewsPage({
  locale,
  userId,
  providerName,
}: {
  locale: Locale;
  userId: string;
  providerName: string;
}) {
  const [t, format, reviews] = await Promise.all([
    getTranslations({ locale, namespace: "reviews" }),
    getFormatter({ locale }),
    listReceivedReviews(userId),
  ]);
  const date = (value: Date) =>
    format.dateTime(value, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <div className="flex max-w-reading min-w-0 flex-col gap-6">
      <TopBarTitle title={t("studio.title")} />
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t("studio.title")}</h1>
        <p className="text-body text-ink-muted">{t("studio.intro")}</p>
      </div>
      {reviews.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText strokeWidth={1.5} />}
          title={t("studio.empty")}
          description={t("studio.emptyHint")}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {reviews.map((review) => {
            const appeals = [...review.appeals].sort(
              (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
            );
            const appeal = appealView("PROVIDER", review.status, appeals);
            const published = review.status === "PUBLISHED";
            return (
              <li
                key={review.id}
                className="flex flex-col gap-4 py-5"
                data-received-review={review.id}
              >
                <StatusPill
                  status={STATUS_TONE[review.status]}
                  label={t(`status.${review.status}`)}
                  className="self-start"
                />
                <ReviewEntry
                  t={t}
                  date={
                    review.publishedAt
                      ? date(review.publishedAt)
                      : t("studio.noDate")
                  }
                  dateTime={review.publishedAt?.toISOString() ?? ""}
                  ratings={review}
                  text={review.text}
                  providerName={providerName}
                  response={
                    review.response && review.respondedAt
                      ? {
                          text: review.response,
                          date: date(review.respondedAt),
                        }
                      : null
                  }
                />
                {published ? null : (
                  <p className="text-small text-ink-muted">
                    {t("studio.removedHint")}
                  </p>
                )}
                {appeal.open ? (
                  <p className="text-small font-[550]" data-appeal-open>
                    {t("appeal.running")}
                  </p>
                ) : null}
                {!appeal.open && appeal.last ? (
                  <p className="text-small text-ink-muted">
                    {t(`appeal.last.${appeal.last}`)}
                  </p>
                ) : null}
                {published ? (
                  <div className="flex flex-col gap-3">
                    <ResponseEditor
                      reviewId={review.id}
                      current={review.response}
                    />
                    {appeal.canAppeal ? (
                      <div>
                        <AppealDialog reviewId={review.id} side="provider" />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
