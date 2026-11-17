import {
  REVIEW_CATEGORIES,
  REVIEW_TEXT_MAX,
  REVIEW_TEXT_MIN,
  type ReviewCategory,
} from "@app/core/review/schemas";

/** Werte des Formulars `/bewertungen/neu/[termin]`; eine Kategorie ohne Wahl ist null. */
export interface ReviewFormValues {
  ratings: Record<ReviewCategory, number | null>;
  text: string;
}

export type ReviewFormField = ReviewCategory | "text";

/** Fehler als Schlüssel unter `reviews.form.errors`. */
export type ReviewFormErrors = Partial<
  Record<ReviewFormField, "ratingMissing" | "textTooShort" | "textTooLong">
>;

export const RATING_VALUES = [1, 2, 3, 4, 5] as const;

export function emptyReviewForm(): ReviewFormValues {
  return {
    ratings: {
      communication: null,
      accuracy: null,
      organization: null,
      overall: null,
    },
    text: "",
  };
}

/** Länge des Texts so, wie der Kern sie zählt: Zeilenenden vereinheitlicht, aussen ohne Leerraum. */
export function countedLength(text: string): number {
  return text.replace(/\r\n/g, "\n").trim().length;
}

/**
 * Prüft das Formular vor dem Senden mit denselben Grenzen wie der Kern, damit
 * Fehler am Feld stehen und kein Versuch der Grenze pro Stunde verloren geht.
 * Die Reihenfolge folgt dem Formular.
 */
export function reviewFormErrors(values: ReviewFormValues): ReviewFormErrors {
  const errors: ReviewFormErrors = {};
  for (const category of REVIEW_CATEGORIES)
    if (values.ratings[category] === null) errors[category] = "ratingMissing";
  const length = countedLength(values.text);
  if (length < REVIEW_TEXT_MIN) errors.text = "textTooShort";
  else if (length > REVIEW_TEXT_MAX) errors.text = "textTooLong";
  return errors;
}

/** Eingabe für `createReviewAction`; nur nach `reviewFormErrors` ohne Befund aufrufen. */
export function toReviewInput(values: ReviewFormValues) {
  return {
    communication: values.ratings.communication ?? 0,
    accuracy: values.ratings.accuracy ?? 0,
    organization: values.ratings.organization ?? 0,
    overall: values.ratings.overall ?? 0,
    text: values.text,
  };
}

/** Grund eines Einspruchs oder Entscheids: mindestens 10 Zeichen, wie im Kern. */
export const REASON_MIN = 10;

export function reasonError(
  reason: string,
  max: number,
): "reasonTooShort" | "reasonTooLong" | null {
  const length = reason.trim().length;
  if (length < REASON_MIN) return "reasonTooShort";
  if (length > max) return "reasonTooLong";
  return null;
}
