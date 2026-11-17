"use client";

import { Button, RadioGroup, TextArea, useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { FormErrorSummary } from "../../settings/components/form-error-summary";
import { decideCaseAppealAction, decideRestrictionAppealAction } from "../actions/moderation";
import { REASON_MAX } from "./decision-rules";

type Outcome = "UPHELD" | "DISMISSED";

/**
 * Entscheid über einen Einspruch (v2 12.4): stattgeben oder abweisen, immer
 * mit Begründung. `kind` bestimmt, ob es um einen Fall oder um eine
 * Einschränkung geht; die Folgen stehen an der Option.
 */
export function AppealDecisionForm({ id, kind }: { id: string; kind: "case" | "restriction" }) {
  const t = useTranslations("moderation.appealDecision");
  const tErrors = useTranslations("moderation.errors");
  const router = useRouter();
  const { toast } = useToast();
  const base = useId();
  const ids = { outcome: `${base}-ergebnis`, reason: `${base}-begruendung` };
  const [outcome, setOutcome] = useState<Outcome | "">("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const errorText = (key: string) => (tErrors.has(key) ? tErrors(key) : tErrors("generic"));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    try {
      const action = kind === "case" ? decideCaseAppealAction : decideRestrictionAppealAction;
      const result = await action({ id, outcome: outcome || undefined, reason });
      if (result.ok) {
        toast({ title: t(outcome === "UPHELD" ? "savedUpheld" : "savedDismissed"), tone: "success" });
        router.refresh();
        return;
      }
      const fieldErrors = result.fieldErrors ?? {};
      setErrors(fieldErrors);
      setFormError(result.formError ?? null);
      const first = Object.keys(fieldErrors)[0];
      if (first) {
        const element = document.getElementById(first === "outcome" ? ids.outcome : ids.reason);
        (element?.querySelector<HTMLElement>("[role=radio]") ?? element)?.focus();
      }
    } catch {
      setFormError("generic");
    } finally {
      setPending(false);
    }
  }

  const summary = Object.entries(errors).map(([key, message]) => ({ fieldId: key === "outcome" ? ids.outcome : ids.reason, message: errorText(message) }));

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4" data-appeal-decision={id}>
      <FormErrorSummary title={t("summaryTitle")} entries={summary} formError={formError ? errorText(formError) : null} />
      <div id={ids.outcome}>
        <RadioGroup
          label={t("outcome")}
          name={ids.outcome}
          value={outcome}
          onValueChange={(value) => {
            setOutcome(value as Outcome);
            setErrors(({ outcome: _removed, ...rest }) => rest);
          }}
          options={(["UPHELD", "DISMISSED"] as const).map((value) => ({ value, label: t(`option.${value}`), description: t(`optionHint.${kind}.${value}`) }))}
          error={errors.outcome ? errorText(errors.outcome) : undefined}
        />
      </div>
      <TextArea
        id={ids.reason}
        label={t("reason")}
        hint={t("reasonHint")}
        rows={3}
        maxLength={REASON_MAX}
        value={reason}
        error={errors.reason ? errorText(errors.reason) : undefined}
        onChange={(event) => setReason(event.target.value)}
      />
      <Button type="submit" variant="primary" loading={pending} className="self-start">
        {t("save")}
      </Button>
    </form>
  );
}
