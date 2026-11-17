import {
  REVIEW_CATEGORIES,
  type ReviewCategory,
} from "@app/core/review/schemas";
import { ReviewItem, type ReviewRating } from "@app/ui";
import type { ReactNode } from "react";

type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

/** Die vier Kategorien als Text mit Wert, zum Beispiel «Kommunikation 4 von 5». Kein Durchschnitt (v2 18). */
export function reviewRatings(
  t: Translate,
  ratings: Record<ReviewCategory, number>,
): ReviewRating[] {
  return REVIEW_CATEGORIES.map((category) => ({
    key: category,
    label: t(`categories.${category}`),
    value: t("rating.value", { value: ratings[category] }),
  }));
}

export interface ReviewEntryProps {
  t: Translate;
  date: string;
  dateTime: string;
  ratings: Record<ReviewCategory, number>;
  text: string;
  /** Name des Profils für «Stellungnahme von …». */
  providerName: string;
  response: { text: string; date?: string } | null;
  actions?: ReactNode;
  className?: string;
}

/**
 * Eine Bewertung, wie Besucher und Anbieter sie sehen (v2 10.1, Entscheid
 * 0017): Datum, «Nach bestätigtem Termin», die vier Kategorien, der Text und
 * direkt darunter die Stellungnahme. Nie der Name des Autors.
 */
export function ReviewEntry({
  t,
  date,
  dateTime,
  ratings,
  text,
  providerName,
  response,
  actions,
  className,
}: ReviewEntryProps) {
  return (
    <ReviewItem
      date={date}
      dateTime={dateTime}
      verification={t("verification")}
      ratings={reviewRatings(t, ratings)}
      response={
        response
          ? {
              label: t("public.responseLabel", { name: providerName }),
              date: response.date,
              text: (
                <p className="break-words whitespace-pre-wrap">
                  {response.text}
                </p>
              ),
            }
          : undefined
      }
      actions={actions}
      className={className}
    >
      <p className="break-words whitespace-pre-wrap">{text}</p>
    </ReviewItem>
  );
}
