"use client";

import {
  REVIEW_CATEGORIES,
  REVIEW_TEXT_MAX,
  type ReviewCategory,
} from "@app/core/review/schemas";
import { Button, InlineAlert, RadioGroup, TextArea } from "@app/ui";
import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  FormErrorSummary,
  type SummaryEntry,
} from "../../../settings/components/form-error-summary";
import { createReviewAction } from "../../actions/review";
import {
  RATING_VALUES,
  emptyReviewForm,
  reviewFormErrors,
  toReviewInput,
  type ReviewFormErrors,
  type ReviewFormField,
  type ReviewFormValues,
} from "../../lib/form";

const fieldId = (field: ReviewFormField) => `bewertung-${field}`;
const NOTICE_ID = "bewertung-hinweis";

function focusField(field: ReviewFormField) {
  requestAnimationFrame(() => {
    const element = document.getElementById(fieldId(field));
    (element?.querySelector<HTMLElement>("[role=radio]") ?? element)?.focus();
  });
}

/** Hinweis über dem Textfeld (v2 12.1): was nicht in die Bewertung gehört. */
function TextNotice({ title, text }: { title: string; text: string }) {
  return (
    <div
      id={NOTICE_ID}
      className="flex items-start gap-3 rounded-control bg-surface-2 p-3"
    >
      <ShieldAlert
        aria-hidden
        strokeWidth={1.5}
        className="mt-0.5 size-5 shrink-0 text-ink-muted"
      />
      <div className="flex flex-col gap-1 text-small">
        <p className="font-[550] text-ink">{title}</p>
        <p className="text-ink-muted">{text}</p>
      </div>
    </div>
  );
}

/** Eine Kategorie als Gruppe von 1 bis 5; jede Option heisst für Screenreader zum Beispiel «Kommunikation, 4 von 5». */
function RatingField({
  category,
  value,
  invalid,
  onChange,
}: {
  category: ReviewCategory;
  value: number | null;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("reviews");
  const label = t(`categories.${category}`);
  return (
    <div id={fieldId(category)}>
      <RadioGroup
        label={label}
        hint={t(`categoryHints.${category}`)}
        name={fieldId(category)}
        orientation="horizontal"
        value={value === null ? "" : String(value)}
        onValueChange={onChange}
        options={RATING_VALUES.map((option) => ({
          value: String(option),
          label: (
            <>
              <span aria-hidden className="tabular">
                {option}
              </span>
              <span className="sr-only">
                {t("rating.option", { category: label, value: option })}
              </span>
            </>
          ),
        }))}
        error={invalid ? t("errors.ratingMissing") : undefined}
      />
    </div>
  );
}

/**
 * Formular der Bewertung (v2 12.1, Entscheid 0017): vier Kategorien als
 * Gruppen von 1 bis 5, der Text mit Zähler und dem Hinweis darüber. Prüft
 * vorab im Browser; nach dem Senden geht es zu `/bewertungen` mit dem Dank.
 */
export function ReviewForm({
  bookingRequestId,
  sentHref,
}: {
  bookingRequestId: string;
  sentHref: string;
}) {
  const t = useTranslations("reviews");
  const router = useRouter();
  const [values, setValues] = useState<ReviewFormValues>(emptyReviewForm);
  const [errors, setErrors] = useState<ReviewFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function setRating(category: ReviewCategory, value: string) {
    setValues((current) => ({
      ...current,
      ratings: { ...current.ratings, [category]: Number(value) },
    }));
    setErrors(({ [category]: _removed, ...rest }) => rest);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const local = reviewFormErrors(values);
    setErrors(local);
    setFormError(null);
    const first = Object.keys(local)[0] as ReviewFormField | undefined;
    if (first) {
      focusField(first);
      return;
    }
    setPending(true);
    try {
      const result = await createReviewAction(
        bookingRequestId,
        toReviewInput(values),
      );
      if (result.ok) {
        // Der Dank steht auf `/bewertungen`, neben dem Status «Wird geprüft».
        router.replace(sentHref);
        return;
      }
      setFormError(result.reason);
      setPending(false);
    } catch {
      setFormError("generic");
      setPending(false);
    }
  }

  const errorText = (key: string) =>
    t.has(`errors.${key}`) ? t(`errors.${key}`) : t("errors.generic");
  const summary: SummaryEntry[] = (
    Object.entries(errors) as [ReviewFormField, string][]
  ).map(([field, key]) => ({
    fieldId: fieldId(field),
    message:
      field === "text"
        ? errorText(key)
        : t("form.ratingMissingFor", { category: t(`categories.${field}`) }),
  }));

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-6"
      data-review-form
    >
      <FormErrorSummary
        title={t("form.summaryTitle")}
        entries={summary}
        formError={formError ? errorText(formError) : null}
      />
      <p className="text-small text-ink-muted">{t("form.scaleHint")}</p>
      {REVIEW_CATEGORIES.map((category) => (
        <RatingField
          key={category}
          category={category}
          value={values.ratings[category]}
          invalid={errors[category] !== undefined}
          onChange={(value) => setRating(category, value)}
        />
      ))}
      <div className="flex flex-col gap-3">
        <TextNotice title={t("form.noticeTitle")} text={t("form.noticeText")} />
        <TextArea
          id={fieldId("text")}
          label={t("form.text")}
          hint={t("form.textHint")}
          rows={6}
          maxLength={REVIEW_TEXT_MAX}
          countLabel={(used, max) => t("form.count", { used, max })}
          aria-describedby={NOTICE_ID}
          value={values.text}
          error={errors.text ? errorText(errors.text) : undefined}
          onChange={(event) => {
            const text = event.target.value;
            setValues((current) => ({ ...current, text }));
            if (errors.text) setErrors(({ text: _removed, ...rest }) => rest);
          }}
        />
      </div>
      <InlineAlert title={t("form.moderationTitle")}>
        {t("form.moderationText")}
      </InlineAlert>
      <Button
        type="submit"
        variant="primary"
        loading={pending}
        className="self-start"
      >
        {t("form.submit")}
      </Button>
    </form>
  );
}
