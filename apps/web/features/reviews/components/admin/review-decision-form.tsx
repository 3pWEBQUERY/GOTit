"use client";

import { REVIEW_RULES } from "@app/core/review/schemas";
import { Button, RadioGroup, Select, TextArea, useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  FormErrorSummary,
  type SummaryEntry,
} from "../../../settings/components/form-error-summary";
import { moderateReviewAction } from "../../actions/moderate";

const IDS = {
  decision: "bewertung-entscheid",
  reason: "bewertung-begruendung",
  rule: "bewertung-regel",
} as const;
type Decision = "PUBLISHED" | "REJECTED" | "REMOVED";

function fieldIdOf(key: string): string {
  return IDS[key as keyof typeof IDS] ?? IDS.decision;
}

/** Fokus zum ersten Feld mit Fehler; bei der Gruppe auf die erste Option. */
function focusFirstError(errors: Record<string, string>) {
  const first = Object.keys(errors)[0];
  if (!first) return;
  requestAnimationFrame(() => {
    const element = document.getElementById(fieldIdOf(first));
    (element?.querySelector<HTMLElement>("[role=radio]") ?? element)?.focus();
  });
}

function summaryOf(
  errors: Record<string, string>,
  errorText: (key: string) => string,
): SummaryEntry[] {
  return Object.entries(errors).map(([key, message]) => ({
    fieldId: fieldIdOf(key),
    message: errorText(message),
  }));
}

/** Regel R-REV-1 bis 5 mit ihrem Namen (Entscheid 0017). */
function RuleSelect({
  value,
  error,
  onChange,
}: {
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("reviews.admin");
  return (
    <Select
      id={IDS.rule}
      label={t("decision.rule")}
      placeholder={t("decision.rulePlaceholder")}
      value={value || undefined}
      onValueChange={onChange}
      options={REVIEW_RULES.map((id) => ({
        value: id,
        label: `${id} ${t(`rules.${id}`)}`,
      }))}
      error={error}
    />
  );
}

/**
 * Entscheid über eine Bewertung (v2 12.4, Entscheid 0017): Entscheid, Regel
 * und Begründung, in einem Schritt gespeichert. Danach zum nächsten offenen
 * Fall oder zurück zur Warteschlange.
 */
export function ReviewDecisionForm({
  reviewId,
  decisions,
  queueHref,
}: {
  reviewId: string;
  decisions: readonly Decision[];
  queueHref: string;
}) {
  const t = useTranslations("reviews.admin.decision");
  const tErrors = useTranslations("reviews.admin.errors");
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [decision, setDecision] = useState<Decision | "">(
    decisions.length === 1 ? (decisions[0] ?? "") : "",
  );
  const [reason, setReason] = useState("");
  const [rule, setRule] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const errorText = (key: string) =>
    tErrors.has(key) ? tErrors(key) : tErrors("generic");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await moderateReviewAction({
        reviewId,
        decision: decision || undefined,
        reason,
        rule: rule || undefined,
      });
      if (result.ok) {
        toast({ title: t("saved"), tone: "success" });
        const nextId = result.data?.nextId;
        router.push(nextId ? `${queueHref}/${nextId}` : queueHref);
        return;
      }
      if (result.formError === "alreadyDecided") {
        router.replace(`${pathname}?hinweis=entschieden`);
        router.refresh();
        return;
      }
      const fieldErrors = result.fieldErrors ?? {};
      setErrors(fieldErrors);
      setFormError(result.formError ?? null);
      focusFirstError(fieldErrors);
    } catch {
      setFormError("generic");
    } finally {
      setPending(false);
    }
  }

  const summary = summaryOf(errors, errorText);
  const errorFor = (key: string) =>
    errors[key] ? errorText(errors[key]) : undefined;

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-6"
      data-review-decision-form
    >
      <FormErrorSummary
        title={t("summaryTitle")}
        entries={summary}
        formError={formError ? errorText(formError) : null}
      />
      <div id={IDS.decision}>
        <RadioGroup
          label={t("decision")}
          name={IDS.decision}
          value={decision}
          onValueChange={(value) => {
            setDecision(value as Decision);
            setErrors(({ decision: _removed, ...rest }) => rest);
          }}
          options={decisions.map((value) => ({
            value,
            label: t(`option.${value}`),
            description: t(`optionHint.${value}`),
          }))}
          error={errorFor("decision")}
        />
      </div>
      <RuleSelect
        value={rule}
        error={errorFor("rule")}
        onChange={(value) => {
          setRule(value);
          setErrors(({ rule: _removed, ...rest }) => rest);
        }}
      />
      <TextArea
        id={IDS.reason}
        label={t("reason")}
        hint={t("reasonHint")}
        rows={4}
        maxLength={1000}
        value={reason}
        error={errorFor("reason")}
        onChange={(event) => setReason(event.target.value)}
      />
      <Button
        type="submit"
        variant="primary"
        loading={pending}
        className="self-start"
      >
        {t("save")}
      </Button>
    </form>
  );
}
